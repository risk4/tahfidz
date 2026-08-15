<?php

namespace App\Domain\Dashboard\Services;

use App\Domain\Academic\Models\ClassRoom;
use App\Domain\People\Models\Student;
use App\Domain\People\Models\Teacher;
use App\Domain\People\Models\User;
use App\Domain\Tahfidz\Models\Murajaah;
use App\Domain\Tahfidz\Models\Submission;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Sumber data tunggal untuk halaman Dashboard.
 *
 * Semua agregasi dihitung di sini (SQL), tidak ada perhitungan statistik
 * di sisi React. Data di-scope berdasarkan role:
 *   - super_admin : seluruh data
 *   - teacher     : hanya santri dalam kelompok binaannya
 *   - student     : hanya data dirinya sendiri
 */
class DashboardService
{
    private const CACHE_TTL = 60; // detik

    private const RANGES = [
        '7d'  => 7,
        '30d' => 30,
        '3m'  => 90,
        '6m'  => 180,
        '1y'  => 365,
    ];

    public function overview(User $user, string $range = '30d'): array
    {
        $range = isset(self::RANGES[$range]) ? $range : '30d';

        $key = implode('.', [
            'dashboard',
            $user->role,
            $user->teacher?->id ?? $user->student?->id ?? 'all',
            $range,
            now()->format('Y-m-d'),
        ]);

        return Cache::remember($key, self::CACHE_TTL, function () use ($user, $range) {
            $ids = $this->scopedStudentIds($user);
            $scope = fn ($query) => $query->when($ids !== null, fn ($q) => $q->whereIn('student_id', $ids));
            $scopeStudent = fn ($query) => $query->when($ids !== null, fn ($q) => $q->whereIn('id', $ids));

            $today = Carbon::today();
            $yesterday = Carbon::yesterday();

            $statistics = $this->statistics($ids, $scope, $today, $yesterday);
            $chart = $this->chart($ids, $scope, $range);
            $target = $this->targetToday($ids, $scopeStudent, $today);

            $payload = [
                'statistics' => $statistics,
                'chart' => $chart,
                'target' => $target,
                'recent_activities' => $this->recentActivities($ids, $scope),
                'recent_submissions' => $this->recentSubmissions($ids, $scope),
                'attention' => $this->attentionStudents($ids, $today),
                'class_performance' => $this->classPerformance($ids),
                'top_students' => $this->topStudents($ids),
                'insights' => $this->insights($ids, $statistics, $target, $today),
            ];

            if ($user->isSuperAdmin()) {
                $payload['teacher_activity'] = $this->teacherActivity($today);
            }

            return $payload;
        });
    }

    /* ================================================================
     * 1. Statistik / KPI
     * ================================================================ */
    private function statistics(?array $ids, \Closure $scope, Carbon $today, Carbon $yesterday): array
    {
        $totalStudents = Student::query()
            ->when($ids !== null, fn ($q) => $q->whereIn('id', $ids))
            ->count();

        $activeStudents = Student::query()
            ->where('status', 'active')
            ->when($ids !== null, fn ($q) => $q->whereIn('id', $ids))
            ->count();

        $subToday = (clone $scope)(Submission::query())->whereDate('submission_date', $today)->count();
        $subYesterday = (clone $scope)(Submission::query())->whereDate('submission_date', $yesterday)->count();
        $murToday = (clone $scope)(Murajaah::query())->whereDate('date', $today)->count();
        $murYesterday = (clone $scope)(Murajaah::query())->whereDate('date', $yesterday)->count();

        $pagesToday = (clone $scope)(Submission::query())->whereDate('submission_date', $today)->sum('page_count');
        $murPagesToday = (clone $scope)(Murajaah::query())->whereDate('date', $today)->sum('page_count');
        $avgPages = $activeStudents > 0 ? round(($pagesToday + $murPagesToday) / $activeStudents, 1) : 0;

        // Target hafalan: santri dengan memorization_target yang sudah tercapai.
        $targetBase = Student::query()
            ->whereNotNull('memorization_target')
            ->where('memorization_target', '>', 0)
            ->when($ids !== null, fn ($q) => $q->whereIn('id', $ids))
            ->count();

        $targetReached = DB::table('students as st')
            ->join('student_progress_summary as ps', 'ps.student_id', '=', 'st.id')
            ->whereNotNull('st.memorization_target')
            ->where('st.memorization_target', '>', 0)
            ->whereColumn('ps.total_juz_completed', '>=', 'st.memorization_target')
            ->when($ids !== null, fn ($q) => $q->whereIn('st.id', $ids))
            ->count();

        return [
            'total_students' => $totalStudents,
            'active_students' => $activeStudents,
            'submissions_today' => $subToday,
            'submissions_trend' => $subYesterday > 0 ? round((($subToday - $subYesterday) / $subYesterday) * 100, 1) : null,
            'murajaahs_today' => $murToday,
            'murajaahs_trend' => $murYesterday > 0 ? round((($murToday - $murYesterday) / $murYesterday) * 100, 1) : null,
            'target_reached' => $targetReached,
            'target_base' => $targetBase,
            'target_percentage' => $targetBase > 0 ? round(($targetReached / $targetBase) * 100, 1) : 0,
            'avg_pages_per_student' => $avgPages,
        ];
    }

    /* ================================================================
     * 2. Data chart harian (Setoran / Muraja'ah / Pencapaian Target)
     * ================================================================ */
    private function chart(?array $ids, \Closure $scope, string $range): array
    {
        $days = self::RANGES[$range];
        $start = Carbon::today()->subDays($days - 1)->startOfDay();

        $subRows = (clone $scope)(Submission::query())
            ->selectRaw('DATE(submission_date) as d, COUNT(*) as c, COALESCE(SUM(page_count), 0) as pages')
            ->where('submission_date', '>=', $start)
            ->groupBy('d')
            ->get();
        $subCount = $subRows->pluck('c', 'd');
        $subPages = $subRows->pluck('pages', 'd');

        $murRows = (clone $scope)(Murajaah::query())
            ->selectRaw('DATE(date) as d, COUNT(*) as c, COALESCE(SUM(page_count), 0) as pages')
            ->where('date', '>=', $start)
            ->groupBy('d')
            ->get();
        $murCount = $murRows->pluck('c', 'd');
        $murPages = $murRows->pluck('pages', 'd');

        // "Pencapaian target": setoran yang dilakukan santri yang (saat ini)
        // sudah mencapai target hafalan — proxy tren harian yang jujur.
        $targetRows = DB::table('submissions as s')
            ->join('students as st', 'st.id', '=', 's.student_id')
            ->join('student_progress_summary as ps', 'ps.student_id', '=', 'st.id')
            ->whereNotNull('st.memorization_target')
            ->where('st.memorization_target', '>', 0)
            ->whereColumn('ps.total_juz_completed', '>=', 'st.memorization_target')
            ->where('s.submission_date', '>=', $start)
            ->whereNull('s.deleted_at')
            ->whereNull('st.deleted_at')
            ->when($ids !== null, fn ($q) => $q->whereIn('s.student_id', $ids))
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
                'setoran_pages' => (int) ($subPages[$key] ?? 0),
                'murajaah' => (int) ($murCount[$key] ?? 0),
                'murajaah_pages' => (int) ($murPages[$key] ?? 0),
                'target' => (int) ($targetCount[$key] ?? 0),
            ];
        }

        return $series;
    }

    /* ================================================================
     * 3. Target hari ini
     * ================================================================ */
    private function targetToday(?array $ids, \Closure $scopeStudent, Carbon $today): array
    {
        $base = Student::query()
            ->where('status', 'active')
            ->whereNotNull('memorization_target')
            ->where('memorization_target', '>', 0)
            ->when($ids !== null, fn ($q) => $q->whereIn('id', $ids))
            ->pluck('id');

        $reached = DB::table('students as st')
            ->join('student_progress_summary as ps', 'ps.student_id', '=', 'st.id')
            ->where('st.status', 'active')
            ->whereNotNull('st.memorization_target')
            ->where('st.memorization_target', '>', 0)
            ->whereColumn('ps.total_juz_completed', '>=', 'st.memorization_target')
            ->when($ids !== null, fn ($q) => $q->whereIn('st.id', $ids))
            ->pluck('st.id');

        $activeIds = Student::query()
            ->where('status', 'active')
            ->when($ids !== null, fn ($q) => $q->whereIn('id', $ids))
            ->pluck('id');

        $since = $today->copy()->subDays(7)->format('Y-m-d');
        $activeSubIds = Submission::query()
            ->whereIn('student_id', $activeIds)
            ->where('submission_date', '>=', $since)
            ->distinct()->pluck('student_id');
        $activeMurIds = Murajaah::query()
            ->whereIn('student_id', $activeIds)
            ->where('date', '>=', $since)
            ->distinct()->pluck('student_id');
        $noActivity = $activeIds->diff($activeSubIds)->diff($activeMurIds);

        $total = $base->count();
        $reachedCount = $reached->count();

        return [
            'total' => $total,
            'reached' => $reachedCount,
            'not_reached' => max(0, $total - $reachedCount),
            'no_activity' => $noActivity->count(),
            'percentage' => $total > 0 ? round(($reachedCount / $total) * 100) : 0,
        ];
    }

    /* ================================================================
     * 4. Aktivitas terbaru (setoran + muraja'ah)
     * ================================================================ */
    private function recentActivities(?array $ids, \Closure $scope): array
    {
        $subs = (clone $scope)(Submission::query())
            ->with(['student:id,name', 'surah:id,name_latin', 'teacher:id,name'])
            ->orderByDesc('submission_date')
            ->orderByDesc('submission_time')
            ->limit(8)
            ->get()
            ->map(function (Submission $s) {
                return [
                    'type' => 'submission',
                    'id' => $s->id,
                    'student_name' => $s->student?->name ?? 'Santri',
                    'student_id' => $s->student_id,
                    'action' => 'melakukan setoran',
                    'detail' => trim(($s->surah?->name_latin ?? '') . ' ' . ($s->start_ayah && $s->end_ayah ? "ayat {$s->start_ayah}-{$s->end_ayah}" : '')),
                    'teacher_name' => $s->teacher?->name ?? null,
                    'status' => $s->status,
                    'datetime' => $s->submission_time
                        ? $s->submission_date->format('Y-m-d') . ' ' . $s->submission_time
                        : $s->submission_date?->format('Y-m-d'),
                    'time' => $s->submission_time,
                ];
            });

        $murs = (clone $scope)(Murajaah::query())
            ->with(['student:id,name', 'surah:id,name_latin', 'teacher:id,name'])
            ->orderByDesc('date')
            ->orderByDesc('time')
            ->limit(8)
            ->get()
            ->map(function (Murajaah $m) {
                $detail = $m->juz ? "Juz {$m->juz}" : (string) ($m->surah?->name_latin ?? '');
                return [
                    'type' => 'murajaah',
                    'id' => $m->id,
                    'student_name' => $m->student?->name ?? 'Santri',
                    'student_id' => $m->student_id,
                    'action' => 'menyelesaikan murajaah',
                    'detail' => $detail,
                    'teacher_name' => $m->teacher?->name ?? null,
                    'status' => $m->status,
                    'datetime' => $m->time
                        ? $m->date->format('Y-m-d') . ' ' . $m->time
                        : $m->date?->format('Y-m-d'),
                    'time' => $m->time,
                ];
            });

        return $subs->concat($murs)
            ->sortByDesc('datetime')
            ->values()
            ->take(10)
            ->all();
    }

    /* ================================================================
     * 5. Setoran terbaru
     * ================================================================ */
    private function recentSubmissions(?array $ids, \Closure $scope): array
    {
        return (clone $scope)(Submission::query())
            ->with(['student:id,name,class_id', 'student.classRoom:id,name', 'surah:id,name_latin', 'teacher:id,name'])
            ->orderByDesc('submission_date')
            ->orderByDesc('submission_time')
            ->limit(7)
            ->get()
            ->map(function (Submission $s) {
                return [
                    'id' => $s->id,
                    'student_name' => $s->student?->name ?? '-',
                    'class_name' => $s->student?->classRoom?->name ?? null,
                    'surah' => $s->surah?->name_latin ?? '-',
                    'ayah_range' => $s->start_ayah && $s->end_ayah ? "{$s->start_ayah}-{$s->end_ayah}" : null,
                    'page_count' => $s->page_count,
                    'teacher_name' => $s->teacher?->name ?? null,
                    'status' => $s->status,
                    'date' => $s->submission_date?->format('Y-m-d'),
                    'time' => $s->submission_time,
                ];
            })
            ->all();
    }

    /* ================================================================
     * 6. Santri yang perlu perhatian
     * ================================================================ */
    private function attentionStudents(?array $ids, Carbon $today): array
    {
        $students = Student::query()
            ->where('status', 'active')
            ->with(['classRoom:id,name'])
            ->when($ids !== null, fn ($q) => $q->whereIn('id', $ids))
            ->get(['id', 'name', 'class_id', 'memorization_target']);

        if ($students->isEmpty()) {
            return [];
        }

        $studentIds = $students->pluck('id');

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

        $revisionCount = Submission::query()
            ->whereIn('student_id', $studentIds)
            ->where('status', 'revision')
            ->where('submission_date', '>=', $today->copy()->subDays(7))
            ->selectRaw('student_id, COUNT(*) as c')
            ->groupBy('student_id')
            ->pluck('c', 'student_id');

        $summaries = DB::table('student_progress_summary')
            ->whereIn('student_id', $studentIds)
            ->get(['student_id', 'total_juz_completed', 'progress_percentage'])
            ->keyBy('student_id');

        $items = [];

        foreach ($students as $student) {
            $lastDates = [];
            if (! empty($lastSub[$student->id])) {
                $lastDates[] = $lastSub[$student->id];
            }
            if (! empty($lastMur[$student->id])) {
                $lastDates[] = $lastMur[$student->id];
            }
            $lastDate = $lastDates ? max($lastDates) : null;

            $severity = null;
            $message = null;

            // Tidak aktif beberapa hari / belum pernah beraktivitas.
            if ($lastDate) {
                $days = (int) Carbon::parse($lastDate)->diffInDays($today);
                if ($days >= 3) {
                    $severity = 'warning';
                    $message = "Tidak melakukan aktivitas selama {$days} hari";
                }
            } else {
                $severity = 'warning';
                $message = 'Belum pernah melakukan setoran atau murajaah';
            }

            // Progress target rendah.
            $summary = $summaries[$student->id] ?? null;
            if ($student->memorization_target && $summary) {
                $pct = round(((float) $summary->total_juz_completed / max((int) $student->memorization_target, 1)) * 100);
                if ($pct < 50 && $severity === null) {
                    $severity = 'info';
                    $message = "Progress target hafalan {$pct}%";
                }
            }

            // Beberapa setoran terakhir perlu revisi.
            if (($revisionCount[$student->id] ?? 0) >= 2) {
                $severity = 'danger';
                $message = "{$revisionCount[$student->id]} setoran terakhir perlu revisi";
            }

            if ($severity && $message) {
                $items[] = [
                    'id' => $student->id,
                    'name' => $student->name,
                    'class_name' => $student->classRoom?->name ?? null,
                    'severity' => $severity,
                    'message' => $message,
                ];
            }
        }

        $order = ['danger' => 0, 'warning' => 1, 'info' => 2];

        usort($items, fn ($a, $b) => $order[$a['severity']] <=> $order[$b['severity']]);

        return array_slice($items, 0, 6);
    }

    /* ================================================================
     * 7. Performa kelas
     * ================================================================ */
    private function classPerformance(?array $ids): array
    {
        $classes = ClassRoom::query()
            ->select('id', 'name')
            ->get()
            ->keyBy('id');

        if ($classes->isEmpty()) {
            return [];
        }

        $studentCount = Student::query()
            ->where('status', 'active')
            ->when($ids !== null, fn ($q) => $q->whereIn('id', $ids))
            ->selectRaw('class_id, COUNT(*) as c')
            ->groupBy('class_id')
            ->pluck('c', 'class_id');

        $since = Carbon::today()->subDays(90)->format('Y-m-d');

        $subCount = DB::table('submissions as s')
            ->join('students as st', 'st.id', '=', 's.student_id')
            ->whereNull('s.deleted_at')
            ->whereNull('st.deleted_at')
            ->where('s.submission_date', '>=', $since)
            ->when($ids !== null, fn ($q) => $q->whereIn('st.id', $ids))
            ->selectRaw('st.class_id, COUNT(*) as c')
            ->groupBy('st.class_id')
            ->pluck('c', 'class_id');

        $murCount = DB::table('murajaahs as m')
            ->join('students as st', 'st.id', '=', 'm.student_id')
            ->whereNull('m.deleted_at')
            ->whereNull('st.deleted_at')
            ->where('m.date', '>=', $since)
            ->when($ids !== null, fn ($q) => $q->whereIn('st.id', $ids))
            ->selectRaw('st.class_id, COUNT(*) as c')
            ->groupBy('st.class_id')
            ->pluck('c', 'class_id');

        $targetPct = DB::table('students as st')
            ->join('student_progress_summary as ps', 'ps.student_id', '=', 'st.id')
            ->where('st.status', 'active')
            ->whereNull('st.deleted_at')
            ->when($ids !== null, fn ($q) => $q->whereIn('st.id', $ids))
            ->selectRaw(
                'st.class_id, AVG(CASE WHEN st.memorization_target > 0 THEN LEAST(100, (ps.total_juz_completed / st.memorization_target) * 100) ELSE ps.progress_percentage END) as avg_pct'
            )
            ->groupBy('st.class_id')
            ->pluck('avg_pct', 'class_id');

        $rows = [];

        foreach ($classes as $class) {
            $rows[] = [
                'id' => $class->id,
                'name' => $class->name,
                'students' => (int) ($studentCount[$class->id] ?? 0),
                'submissions' => (int) ($subCount[$class->id] ?? 0),
                'murajaahs' => (int) ($murCount[$class->id] ?? 0),
                'target_percentage' => round((float) ($targetPct[$class->id] ?? 0), 1),
            ];
        }

        usort($rows, fn ($a, $b) => $b['students'] <=> $a['students']);

        return array_slice($rows, 0, 6);
    }

    /* ================================================================
     * 8. Top santri
     * ================================================================ */
    private function topStudents(?array $ids): array
    {
        $students = DB::table('students as st')
            ->leftJoin('student_progress_summary as ps', 'ps.student_id', '=', 'st.id')
            ->leftJoin('classes as c', 'c.id', '=', 'st.class_id')
            ->where('st.status', 'active')
            ->whereNull('st.deleted_at')
            ->when($ids !== null, fn ($q) => $q->whereIn('st.id', $ids))
            ->select(
                'st.id',
                'st.name',
                'st.class_id',
                'c.name as class_name',
                'ps.total_juz_completed',
                'ps.progress_percentage',
                'ps.last_submission_at'
            )
            ->get();

        if ($students->isEmpty()) {
            return [];
        }

        // Konsistensi: jumlah hari aktif (setoran/murajaah) dalam 7 hari terakhir.
        $since = Carbon::today()->subDays(7)->format('Y-m-d');
        $activeDays = DB::table(function ($q) use ($ids, $since) {
            $q->selectRaw('student_id, DATE(submission_date) as d')
                ->from('submissions')
                ->where('submission_date', '>=', $since)
                ->whereNull('deleted_at')
                ->when($ids !== null, fn ($qq) => $qq->whereIn('student_id', $ids))
                ->union(
                    DB::table('murajaahs')
                        ->selectRaw('student_id, DATE(date) as d')
                        ->where('date', '>=', $since)
                        ->whereNull('deleted_at')
                        ->when($ids !== null, fn ($qq) => $qq->whereIn('student_id', $ids))
                );
        }, 'acts')
            ->selectRaw('student_id, COUNT(DISTINCT d) as days')
            ->groupBy('student_id')
            ->pluck('days', 'student_id');

        $rows = $students
            ->map(function ($s) use ($activeDays) {
                $progress = (float) ($s->progress_percentage ?? 0);
                $consistency = min(30, (int) ($activeDays[$s->id] ?? 0) * 5);

                return [
                    'id' => (int) $s->id,
                    'name' => $s->name,
                    'class_name' => $s->class_name,
                    'total_juz' => (int) ($s->total_juz_completed ?? 0),
                    'progress_percentage' => $progress,
                    'score' => round(min(100, $progress + $consistency), 1),
                ];
            })
            ->sortByDesc('score')
            ->values()
            ->take(5)
            ->all();

        return $rows;
    }

    /* ================================================================
     * 9. Aktivitas pembimbing (khusus admin)
     * ================================================================ */
    private function teacherActivity(Carbon $today): array
    {
        $teachers = Teacher::query()
            ->where('status', 'active')
            ->get(['id', 'name']);

        $studentCount = DB::table('tahfidz_groups as tg')
            ->join('tahfidz_group_members as tgm', 'tgm.tahfidz_group_id', '=', 'tg.id')
            ->selectRaw('tg.teacher_id, COUNT(DISTINCT tgm.student_id) as c')
            ->groupBy('tg.teacher_id')
            ->pluck('c', 'teacher_id');

        $subCount = Submission::query()
            ->whereNotNull('teacher_id')
            ->where('submission_date', '>=', $today->copy()->subDays(30))
            ->selectRaw('teacher_id, COUNT(*) as c')
            ->groupBy('teacher_id')
            ->pluck('c', 'teacher_id');

        $murCount = Murajaah::query()
            ->whereNotNull('teacher_id')
            ->where('date', '>=', $today->copy()->subDays(30))
            ->selectRaw('teacher_id, COUNT(*) as c')
            ->groupBy('teacher_id')
            ->pluck('c', 'teacher_id');

        $rows = $teachers
            ->map(function ($t) use ($studentCount, $subCount, $murCount) {
                return [
                    'id' => $t->id,
                    'name' => $t->name,
                    'students' => (int) ($studentCount[$t->id] ?? 0),
                    'submissions' => (int) ($subCount[$t->id] ?? 0),
                    'murajaahs' => (int) ($murCount[$t->id] ?? 0),
                ];
            })
            ->sortByDesc(fn ($r) => $r['submissions'] + $r['murajaahs'])
            ->values()
            ->take(8)
            ->all();

        $supervisedTotal = $studentCount->sum();

        return [
            'active_teachers' => $teachers->count(),
            'submissions_30d' => $subCount->sum(),
            'murajaahs_30d' => $murCount->sum(),
            'avg_students_per_teacher' => $teachers->count() > 0 ? round($supervisedTotal / $teachers->count(), 1) : 0,
            'teachers' => $rows,
        ];
    }

    /* ================================================================
     * 10. Insight (dihitung dari data nyata)
     * ================================================================ */
    private function insights(?array $ids, array $statistics, array $target, Carbon $today): array
    {
        $insights = [];

        if ($statistics['target_base'] > 0) {
            $insights[] = [
                'type' => $statistics['target_percentage'] >= 60 ? 'success' : 'warning',
                'text' => number_format($statistics['target_percentage'], 0) . '% santri telah mencapai target hafalan.',
            ];
        }

        if ($statistics['murajaahs_trend'] !== null && $statistics['murajaahs_trend'] !== 0) {
            $dir = $statistics['murajaahs_trend'] > 0 ? 'meningkat' : 'menurun';
            $insights[] = [
                'type' => $statistics['murajaahs_trend'] > 0 ? 'success' : 'info',
                'text' => 'Muraja\'ah ' . $dir . ' ' . abs($statistics['murajaahs_trend']) . '% dibandingkan kemarin.',
            ];
        }

        // Santri aktif yang belum setoran hari ini.
        $activeIds = Student::query()
            ->where('status', 'active')
            ->when($ids !== null, fn ($q) => $q->whereIn('id', $ids))
            ->pluck('id');
        $submittedToday = Submission::query()
            ->whereIn('student_id', $activeIds)
            ->whereDate('submission_date', $today)
            ->distinct()
            ->pluck('student_id');
        $notSubmitted = $activeIds->diff($submittedToday)->count();

        if ($notSubmitted > 0) {
            $insights[] = [
                'type' => 'warning',
                'text' => "{$notSubmitted} santri belum melakukan setoran hari ini.",
            ];
        }

        // Jam dengan aktivitas tertinggi hari ini.
        $hourSub = Submission::query()
            ->whereIn('student_id', $activeIds)
            ->whereDate('submission_date', $today)
            ->whereNotNull('submission_time')
            ->selectRaw('HOUR(submission_time) as h, COUNT(*) as c')
            ->groupBy('h')
            ->pluck('c', 'h');
        $hourMur = Murajaah::query()
            ->whereIn('student_id', $activeIds)
            ->whereDate('date', $today)
            ->whereNotNull('time')
            ->selectRaw('HOUR(time) as h, COUNT(*) as c')
            ->groupBy('h')
            ->pluck('c', 'h');

        $hourCounts = [];
        foreach ($hourSub as $hour => $count) {
            $hourCounts[(int) $hour] = ($hourCounts[(int) $hour] ?? 0) + (int) $count;
        }
        foreach ($hourMur as $hour => $count) {
            $hourCounts[(int) $hour] = ($hourCounts[(int) $hour] ?? 0) + (int) $count;
        }

        if ($hourCounts) {
            $busiest = array_search(max($hourCounts), $hourCounts, true);
            $insights[] = [
                'type' => 'info',
                'text' => 'Jam ' . str_pad((string) $busiest, 2, '0', STR_PAD_LEFT) . '.00 memiliki aktivitas tertinggi hari ini.',
            ];
        }

        return $insights;
    }

    /* ================================================================
     * Helper scope
     * ================================================================ */
    private function scopedStudentIds(User $user): ?array
    {
        if ($user->isSuperAdmin()) {
            return null;
        }

        if ($user->isTeacher()) {
            $teacherId = $user->teacher?->id;

            if (! $teacherId) {
                return [];
            }

            return DB::table('tahfidz_group_members as tgm')
                ->join('tahfidz_groups as tg', 'tg.id', '=', 'tgm.tahfidz_group_id')
                ->where('tg.teacher_id', $teacherId)
                ->distinct()
                ->pluck('tgm.student_id')
                ->all();
        }

        if ($user->isStudent()) {
            return $user->student ? [$user->student->id] : [];
        }

        return [];
    }
}
