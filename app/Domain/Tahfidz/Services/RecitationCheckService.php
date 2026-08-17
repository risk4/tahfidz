<?php

namespace App\Domain\Tahfidz\Services;

use App\Domain\People\Models\Student;
use App\Domain\People\Models\User;
use App\Domain\Quran\Models\QuranSurah;
use App\Domain\Tahfidz\Models\RecitationCheck;
use App\Domain\Tahfidz\Models\StudentAyahCoverage;
use Illuminate\Validation\ValidationException;

/**
 * Business logic pengecekan bacaan: menyimpan hasil sesi dan memperbarui
 * status hafalan per-ayat secara konservatif — skor tinggi → memorized,
 * skor menengah → in_progress, skor rendah → tidak diubah. Ayat yang
 * tercakup submission bersifat otoritatif dan tidak pernah ditimpa.
 */
class RecitationCheckService
{
    /** Skor minimal (persen kata benar per ayat) untuk menandai memorized. */
    public const SCORE_MEMORIZED = 90;

    /** Skor minimal untuk menandai in_progress. */
    public const SCORE_IN_PROGRESS = 70;

    public function __construct(private readonly ProgressService $progressService)
    {
    }

    public function create(User $user, array $data): RecitationCheck
    {
        $student = $user->student;
        if (! $student) {
            throw ValidationException::withMessages([
                'student' => ['Akun ini tidak terhubung ke data siswa.'],
            ]);
        }

        $surah = QuranSurah::findOrFail($data['surah_id']);
        $start = (int) $data['start_ayah'];
        $end = (int) $data['end_ayah'];

        if ($end > $surah->total_ayahs) {
            throw ValidationException::withMessages([
                'end_ayah' => ["Rentang ayat melebihi jumlah ayat surah ({$surah->total_ayahs})."],
            ]);
        }

        // Statistik dihitung ulang dari details di sisi server (tidak
        // mempercayai angka dari klien).
        $details = $data['details'];
        $totalWords = count($details);
        $correct = count(array_filter($details, fn ($d) => $d['status'] === 'correct'));
        $incorrect = count(array_filter($details, fn ($d) => $d['status'] === 'incorrect'));
        $missing = $totalWords - $correct - $incorrect;
        $score = $totalWords > 0 ? (int) round($correct / $totalWords * 100) : 0;

        $ayahStatuses = $this->applyPerAyahStatuses($student, $surah->id, $start, $end, $details);

        $check = RecitationCheck::create([
            'student_id' => $student->id,
            'surah_id' => $surah->id,
            'start_ayah' => $start,
            'end_ayah' => $end,
            'score' => $score,
            'correct_count' => $correct,
            'incorrect_count' => $incorrect,
            'missing_count' => $missing,
            'extra_count' => max(0, (int) ($data['extra_count'] ?? 0)),
            'transcript' => $data['transcript'] ?? null,
            'details' => $details,
            'ayah_statuses' => $ayahStatuses !== [] ? $ayahStatuses : null,
            'checked_at' => now(),
        ]);

        $this->progressService->recompute($student);

        return $check;
    }

    /**
     * Perbarui status hafalan per-ayat sesuai skor kata benar di ayat tsb.
     *
     * @return array<int, string> peta {ayah_number: status} yang diperbarui
     */
    private function applyPerAyahStatuses(Student $student, int $surahId, int $start, int $end, array $details): array
    {
        $perAyah = [];
        foreach ($details as $d) {
            $ayahNumber = (int) $d['ayah_number'];
            if ($ayahNumber < $start || $ayahNumber > $end) {
                continue;
            }
            $perAyah[$ayahNumber]['total'] = ($perAyah[$ayahNumber]['total'] ?? 0) + 1;
            if ($d['status'] === 'correct') {
                $perAyah[$ayahNumber]['correct'] = ($perAyah[$ayahNumber]['correct'] ?? 0) + 1;
            }
        }

        $updated = [];
        foreach ($perAyah as $ayahNumber => $stats) {
            if (($stats['total'] ?? 0) === 0) {
                continue;
            }

            $ayahScore = (int) round(($stats['correct'] ?? 0) / $stats['total'] * 100);
            $newStatus = match (true) {
                $ayahScore >= self::SCORE_MEMORIZED => StudentAyahCoverage::STATUS_MEMORIZED,
                $ayahScore >= self::SCORE_IN_PROGRESS => StudentAyahCoverage::STATUS_IN_PROGRESS,
                default => null,
            };
            if ($newStatus === null) {
                continue;
            }

            // Ayat yang tercakup submission bersifat otoritatif — jangan ditimpa.
            $submissionCovered = StudentAyahCoverage::where('student_id', $student->id)
                ->where('surah_id', $surahId)
                ->where('ayah_number', $ayahNumber)
                ->whereNotNull('first_covered_submission_id')
                ->exists();
            if ($submissionCovered) {
                continue;
            }

            StudentAyahCoverage::updateOrCreate(
                [
                    'student_id' => $student->id,
                    'surah_id' => $surahId,
                    'ayah_number' => $ayahNumber,
                ],
                [
                    'memorization_status' => $newStatus,
                    'first_covered_submission_id' => null,
                ]
            );
            $updated[$ayahNumber] = $newStatus;
        }

        return $updated;
    }
}
