<?php

namespace App\Domain\Tahfidz\Services;

use App\Domain\Notifications\Services\NotificationService;
use App\Domain\People\Models\Student;
use App\Domain\Tahfidz\Models\StudentAyahCoverage;
use App\Domain\Tahfidz\Models\Submission;
use Illuminate\Support\Facades\DB;

/**
 * Business logic seputar submission: perhitungan final_score,
 * sinkronisasi student_ayah_coverage, dan refresh progres siswa.
 */
class SubmissionService
{
    public function __construct(
        private readonly ProgressService $progressService,
        private readonly NotificationService $notifications,
    ) {
    }

    /**
     * final_score adalah rata-rata dari 4 sub-skor (masing-masing 0-100).
     */
    public function calculateFinalScore(array $data): float
    {
        $scores = [
            (float) $data['fluency_score'],
            (float) $data['tajwid_score'],
            (float) $data['makhraj_score'],
            (float) $data['fashahah_score'],
        ];

        return round(array_sum($scores) / count($scores), 2);
    }

    /**
     * Simpan submission baru, sinkronkan coverage, dan perbarui progres.
     */
    public function create(array $data): Submission
    {
        $data['final_score'] = $this->calculateFinalScore($data);
        $data['status'] = $data['status'] ?? 'approved';

        $submission = DB::transaction(function () use ($data) {
            $submission = Submission::create($data);
            $this->syncCoverage($submission);

            return $submission;
        });

        $this->progressService->recompute($submission->student);

        $this->notifications->send('setoran', $submission->student->user?->email, [
            'nama' => $submission->student->name,
        ], $submission->student_id);

        return $submission->load(['student', 'teacher', 'academicYear', 'surah']);
    }

    /**
     * Perbarui submission, lalu bangun ulang coverage & progres siswa.
     */
    public function update(Submission $submission, array $data): Submission
    {
        $data['final_score'] = $this->calculateFinalScore($data);
        $data['status'] = $data['status'] ?? $submission->status ?? 'approved';

        DB::transaction(function () use ($submission, $data) {
            $submission->update($data);
            $this->rebuildCoverage($submission->student);
        });

        $this->progressService->recompute($submission->student);

        return $submission->fresh(['student', 'teacher', 'academicYear', 'surah']);
    }

    /**
     * Hapus submission, lalu bangun ulang coverage & progres siswa.
     */
    public function delete(Submission $submission): void
    {
        $student = $submission->student;

        DB::transaction(function () use ($submission, $student) {
            $submission->delete();
            $this->rebuildCoverage($student);
        });

        $this->progressService->recompute($student);
    }

    /**
     * Tandai setiap ayat pada rentang surah (start..end) sebagai tercakup —
     * submission pertama yang mencakup ayat tersebut yang dicatat sebagai
     * first_covered_submission_id. Atribusi tidak ditimpa oleh submission
     * berikutnya yang mencakup ayat yang sama.
     */
    private function syncCoverage(Submission $submission): void
    {
        for ($ayah = $submission->start_ayah; $ayah <= $submission->end_ayah; $ayah++) {
            $coverage = StudentAyahCoverage::firstOrNew([
                'student_id' => $submission->student_id,
                'surah_id' => $submission->surah_id,
                'ayah_number' => $ayah,
            ]);

            $coverage->memorization_status = StudentAyahCoverage::STATUS_MEMORIZED;

            // Baris yang sudah dimiliki submission lain tidak ditimpa.
            // Baris baru atau baris milik murajaah (NULL) diadopsi submission ini.
            if (! $coverage->exists || $coverage->first_covered_submission_id === null) {
                $coverage->first_covered_submission_id = $submission->id;
            }

            $coverage->save();
        }
    }

    /**
     * Bangun ulang coverage siswa dari submission-submission aktif
     * (dipakai pada update/delete submission).
     *
     * Hanya baris milik submission (first_covered_submission_id terisi) yang
     * dihapus & dibangun ulang. Catatan per-ayat dari murajaah
     * (first_covered_submission_id NULL) dipertahankan agar status hafalan
     * dari murajaah tidak hilang saat submission diubah/dihapus.
     */
    private function rebuildCoverage(Student $student): void
    {
        StudentAyahCoverage::where('student_id', $student->id)
            ->whereNotNull('first_covered_submission_id')
            ->delete();

        $submissions = Submission::where('student_id', $student->id)
            ->orderBy('submission_date')
            ->orderBy('id')
            ->get(['id', 'surah_id', 'start_ayah', 'end_ayah']);

        // Submission diproses dari yang paling awal, sehingga submission pertama
        // yang mencakup sebuah ayat yang mencatat first_covered_submission_id;
        // submission berikutnya tidak menimpa atribusi tersebut.
        foreach ($submissions as $submission) {
            for ($ayah = $submission->start_ayah; $ayah <= $submission->end_ayah; $ayah++) {
                $coverage = StudentAyahCoverage::firstOrNew([
                    'student_id' => $student->id,
                    'surah_id' => $submission->surah_id,
                    'ayah_number' => $ayah,
                ]);

                $coverage->memorization_status = StudentAyahCoverage::STATUS_MEMORIZED;

                if (! $coverage->exists || $coverage->first_covered_submission_id === null) {
                    $coverage->first_covered_submission_id = $submission->id;
                }

                $coverage->save();
            }
        }
    }
}
