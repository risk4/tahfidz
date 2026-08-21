<?php

namespace Tests\Feature;

use App\Domain\Academic\Models\AcademicYear;
use App\Domain\Academic\Models\ClassRoom;
use App\Domain\Notifications\Models\NotificationLog;
use App\Domain\People\Models\Student;
use App\Domain\People\Models\Teacher;
use App\Domain\People\Models\User;
use App\Domain\Quran\Models\QuranSurah;
use App\Domain\Settings\Models\AppSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Regression test hardening hasil audit (lanjutan SecurityAuditFixesTest):
 *  - guru tanpa profil Teacher tidak lagi melihat santri kelas tanpa wali
 *  - validasi audio_path menolak skema berbahaya (javascript:, dsb.)
 *  - penghapusan log aktivitas mempertahankan jejak 24 jam terakhir
 *  - nama aplikasi di email reset di-escape dari HTML
 */
class SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $email, string $role = 'super_admin'): User
    {
        return User::create([
            'name' => 'Pengguna '.strtok($email, '@'),
            'email' => $email,
            'password' => bcrypt('password-lama-123'),
            'role' => $role,
            'is_active' => true,
            'must_change_password' => false,
        ]);
    }

    private function makeContext(): array
    {
        $year = AcademicYear::create([
            'name' => '2025/2026',
            'start_date' => '2025-07-01',
            'end_date' => '2026-06-30',
            'is_active' => true,
        ]);

        $class = ClassRoom::create([
            'name' => '7A',
            'grade' => 7,
            'academic_year_id' => $year->id,
        ]);

        return [$year, $class];
    }

    /* ====================================================================
     * Scope binaan — guru tanpa profil Teacher harus melihat daftar kosong,
     * bukan santri pada kelas yang belum memiliki wali (bug whereNull).
     * ==================================================================== */

    public function test_guru_tanpa_profil_tidak_melihat_santri_kelas_tanpa_wali(): void
    {
        [$year, $class] = $this->makeContext();

        // Kelas tanpa wali kelas + halaqah tanpa pembimbing = "umpan" bug lama.
        Student::create([
            'student_code' => 'STR-901',
            'name' => 'Santri Kelas Yatim Wali',
            'gender' => 'L',
            'class_id' => $class->id,
            'academic_year_id' => $year->id,
        ]);

        Sanctum::actingAs($this->makeUser('guru-tanpa-profil@example.com', 'teacher'));

        $this->getJson('/api/students')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->getJson('/api/tahfidz-groups')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_guru_wali_kelas_tetap_melihat_santri_binaannya(): void
    {
        [$year, $class] = $this->makeContext();

        $teacherUser = $this->makeUser('wali@example.com', 'teacher');
        $teacher = Teacher::create([
            'user_id' => $teacherUser->id,
            'teacher_code' => 'GR-901',
            'name' => 'Ust. Wali Kelas',
        ]);
        $class->update(['homeroom_teacher_id' => $teacher->id]);

        Student::create([
            'student_code' => 'STR-902',
            'name' => 'Santri Binaan',
            'gender' => 'P',
            'class_id' => $class->id,
            'academic_year_id' => $year->id,
        ]);

        // Santri lain di kelas berbeda tidak boleh ikut muncul.
        $otherClass = ClassRoom::create([
            'name' => '8A',
            'grade' => 8,
            'academic_year_id' => $year->id,
        ]);
        Student::create([
            'student_code' => 'STR-903',
            'name' => 'Santri Kelas Lain',
            'gender' => 'L',
            'class_id' => $otherClass->id,
            'academic_year_id' => $year->id,
        ]);

        Sanctum::actingAs($teacherUser);

        $this->getJson('/api/students')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Santri Binaan');
    }

    /* ====================================================================
     * Validasi audio_path — nilai dirender sebagai <audio src> di frontend.
     * ==================================================================== */

    public function test_audio_path_menolak_skema_berbahaya_dan_menerima_url_https(): void
    {
        Sanctum::actingAs($this->makeUser('admin@example.com'));

        [$year, $class] = $this->makeContext();

        $student = Student::create([
            'student_code' => 'STR-910',
            'name' => 'Santri Audio',
            'gender' => 'L',
            'class_id' => $class->id,
            'academic_year_id' => $year->id,
        ]);

        $surah = QuranSurah::create([
            'surah_number' => 1,
            'name_arabic' => 'الفاتحة',
            'name_latin' => 'Al-Fatihah',
            'translation' => 'Pembukaan',
            'total_ayahs' => 7,
        ]);

        $teacher = Teacher::create([
            'user_id' => null,
            'teacher_code' => 'GR-910',
            'name' => 'Ust. Pencatat',
        ]);

        $payload = fn (string $date, ?string $audio) => [
            'student_id' => $student->id,
            'teacher_id' => $teacher->id,
            'submission_date' => $date,
            'type' => 'new_memorization',
            'method' => 'setoran',
            'surah_id' => $surah->id,
            'start_ayah' => 1,
            'end_ayah' => 3,
            'page_count' => 1,
            'fluency_score' => 80,
            'tajwid_score' => 80,
            'makhraj_score' => 80,
            'fashahah_score' => 80,
            'audio_path' => $audio,
        ];

        foreach (['javascript:alert(1)', 'data:text/html;base64,AAAA', '/../../etc/passwd'] as $evil) {
            $this->postJson('/api/submissions', $payload('2026-08-20', $evil))
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['audio_path']);
        }

        $this->postJson('/api/submissions', $payload('2026-08-21', 'https://contoh.id/rekaman/setoran.mp3'))
            ->assertCreated();
    }

    /* ====================================================================
     * Retensi log audit — log 24 jam terakhir selalu tersisa.
     * ==================================================================== */

    public function test_hapus_log_aktivitas_mempertahankan_log_24_jam_terakhir(): void
    {
        Sanctum::actingAs($this->makeUser('admin@example.com'));

        DB::table('audit_logs')->insert([
            ['user_id' => null, 'action' => 'login', 'model' => 'user', 'model_id' => null,
                'ip_address' => '127.0.0.1', 'user_agent' => 'test', 'created_at' => now()->subDays(2)],
            ['user_id' => null, 'action' => 'login', 'model' => 'user', 'model_id' => null,
                'ip_address' => '127.0.0.1', 'user_agent' => 'test', 'created_at' => now()->subHours(2)],
        ]);

        $this->deleteJson('/api/settings/activity-logs')->assertOk();

        $remaining = DB::table('audit_logs')->pluck('action')->all();

        // Log lama terhapus, log terbaru bertahan + entri clear_activity_logs.
        $this->assertSame(['login', 'clear_activity_logs'], $remaining);
    }

    /* ====================================================================
     * Email reset — nama aplikasi dari pengaturan di-escape.
     * ==================================================================== */

    public function test_email_reset_mengescape_nama_aplikasi(): void
    {
        AppSetting::create([
            'key' => 'application.app_name',
            'group' => 'application',
            'value' => '<b>Evil</b> Tahfidz',
        ]);

        $user = $this->makeUser('reset-html@example.com', 'student');

        $this->postJson('/api/auth/forgot-password', ['email' => $user->email])->assertOk();

        $log = NotificationLog::where('type', 'reset_password')
            ->where('recipient_email', $user->email)
            ->firstOrFail();

        $this->assertStringNotContainsString('<b>Evil</b>', (string) $log->body);
        $this->assertStringContainsString('&lt;b&gt;Evil&lt;/b&gt;', (string) $log->body);
    }
}
