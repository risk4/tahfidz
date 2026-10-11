<?php

namespace App\Http\Controllers\Api\Tahfidz;

use App\Domain\People\Models\Student;
use App\Domain\People\Models\User;
use App\Domain\People\Support\SupervisedStudentScope;
use App\Domain\Tahfidz\Models\StudentProgressSummary;
use App\Domain\Tahfidz\Services\ProgressService;
use App\Domain\Tahfidz\Services\PublicHafalanService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ProgressController extends Controller
{
    public function __construct(
        private readonly ProgressService $progressService,
        private readonly PublicHafalanService $hafalan,
    ) {}

    /**
     * Ringkasan progres seorang siswa.
     *
     * Membaca snapshot yang tersimpan; recompute hanya dilakukan bila
     * ringkasan belum ada (inisialisasi pertama). Semua mutasi data
     * (submission CRUD, status ayat, perubahan target santri) sudah
     * memicu recompute masing-masing, sehingga endpoint GET tidak boleh
     * melakukan penulisan ke database.
     */
    public function show(Request $request, Student $student)
    {
        $user = $request->user();
        $this->authorizeShow($user, $student);

        $summary = StudentProgressSummary::find($student->id)
            ?? $this->progressService->recompute($student);

        return response()->json([
            'student' => $student->only(['id', 'name', 'student_code', 'class_id']),
            'summary' => $summary,
            'surah_progress' => $this->hafalan->surahProgress($student),
        ]);
    }

    /**
     * Daftar progres siswa dalam satu tahun ajaran / kelas.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if (! $user->isSuperAdmin() && ! $user->isTeacher()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $query = StudentProgressSummary::query()
            ->with(['student:id,name,student_code,class_id,memorization_target,starting_juz', 'student.classRoom:id,name']);

        SupervisedStudentScope::apply($query, $user, viaRelation: true);

        if ($classId = $request->integer('class_id')) {
            $query->whereHas('student', fn ($q) => $q->where('class_id', $classId));
        }

        if ($search = $request->string('search')->toString()) {
            $query->whereHas('student', fn ($q) => $q
                ->where('name', 'like', "%{$search}%")
                ->orWhere('student_code', 'like', "%{$search}%")
                ->orWhere('nis', 'like', "%{$search}%"));
        }

        $perPage = min(max($request->integer('per_page', 15), 5), 100);

        return $query->orderByDesc('progress_percentage')->paginate($perPage)->withQueryString();
    }

    /** Statistik agregat progres (seluruh data sesuai scope role + filter). */
    public function stats(Request $request)
    {
        $user = $request->user();

        if (! $user->isSuperAdmin() && ! $user->isTeacher()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $query = StudentProgressSummary::query();

        SupervisedStudentScope::apply($query, $user, viaRelation: true);

        if ($classId = $request->integer('class_id')) {
            $query->whereHas('student', fn ($q) => $q->where('class_id', $classId));
        }

        return response()->json([
            'total_students' => (int) $query->count(),
            'avg_progress' => round((float) $query->avg('progress_percentage'), 1),
            'avg_score' => round((float) $query->avg('average_score'), 1),
            'total_juz' => (int) $query->sum('total_juz_completed'),
        ]);
    }

    private function authorizeShow(User $user, Student $student): void
    {
        if ($user->isSuperAdmin()) {
            return;
        }

        if ($user->isTeacher() && ($user->teacher?->supervises($student->id) ?? false)) {
            return;
        }

        if ($user->isStudent() && $user->student?->id === $student->id) {
            return;
        }

        abort(403, 'Forbidden.');
    }
}
