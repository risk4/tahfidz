<?php

namespace App\Http\Controllers\Api\Tahfidz;

use App\Domain\People\Models\Student;
use App\Domain\People\Models\User;
use App\Domain\Tahfidz\Models\StudentAyahCoverage;
use App\Domain\Tahfidz\Models\StudentProgressSummary;
use App\Domain\Tahfidz\Services\ProgressService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProgressController extends Controller
{
    public function __construct(
        private readonly ProgressService $progressService,
    ) {
    }

    /**
     * Ringkasan progres seorang siswa.
     */
    public function show(Request $request, Student $student)
    {
        $user = $request->user();
        $this->authorizeShow($user, $student);

        $summary = $this->progressService->recompute($student);

        return response()->json([
            'student' => $student->only(['id', 'name', 'student_code', 'class_id']),
            'summary' => $summary,
            'surah_progress' => $this->surahProgress($student),
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
            ->with('student:id,name,student_code,class_id');

        if ($user->isTeacher()) {
            $teacherId = $user->teacher?->id;
            $query->whereHas('student.tahfidzGroups', fn ($q) => $q->where('teacher_id', $teacherId));
        }

        if ($classId = $request->integer('class_id')) {
            $query->whereHas('student', fn ($q) => $q->where('class_id', $classId));
        }

        return $query->orderByDesc('progress_percentage')->paginate(20);
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

    private function surahProgress(Student $student)
    {
        $coverage = DB::table('student_ayah_coverage')
            ->select('surah_id', DB::raw('COUNT(DISTINCT ayah_number) as covered_ayahs'))
            ->where('student_id', $student->id)
            ->where('memorization_status', StudentAyahCoverage::STATUS_MEMORIZED)
            ->groupBy('surah_id');

        return DB::table('quran_surahs')
            ->leftJoinSub($coverage, 'coverage', fn ($join) => $join->on('quran_surahs.id', '=', 'coverage.surah_id'))
            ->leftJoin('submissions', function ($join) use ($student) {
                $join->on('quran_surahs.id', '=', 'submissions.surah_id')
                    ->where('submissions.student_id', '=', $student->id)
                    ->whereNull('submissions.deleted_at');
            })
            ->select([
                'quran_surahs.id as surah_id',
                'quran_surahs.surah_number',
                'quran_surahs.name_latin',
                'quran_surahs.total_ayahs',
                DB::raw('COALESCE(coverage.covered_ayahs, 0) as covered_ayahs'),
                DB::raw('ROUND((COALESCE(coverage.covered_ayahs, 0) / quran_surahs.total_ayahs) * 100, 2) as progress_percentage'),
                DB::raw('ROUND(AVG(submissions.final_score), 2) as average_score'),
                DB::raw('MAX(submissions.submission_date) as last_submission_at'),
            ])
            ->groupBy([
                'quran_surahs.id',
                'quran_surahs.surah_number',
                'quran_surahs.name_latin',
                'quran_surahs.total_ayahs',
                'coverage.covered_ayahs',
            ])
            ->orderBy('quran_surahs.surah_number')
            ->get()
            ->map(function ($surah) {
                return [
                    'surah_id' => (int) $surah->surah_id,
                    'surah_number' => (int) $surah->surah_number,
                    'name_latin' => $surah->name_latin,
                    'total_ayahs' => (int) $surah->total_ayahs,
                    'covered_ayahs' => (int) $surah->covered_ayahs,
                    'progress_percentage' => (float) $surah->progress_percentage,
                    'average_score' => $surah->average_score === null ? null : (float) $surah->average_score,
                    'last_submission_at' => $surah->last_submission_at,
                ];
            });
    }
}
