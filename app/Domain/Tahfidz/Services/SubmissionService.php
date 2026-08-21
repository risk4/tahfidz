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
    ) {}

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
     *
     * Implementasi batch: satu SELECT untuk membaca kondisi awal, lalu
     * maksimal tiga operasi tulis (INSERT massal untuk ayat baru, UPDATE
     * adopsi untuk baris warisan murajaah, UPDATE status untuk baris milik
     * submission lain) — bukan query per-ayat.
     */
    private function syncCoverage(Submission $submission): void
    {
        $ayahs = range($submission->start_ayah, $submission->end_ayah);

        $existing = StudentAyahCoverage::query()
            ->where('student_id', $submission->student_id)
            ->where('surah_id', $submission->surah_id)
            ->whereIn('ayah_number', $ayahs)
            ->get()
            ->keyBy('ayah_number');

        $missing = [];
        $orphanAyahs = []; // ada barisnya, tapi belum dimiliki submission mana pun
        $ownedAyahs = [];  // sudah dimiliki submission lain — atribusi dipertahankan

        foreach ($ayahs as $ayah) {
            $row = $existing->get($ayah);

            if ($row === null) {
                $missing[] = $ayah;
            } elseif ($row->first_covered_submission_id === null) {
                $orphanAyahs[] = $ayah;
            } else {
                $ownedAyahs[] = $ayah;
            }
        }

        $now = now();

        if ($missing !== []) {
            StudentAyahCoverage::insert(array_map(fn ($ayah) => [
                'student_id' => $submission->student_id,
                'surah_id' => $submission->surah_id,
                'ayah_number' => $ayah,
                'memorization_status' => StudentAyahCoverage::STATUS_MEMORIZED,
                'first_covered_submission_id' => $submission->id,
                'created_at' => $now,
                'updated_at' => $now,
            ], $missing));
        }

        // Baris warisan murajaah (owner NULL) diadopsi submission ini.
        if ($orphanAyahs !== []) {
            StudentAyahCoverage::query()
                ->where('student_id', $submission->student_id)
                ->where('surah_id', $submission->surah_id)
                ->whereIn('ayah_number', $orphanAyahs)
                ->update([
                    'memorization_status' => StudentAyahCoverage::STATUS_MEMORIZED,
                    'first_covered_submission_id' => $submission->id,
                    'updated_at' => $now,
                ]);
        }

        // Baris milik submission lain: cukup pastikan berstatus memorized.
        if ($ownedAyahs !== []) {
            StudentAyahCoverage::query()
                ->where('student_id', $submission->student_id)
                ->where('surah_id', $submission->surah_id)
                ->whereIn('ayah_number', $ownedAyahs)
                ->update([
                    'memorization_status' => StudentAyahCoverage::STATUS_MEMORIZED,
                    'updated_at' => $now,
                ]);
        }
    }

    /**
     * Bangun ulang coverage siswa dari submission-submission aktif
     * (dipakai pada update/delete submission).
     *
     * Hanya baris milik submission (first_covered_submission_id terisi) yang
     * dihapus & dibangun ulang. Catatan per-ayat dari murajaah
     * (first_covered_submission_id NULL) dipertahankan agar status hafalan
     * dari murajaah tidak hilang saat submission diubah/dihapus — bila
     * ayatnya kini dicakup submission, baris tersebut diadopsi alih-alih
     * dibuat ulang.
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
        // yang mencakup sebuah ayat yang mencatat atribusi (prinsip first-wins);
        // submission berikutnya tidak menimpa atribusi tersebut.
        $attributed = [];
        foreach ($submissions as $submission) {
            for ($ayah = $submission->start_ayah; $ayah <= $submission->end_ayah; $ayah++) {
                $attributed[$submission->surah_id][$ayah] ??= $submission->id;
            }
        }

        if ($attributed === []) {
            return;
        }

        // Baris warisan murajaah yang selamat dari delete di atas dan kini
        // dicakup oleh submission harus DIADOPSI (bukan insert ulang —
        // constraint uniq_student_ayah akan melarang duplikat).
        $orphanKeys = StudentAyahCoverage::where('student_id', $student->id)
            ->whereNull('first_covered_submission_id')
            ->get(['surah_id', 'ayah_number'])
            ->mapWithKeys(fn ($row) => [$row->surah_id.'-'.$row->ayah_number => true])
            ->all();

        $adoptions = []; // [surah_id][submission_id][] = daftar ayat yang diadopsi
        $toInsert = [];
        $now = now();

        foreach ($attributed as $surahId => $owners) {
            foreach ($owners as $ayah => $submissionId) {
                if (isset($orphanKeys[$surahId.'-'.$ayah])) {
                    $adoptions[$surahId][$submissionId][] = $ayah;
                } else {
                    $toInsert[] = [
                        'student_id' => $student->id,
                        'surah_id' => $surahId,
                        'ayah_number' => $ayah,
                        'memorization_status' => StudentAyahCoverage::STATUS_MEMORIZED,
                        'first_covered_submission_id' => $submissionId,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
            }
        }

        foreach ($adoptions as $surahId => $bySubmission) {
            foreach ($bySubmission as $submissionId => $ayahs) {
                StudentAyahCoverage::query()
                    ->where('student_id', $student->id)
                    ->where('surah_id', $surahId)
                    ->whereIn('ayah_number', $ayahs)
                    ->update([
                        'memorization_status' => StudentAyahCoverage::STATUS_MEMORIZED,
                        'first_covered_submission_id' => $submissionId,
                        'updated_at' => $now,
                    ]);
            }
        }

        foreach (array_chunk($toInsert, 500) as $chunk) {
            StudentAyahCoverage::insert($chunk);
        }
    }
}
