<?php

namespace App\Http\Controllers\Api\Tahfidz;

use App\Domain\Academic\Models\AcademicYear;
use App\Domain\People\Models\Teacher;
use App\Domain\Quran\Models\QuranSurah;
use App\Domain\Tahfidz\Models\Submission;
use App\Domain\Tahfidz\Services\SubmissionService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Tahfidz\StoreSubmissionRequest;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class SubmissionController extends Controller
{
    public function __construct(
        private readonly SubmissionService $submissionService,
    ) {
    }

    public function index(Request $request)
    {
        $this->authorize('viewAny', Submission::class);

        $query = Submission::query()
            ->with(['student.classRoom', 'teacher', 'academicYear', 'surah']);

        // Guru hanya melihat submission siswa binaannya: murid kelas yang ia wali
        // (homeroom) ATAU murid dalam kelompok tahfidz binaannya.
        if ($request->user()->isTeacher()) {
            $teacherId = $request->user()->teacher?->id;
            $query->whereHas('student', function ($student) use ($teacherId) {
                $student->where(function ($q) use ($teacherId) {
                    $q->whereHas('classRoom', fn ($class) => $class->where('homeroom_teacher_id', $teacherId))
                        ->orWhereHas('tahfidzGroups', fn ($group) => $group->where('teacher_id', $teacherId));
                });
            });
        }

        if ($studentId = $request->integer('student_id')) {
            $query->where('student_id', $studentId);
        }

        if ($search = trim((string) $request->input('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('notes', 'like', "%{$search}%")
                    ->orWhereHas('student', fn ($student) => $student
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('student_code', 'like', "%{$search}%")
                        ->orWhere('nis', 'like', "%{$search}%"))
                    ->orWhereHas('surah', fn ($surah) => $surah
                        ->where('name_latin', 'like', "%{$search}%")
                        ->orWhere('translation', 'like', "%{$search}%")
                        ->orWhere('surah_number', $search));
            });
        }

        if ($surahId = $request->integer('surah_id')) {
            $query->where('surah_id', $surahId);
        }

        if ($juz = $request->integer('juz')) {
            $query->whereHas('surah.ayahs', function ($ayah) use ($juz) {
                $ayah->whereHas('juz', fn ($juzQuery) => $juzQuery->where('juz_number', $juz));
            });
        }

        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($academicYearId = $request->integer('academic_year_id')) {
            $query->where('academic_year_id', $academicYearId);
        }

        if ($from = $request->input('from', $request->input('date_from'))) {
            $query->whereDate('submission_date', '>=', $from);
        }

        if ($to = $request->input('to', $request->input('date_to'))) {
            $query->whereDate('submission_date', '<=', $to);
        }

        $perPage = min(max($request->integer('per_page', 10), 10), 100);

        $submissions = $query
            ->orderByDesc('submission_date')
            ->orderByDesc('submission_time')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        QuranSurah::attachJuzRanges($submissions->getCollection()->pluck('surah'));

        return $submissions;
    }

    public function store(StoreSubmissionRequest $request)
    {
        $data = $request->validated();

        // Guru hanya boleh menginputkan untuk siswa yang ia bina.
        if ($request->user()->isTeacher() && ! ($request->user()->teacher?->supervises((int) $data['student_id']) ?? false)) {
            throw ValidationException::withMessages([
                'student_id' => ['Anda hanya dapat membuat submission untuk siswa yang Anda bina.'],
            ]);
        }

        // teacher_id & academic_year_id diisi otomatis dari konteks.
        $data['teacher_id'] = $this->resolveTeacherId($request);
        $data['academic_year_id'] = $this->resolveAcademicYearId();

        // Mapping metode baru (setoran/murojaah/tasmi/sambung_ayat) ke kolom type legacy.
        $data = $this->applyMethodMapping($data);

        // Cegah duplikat: santri + tanggal + waktu yang sama.
        $duplicate = Submission::where('student_id', $data['student_id'])
            ->where('submission_date', $data['submission_date'])
            ->when(! empty($data['submission_time']), fn ($q) => $q->where('submission_time', $data['submission_time']));

        if ($duplicate->exists()) {
            throw ValidationException::withMessages([
                'submission_time' => ['Setoran untuk santri ini pada waktu tersebut sudah tersedia. Periksa kembali data setoran.'],
            ]);
        }

        $submission = $this->submissionService->create($data);

        return response()->json($submission, 201);
    }

    public function show(Request $request, Submission $submission)
    {
        $this->authorize('view', $submission);

        $submission->load(['student.classRoom', 'teacher', 'academicYear', 'surah']);

        QuranSurah::attachJuzRanges([$submission->surah]);

        return $submission;
    }

    public function update(StoreSubmissionRequest $request, Submission $submission)
    {
        $this->authorize('update', $submission);

        $updated = $this->submissionService->update($submission, $request->validated());

        return response()->json($updated);
    }

    public function destroy(Request $request, Submission $submission)
    {
        $this->authorize('delete', $submission);

        $this->submissionService->delete($submission);

        return response()->json(['message' => 'Submission berhasil dihapus.']);
    }

    /**
     * Kolom legacy `type` diisi mengikuti metode baru agar data lama tetap konsisten:
     * - setoran / tasmi / sambung_ayat  → new_memorization
     * - murojaah                        → repetition
     */
    private function applyMethodMapping(array $data): array
    {
        $method = $data['method'] ?? null;

        if ($method) {
            $data['type'] = $method === 'murojaah' ? 'repetition' : 'new_memorization';
        }

        return $data;
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
