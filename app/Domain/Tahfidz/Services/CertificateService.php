<?php

namespace App\Domain\Tahfidz\Services;

use App\Domain\People\Models\Student;
use App\Domain\Settings\Services\SettingsService;
use App\Domain\Tahfidz\Models\Certificate;
use App\Domain\Tahfidz\Models\StudentAyahCoverage;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * Logika sertifikat hafalan: menentukan juz yang sudah tuntas,
 * menerbitkan sertifikat, serta menyusun data siap-render untuk
 * template sertifikat (PDF/print) di sisi klien.
 */
class CertificateService
{
    public function __construct(
        private readonly ProgressService $progress,
        private readonly SettingsService $settings,
    ) {}

    /**
     * Daftar nomor juz yang seluruh ayatnya sudah dihafal santri.
     *
     * @return array<int, int>
     */
    public function completedJuzNumbers(Student $student): array
    {
        $covered = StudentAyahCoverage::where('student_id', $student->id)
            ->where('memorization_status', StudentAyahCoverage::STATUS_MEMORIZED)
            ->get(['surah_id', 'ayah_number'])
            ->groupBy('surah_id')
            ->map(fn ($rows) => $rows->pluck('ayah_number')->map(fn ($n) => (int) $n)->flip()->all());

        if ($covered->isEmpty()) {
            return [];
        }

        $juzAyahs = DB::table('quran_ayahs')
            ->join('quran_juz', 'quran_ayahs.juz_id', '=', 'quran_juz.id')
            ->orderBy('quran_juz.juz_number')
            ->get(['quran_juz.juz_number', 'quran_ayahs.surah_id', 'quran_ayahs.ayah_number'])
            ->groupBy('juz_number');

        $completed = [];

        foreach ($juzAyahs as $juzNumber => $ayahs) {
            $allCovered = $ayahs->every(function ($ayah) use ($covered) {
                return isset($covered[$ayah->surah_id][$ayah->ayah_number]);
            });

            if ($allCovered) {
                $completed[] = (int) $juzNumber;
            }
        }

        return $completed;
    }

    /**
     * Terbitkan sertifikat untuk santri pada tingkat juz tertentu.
     */
    public function issue(
        Student $student,
        int $juzCount,
        string $issuedDate,
        ?string $pembinaName = null,
        ?string $pembinaLabel = null,
        ?string $pengajarName = null,
        ?string $pengajarLabel = null,
        ?string $notes = null,
        ?int $issuedBy = null,
    ): Certificate {
        // Pastikan snapshot progres terbaru sebelum memvalidasi kelayakan.
        $summary = $this->progress->recompute($student);

        $completed = (int) $summary->total_juz_completed;

        if ($completed < $juzCount) {
            throw new InvalidArgumentException(
                "Santri belum menuntaskan {$juzCount} juz (hafalan tuntas saat ini: {$completed} juz)."
            );
        }

        $exists = Certificate::where('student_id', $student->id)
            ->where('juz_count', $juzCount)
            ->exists();

        if ($exists) {
            throw new InvalidArgumentException(
                "Sertifikat tingkat {$juzCount} juz untuk santri ini sudah pernah diterbitkan."
            );
        }

        try {
            return Certificate::create([
                'certificate_number' => $this->generateNumber(),
                'student_id' => $student->id,
                'juz_count' => $juzCount,
                'issued_date' => $issuedDate,
                'pembina_name' => $this->nullIfBlank($pembinaName),
                'pembina_label' => $this->nullIfBlank($pembinaLabel, 'Pembina Tahfidz'),
                'pengajar_name' => $this->nullIfBlank($pengajarName),
                'pengajar_label' => $this->nullIfBlank($pengajarLabel, 'Pengajar Tahfidz'),
                'verification_code' => Str::random(48),
                'notes' => $notes,
                'issued_by' => $issuedBy,
            ]);
        } catch (QueryException $e) {
            // 1062 = duplicate entry — mis. sisa baris soft delete pada
            // database lama atau kondisi balapan dua penerbitan bersamaan.
            if ((int) ($e->errorInfo[1] ?? 0) === 1062) {
                throw new InvalidArgumentException(
                    "Sertifikat tingkat {$juzCount} juz untuk santri ini sudah pernah diterbitkan."
                );
            }

            throw $e;
        }
    }

    /**
     * Normalisasi input teks: kosong → null (atau label bawaan).
     */
    private function nullIfBlank(?string $value, ?string $fallback = null): ?string
    {
        $trimmed = trim((string) $value);

        return $trimmed !== '' ? $trimmed : $fallback;
    }

    /**
     * Label capaian hafalan berdasarkan nomor juz yang benar-benar tuntas.
     * Contoh: "Juz 30", "Juz 26 – 30", "Juz 1 – 30".
     */
    public function juzLabel(Student $student, int $juzCount): string
    {
        $numbers = array_slice(
            array_reverse($this->completedJuzNumbers($student)),
            0,
            max($juzCount, 0),
        );

        if (empty($numbers)) {
            return "Juz {$juzCount}";
        }

        sort($numbers);

        $min = (int) reset($numbers);
        $max = (int) end($numbers);

        // Jika rentang tidak kontinu, tetap tampilkan rentang min–max.
        return $min === $max ? "Juz {$min}" : "Juz {$min} – {$max}";
    }

    /**
     * Data lengkap siap-render untuk satu sertifikat.
     */
    public function payload(Certificate $certificate): array
    {
        $certificate->loadMissing(['student.classRoom:id,name']);

        $profile = $this->settings->rawGroup('profile');

        return [
            'id' => $certificate->id,
            'certificate_number' => $certificate->certificate_number,
            'verification_code' => $certificate->verification_code,
            'juz_count' => (int) $certificate->juz_count,
            'juz_label' => $this->juzLabel($certificate->student, (int) $certificate->juz_count),
            'issued_date' => $certificate->issued_date?->toDateString(),
            'pembina_name' => $certificate->pembina_name,
            'pembina_label' => $certificate->pembina_label ?? 'Pembina Tahfidz',
            'pengajar_name' => $certificate->pengajar_name,
            'pengajar_label' => $certificate->pengajar_label ?? 'Pengajar Tahfidz',
            'notes' => $certificate->notes,
            'institution_name' => $profile['name'] ?? null,
            'institution_city' => $profile['city'] ?? null,
            'institution_logo_path' => $profile['logo_path'] ?? null,
            'institution_seal_path' => $this->settings->rawGroup('certificate')['seal_path'] ?? null,
            'student' => [
                'id' => $certificate->student?->id,
                'name' => $certificate->student?->name,
                'student_code' => $certificate->student?->student_code,
                'class_name' => $certificate->student?->classRoom?->name,
            ],
        ];
    }

    /**
     * Nomor sertifikat berurutan per tahun: SRT/{tahun}/{bulan}/{nomor urut}.
     */
    private function generateNumber(): string
    {
        $year = now()->format('Y');
        $month = now()->format('m');

        $sequence = Certificate::withTrashed()
            ->whereYear('created_at', $year)
            ->count() + 1;

        // Cegah tabrakan nomor bila data lama dipulihkan dari soft delete.
        do {
            $number = sprintf('SRT/%s/%s/%04d', $year, $month, $sequence);
            $sequence++;
        } while (Certificate::withTrashed()->where('certificate_number', $number)->exists());

        return $number;
    }
}
