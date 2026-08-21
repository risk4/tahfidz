<?php

namespace Tests\Feature;

use App\Domain\Academic\Models\AcademicYear;
use App\Domain\Academic\Models\ClassRoom;
use App\Domain\Notifications\Models\NotificationLog;
use App\Domain\People\Models\Student;
use App\Domain\People\Models\Teacher;
use App\Domain\People\Models\User;
use App\Domain\Tahfidz\Models\StudentProgressSummary;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Regression test hasil audit keamanan:
 *  - deleteLogo wajib otorisasi super admin
 *  - destroy guru/siswa menonaktifkan akun login & mencabut token
 *  - ganti/reset password mencabut sesi lain
 *  - reset password oleh admin memicu wajib ganti password
 *  - GET /progress/{student} membaca ringkasan tersimpan (tanpa recompute)
 */
class SecurityAuditFixesTest extends TestCase
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

    private function makeAcademicContext(): array
    {
        $year = AcademicYear::create([
            'name' => '2025/2026',
            'start_date' => '2025-07-01',
            'end_date' => '2026-06-30',
        ]);

        $class = ClassRoom::create([
            'name' => '7A',
            'grade' => 7,
            'academic_year_id' => $year->id,
        ]);

        return [$year, $class];
    }

    /* ====================================================================
     * Fix #1 — DELETE /api/settings/logo harus terproteksi policy.
     * ==================================================================== */

    public function test_delete_logo_ditolak_untuk_non_super_admin(): void
    {
        $teacher = $this->makeUser('guru@example.com', 'teacher');

        Sanctum::actingAs($teacher);

        $this->deleteJson('/api/settings/logo', ['key' => 'application.logo_path'])
            ->assertForbidden();
    }

    public function test_delete_logo_diizinkan_super_admin(): void
    {
        Sanctum::actingAs($this->makeUser('admin@example.com'));

        $this->deleteJson('/api/settings/logo', ['key' => 'application.logo_path'])
            ->assertOk()
            ->assertJsonPath('message', 'Logo berhasil dihapus.');
    }

    /* ====================================================================
     * Fix #2 — destroy guru/siswa tidak boleh meninggalkan akun aktif.
     * ==================================================================== */

    public function test_hapus_guru_menonaktifkan_akun_dan_mencabut_token(): void
    {
        Sanctum::actingAs($this->makeUser('admin@example.com'));

        $teacherUser = $this->makeUser('guru2@example.com', 'teacher');
        $teacherUser->createToken('perangkat-guru');

        $teacher = Teacher::create([
            'user_id' => $teacherUser->id,
            'teacher_code' => 'GR-001',
            'name' => 'Ust. Guru Uji',
        ]);

        $this->deleteJson("/api/teachers/{$teacher->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Guru berhasil dihapus.');

        $this->assertSoftDeleted('teachers', ['id' => $teacher->id]);
        $this->assertFalse($teacherUser->fresh()->is_active);
        $this->assertSame(0, $teacherUser->tokens()->count());
    }

    public function test_hapus_siswa_menonaktifkan_akun_dan_mencabut_token(): void
    {
        Sanctum::actingAs($this->makeUser('admin@example.com'));

        [$year, $class] = $this->makeAcademicContext();

        $studentUser = $this->makeUser('siswa2@example.com', 'student');
        $studentUser->createToken('perangkat-siswa');

        $student = Student::create([
            'user_id' => $studentUser->id,
            'student_code' => 'STR-001',
            'name' => 'Rizky Uji',
            'gender' => 'L',
            'class_id' => $class->id,
            'academic_year_id' => $year->id,
        ]);

        $this->deleteJson("/api/students/{$student->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Siswa berhasil dihapus.');

        $this->assertSoftDeleted('students', ['id' => $student->id]);
        $this->assertFalse($studentUser->fresh()->is_active);
        $this->assertSame(0, $studentUser->tokens()->count());
    }

    public function test_akun_yang_dinonaktifkan_tidak_bisa_login(): void
    {
        $user = $this->makeUser('nonaktif@example.com', 'teacher');
        $user->forceFill(['is_active' => false])->save();

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password-lama-123',
        ])->assertUnprocessable();
    }

    /* ====================================================================
     * Fix #3 — rotasi token saat ganti/reset kata sandi.
     * ==================================================================== */

    public function test_ganti_password_mencabut_token_lain_dan_menyimpan_token_aktif(): void
    {
        $user = $this->makeUser('multi-device@example.com', 'teacher');

        $tokenAktif = $user->createToken('perangkat-ini')->plainTextToken;
        $user->createToken('perangkat-lain');

        $this->withToken($tokenAktif)->postJson('/api/auth/change-password', [
            'current_password' => 'password-lama-123',
            'password' => 'password-baru-456',
            'password_confirmation' => 'password-baru-456',
        ])->assertOk();

        // Token lain mati, token yang dipakai tetap hidup.
        $remaining = $user->tokens()->pluck('name');
        $this->assertSame(['perangkat-ini'], $remaining->all());

        // Password benar-benar berubah.
        $this->assertTrue(Hash::check('password-baru-456', $user->fresh()->password));
    }

    public function test_reset_password_mencabut_semua_token(): void
    {
        $user = $this->makeUser('reset@example.com', 'student');
        $user->createToken('sesi-1');
        $user->createToken('sesi-2');

        $this->postJson('/api/auth/forgot-password', ['email' => $user->email])->assertOk();

        $log = NotificationLog::where('type', 'reset_password')
            ->where('recipient_email', $user->email)
            ->firstOrFail();
        preg_match('/[?&]token=([^&"\s]+)/', (string) $log->body, $m);
        $this->assertNotEmpty($m[1] ?? '');

        $this->postJson('/api/auth/reset-password', [
            'email' => $user->email,
            'token' => $m[1],
            'password' => 'password-baru-789',
            'password_confirmation' => 'password-baru-789',
        ])->assertOk();

        $this->assertSame(0, $user->tokens()->count());
    }

    /* ====================================================================
     * Fix #5 — reset password oleh admin memicu wajib ganti password.
     * ==================================================================== */

    public function test_reset_password_guru_oleh_admin_memicu_wajib_ganti_dan_mencabut_sesi(): void
    {
        Sanctum::actingAs($this->makeUser('admin@example.com'));

        $teacherUser = $this->makeUser('guru3@example.com', 'teacher');
        $teacherUser->createToken('sesi-lama');

        $teacher = Teacher::create([
            'user_id' => $teacherUser->id,
            'teacher_code' => 'GR-002',
            'name' => 'Ust. Guru Reset',
            'email' => 'guru3@example.com',
        ]);

        $this->putJson("/api/teachers/{$teacher->id}", [
            'teacher_code' => 'GR-002',
            'name' => 'Ust. Guru Reset',
            'email' => 'guru3@example.com',
            'password' => 'password-sementara-1',
            'password_confirmation' => 'password-sementara-1',
        ])->assertOk();

        $fresh = $teacherUser->fresh();
        $this->assertTrue((bool) $fresh->must_change_password);
        $this->assertSame(0, $fresh->tokens()->count());
    }

    /* ====================================================================
     * Fix #4 — GET /progress/{student} membaca ringkasan tersimpan
     * (tidak menjalankan recompute yang menimpa snapshot).
     * ==================================================================== */

    public function test_progress_show_memakai_ringkasan_tersimpan_tanpa_recompute(): void
    {
        Sanctum::actingAs($this->makeUser('admin@example.com'));

        [$year, $class] = $this->makeAcademicContext();

        $student = Student::create([
            'student_code' => 'STR-002',
            'name' => 'Santri Progres',
            'gender' => 'P',
            'class_id' => $class->id,
            'academic_year_id' => $year->id,
        ]);

        // Nilai sengaja tidak masuk akal (99 juz) — bila endpoint tetap
        // menjalankan recompute pada GET, nilai ini akan tertimpa menjadi 0
        // karena tabel quran/coverage kosong di lingkungan uji.
        StudentProgressSummary::create([
            'student_id' => $student->id,
            'total_juz_completed' => 99,
            'progress_percentage' => 77.77,
        ]);

        $response = $this->getJson("/api/progress/{$student->id}")->assertOk();

        $this->assertEquals(99, $response->json('summary.total_juz_completed'));
        $this->assertEqualsWithDelta(77.77, (float) $response->json('summary.progress_percentage'), 0.001);
    }
}
