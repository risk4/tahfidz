<?php

namespace App\Domain\Tahfidz\Services;

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

        $submission = DB::transaction(function () use ($data) {
            $submission = Submission::create($data);
            $this->syncCoverage($submission);

            return $submission;
        });

        $this->progressService->recompute($submission->student);

        return $submission->load(['student', 'teacher', 'academicYear', 'surah']);
    }

    /**
     * Perbarui submission, lalu bangun ulang coverage & progres siswa.
     */
    public function update(Submission $submission, array $data): Submission
    {
        $data['final_score'] = $this->calculateFinalScore($data);

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
     * Tandai setiap ayat pada rentang surah (start..end) sebagai tercakup
     * bila belum ada — submission pertama yang mencakup ayat tersebut.
     */
    private function syncCoverage(Submission $submission): void
    {
        for ($ayah = $submission->start_ayah; $ayah <= $submission->end_ayah; $ayah++) {
            StudentAyahCoverage::updateOrCreate(
                [
                    'student_id' => $submission->student_id,
                    'surah_id' => $submission->surah_id,
                    'ayah_number' => $ayah,
                ],
                [
                    'memorization_status' => StudentAyahCoverage::STATUS_MEMORIZED,
                    'first_covered_submission_id' => $submission->id,
                ]
            );
        }
    }

    /**
     * Bangun ulang coverage seluruh siswa dari nol (dipakai pada update/delete),
     * mencerminkan submission-submission aktif siswa.
     */
    private function rebuildCoverage(Student $student): void
    {
        StudentAyahCoverage::where('student_id', $student->id)->delete();

        $submissions = Submission::where('student_id', $student->id)
            ->orderBy('submission_date')
            ->orderBy('id')
            ->get(['id', 'surah_id', 'start_ayah', 'end_ayah']);

        foreach ($submissions as $submission) {
            for ($ayah = $submission->start_ayah; $ayah <= $submission->end_ayah; $ayah++) {
                StudentAyahCoverage::updateOrCreate(
                    [
                        'student_id' => $student->id,
                        'surah_id' => $submission->surah_id,
                        'ayah_number' => $ayah,
                    ],
                    [
                        'memorization_status' => StudentAyahCoverage::STATUS_MEMORIZED,
                        'first_covered_submission_id' => $submission->id,
                    ]
                );
            }
        }
    }
}
