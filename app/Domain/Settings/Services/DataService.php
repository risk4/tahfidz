<?php

namespace App\Domain\Settings\Services;

use App\Domain\People\Models\Student;
use App\Domain\People\Models\Teacher;
use App\Domain\People\Models\User;
use App\Domain\Tahfidz\Models\Certificate;
use App\Domain\Tahfidz\Models\Murajaah;
use App\Domain\Tahfidz\Models\RecitationCheck;
use App\Domain\Tahfidz\Models\StudentAyahCoverage;
use App\Domain\Tahfidz\Models\StudentProgressSummary;
use App\Domain\Tahfidz\Models\Submission;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Fitur "Hapus Data" — penghapusan total seluruh data operasional lembaga.
 *
 * Menghapus: guru/pembimbing, siswa/santri, setoran & murajaah, progress
 * hafalan (ayah coverage + summary), sertifikat, SERTA akun login yang
 * melekat pada guru/siswa. Pengaturan aplikasi dan akun super admin tetap
 * dipertahankan.
 *
 * Penghapusan dilindungi captcha (challenge aritmetika berbasis cache)
 * sehingga terhindar dari reset data yang tidak disengaja.
 */
class DataService
{
    /** Awalan kunci cache untuk challenge captcha. */
    private const CAPTCHA_PREFIX = 'data_wipe_captcha_';

    private const CAPTCHA_TTL_SECONDS = 300;

    /**
     * Buat challenge captcha baru berupa soal penjumlahan sederhana.
     *
     * Kunci (berisi jawaban) disimpan di cache 5 menit, jadi tidak perlu
     * bergantung pada session (request API Sanctum tidak mengaktifkan session).
     *
     * @return array{token: string, question: string}
     */
    public function generateCaptcha(): array
    {
        $a = random_int(3, 20);
        $b = random_int(2, 15);
        $answer = (string) ($a + $b);

        $token = Str::random(40);

        Cache::put(self::CAPTCHA_PREFIX.$token, $answer, now()->addSeconds(self::CAPTCHA_TTL_SECONDS));

        return [
            'token' => $token,
            'question' => "Berapakah hasil dari {$a} + {$b}?",
        ];
    }

    /**
     * Verifikasi jawaban captcha. Jawaban yang benar akan "dikonsumsi"
     * (kunci dihapus) sehingga token hanya bisa dipakai sekali.
     */
    public function verifyCaptcha(string $token, string $answer): bool
    {
        $key = self::CAPTCHA_PREFIX.$token;
        $expected = Cache::get($key);

        if ($expected === null) {
            return false;
        }

        Cache::forget($key);

        return hash_equals((string) $expected, trim($answer));
    }

    /** Hitung jumlah data yang akan dihapus (untuk pesan konfirmasi). */
    public function counts(): array
    {
        return [
            'teachers' => Teacher::withTrashed()->count(),
            'students' => Student::withTrashed()->count(),
            'submissions' => Submission::withTrashed()->count(),
            'murajaahs' => Murajaah::withTrashed()->count(),
            'certificates' => Certificate::withTrashed()->count(),
            'recitations' => RecitationCheck::count(),
            'users' => User::query()
                ->where(function ($q) {
                    $q->whereHas('teacher')->orWhereHas('student');
                })
                ->count(),
        ];
    }

    /**
     * Lakukan penghapusan total data operasional.
     *
     * @return array<string, int> jumlah tiap entitas yang dihapus
     */
    public function wipe(): array
    {
        $before = $this->counts();

        DB::transaction(function () {
            // Tangkap user_id milik guru & siswa SEBELUM profil dihapus,
            // karena setelah hard-delete relasi whereHas tidak akan
            // menemukan barisnya lagi.
            $teacherUserIds = Teacher::withTrashed()->whereNotNull('user_id')->pluck('user_id');
            $studentUserIds = Student::withTrashed()->whereNotNull('user_id')->pluck('user_id');
            $userIds = $teacherUserIds->merge($studentUserIds)->unique()->values();

            // 1. Turunkan baris anak yang merujuk students/teachers terlebih
            //    dahulu. FK submissions.teacher_id / murajaahs.teacher_id
            //    memakai restrictOnDelete, jadi wajib dibersihkan sebelum guru.
            Submission::withTrashed()->forceDelete();
            Murajaah::withTrashed()->forceDelete();
            Certificate::withTrashed()->forceDelete();
            RecitationCheck::query()->delete();
            StudentAyahCoverage::query()->delete();
            StudentProgressSummary::query()->delete();

            // 2. Baru hapus profil guru & siswa.
            Teacher::withTrashed()->forceDelete();
            Student::withTrashed()->forceDelete();

            // 3. Hapus akun login milik guru/siswa. Safe-guard: jangan pernah
            //    menghapus super admin (akun yang menjalankan fitur ini).
            User::query()
                ->whereIn('id', $userIds)
                ->where('role', '!=', 'super_admin')
                ->delete();
        });

        return [
            'teachers' => $before['teachers'],
            'students' => $before['students'],
            'submissions' => $before['submissions'],
            'murajaahs' => $before['murajaahs'],
            'certificates' => $before['certificates'],
            'recitations' => $before['recitations'],
            'users' => $before['users'],
        ];
    }
}
