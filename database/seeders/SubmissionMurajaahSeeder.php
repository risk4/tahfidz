<?php

namespace Database\Seeders;

use App\Domain\Academic\Models\AcademicYear;
use App\Domain\People\Models\Student;
use App\Domain\People\Models\Teacher;
use App\Domain\Quran\Models\QuranSurah;
use App\Domain\Tahfidz\Models\Murajaah;
use App\Domain\Tahfidz\Models\StudentAyahCoverage;
use App\Domain\Tahfidz\Models\StudentProgressSummary;
use App\Domain\Tahfidz\Models\Submission;
use App\Domain\Tahfidz\Services\ProgressService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeder data contoh setoran & muraja'ah untuk mengisi dashboard.
 *
 * Membuat:
 *   - target hafalan + cakupan ayat (student_ayah_coverage) per santri,
 *   - setoran & muraja'ah selama 30 hari terakhir dengan variasi status,
 *   - ringkasan progres (student_progress_summary) via ProgressService.
 *
 * Aman dijalankan ulang: data milik seeder ini dibersihkan dulu di awal.
 */
class SubmissionMurajaahSeeder extends Seeder
{
    public function run(): void
    {
        $year = AcademicYear::where('is_active', true)->first() ?? AcademicYear::first();
        $students = Student::where('status', 'active')->orderBy('id')->get();
        $teachers = Teacher::where('status', 'active')->orderBy('id')->get();
        $surahs = QuranSurah::orderBy('surah_number')->limit(25)->get(['id', 'surah_number', 'total_ayahs']);

        if (! $year || $students->isEmpty() || $teachers->isEmpty() || $surahs->isEmpty()) {
            $this->command->warn('Seeder Submission/Murajaah dilewati: data dasar (tahun ajaran/santri/guru/surah) belum lengkap.');

            return;
        }

        // Bersihkan data lama milik seeder ini agar bisa dijalankan ulang.
        Submission::query()->forceDelete();
        Murajaah::query()->forceDelete();
        StudentAyahCoverage::query()->delete();
        StudentProgressSummary::query()->delete();

        $surahList = $surahs->all();
        $statuses = ['approved', 'approved', 'approved', 'approved', 'approved', 'approved', 'revision', 'pending', 'rejected'];
        $methods = ['independent', 'repeated', 'group', 'guided'];
        $teacherIds = $teachers->pluck('id')->all();
        $progressByIndex = [100, 78, 45, 90, 55, 35]; // persentase cakupan target per santri

        // ------------------------------------------------------------------
        // 1. Target hafalan & cakupan ayat (agar KPI/progress dashboard terisi)
        // ------------------------------------------------------------------
        foreach ($students as $i => $student) {
            $targetJuz = 1 + ($i % 3); // 1-3 juz
            $student->update([
                'memorization_target' => $targetJuz,
                'starting_juz' => 30,
            ]);

            $this->seedCoverage($student, $targetJuz, 30, ($progressByIndex[$i % count($progressByIndex)] ?? 50) / 100);
        }

        // ------------------------------------------------------------------
        // 2. Setoran & muraja'ah selama 30 hari terakhir
        // ------------------------------------------------------------------
        for ($day = 29; $day >= 0; $day--) {
            $date = today()->subDays($day);

            foreach ($students as $student) {
                // Sebagian hari sengaja kosong agar tren chart tidak kaku.
                if (random_int(1, 100) <= 25) {
                    continue;
                }

                foreach (range(1, random_int(0, 2)) as $_) {
                    $this->createSubmission($date, $student, $year->id, $teacherIds, $surahList, $statuses);
                }

                foreach (range(1, random_int(0, 2)) as $_) {
                    $this->createMurajaah($date, $student, $year->id, $teacherIds, $surahList, $statuses, $methods);
                }
            }
        }

        // ------------------------------------------------------------------
        // 3. Hitung ulang ringkasan progres (student_progress_summary)
        // ------------------------------------------------------------------
        $progress = app(ProgressService::class);
        foreach ($students as $student) {
            $progress->recompute($student);
        }

        $this->command->info(sprintf(
            'Seeder Submission/Murajaah selesai: %d setoran, %d murajaah.',
            Submission::count(),
            Murajaah::count()
        ));
    }

    private function createSubmission(
        \Illuminate\Support\Carbon $date,
        Student $student,
        int $yearId,
        array $teacherIds,
        array $surahList,
        array $statuses
    ): void {
        [$surahId, $start, $end] = $this->pickSurahRange($surahList);
        $scores = $this->scores();

        Submission::create([
            'student_id' => $student->id,
            'teacher_id' => $teacherIds[array_rand($teacherIds)],
            'academic_year_id' => $yearId,
            'submission_date' => $date->format('Y-m-d'),
            'submission_time' => $this->randomTime(),
            'surah_id' => $surahId,
            'start_ayah' => $start,
            'end_ayah' => $end,
            'type' => random_int(0, 1) ? 'new_memorization' : 'repetition',
            'fluency_score' => $scores[0],
            'tajwid_score' => $scores[1],
            'makhraj_score' => $scores[2],
            'fashahah_score' => $scores[3],
            'final_score' => round(array_sum($scores) / 4, 2),
            'page_count' => max(0.5, round(($end - $start + 1) / 15, 1)),
            'status' => $statuses[array_rand($statuses)],
            'notes' => null,
        ]);
    }

    private function createMurajaah(
        \Illuminate\Support\Carbon $date,
        Student $student,
        int $yearId,
        array $teacherIds,
        array $surahList,
        array $statuses,
        array $methods
    ): void {
        [$surahId, $start, $end] = $this->pickSurahRange($surahList);
        $scores = $this->scores();

        Murajaah::create([
            'student_id' => $student->id,
            'teacher_id' => $teacherIds[array_rand($teacherIds)],
            'academic_year_id' => $yearId,
            'date' => $date->format('Y-m-d'),
            'time' => $this->randomTime(),
            'juz' => random_int(1, 5),
            'surah_id' => $surahId,
            'start_ayah' => $start,
            'end_ayah' => $end,
            'page_count' => max(0.5, round(($end - $start + 1) / 15, 2)),
            'method' => $methods[array_rand($methods)],
            'duration_minutes' => random_int(15, 60),
            'fluency_score' => $scores[0],
            'tajwid_score' => $scores[1],
            'makhraj_score' => $scores[2],
            'fashahah_score' => $scores[3],
            'final_score' => round(array_sum($scores) / 4, 2),
            'status' => $statuses[array_rand($statuses)],
            'notes' => null,
        ]);
    }

    /** Pilih surah + rentang ayat acak yang valid. */
    private function pickSurahRange(array $surahList): array
    {
        $surah = $surahList[array_rand($surahList)];
        $maxStart = max(1, (int) $surah->total_ayahs - 5);
        $start = random_int(1, $maxStart);
        $end = min((int) $surah->total_ayahs, $start + random_int(2, 14));

        return [$surah->id, $start, $end];
    }

    private function scores(): array
    {
        return [
            random_int(62, 100),
            random_int(62, 100),
            random_int(62, 100),
            random_int(62, 100),
        ];
    }

    private function randomTime(): string
    {
        return sprintf('%02d:%02d:00', random_int(7, 15), random_int(0, 59));
    }

    /**
     * Tandai sejumlah ayat dari rentang juz target sebagai "memorized"
     * (cakupan berurutan dari awal juz) agar progress terhitung di dashboard.
     */
    private function seedCoverage(Student $student, int $targetJuz, int $startJuz, float $pct): void
    {
        $juzNumbers = [];
        for ($i = 0; $i < $targetJuz; $i++) {
            $j = $startJuz - $i;
            if ($j < 1) {
                $j += 30;
            }
            $juzNumbers[] = $j;
        }
        $juzNumbers = array_values(array_unique($juzNumbers));

        $targetAyahs = DB::table('quran_ayahs')
            ->join('quran_juz', 'quran_ayahs.juz_id', '=', 'quran_juz.id')
            ->whereIn('quran_juz.juz_number', $juzNumbers)
            ->select('quran_ayahs.surah_id', 'quran_ayahs.ayah_number')
            ->orderBy('quran_ayahs.id')
            ->get();

        $take = (int) floor($targetAyahs->count() * $pct);
        if ($take <= 0) {
            return;
        }

        $now = now();
        $rows = $targetAyahs->take($take)->map(fn ($ayah) => [
            'student_id' => $student->id,
            'surah_id' => $ayah->surah_id,
            'ayah_number' => $ayah->ayah_number,
            'memorization_status' => StudentAyahCoverage::STATUS_MEMORIZED,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('student_ayah_coverage')->insert($rows->all());
    }
}
