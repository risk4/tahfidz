<?php

namespace App\Http\Controllers\Api\Tahfidz;

use App\Domain\Academic\Models\AcademicYear;
use App\Domain\People\Models\Teacher;
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

        // Guru hanya melihat submission siswa yang ia bina (lewat kelompok tahfidz).
        if ($request->user()->isTeacher()) {
            $teacherId = $request->user()->teacher?->id;
            $query->whereHas('student.tahfidzGroups', fn ($q) => $q->where('teacher_id', $teacherId));
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

        return $query
            ->orderByDesc('submission_date')
            ->orderByDesc('submission_time')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();
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

        $submission = $this->submissionService->create($data);

        return response()->json($submission, 201);
    }

    public function show(Request $request, Submission $submission)
    {
        $this->authorize('view', $submission);

        return $submission->load(['student.classRoom', 'teacher', 'academicYear', 'surah']);
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
