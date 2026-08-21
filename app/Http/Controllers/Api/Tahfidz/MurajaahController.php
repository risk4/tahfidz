<?php

namespace App\Http\Controllers\Api\Tahfidz;

use App\Domain\Academic\Models\AcademicYear;
use App\Domain\People\Models\Teacher;
use App\Domain\People\Support\SupervisedStudentScope;
use App\Domain\Quran\Models\QuranSurah;
use App\Domain\Tahfidz\Models\Murajaah;
use App\Domain\Tahfidz\Models\StudentAyahCoverage;
use App\Domain\Tahfidz\Services\MurajaahService;
use App\Domain\Tahfidz\Services\ProgressService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Tahfidz\StoreMurajaahRequest;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MurajaahController extends Controller
{
    public function __construct(
        private readonly MurajaahService $murajaahService,
        private readonly ProgressService $progressService,
    ) {}

    public function index(Request $request)
    {
        $this->authorize('viewAny', Murajaah::class);

        $query = Murajaah::query()
            ->with(['student.classRoom', 'teacher', 'academicYear', 'surah']);

        // Guru hanya melihat murajaah siswa binaannya: murid kelas yang ia wali
        // (homeroom) ATAU murid dalam kelompok tahfidz binaannya.
        SupervisedStudentScope::apply($query, $request->user(), viaRelation: true);

        if ($studentId = $request->integer('student_id')) {
            $query->where('student_id', $studentId);
        }

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('notes', 'like', "%{$search}%")
                    ->orWhere('juz', $search)
                    ->orWhereHas('student', fn ($sq) => $sq
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('student_code', 'like', "%{$search}%")
                        ->orWhere('nis', 'like', "%{$search}%"))
                    ->orWhereHas('surah', fn ($sq) => $sq
                        ->where('name_latin', 'like', "%{$search}%")
                        ->orWhere('translation', 'like', "%{$search}%"));
            });
        }

        if ($surahId = $request->integer('surah_id')) {
            $query->where('surah_id', $surahId);
        }

        if ($juz = $request->integer('juz')) {
            $query->where('juz', $juz);
        }

        if ($method = $request->query('method', $request->query('metode'))) {
            $query->where('method', $method);
        }

        if ($status = $request->query('status')) {
            $query->where('status', match ($status) {
                'LANCAR' => 'approved',
                'PERLU_MUROJAAH' => 'revision',
                default => $status,
            });
        }

        $dateFrom = $request->query('date_from', $request->query('from'));
        $dateTo = $request->query('date_to', $request->query('to'));

        if ($dateFrom) {
            $query->whereDate('date', '>=', $dateFrom);
        }

        if ($dateTo) {
            $query->whereDate('date', '<=', $dateTo);
        }

        if ($academicYearId = $request->integer('academic_year_id')) {
            $query->where('academic_year_id', $academicYearId);
        }

        $perPage = min(max((int) $request->query('per_page', 10), 1), 100);

        $murajaahs = $query
            ->orderByDesc('date')
            ->orderByDesc('time')
            ->paginate($perPage);

        QuranSurah::attachJuzRanges($murajaahs->getCollection()->pluck('surah'));

        return $murajaahs;
    }

    public function store(StoreMurajaahRequest $request)
    {
        $data = $request->validated();

        // Guru hanya boleh menginputkan untuk siswa yang ia bina.
        if ($request->user()->isTeacher() && ! ($request->user()->teacher?->supervises((int) $data['student_id']) ?? false)) {
            throw ValidationException::withMessages([
                'student_id' => ['Anda hanya dapat membuat murajaah untuk siswa yang Anda bina.'],
            ]);
        }

        $data['teacher_id'] = $this->resolveTeacherId($request);
        $data['academic_year_id'] = $this->resolveAcademicYearId();

        $murajaah = $this->murajaahService->create($data);

        return response()->json($murajaah, 201);
    }

    public function show(Request $request, Murajaah $murajaah)
    {
        $this->authorize('view', $murajaah);

        $murajaah->load(['student.classRoom', 'teacher', 'academicYear', 'surah']);

        QuranSurah::attachJuzRanges([$murajaah->surah]);

        return $murajaah;
    }

    public function update(StoreMurajaahRequest $request, Murajaah $murajaah)
    {
        $this->authorize('update', $murajaah);

        return response()->json($this->murajaahService->update($murajaah, $request->validated()));
    }

    public function destroy(Request $request, Murajaah $murajaah)
    {
        $this->authorize('delete', $murajaah);

        $this->murajaahService->delete($murajaah);

        return response()->json(['message' => 'Murajaah berhasil dihapus.']);
    }

    public function ayahStatuses(Request $request, Murajaah $murajaah)
    {
        $this->authorize('view', $murajaah);

        $statuses = StudentAyahCoverage::where('student_id', $murajaah->student_id)
            ->where('surah_id', $murajaah->surah_id)
            ->whereBetween('ayah_number', [$murajaah->start_ayah, $murajaah->end_ayah])
            ->pluck('memorization_status', 'ayah_number');

        return collect(range($murajaah->start_ayah, $murajaah->end_ayah))
            ->map(fn ($ayahNumber) => [
                'ayah_number' => $ayahNumber,
                'memorization_status' => $statuses->get($ayahNumber, 'not_memorized'),
            ])
            ->values();
    }

    public function updateAyahStatus(Request $request, Murajaah $murajaah)
    {
        $this->authorize('update', $murajaah);

        $data = $request->validate([
            'ayah_number' => ['required', 'integer', 'min:'.$murajaah->start_ayah, 'max:'.$murajaah->end_ayah],
            'memorization_status' => ['required', 'in:not_memorized,in_progress,memorized'],
        ]);

        // Ayat yang sudah tercakup submission (first_covered_submission_id
        // terisi) bersifat otoritatif: status dari murajaah tidak boleh
        // menimpa atau menghapus coverage tersebut.
        $submissionCovered = StudentAyahCoverage::where('student_id', $murajaah->student_id)
            ->where('surah_id', $murajaah->surah_id)
            ->where('ayah_number', $data['ayah_number'])
            ->whereNotNull('first_covered_submission_id')
            ->exists();

        if ($submissionCovered) {
            // Jangan ubah apa pun; kembalikan status yang benar-benar tersimpan.
            $stored = StudentAyahCoverage::where('student_id', $murajaah->student_id)
                ->where('surah_id', $murajaah->surah_id)
                ->where('ayah_number', $data['ayah_number'])
                ->value('memorization_status') ?? StudentAyahCoverage::STATUS_MEMORIZED;
        } elseif ($data['memorization_status'] === 'not_memorized') {
            // Hapus hanya catatan dari murajaah (bukan coverage submission).
            StudentAyahCoverage::where('student_id', $murajaah->student_id)
                ->where('surah_id', $murajaah->surah_id)
                ->where('ayah_number', $data['ayah_number'])
                ->whereNull('first_covered_submission_id')
                ->delete();
            $stored = 'not_memorized';
        } else {
            StudentAyahCoverage::updateOrCreate(
                [
                    'student_id' => $murajaah->student_id,
                    'surah_id' => $murajaah->surah_id,
                    'ayah_number' => $data['ayah_number'],
                ],
                [
                    'memorization_status' => $data['memorization_status'],
                    'first_covered_submission_id' => null,
                ]
            );
            $stored = $data['memorization_status'];
        }

        $this->progressService->recompute($murajaah->student);

        return response()->json([
            'ayah_number' => $data['ayah_number'],
            'memorization_status' => $stored,
        ]);
    }

    /**
     * Export data muraja'ah (CSV/XLSX) — menerapkan filter yang sama dengan index().
     */
    public function export(Request $request)
    {
        $this->authorize('viewAny', Murajaah::class);

        $query = Murajaah::query()
            ->with(['student.classRoom', 'teacher', 'academicYear', 'surah']);

        SupervisedStudentScope::apply($query, $request->user(), viaRelation: true);

        if ($studentId = $request->integer('student_id')) {
            $query->where('student_id', $studentId);
        }

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('notes', 'like', "%{$search}%")
                    ->orWhere('juz', $search)
                    ->orWhereHas('student', fn ($sq) => $sq
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('student_code', 'like', "%{$search}%")
                        ->orWhere('nis', 'like', "%{$search}%"))
                    ->orWhereHas('surah', fn ($sq) => $sq
                        ->where('name_latin', 'like', "%{$search}%")
                        ->orWhere('translation', 'like', "%{$search}%"));
            });
        }

        if ($surahId = $request->integer('surah_id')) {
            $query->where('surah_id', $surahId);
        }

        if ($juz = $request->integer('juz')) {
            $query->where('juz', $juz);
        }

        if ($method = $request->query('method', $request->query('metode'))) {
            $query->where('method', $method);
        }

        if ($status = $request->query('status')) {
            $query->where('status', match ($status) {
                'LANCAR' => 'approved',
                'PERLU_MUROJAAH' => 'revision',
                default => $status,
            });
        }

        $dateFrom = $request->query('date_from', $request->query('from'));
        $dateTo = $request->query('date_to', $request->query('to'));

        if ($dateFrom) {
            $query->whereDate('date', '>=', $dateFrom);
        }

        if ($dateTo) {
            $query->whereDate('date', '<=', $dateTo);
        }

        if ($academicYearId = $request->integer('academic_year_id')) {
            $query->where('academic_year_id', $academicYearId);
        }

        $murajaahs = $query
            ->orderByDesc('date')
            ->orderByDesc('time')
            ->get();

        QuranSurah::attachJuzRanges($murajaahs->pluck('surah'));

        $methodLabel = [
            'independent' => "Muraja'ah Mandiri",
            'repeated' => "Muraja'ah Berulang",
            'group' => "Muraja'ah Kelompok",
            'guided' => "Muraja'ah Terbimbing",
        ];

        $headers = [
            'Tanggal', 'Waktu', 'Nama Santri', 'NIS', 'Kelas', 'Surah', 'Juz', 'Ayat Mulai', 'Ayat Akhir',
            'Jumlah Halaman', 'Metode', 'Pembimbing', 'Durasi (menit)', 'Nilai Fasih', 'Nilai Tajwid',
            'Nilai Makhraj', 'Nilai Fashahah', 'Status', 'Catatan', 'Tahun Ajaran',
        ];

        $rows = $murajaahs->map(fn (Murajaah $m) => [
            $m->date?->format('Y-m-d') ?? '',
            $m->time ?? '',
            $m->student?->name ?? '',
            $m->student?->nis ?? $m->student?->student_code ?? '',
            $m->student?->classRoom?->name ?? '',
            $m->surah?->name_latin ?? '',
            $this->juzRangeLabel($m->surah),
            $m->start_ayah,
            $m->end_ayah,
            $m->page_count,
            $methodLabel[$m->method] ?? $m->method ?? '',
            $m->teacher?->name ?? '',
            $m->duration_minutes ?? '',
            $m->fluency_score ?? '',
            $m->tajwid_score ?? '',
            $m->makhraj_score ?? '',
            $m->fashahah_score ?? '',
            $this->statusLabel($m->status),
            $m->notes ?? '',
            $m->academicYear?->name ?? '',
        ])->all();

        $format = $this->resolveExportFormat($request->query('format'));
        $filename = 'export_murajaah_'.now()->format('Ymd_His').($format === 'xlsx' ? '.xlsx' : '.csv');

        return $format === 'xlsx'
            ? $this->xlsxDownload($filename, $headers, $rows)
            : $this->csvDownload($filename, $headers, $rows);
    }

    private function juzRangeLabel(mixed $surah): string
    {
        if (! $surah || empty($surah->juz_range)) {
            return '';
        }

        $min = $surah->juz_range['min'];
        $max = $surah->juz_range['max'];

        return $min === $max ? "Juz {$min}" : "Juz {$min}-{$max}";
    }

    private function statusLabel(?string $status): string
    {
        return match ($status) {
            'approved', 'LANCAR' => 'Disetujui',
            'pending' => 'Menunggu',
            'revision', 'PERLU_MUROJAAH' => 'Direvisi',
            'rejected' => 'Ditolak',
            default => $status ?? '',
        };
    }

    private function resolveExportFormat(mixed $format): string
    {
        $format = strtolower(trim((string) $format));

        return in_array($format, ['csv', 'xlsx'], true) ? $format : 'csv';
    }

    /**
     * Guard CSV injection: sel berawalan =, +, -, @ (atau tab/CR) diberi prefiks
     * apostrof agar tidak dieksekusi sebagai formula oleh Excel/Sheets.
     */
    private function sanitizeCsvCell(mixed $value): string
    {
        $value = (string) ($value ?? '');

        if ($value !== '' && in_array($value[0], ['=', '+', '-', '@', "\t", "\r"], true)) {
            return "'".$value;
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
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();

        $sheet->fromArray($headers, null, 'A1');
        $sheet->getStyle('A1:'.$sheet->getHighestDataColumn().'1')->getFont()->setBold(true);

        if ($rows !== []) {
            $sheet->fromArray($rows, null, 'A2');
        }

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

    private function resolveTeacherId(Request $request): int
    {
        $user = $request->user();

        if ($user->isTeacher()) {
            return $user->teacher->id;
        }

        $teacherId = $request->integer('teacher_id');

        if (! $teacherId || ! Teacher::where('id', $teacherId)->exists()) {
            throw ValidationException::withMessages([
                'teacher_id' => ['Field teacher_id wajib diisi untuk super_admin.'],
            ]);
        }

        return $teacherId;
    }

    private function resolveAcademicYearId(): int
    {
        $active = AcademicYear::where('is_active', true)->first();

        if (! $active) {
            throw ValidationException::withMessages([
                'academic_year_id' => ['Tidak ada tahun ajaran yang sedang aktif. Aktifkan tahun ajaran terlebih dahulu.'],
            ]);
        }

        return $active->id;
    }
}
