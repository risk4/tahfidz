<?php

namespace App\Domain\Tahfidz\Services;

use App\Domain\People\Models\Student;
use App\Domain\Tahfidz\Models\Murajaah;
use App\Domain\Tahfidz\Models\StudentAyahCoverage;
use App\Domain\Tahfidz\Models\StudentProgressSummary;
use App\Domain\Tahfidz\Models\Submission;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Data hafalan siswa untuk halaman publik "Lihat Hafalan" (tanpa
 * autentikasi, dicari lewat NISN).
 *
 * Prinsip keamanan: endpoint ini bersifat publik sehingga payload
 * hanya memuat informasi hafalan + identitas minimum (nama, kelas,
 * tahun masuk). Data pribadi sensitif — alamat, telepon, NIK, orang
 * tua, tanggal lahir, nomor induk — tidak pernah diekspos.
 */
class PublicHafalanService
{
    /** Rentang data grafik aktivitas harian. */
    public const CHART_DAYS = 30;

    public function __construct(private readonly ProgressService $progressService) {}

    /**
     * Cari siswa berdasarkan NISN persis. Jika NISN terduplikasi,
     * siswa berstatus aktif diprioritaskan.
     */
    public function findByNisn(string $nisn): ?Student
    {
        $nisn = trim($nisn);

        if ($nisn === '') {
            return null;
        }

        return Student::query()
            ->with(['classRoom:id,name', 'academicYear:id,name'])
            ->where('nisn', $nisn)
            ->get()
            ->sortBy(fn (Student $student) => $student->isActive() ? 0 : 1)
            ->first();
    }

    /**
     * Susun payload publik untuk satu siswa.
     */
    public function payload(Student $student): array
    {
        $summary = StudentProgressSummary::find($student->id)
            ?? $this->progressService->recompute($student);

        return [
            'student' => [
                'name' => $student->name,
                'gender' => $student->gender,
                'status' => $student->status,
                'entry_year' => $student->entry_year,
                'class_name' => $student->classRoom?->name,
                'academic_year' => $student->academicYear?->name,
            ],
            'summary' => [
                'total_juz_completed' => (int) ($summary->total_juz_completed ?? 0),
                'total_surah_completed' => (int) ($summary->total_surah_completed ?? 0),
                'total_ayah_covered' => (int) ($summary->total_ayah_covered ?? 0),
                'progress_percentage' => (float) ($summary->progress_percentage ?? 0),
                'average_score' => $summary->average_score === null ? null : (float) $summary->average_score,
                'last_submission_at' => $summary->last_submission_at?->toDateString(),
                'memorization_target' => $student->memorization_target,
                'starting_juz' => $student->starting_juz,
            ],
            'stats' => $this->stats($student),
            'chart' => $this->chart($student),
            'surah_progress' => $this->startedSurahs($student),
            'recent' => $this->recent($student),
        ];
    }

    /**
     * Rekap jumlah setoran & muroja'ah sepanjang waktu (untuk kartu statistik).
     */
    private function stats(Student $student): array
    {
        $setoran = Submission::where('student_id', $student->id)->count();
        $murajaah = Murajaah::where('student_id', $student->id)->count();

        $setoranBulanIni = Submission::where('student_id', $student->id)
            ->whereBetween('submission_date', [Carbon::now()->startOfMonth(), Carbon::now()->endOfMonth()])
            ->count();

        $murajaahBulanIni = Murajaah::where('student_id', $student->id)
            ->whereBetween('date', [Carbon::now()->startOfMonth(), Carbon::now()->endOfMonth()])
            ->count();

        return [
            'total_setoran' => $setoran,
            'total_murajaah' => $murajaah,
            'setoran_this_month' => $setoranBulanIni,
            'murajaah_this_month' => $murajaahBulanIni,
        ];
    }

    /**
     * Deret aktivitas harian (setoran + muroja'ah) untuk grafik.
     * Tanggal tanpa aktivitas tetap diisi 0 agar sumbu waktu kontinu.
     */
    private function chart(Student $student): array
    {
        $start = Carbon::today()->subDays(self::CHART_DAYS - 1);

        $subRows = Submission::query()
            ->where('student_id', $student->id)
            ->where('submission_date', '>=', $start)
            ->selectRaw('DATE(submission_date) as d, COUNT(*) as c, COALESCE(SUM(page_count), 0) as pages')
            ->groupBy('d')
            ->get();

        $murRows = Murajaah::query()
            ->where('student_id', $student->id)
            ->where('date', '>=', $start)
            ->selectRaw('DATE(date) as d, COUNT(*) as c, COALESCE(SUM(page_count), 0) as pages')
            ->groupBy('d')
            ->get();

        $subCount = $subRows->pluck('c', 'd');
        $subPages = $subRows->pluck('pages', 'd');
        $murCount = $murRows->pluck('c', 'd');
        $murPages = $murRows->pluck('pages', 'd');

        $series = [];

        for ($i = 0; $i < self::CHART_DAYS; $i++) {
            $date = $start->copy()->addDays($i);
            $key = $date->format('Y-m-d');

            $series[] = [
                'date' => $key,
                'label' => $date->format('d M'),
                'setoran' => (int) ($subCount[$key] ?? 0),
                'setoran_pages' => (float) ($subPages[$key] ?? 0),
                'murajaah' => (int) ($murCount[$key] ?? 0),
                'murajaah_pages' => (float) ($murPages[$key] ?? 0),
            ];
        }

        return $series;
    }

    /**
     * Progres per surah. Nol ayat ditandai progress 0; baris dengan
     * setoran tetap ikut tampil karena berguna untuk menampilkan
     * riwayat per surah pada halaman publik.
     */
    public function surahProgress(Student $student): Collection
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
                'quran_surahs.name_arabic',
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
                'quran_surahs.name_arabic',
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
                    'name_arabic' => $surah->name_arabic,
                    'total_ayahs' => (int) $surah->total_ayahs,
                    'covered_ayahs' => (int) $surah->covered_ayahs,
                    'progress_percentage' => (float) $surah->progress_percentage,
                    'average_score' => $surah->average_score === null ? null : (float) $surah->average_score,
                    'last_submission_at' => $surah->last_submission_at,
                ];
            });
    }

    /**
     * Surah yang benar-benar disentuh siswa (punya ayat terhafal
     * atau setidaknya satu setoran) — payload lebih ringan untuk
     * tampilan publik.
     */
    public function startedSurahs(Student $student): Collection
    {
        return $this->surahProgress($student)
            ->filter(fn (array $surah) => $surah['covered_ayahs'] > 0 || $surah['last_submission_at'] !== null)
            ->values();
    }

    /**
     * Setoran terakhir siswa (maksimal 5).
     */
    private function recent(Student $student): Collection
    {
        return Submission::query()
            ->with('surah:id,name_latin')
            ->where('student_id', $student->id)
            ->orderByDesc('submission_date')
            ->orderByDesc('id')
            ->take(5)
            ->get()
            ->map(fn (Submission $submission) => [
                'submission_date' => $submission->submission_date?->toDateString(),
                'surah_name' => $submission->surah?->name_latin,
                'start_ayah' => (int) $submission->start_ayah,
                'end_ayah' => (int) $submission->end_ayah,
                'type' => $submission->type,
                'status' => $submission->status,
                'final_score' => $submission->final_score === null ? null : (float) $submission->final_score,
            ]);
    }
}
