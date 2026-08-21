<?php

namespace App\Http\Controllers\Api\Master;

use App\Domain\People\Models\Student;
use App\Domain\People\Models\Teacher;
use App\Domain\People\Models\User;
use App\Domain\Tahfidz\Models\Murajaah;
use App\Domain\Tahfidz\Models\Submission;
use App\Http\Controllers\Controller;
use App\Http\Requests\Master\StoreTeacherRequest;
use App\Http\Requests\Master\UploadTeacherPhotoRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TeacherController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Teacher::class);

        $query = Teacher::query()
            ->with(['homeroomClasses:id,name', 'tahfidzGroups:id,name,status'])
            ->withCount(['submissions', 'murajaahs', 'tahfidzGroups']);

        // Guru hanya boleh melihat data dirinya sendiri di listing.
        // Tanpa profil Teacher → hasil kosong (whereKey(0) tidak pernah match,
        // bukan whereNull yang berbahaya pada kolom lain).
        if ($request->user()->isTeacher()) {
            $query->whereKey($request->user()->teacher?->id ?? 0);
        }

        if ($search = $request->string('search')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('nip', 'like', "%{$search}%")
                    ->orWhere('nuptk', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('subject', 'like', "%{$search}%");
            });
        }

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        if ($subject = $request->string('subject')->toString()) {
            $query->where('subject', $subject);
        }

        $role = strtolower($request->string('role')->toString());
        if ($role === 'pembimbing') {
            $query->whereHas('tahfidzGroups');
        } elseif ($role === 'guru') {
            $query->whereDoesntHave('tahfidzGroups');
        }

        if ($classId = $request->integer('class_id') ?: $request->integer('kelas_id')) {
            $query->whereHas('homeroomClasses', fn ($q) => $q->where('classes.id', $classId));
        }

        if ($halaqahId = $request->integer('halaqah_id')) {
            $query->whereHas('tahfidzGroups', fn ($q) => $q->where('tahfidz_groups.id', $halaqahId));
        }

        $perPage = min(max($request->integer('per_page', 10), 5), 100);

        $paginator = $query->orderBy('name')->paginate($perPage)->withQueryString();

        // Jumlah santri bimbingan unik per guru (satu query untuk semua baris).
        $ids = collect($paginator->items())->pluck('id');
        if ($ids->isNotEmpty()) {
            $supervised = DB::table('tahfidz_groups as tg')
                ->join('tahfidz_group_members as tgm', 'tgm.tahfidz_group_id', '=', 'tg.id')
                ->whereIn('tg.teacher_id', $ids)
                ->selectRaw('tg.teacher_id, COUNT(DISTINCT tgm.student_id) as c')
                ->groupBy('tg.teacher_id')
                ->pluck('c', 'teacher_id');

            foreach ($paginator->items() as $teacher) {
                $teacher->setAttribute('supervised_students', (int) ($supervised[$teacher->id] ?? 0));
            }
        }

        return $paginator;
    }

    /** Statistik halaman Guru / Pembimbing. */
    public function stats(Request $request)
    {
        $this->authorize('viewAny', Teacher::class);

        $total = Teacher::count();
        $active = Teacher::where('status', 'active')->count();
        $pembimbingActive = Teacher::where('status', 'active')
            ->whereHas('tahfidzGroups', fn ($q) => $q->where('status', 'active'))
            ->count();

        $supervised = DB::table('tahfidz_groups as tg')
            ->join('tahfidz_group_members as tgm', 'tgm.tahfidz_group_id', '=', 'tg.id')
            ->where('tg.status', 'active')
            ->distinct()
            ->count('tgm.student_id');

        return response()->json([
            'total' => $total,
            'active' => $active,
            'pembimbing_active' => $pembimbingActive,
            'supervised_students' => $supervised,
            'avg_per_teacher' => $pembimbingActive > 0 ? round($supervised / $pembimbingActive, 1) : 0,
        ]);
    }

    public function store(StoreTeacherRequest $request)
    {
        $data = $request->validated();
        $password = $data['password'] ?? null;
        unset($data['password']);

        $teacher = DB::transaction(function () use ($data, $password) {
            $teacher = Teacher::create($data);

            if ($password) {
                $email = $data['email'] ?? null;
                abort_if(! $email, 422, 'Email wajib diisi untuk membuat akun login.');

                $this->ensureEmailAvailable($email);

                $user = User::create([
                    'name' => $data['name'],
                    'email' => $email,
                    'role' => 'teacher',
                    'password' => Hash::make($password),
                ]);
                $teacher->update(['user_id' => $user->id]);
            }

            return $teacher;
        });

        return response()->json($teacher->load('user'), 201);
    }

    public function show(Teacher $teacher)
    {
        $this->authorize('view', $teacher);

        $teacher->load(['homeroomClasses:id,name', 'tahfidzGroups:id,name,status', 'user']);
        $teacher->loadCount(['submissions', 'murajaahs', 'tahfidzGroups']);

        $studentIds = $this->supervisedStudentIds($teacher->id);

        $students = collect();
        if ($studentIds->isNotEmpty()) {
            $lastSub = Submission::query()
                ->whereIn('student_id', $studentIds)
                ->selectRaw('student_id, MAX(submission_date) as last_date')
                ->groupBy('student_id')
                ->pluck('last_date', 'student_id');

            $lastMur = Murajaah::query()
                ->whereIn('student_id', $studentIds)
                ->selectRaw('student_id, MAX(date) as last_date')
                ->groupBy('student_id')
                ->pluck('last_date', 'student_id');

            $students = Student::query()
                ->whereIn('id', $studentIds)
                ->with(['classRoom:id,name', 'progressSummary'])
                ->withCount(['submissions', 'murajaahs'])
                ->get(['id', 'name', 'class_id', 'status'])
                ->map(function (Student $s) use ($lastSub, $lastMur) {
                    return [
                        'id' => $s->id,
                        'name' => $s->name,
                        'class_name' => $s->classRoom?->name ?? null,
                        'status' => $s->status,
                        'total_juz' => (int) ($s->progressSummary?->total_juz_completed ?? 0),
                        'progress_percentage' => (float) ($s->progressSummary?->progress_percentage ?? 0),
                        'total_setoran' => $s->submissions_count,
                        'total_murajaah' => $s->murajaahs_count,
                        'last_submission_at' => $lastSub[$s->id] ?? null,
                        'last_murajaah_at' => $lastMur[$s->id] ?? null,
                    ];
                });
        }

        $statistics = [
            'total_santri' => $studentIds->count(),
            'total_setoran' => $teacher->submissions_count,
            'total_murajaah' => $teacher->murajaahs_count,
            'avg_progress' => $students->isNotEmpty()
                ? round($students->avg(fn ($s) => $s['progress_percentage']), 1)
                : 0,
        ];

        return response()->json([
            'teacher' => $teacher,
            'students' => $students->values(),
            'statistics' => $statistics,
            'activities' => $this->activities($teacher->id),
        ]);
    }

    public function update(StoreTeacherRequest $request, Teacher $teacher)
    {
        $this->authorize('update', $teacher);

        $data = $request->validated();
        $password = $data['password'] ?? null;
        unset($data['password']);

        DB::transaction(function () use ($teacher, $data, $password) {
            $teacher->update($data);

            if ($password) {
                if ($teacher->user) {
                    // Password di-reset oleh admin: wajibkan ganti password saat
                    // login berikutnya dan matikan sesi lama guru tersebut.
                    $teacher->user->forceFill([
                        'password' => Hash::make($password),
                        'must_change_password' => true,
                    ])->save();
                    $teacher->user->tokens()->delete();
                } else {
                    $email = $data['email'] ?? $teacher->email;
                    abort_if(! $email, 422, 'Email wajib diisi untuk membuat akun login.');

                    $this->ensureEmailAvailable($email);

                    $user = User::create([
                        'name' => $teacher->name,
                        'email' => $email,
                        'role' => 'teacher',
                        'password' => Hash::make($password),
                    ]);
                    $teacher->update(['user_id' => $user->id]);
                }
            }
        });

        return response()->json($teacher->fresh()->load('user'));
    }

    public function destroy(Teacher $teacher)
    {
        $this->authorize('delete', $teacher);

        DB::transaction(function () use ($teacher) {
            // Ambil akun login sebelum record dihapus agar relasinya tetap bisa dibaca.
            $user = $teacher->user;

            $teacher->delete();

            // Akun tanpa data guru tidak boleh tetap bisa login:
            // nonaktifkan akun dan cabut seluruh token Sanctum miliknya.
            if ($user) {
                $user->forceFill(['is_active' => false])->save();
                $user->tokens()->delete();
            }
        });

        return response()->json(['message' => 'Guru berhasil dihapus.']);
    }

    /**
     * Upload foto guru ke disk public (storage/app/public/teachers).
     * File lama dihapus bila ada.
     */
    public function uploadPhoto(UploadTeacherPhotoRequest $request, Teacher $teacher)
    {
        $this->authorize('update', $teacher);

        $old = $teacher->photo_path;
        if ($old && Storage::disk('public')->exists($old)) {
            Storage::disk('public')->delete($old);
        }

        $path = $request->file('file')->store('teachers', 'public');

        $teacher->update(['photo_path' => $path]);

        return response()->json([
            'message' => 'Foto guru berhasil diunggah.',
            'photo_path' => $path,
        ]);
    }

    /**
     * Hapus foto guru (file + referensi di database).
     */
    public function deletePhoto(Request $request, Teacher $teacher)
    {
        $this->authorize('update', $teacher);

        $old = $teacher->photo_path;
        if ($old && Storage::disk('public')->exists($old)) {
            Storage::disk('public')->delete($old);
        }

        $teacher->update(['photo_path' => null]);

        return response()->json(['message' => 'Foto guru berhasil dihapus.']);
    }

    /** Data chart harian untuk santri bimbingan guru (setoran/murajaah/target). */
    public function performance(Request $request, Teacher $teacher)
    {
        $this->authorize('view', $teacher);

        $range = (string) $request->query('range', '30d');
        $days = match ($range) {
            '7d' => 7,
            '3m' => 90,
            default => 30,
        };

        $studentIds = $this->supervisedStudentIds($teacher->id);
        $start = Carbon::today()->subDays($days - 1)->startOfDay();

        $subRows = Submission::query()
            ->when($studentIds->isNotEmpty(), fn ($q) => $q->whereIn('student_id', $studentIds))
            ->selectRaw('DATE(submission_date) as d, COUNT(*) as c')
            ->where('submission_date', '>=', $start)
            ->groupBy('d')
            ->get();
        $subCount = $subRows->pluck('c', 'd');

        $murRows = Murajaah::query()
            ->when($studentIds->isNotEmpty(), fn ($q) => $q->whereIn('student_id', $studentIds))
            ->selectRaw('DATE(date) as d, COUNT(*) as c')
            ->where('date', '>=', $start)
            ->groupBy('d')
            ->get();
        $murCount = $murRows->pluck('c', 'd');

        $targetRows = DB::table('submissions as s')
            ->join('students as st', 'st.id', '=', 's.student_id')
            ->join('student_progress_summary as ps', 'ps.student_id', '=', 'st.id')
            ->whereNotNull('st.memorization_target')
            ->where('st.memorization_target', '>', 0)
            ->whereColumn('ps.total_juz_completed', '>=', 'st.memorization_target')
            ->where('s.submission_date', '>=', $start)
            ->whereNull('s.deleted_at')
            ->whereNull('st.deleted_at')
            ->when($studentIds->isNotEmpty(), fn ($q) => $q->whereIn('s.student_id', $studentIds))
            ->selectRaw('DATE(s.submission_date) as d, COUNT(*) as c')
            ->groupBy('d')
            ->get();
        $targetCount = $targetRows->pluck('c', 'd');

        $series = [];
        for ($i = 0; $i < $days; $i++) {
            $date = $start->copy()->addDays($i);
            $key = $date->format('Y-m-d');
            $series[] = [
                'date' => $key,
                'label' => $date->format('d M'),
                'setoran' => (int) ($subCount[$key] ?? 0),
                'murajaah' => (int) ($murCount[$key] ?? 0),
                'target' => (int) ($targetCount[$key] ?? 0),
            ];
        }

        return response()->json($series);
    }

    /* ================================================================
     * Export / Import
     * ================================================================ */

    public function importTemplate(Request $request)
    {
        $this->authorize('create', Teacher::class);

        $headers = $this->spreadsheetColumns();
        $example = [
            'GR-001', 'Ust. Muhammad Iqbal', 'L', '198501012000031001', '1212121212',
            'Medan', '1985-01-01', '081234567890', 'iqbal@example.sch.id',
            'Jl. Contoh No. 1', 'Tahfidz Qur\'an', 'active',
        ];

        $format = $this->resolveExportFormat($request->query('format'));
        $filename = 'template_import_guru.'.($format === 'xlsx' ? 'xlsx' : 'csv');

        return $format === 'xlsx'
            ? $this->xlsxDownload($filename, $headers, [$example])
            : $this->csvDownload($filename, $headers, [$example]);
    }

    public function export(Request $request)
    {
        $this->authorize('viewAny', Teacher::class);

        $query = Teacher::query()
            ->with(['homeroomClasses:id,name', 'tahfidzGroups:id,name,status'])
            ->withCount(['tahfidzGroups']);

        if ($request->user()->isTeacher()) {
            $query->whereKey($request->user()->teacher?->id ?? 0);
        }
        if ($search = $request->string('search')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('nip', 'like', "%{$search}%")
                    ->orWhere('nuptk', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('subject', 'like', "%{$search}%");
            });
        }
        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }
        if ($subject = $request->string('subject')->toString()) {
            $query->where('subject', $subject);
        }
        $role = strtolower($request->string('role')->toString());
        if ($role === 'pembimbing') {
            $query->whereHas('tahfidzGroups');
        } elseif ($role === 'guru') {
            $query->whereDoesntHave('tahfidzGroups');
        }
        if ($classId = $request->integer('class_id') ?: $request->integer('kelas_id')) {
            $query->whereHas('homeroomClasses', fn ($q) => $q->where('classes.id', $classId));
        }
        if ($halaqahId = $request->integer('halaqah_id')) {
            $query->whereHas('tahfidzGroups', fn ($q) => $q->where('tahfidz_groups.id', $halaqahId));
        }

        $teachers = $query->orderBy('name')->get();

        $headers = [
            'teacher_code', 'name', 'gender', 'nip', 'nuptk', 'birth_place',
            'birth_date', 'phone', 'email', 'address', 'subject', 'status',
            'role', 'halaqah', 'kelas_wali', 'jumlah_santri_bimbingan',
        ];

        $supervisedCounts = DB::table('tahfidz_groups as tg')
            ->join('tahfidz_group_members as tgm', 'tgm.tahfidz_group_id', '=', 'tg.id')
            ->selectRaw('tg.teacher_id, COUNT(DISTINCT tgm.student_id) as c')
            ->groupBy('tg.teacher_id')
            ->pluck('c', 'teacher_id');

        $rows = $teachers->map(function (Teacher $t) use ($supervisedCounts) {
            $halaqahs = $t->tahfidzGroups->pluck('name')->implode(', ');
            $classes = $t->homeroomClasses->pluck('name')->implode(', ');

            return [
                $t->teacher_code,
                $t->name,
                $t->gender ?? '',
                $t->nip ?? '',
                $t->nuptk ?? '',
                $t->birth_place ?? '',
                $t->birth_date?->format('Y-m-d') ?? '',
                $t->phone ?? '',
                $t->email ?? '',
                $t->address ?? '',
                $t->subject ?? '',
                $t->status,
                $t->tahfidz_groups_count > 0 ? 'Pembimbing' : 'Guru Tahfidz',
                $halaqahs,
                $classes,
                (int) ($supervisedCounts[$t->id] ?? 0),
            ];
        })->all();

        $format = $this->resolveExportFormat($request->query('format'));
        $filename = 'export_guru_'.now()->format('Ymd_His').($format === 'xlsx' ? '.xlsx' : '.csv');

        return $format === 'xlsx'
            ? $this->xlsxDownload($filename, $headers, $rows)
            : $this->csvDownload($filename, $headers, $rows);
    }

    public function import(Request $request)
    {
        $this->authorize('create', Teacher::class);
        $request->validate(['file' => ['required', 'file', 'mimes:csv,txt,xlsx,zip', 'max:5120']]);

        $file = $request->file('file');

        try {
            [$headerRow, $dataRows] = $this->readRowsFromFile($file);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Gagal membaca file: '.$e->getMessage()], 422);
        }

        if (empty($headerRow)) {
            return response()->json(['message' => 'File kosong.'], 422);
        }

        $headerRow = array_map(fn ($h) => strtolower(trim((string) $h)), $headerRow);
        $missing = array_diff(['teacher_code', 'name'], $headerRow);
        if ($missing) {
            return response()->json(['message' => 'Kolom wajib tidak ditemukan: '.implode(', ', $missing)], 422);
        }

        $mode = strtolower((string) $request->input('mode', 'update'));
        $mode = in_array($mode, ['update', 'insert_only'], true) ? $mode : 'update';

        $imported = 0;
        $skipped = [];

        DB::beginTransaction();
        try {
            $this->processImportRows($headerRow, $dataRows, $mode, $imported, $skipped);
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json(['message' => 'Terjadi kesalahan: '.$e->getMessage()], 500);
        }

        return response()->json([
            'message' => 'Import selesai. '.$imported.' data berhasil diimpor.'.(count($skipped) ? ' '.count($skipped).' baris dilewati.' : ''),
            'imported' => $imported,
            'skipped' => $skipped,
        ]);
    }

    private function processImportRows(array $headerRow, array $dataRows, string $mode, int &$imported, array &$skipped): void
    {
        $rowNum = 1;

        foreach ($dataRows as $row) {
            $rowNum++;

            $data = [];
            foreach ($headerRow as $i => $col) {
                $data[$col] = isset($row[$i]) && trim((string) $row[$i]) !== '' ? trim((string) $row[$i]) : null;
            }

            if (isset($data['birth_date']) && is_numeric($data['birth_date'])) {
                try {
                    $data['birth_date'] = ExcelDate::excelToDateTimeObject((float) $data['birth_date'])->format('Y-m-d');
                } catch (\Throwable) {
                    // Biarkan validator yang menolak.
                }
            }

            $validator = Validator::make($data, [
                'teacher_code' => ['required', 'string', 'max:30'],
                'name' => ['required', 'string', 'max:150'],
                'gender' => ['nullable', Rule::in(['L', 'P'])],
                'nip' => ['nullable', 'string', 'max:30'],
                'nuptk' => ['nullable', 'string', 'max:30'],
                'birth_place' => ['nullable', 'string', 'max:100'],
                'birth_date' => ['nullable', 'date'],
                'phone' => ['nullable', 'string', 'max:20'],
                'email' => ['nullable', 'email', 'max:150'],
                'address' => ['nullable', 'string', 'max:500'],
                'subject' => ['nullable', 'string', 'max:100'],
                'status' => ['nullable', Rule::in(['active', 'inactive'])],
            ]);

            if ($validator->fails()) {
                $skipped[] = ['row' => $rowNum, 'data' => $data['teacher_code'] ?? "(baris {$rowNum})", 'errors' => $validator->errors()->all()];

                continue;
            }

            $existing = Teacher::where('teacher_code', $data['teacher_code'])->first();

            if ($existing && $mode === 'insert_only') {
                $skipped[] = ['row' => $rowNum, 'data' => $data['teacher_code'], 'errors' => ['teacher_code sudah ada (mode insert only).']];

                continue;
            }

            $values = array_filter([
                'teacher_code' => $data['teacher_code'] ?? null,
                'name' => $data['name'] ?? null,
                'gender' => $data['gender'] ?? null,
                'nip' => $data['nip'] ?? null,
                'nuptk' => $data['nuptk'] ?? null,
                'birth_place' => $data['birth_place'] ?? null,
                'birth_date' => $data['birth_date'] ?? null,
                'phone' => $data['phone'] ?? null,
                'email' => $data['email'] ?? null,
                'address' => $data['address'] ?? null,
                'subject' => $data['subject'] ?? null,
            ], fn ($v) => $v !== null);

            if ($existing) {
                if (($data['status'] ?? null) !== null) {
                    $values['status'] = $data['status'];
                }
                $existing->update($values);
            } else {
                $values['status'] = $data['status'] ?? 'active';
                Teacher::create($values);
            }

            $imported++;
        }
    }

    /* ================================================================
     * Helpers
     * ================================================================ */

    private function supervisedStudentIds(int $teacherId)
    {
        return DB::table('tahfidz_group_members as tgm')
            ->join('tahfidz_groups as tg', 'tg.id', '=', 'tgm.tahfidz_group_id')
            ->where('tg.teacher_id', $teacherId)
            ->distinct()
            ->pluck('tgm.student_id');
    }

    private function activities(int $teacherId): array
    {
        $subs = Submission::query()
            ->where('teacher_id', $teacherId)
            ->with(['student:id,name', 'surah:id,name_latin'])
            ->orderByDesc('submission_date')
            ->orderByDesc('submission_time')
            ->limit(8)
            ->get()
            ->map(fn (Submission $s) => [
                'type' => 'submission',
                'student_name' => $s->student?->name ?? 'Santri',
                'action' => 'Memeriksa setoran',
                'detail' => trim(($s->surah?->name_latin ?? '').' '.($s->start_ayah && $s->end_ayah ? "ayat {$s->start_ayah}-{$s->end_ayah}" : '')),
                'datetime' => $s->submission_time
                    ? $s->submission_date->format('Y-m-d').' '.$s->submission_time
                    : $s->submission_date?->format('Y-m-d'),
                'time' => $s->submission_time,
            ]);

        $murs = Murajaah::query()
            ->where('teacher_id', $teacherId)
            ->with(['student:id,name', 'surah:id,name_latin'])
            ->orderByDesc('date')
            ->orderByDesc('time')
            ->limit(8)
            ->get()
            ->map(fn (Murajaah $m) => [
                'type' => 'murajaah',
                'student_name' => $m->student?->name ?? 'Santri',
                'action' => 'Membimbing murajaah',
                'detail' => $m->juz ? "Juz {$m->juz}" : (string) ($m->surah?->name_latin ?? ''),
                'datetime' => $m->time
                    ? $m->date->format('Y-m-d').' '.$m->time
                    : $m->date?->format('Y-m-d'),
                'time' => $m->time,
            ]);

        return $subs->concat($murs)->sortByDesc('datetime')->values()->take(10)->all();
    }

    private function ensureEmailAvailable(string $email): void
    {
        abort_if(User::where('email', $email)->exists(), 422, 'Email sudah digunakan oleh akun lain.');
    }

    private function spreadsheetColumns(): array
    {
        return [
            'teacher_code', 'name', 'gender', 'nip', 'nuptk', 'birth_place',
            'birth_date', 'phone', 'email', 'address', 'subject', 'status',
        ];
    }

    private function resolveExportFormat(mixed $format): string
    {
        $format = strtolower(trim((string) $format));

        return in_array($format, ['csv', 'xlsx'], true) ? $format : 'csv';
    }

    private function readRowsFromFile($file): array
    {
        if (strtolower((string) $file->getClientOriginalExtension()) === 'xlsx') {
            $spreadsheet = IOFactory::load($file->getRealPath());
            $rows = $spreadsheet->getActiveSheet()->toArray(null, false, true, false);
            $rows = array_values(array_filter($rows, fn ($row) => $this->rowIsNotEmpty($row)));

            return $this->splitHeaderRows($rows);
        }

        $handle = fopen($file->getRealPath(), 'r');
        $bom = fread($handle, 3);
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
}
