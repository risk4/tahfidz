<?php

namespace App\Http\Controllers\Api\Master;

use App\Domain\Academic\Models\AcademicYear;
use App\Domain\Academic\Models\ClassRoom;
use App\Domain\People\Models\Student;
use App\Http\Controllers\Controller;
use App\Http\Requests\Master\StoreStudentRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StudentController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Student::class);

        $query = Student::query()
            ->with(['classRoom', 'academicYear', 'tahfidzGroups.teacher'])
            ->withCount(['submissions', 'murajaahs'])
            ->with(['progressSummary']);

        // Guru hanya melihat siswa yang tergabung dalam kelompok binaannya.
        if ($request->user()->isTeacher()) {
            $teacherId = $request->user()->teacher?->id;
            $query->whereHas('tahfidzGroups', fn ($q) => $q->where('teacher_id', $teacherId));
        }

        if ($classId = $request->integer('class_id') ?: $request->integer('kelas_id')) {
            $query->where('class_id', $classId);
        }

        if ($halaqahId = $request->integer('halaqah_id')) {
            $query->whereHas('tahfidzGroups', fn ($q) => $q->where('tahfidz_groups.id', $halaqahId));
        }

        if ($gender = $request->string('gender')->toString()) {
            $query->where('gender', $gender);
        }

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        if ($entryYear = $request->integer('tahun_masuk') ?: $request->integer('entry_year')) {
            $query->where('entry_year', $entryYear);
        }

        if ($search = $request->string('search')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('student_code', 'like', "%{$search}%")
                    ->orWhere('nis', 'like', "%{$search}%")
                    ->orWhere('nisn', 'like', "%{$search}%")
                    ->orWhere('father_name', 'like', "%{$search}%")
                    ->orWhere('mother_name', 'like', "%{$search}%")
                    ->orWhere('guardian_name', 'like', "%{$search}%")
                    ->orWhereHas('classRoom', fn ($class) => $class->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('tahfidzGroups', fn ($group) => $group->where('name', 'like', "%{$search}%"));
            });
        }

        $perPage = min(max($request->integer('per_page', 20), 5), 100);

        return $query->latest()->paginate($perPage);
    }

    public function store(StoreStudentRequest $request)
    {
        $student = Student::create($request->validated());

        return response()->json($student, 201);
    }

    public function show(Request $request, Student $student)
    {
        $this->authorize('view', $student);

        return $student->load(['classRoom', 'academicYear', 'tahfidzGroups.teacher', 'progressSummary'])
            ->loadCount(['submissions', 'murajaahs'])
            ->setAttribute('tahfidz_profile', $this->tahfidzProfile($student));
    }

    public function update(StoreStudentRequest $request, Student $student)
    {
        $this->authorize('update', $student);

        $student->update($request->validated());

        return response()->json($student);
    }

    public function destroy(Student $student)
    {
        $this->authorize('delete', $student);

        $student->delete();

        return response()->json(['message' => 'Siswa berhasil dihapus.']);
    }

    /**
     * Download template import santri (CSV atau XLSX).
     */
    public function importTemplate(Request $request)
    {
        $this->authorize('create', Student::class);

        $headers = $this->spreadsheetColumns();
        $example = [
            'STR-001', 'Ahmad Fauzan', '12345', '1234567890', '3201234567890001', 'L',
            'Jakarta', '2010-05-15', 'Jl. Contoh No. 1', '08123456789',
            '1', '1', '2024', 'active',
            'Bapak Contoh', 'Ibu Contoh',
            '', '', '',
            '30', '1', 'Catatan contoh',
        ];

        $format = $this->resolveExportFormat($request->query('format'));
        $filename = $format === 'xlsx' ? 'template_import_santri.xlsx' : 'template_import_santri.csv';

        return $format === 'xlsx'
            ? $this->xlsxDownload($filename, $headers, [$example])
            : $this->csvDownload($filename, $headers, [$example]);
    }

    /**
     * Export seluruh/sebagian data santri ke CSV atau XLSX.
     */
    public function export(Request $request)
    {
        $this->authorize('viewAny', Student::class);

        $query = Student::query()->with(['classRoom', 'academicYear']);

        if ($request->user()->isTeacher()) {
            $teacherId = $request->user()->teacher?->id;
            $query->whereHas('tahfidzGroups', fn ($q) => $q->where('teacher_id', $teacherId));
        }
        if ($classId = $request->integer('class_id') ?: $request->integer('kelas_id')) {
            $query->where('class_id', $classId);
        }
        if ($halaqahId = $request->integer('halaqah_id')) {
            $query->whereHas('tahfidzGroups', fn ($q) => $q->where('tahfidz_groups.id', $halaqahId));
        }
        if ($gender = $request->string('gender')->toString()) {
            $query->where('gender', $gender);
        }
        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }
        if ($entryYear = $request->integer('tahun_masuk') ?: $request->integer('entry_year')) {
            $query->where('entry_year', $entryYear);
        }
        if ($search = $request->string('search')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('student_code', 'like', "%{$search}%")
                    ->orWhere('nis', 'like', "%{$search}%")
                    ->orWhere('nisn', 'like', "%{$search}%");
            });
        }

        $students = $query->latest()->get();

        $headers = $this->spreadsheetColumns(includeLabels: true);
        $rows = $students->map(fn (Student $s) => [
            $s->student_code,
            $s->name,
            $s->nis ?? '',
            $s->nisn ?? '',
            $s->nik ?? '',
            $s->gender,
            $s->birth_place ?? '',
            $s->birth_date?->format('Y-m-d') ?? '',
            $s->address ?? '',
            $s->phone ?? '',
            $s->class_id,
            $s->classRoom?->name ?? '',
            $s->academic_year_id,
            $s->academicYear?->name ?? '',
            $s->entry_year ?? '',
            $s->status,
            $s->father_name ?? '',
            $s->mother_name ?? '',
            $s->guardian_name ?? '',
            $s->guardian_phone ?? '',
            $s->guardian_address ?? '',
            $s->memorization_target ?? '',
            $s->starting_juz ?? '',
            $s->notes ?? '',
        ])->all();

        $format = $this->resolveExportFormat($request->query('format'));
        $filename = 'export_santri_' . now()->format('Ymd_His') . ($format === 'xlsx' ? '.xlsx' : '.csv');

        return $format === 'xlsx'
            ? $this->xlsxDownload($filename, $headers, $rows)
            : $this->csvDownload($filename, $headers, $rows);
    }

    /** Import data santri dari file CSV/TXT/XLSX. */
    public function import(Request $request)
    {
        $this->authorize('create', Student::class);
        // 'zip' diizinkan karena finfo sering mendeteksi .xlsx sebagai application/zip.
        $request->validate(['file' => ['required', 'file', 'mimes:csv,txt,xlsx,zip', 'max:5120']]);

        $file = $request->file('file');

        try {
            [$headerRow, $dataRows] = $this->readRowsFromFile($file);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Gagal membaca file: ' . $e->getMessage()], 422);
        }

        if (empty($headerRow)) {
            return response()->json(['message' => 'File kosong.'], 422);
        }

        $headerRow = array_map(fn ($h) => strtolower(trim((string) $h)), $headerRow);
        $missing   = array_diff(['student_code','name','gender','class_id','academic_year_id'], $headerRow);
        if ($missing) {
            return response()->json(['message' => 'Kolom wajib tidak ditemukan: ' . implode(', ', $missing)], 422);
        }

        // Mode import: 'update' = tambah baru + perbarui yang sudah ada;
        // 'insert_only' = hanya tambah baru, baris yang sudah ada dilewati.
        $mode = strtolower((string) $request->input('mode', 'update'));
        $mode = in_array($mode, ['update', 'insert_only'], true) ? $mode : 'update';

        $classMap        = ClassRoom::pluck('id', 'id')->toArray();
        $academicYearMap = AcademicYear::pluck('id', 'id')->toArray();
        $imported = 0;
        $skipped  = [];

        DB::beginTransaction();
        try {
            $this->processImportRows($headerRow, $dataRows, $classMap, $academicYearMap, $mode, $imported, $skipped);
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json(['message' => 'Terjadi kesalahan: ' . $e->getMessage()], 500);
        }

        return response()->json([
            'message'  => "Import selesai. {$imported} data berhasil diimpor." . (count($skipped) ? ' ' . count($skipped) . ' baris dilewati.' : ''),
            'imported' => $imported,
            'skipped'  => $skipped,
        ]);
    }

    private function processImportRows(array $headerRow, array $dataRows, array $classMap, array $academicYearMap, string $mode, int &$imported, array &$skipped): void
    {
        // Baris 1 adalah header, sehingga baris data pertama bernomor 2.
        $rowNum = 1;

        foreach ($dataRows as $row) {
            $rowNum++;

            $data = [];
            foreach ($headerRow as $i => $col) {
                $data[$col] = isset($row[$i]) && trim((string) $row[$i]) !== '' ? trim((string) $row[$i]) : null;
            }

            // Tanggal Excel sering berupa angka serial; ubah ke format Y-m-d.
            if (isset($data['birth_date']) && is_numeric($data['birth_date'])) {
                try {
                    $data['birth_date'] = ExcelDate::excelToDateTimeObject((float) $data['birth_date'])->format('Y-m-d');
                } catch (\Throwable) {
                    // Biarkan validator yang menolak nilai tersebut.
                }
            }

            $validator = Validator::make($data, [
                'student_code'        => ['required', 'string', 'max:30'],
                'name'                => ['required', 'string', 'max:150'],
                'gender'              => ['required', Rule::in(['L', 'P'])],
                'class_id'            => ['required', 'integer'],
                'academic_year_id'    => ['required', 'integer'],
                'birth_date'          => ['nullable', 'date'],
                'entry_year'          => ['nullable', 'integer', 'min:2000', 'max:2100'],
                'status'              => ['nullable', Rule::in(['active', 'inactive', 'graduated', 'transferred'])],
                'memorization_target' => ['nullable', 'integer', 'min:1', 'max:30'],
                'starting_juz'        => ['nullable', 'integer', 'min:1', 'max:30'],
            ]);

            if ($validator->fails()) {
                $skipped[] = ['row' => $rowNum, 'data' => $data['student_code'] ?? "(baris {$rowNum})", 'errors' => $validator->errors()->all()];
                continue;
            }

            $classId = (int) $data['class_id'];
            $yearId  = (int) $data['academic_year_id'];

            if (!isset($classMap[$classId])) {
                $skipped[] = ['row' => $rowNum, 'data' => $data['student_code'], 'errors' => ["class_id {$classId} tidak ditemukan."]];
                continue;
            }
            if (!isset($academicYearMap[$yearId])) {
                $skipped[] = ['row' => $rowNum, 'data' => $data['student_code'], 'errors' => ["academic_year_id {$yearId} tidak ditemukan."]];
                continue;
            }

            $existing = Student::where('student_code', $data['student_code'])->first();

            if ($existing && $mode === 'insert_only') {
                $skipped[] = ['row' => $rowNum, 'data' => $data['student_code'], 'errors' => ['student_code sudah ada (mode insert only).']];
                continue;
            }

            // Hanya kolom yang terisi (non-null) yang ikut disimpan, agar
            // import parsial tidak menimpa data lama dengan NULL.
            // Kolom opsional yang tidak ada di file dianggap null (tidak
            // ikut disimpan saat update). Gunakan ?? null agar CSV parsial
            // tidak memicu error "undefined array key".
            $values = array_filter([
                'student_code'        => $data['student_code'] ?? null,
                'name'                => $data['name'] ?? null,
                'gender'              => $data['gender'] ?? null,
                'nis'                 => $data['nis'] ?? null,
                'nisn'                => $data['nisn'] ?? null,
                'nik'                 => $data['nik'] ?? null,
                'birth_place'         => $data['birth_place'] ?? null,
                'birth_date'          => $data['birth_date'] ?? null,
                'address'             => $data['address'] ?? null,
                'phone'               => $data['phone'] ?? null,
                'class_id'            => $classId,
                'academic_year_id'    => $yearId,
                'entry_year'          => $data['entry_year'] ?? null,
                'father_name'         => $data['father_name'] ?? null,
                'mother_name'         => $data['mother_name'] ?? null,
                'guardian_name'       => $data['guardian_name'] ?? null,
                'guardian_phone'      => $data['guardian_phone'] ?? null,
                'guardian_address'    => $data['guardian_address'] ?? null,
                'memorization_target' => ($data['memorization_target'] ?? null) !== null ? (int) $data['memorization_target'] : null,
                'starting_juz'        => ($data['starting_juz'] ?? null) !== null ? (int) $data['starting_juz'] : null,
                'notes'               => $data['notes'] ?? null,
            ], fn ($v) => $v !== null);

            if ($existing) {
                // Status hanya diubah bila kolomnya terisi di file — jangan
                // me-reset siswa nonaktif/lulus menjadi aktif saat import parsial.
                if (($data['status'] ?? null) !== null) {
                    $values['status'] = $data['status'];
                }

                $existing->update($values);
            } else {
                $values['status'] = $data['status'] ?? 'active';

                Student::create($values);
            }

            $imported++;
        }
    }

    private function tahfidzProfile(Student $student): array
    {
        $lastSubmission = $student->submissions()->with('surah')->latest('submission_date')->first();
        $lastMurajaah = $student->murajaahs()->with('surah')->latest('date')->first();

        return [
            'total_juz' => (int) ($student->progressSummary?->total_juz_completed ?? 0),
            'progress_target' => $student->memorization_target
                ? round(((int) ($student->progressSummary?->total_juz_completed ?? 0) / max($student->memorization_target, 1)) * 100, 2)
                : (float) ($student->progressSummary?->progress_percentage ?? 0),
            'hafalan_terakhir' => $lastSubmission?->surah?->name_latin,
            'setoran_terakhir' => $lastSubmission?->submission_date,
            'murajaah_terakhir' => $lastMurajaah?->date,
            'total_setoran' => $student->submissions_count ?? $student->submissions()->count(),
            'total_murajaah' => $student->murajaahs_count ?? $student->murajaahs()->count(),
        ];
    }

    /**
     * Kolom spreadsheet untuk template import / export.
     * Export menyertakan kolom label tambahan (class_name, academic_year_name).
     */
    private function spreadsheetColumns(bool $includeLabels = false): array
    {
        if ($includeLabels) {
            return [
                'student_code', 'name', 'nis', 'nisn', 'nik', 'gender',
                'birth_place', 'birth_date', 'address', 'phone',
                'class_id', 'class_name', 'academic_year_id', 'academic_year_name',
                'entry_year', 'status',
                'father_name', 'mother_name',
                'guardian_name', 'guardian_phone', 'guardian_address',
                'memorization_target', 'starting_juz', 'notes',
            ];
        }

        return [
            'student_code', 'name', 'nis', 'nisn', 'nik', 'gender',
            'birth_place', 'birth_date', 'address', 'phone',
            'class_id', 'academic_year_id', 'entry_year', 'status',
            'father_name', 'mother_name',
            'guardian_name', 'guardian_phone', 'guardian_address',
            'memorization_target', 'starting_juz', 'notes',
        ];
    }

    private function resolveExportFormat(mixed $format): string
    {
        $format = strtolower(trim((string) $format));

        return in_array($format, ['csv', 'xlsx'], true) ? $format : 'csv';
    }

    /**
     * Baca file upload (CSV/TXT/XLSX) menjadi [headerRow[], dataRows[][]]
     * dengan baris kosong dihilangkan.
     *
     * @return array{0: array, 1: array}
     */
    private function readRowsFromFile($file): array
    {
        if (strtolower((string) $file->getClientOriginalExtension()) === 'xlsx') {
            $spreadsheet = IOFactory::load($file->getRealPath());
            $rows = $spreadsheet->getActiveSheet()->toArray(null, false, true, false);
            $rows = array_values(array_filter($rows, fn ($row) => $this->rowIsNotEmpty($row)));

            return $this->splitHeaderRows($rows);
        }

        // CSV / TXT — tangani BOM UTF-8 bila ada.
        $handle = fopen($file->getRealPath(), 'r');
        $bom    = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($handle);
        }

        $rows = [];
        while (($row = fgetcsv($handle)) !== false) {
            if (! $this->rowIsNotEmpty($row)) {
                continue;
            }
            $rows[] = $row;
        }
        fclose($handle);

        return $this->splitHeaderRows($rows);
    }

    private function rowIsNotEmpty(array $row): bool
    {
        return count(array_filter($row, fn ($v) => trim((string) $v) !== '')) > 0;
    }

    private function splitHeaderRows(array $rows): array
    {
        return [$rows[0] ?? [], array_slice($rows, 1)];
    }

    /**
     * Guard CSV injection: sel yang diawali =, +, -, @ (atau tab/CR) diberi
     * prefiks apostrof agar tidak dieksekusi sebagai formula oleh Excel/Sheets.
     */
    private function sanitizeCsvCell(mixed $value): string
    {
        $value = (string) ($value ?? '');

        if ($value !== '' && in_array($value[0], ['=', '+', '-', '@', "\t", "\r"], true)) {
            return "'" . $value;
        }

        return $value;
    }

    private function csvDownload(string $filename, array $headers, array $rows): StreamedResponse
    {
        $stream = fopen('php://temp', 'r+');

        fputcsv($stream, $headers);

        foreach ($rows as $row) {
            fputcsv($stream, array_map(fn ($value) => $this->sanitizeCsvCell($value), $row));
        }

        rewind($stream);

        return response()->streamDownload(function () use ($stream) {
            fpassthru($stream);
            fclose($stream);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function xlsxDownload(string $filename, array $headers, array $rows): BinaryFileResponse
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        $sheet->fromArray($headers, null, 'A1');
        $sheet->getStyle('A1:' . $sheet->getHighestDataColumn() . '1')->getFont()->setBold(true);

        if ($rows !== []) {
            $sheet->fromArray($rows, null, 'A2');
        }

        // Tulis semua sel sebagai teks eksplisit agar nilai yang diawali "="
        // tidak dieksekusi sebagai formula saat file dibuka (XLSX injection).
        foreach ($sheet->getRowIterator() as $row) {
            $cellIterator = $row->getCellIterator();
            $cellIterator->setIterateOnlyExistingCells(true);
            foreach ($cellIterator as $cell) {
                $value = $cell->getValue();
                $cell->setValueExplicit(is_scalar($value) ? (string) $value : '', DataType::TYPE_STRING);
            }
        }

        $writer = new Xlsx($spreadsheet);
        $path = tempnam(sys_get_temp_dir(), 'tahfidz_export_');
        $writer->save($path);

        return response()->download($path, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }
}
