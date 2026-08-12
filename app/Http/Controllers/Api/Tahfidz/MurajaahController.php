<?php

namespace App\Http\Controllers\Api\Tahfidz;

use App\Domain\Academic\Models\AcademicYear;
use App\Domain\People\Models\Teacher;
use App\Domain\Tahfidz\Models\Murajaah;
use App\Domain\Tahfidz\Models\StudentAyahCoverage;
use App\Domain\Tahfidz\Services\ProgressService;
use App\Domain\Tahfidz\Services\MurajaahService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Tahfidz\StoreMurajaahRequest;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class MurajaahController extends Controller
{
    public function __construct(
        private readonly MurajaahService $murajaahService,
        private readonly ProgressService $progressService,
    ) {
    }

    public function index(Request $request)
    {
        $this->authorize('viewAny', Murajaah::class);

        $query = Murajaah::query()
            ->with(['student', 'teacher', 'academicYear', 'surah']);

        // Guru hanya melihat murajaah siswa yang ia bina.
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

        return $query->latest('date')->paginate(20);
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

        return $murajaah->load(['student', 'teacher', 'academicYear', 'surah']);
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

        if ($data['memorization_status'] === 'not_memorized') {
            StudentAyahCoverage::where('student_id', $murajaah->student_id)
                ->where('surah_id', $murajaah->surah_id)
                ->where('ayah_number', $data['ayah_number'])
                ->delete();
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
        }

        $this->progressService->recompute($murajaah->student);

        return response()->json([
            'ayah_number' => $data['ayah_number'],
            'memorization_status' => $data['memorization_status'],
        ]);
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
