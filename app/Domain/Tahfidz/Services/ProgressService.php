<?php

namespace App\Domain\Tahfidz\Services;

use App\Domain\Notifications\Services\NotificationService;
use App\Domain\People\Models\Student;
use App\Domain\Quran\Models\QuranAyah;
use App\Domain\Tahfidz\Models\StudentAyahCoverage;
use App\Domain\Tahfidz\Models\StudentProgressSummary;
use App\Domain\Tahfidz\Models\Submission;
use Illuminate\Support\Collection;
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
    public function __construct(private readonly NotificationService $notifications) {}

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

        // Progress dihitung relatif terhadap target hafalan siswa (jumlah juz).
        // Rentang target: mulai dari Juz Awal (default 30) mundur sejumlah target.
        // Contoh: target 1 juz + Juz Awal 30 → progress = cakupan ayat di Juz 30.
        // Tanpa target terisi, fallback ke progress terhadap seluruh Al-Qur'an.
        $targetJuz = (int) $student->memorization_target;
        $startJuz = (int) $student->starting_juz;

        if ($targetJuz > 0 && $startJuz > 0) {
            $targetJuzNumbers = [];
            for ($i = 0; $i < $targetJuz; $i++) {
                $j = $startJuz - $i;
                if ($j < 1) {
                    $j += 30;
                }
                $targetJuzNumbers[] = $j;
            }
            $targetJuzNumbers = array_values(array_unique($targetJuzNumbers));

            $targetAyahs = DB::table('quran_ayahs')
                ->join('quran_juz', 'quran_ayahs.juz_id', '=', 'quran_juz.id')
                ->whereIn('quran_juz.juz_number', $targetJuzNumbers)
                ->get(['quran_ayahs.surah_id', 'quran_ayahs.ayah_number']);

            // Set [surah_id => [ayah_number => true]] untuk lookup O(1).
            $coveredSets = $this->toCoveredSets($covered);

            $targetTotal = $targetAyahs->count();
            $targetCovered = $targetAyahs
                ->filter(fn ($ayah) => isset($coveredSets[$ayah->surah_id][$ayah->ayah_number]))
                ->count();

            $progress = $targetTotal > 0 ? round(($targetCovered / $targetTotal) * 100, 2) : 0;
        } else {
            $progress = $totalAyahQuran > 0 ? round(($totalCovered / $totalAyahQuran) * 100, 2) : 0;
        }

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
     * @param  Collection<int, Collection<int,int>>  $covered
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
     * @param  Collection<int, Collection<int,int>>  $covered
     */
    private function countCompletedJuz($covered): int
    {
        $ayahs = DB::table('quran_ayahs')
            ->select('juz_id', 'surah_id', 'ayah_number')
            ->orderBy('surah_id')
            ->orderBy('ayah_number')
            ->get()
            ->groupBy('juz_id');

        // Set [surah_id => [ayah_number => true]] agar pengecekan tiap ayat
        // O(1) alih-alih linear scan (`contains`) pada koleksi besar.
        $coveredSets = $this->toCoveredSets($covered);

        $completed = 0;

        foreach ($ayahs as $juzAyahs) {
            $allCovered = $juzAyahs->every(function ($ayah) use ($coveredSets) {
                return isset($coveredSets[$ayah->surah_id][$ayah->ayah_number]);
            });

            if ($allCovered) {
                $completed++;
            }
        }

        return $completed;
    }

    /**
     * Ubah peta [surah_id => Collection<ayah_number>] menjadi
     * [surah_id => [ayah_number => true]] untuk lookup konstan.
     *
     * @param  Collection<int, Collection<int,int>>  $covered
     * @return array<int, array<int, bool>>
     */
    private function toCoveredSets($covered): array
    {
        return $covered
            ->map(fn ($ayahNumbers) => $ayahNumbers->map(fn ($n) => (int) $n)->flip()->all())
            ->all();
    }
}
