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
            ->with(['student', 'teacher', 'academicYear', 'surah']);

        // Guru hanya melihat submission siswa yang ia bina (lewat kelompok tahfidz).
        if ($request->user()->isTeacher()) {
            $teacherId = $request->user()->teacher?->id;
            $query->whereHas('student.tahfidzGroups', fn ($q) => $q->where('teacher_id', $teacherId));
        }

        if ($studentId = $request->integer('student_id')) {
            $query->where('student_id', $studentId);
        }

        if ($surahId = $request->integer('surah_id')) {
            $query->where('surah_id', $surahId);
        }

        if ($academicYearId = $request->integer('academic_year_id')) {
            $query->where('academic_year_id', $academicYearId);
        }

        if ($from = $request->input('from')) {
            $query->whereDate('submission_date', '>=', $from);
        }

        if ($to = $request->input('to')) {
            $query->whereDate('submission_date', '<=', $to);
        }

        return $query->latest('submission_date')->paginate(20);
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

        return $submission->load(['student', 'teacher', 'academicYear', 'surah']);
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
