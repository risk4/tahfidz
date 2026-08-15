<?php

namespace App\Domain\Tahfidz\Services;

use App\Domain\Notifications\Services\NotificationService;
use App\Domain\People\Models\Student;
use App\Domain\Quran\Models\QuranAyah;
use App\Domain\Tahfidz\Models\StudentAyahCoverage;
use App\Domain\Tahfidz\Models\StudentProgressSummary;
use App\Domain\Tahfidz\Models\Submission;
use Illuminate\Support\Facades\DB;

/**
 * Menghitung ulang ringkasan progres seorang siswa berdasarkan data
 * student_ayah_coverage dan submissions.
 *
 * Desain: service ini hanya membaca kondisi faktual di database lalu
 * menulis snapshot ke tabel student_progress_summary (denormalisasi).
 */
class ProgressService
{
    public function __construct(private readonly NotificationService $notifications)
    {
    }

    /**
     * Hitung ulang & simpan ringkasan progres untuk satu siswa.
     */
    public function recompute(Student $student): StudentProgressSummary
    {
        // Peta [surah_id => Collection<ayah_number>] yang sudah tercakup siswa.
        $covered = StudentAyahCoverage::where('student_id', $student->id)
            ->where('memorization_status', StudentAyahCoverage::STATUS_MEMORIZED)
            ->get(['surah_id', 'ayah_number'])
            ->groupBy('surah_id')
            ->map(fn ($rows) => $rows->pluck('ayah_number'));

        $totalAyahQuran = QuranAyah::count();
        $totalCovered = $covered->sum(fn ($ayahs) => $ayahs->count());

        $surahCompleted = $this->countCompletedSurahs($covered);
        $juzCompleted = $this->countCompletedJuz($covered);

        $average = Submission::where('student_id', $student->id)->avg('final_score');
        $last = Submission::where('student_id', $student->id)->max('submission_date');

        $progress = $totalAyahQuran > 0 ? round(($totalCovered / $totalAyahQuran) * 100, 2) : 0;

        $summary = StudentProgressSummary::updateOrCreate(
            ['student_id' => $student->id],
            [
                'total_ayah_covered' => $totalCovered,
                'total_surah_completed' => $surahCompleted,
                'total_juz_completed' => $juzCompleted,
                'progress_percentage' => $progress,
                'average_score' => $average === null ? null : round((float) $average, 2),
                'last_submission_at' => $last,
                'updated_at' => now(),
            ]
        );

        // Notifikasi sekali-saja saat target hafalan (juz) tercapai.
        if ($student->memorization_target && (int) $juzCompleted >= (int) $student->memorization_target) {
            $this->notifications->notifyTargetAchieved($student);
        }

        return $summary;
    }

    /**
     * Jumlah surah yang seluruh ayatnya sudah tercakup siswa.
     *
     * @param \Illuminate\Support\Collection<int, \Illuminate\Support\Collection<int,int>> $covered
     */
    private function countCompletedSurahs($covered): int
    {
        return DB::table('quran_surahs')
            ->get(['id', 'total_ayahs'])
            ->filter(function ($surah) use ($covered) {
                $ayahNumbers = $covered->get($surah->id);

                if (! $ayahNumbers || $ayahNumbers->count() < $surah->total_ayahs) {
                    return false;
                }

                $coveredSet = $ayahNumbers->map(fn ($n) => (int) $n)->sort()->values();

                return $coveredSet->all() === collect(range(1, $surah->total_ayahs))->all();
            })
            ->count();
    }

    /**
     * Jumlah juz yang seluruh ayatnya sudah tercakup siswa.
     *
     * @param \Illuminate\Support\Collection<int, \Illuminate\Support\Collection<int,int>> $covered
     */
    private function countCompletedJuz($covered): int
    {
        $ayahs = DB::table('quran_ayahs')
            ->select('juz_id', 'surah_id', 'ayah_number')
            ->orderBy('surah_id')
            ->orderBy('ayah_number')
            ->get()
            ->groupBy('juz_id');

        $coveredBySurah = $covered->map(fn ($ayahs) => $ayahs->map(fn ($n) => (int) $n));

        $completed = 0;

        foreach ($ayahs as $juzAyahs) {
            $allCovered = $juzAyahs->every(function ($ayah) use ($coveredBySurah) {
                return $coveredBySurah->get($ayah->surah_id)?->contains((int) $ayah->ayah_number) ?? false;
            });

            if ($allCovered) {
                $completed++;
            }
        }

        return $completed;
    }
}

