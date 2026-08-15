<?php

namespace App\Http\Controllers\Api\Tahfidz;

use App\Domain\Academic\Models\AcademicYear;
use App\Domain\People\Models\Student;
use App\Domain\People\Models\Teacher;
use App\Domain\Quran\Models\QuranSurah;
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
            ->with(['student.classRoom', 'teacher', 'academicYear', 'surah']);

        // Guru hanya melihat murajaah siswa binaannya: murid kelas yang ia wali
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
