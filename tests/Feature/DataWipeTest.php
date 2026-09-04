<?php

namespace Tests\Feature;

use App\Domain\Academic\Models\AcademicYear;
use App\Domain\Academic\Models\ClassRoom;
use App\Domain\People\Models\Student;
use App\Domain\People\Models\Teacher;
use App\Domain\People\Models\User;
use App\Domain\Quran\Models\QuranSurah;
use App\Domain\Tahfidz\Models\Certificate;
use App\Domain\Tahfidz\Models\Murajaah;
use App\Domain\Tahfidz\Models\RecitationCheck;
use App\Domain\Tahfidz\Models\Submission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DataWipeTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::create([
            'name' => 'Admin Test',
            'email' => 'admin@example.com',
            'password' => bcrypt('password'),
            'role' => 'super_admin',
            'is_active' => true,
            'must_change_password' => false,
        ]);
    }

    /** Bangun satu set data lengkap (guru, siswa, setoran, murajaah, sertifikat). */
    private function seedData(): array
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

        $teacherUser = User::create([
            'name' => 'Guru Akun',
            'email' => 'guru@example.com',
            'password' => bcrypt('password'),
            'role' => 'teacher',
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $teacher = Teacher::create([
            'name' => 'Guru Test',
            'teacher_code' => 'GR-001',
            'status' => 'active',
            'user_id' => $teacherUser->id,
        ]);

        $studentUser = User::create([
            'name' => 'Santri Akun',
            'email' => 'santri@example.com',
            'password' => bcrypt('password'),
            'role' => 'student',
            'is_active' => true,
            'must_change_password' => true,
        ]);
        $student = Student::create([
            'student_code' => 'ST-001',
            'name' => 'Santri Test',
            'gender' => 'L',
            'class_id' => $class->id,
            'academic_year_id' => $year->id,
            'status' => 'active',
            'nis' => '12345',
            'user_id' => $studentUser->id,
        ]);

        $surah = QuranSurah::create([
            'surah_number' => 36,
            'name_arabic' => 'USO3',
            'name_latin' => 'Yasin',
            'translation' => 'Yasin',
            'total_ayahs' => 83,
        ]);

        Submission::create([
            'student_id' => $student->id,
            'teacher_id' => $teacher->id,
            'academic_year_id' => $year->id,
            'submission_date' => '2026-08-01',
            'submission_time' => '08:00:00',
            'surah_id' => $surah->id,
            'start_ayah' => 1,
            'end_ayah' => 5,
            'type' => 'new_memorization',
            'method' => 'setoran',
            'fluency_score' => 90,
            'tajwid_score' => 90,
            'makhraj_score' => 90,
            'fashahah_score' => 90,
            'final_score' => 90.0,
            'status' => 'approved',
            'page_count' => 1.5,
            'notes' => 'Catatan',
        ]);

        Murajaah::create([
            'student_id' => $student->id,
            'teacher_id' => $teacher->id,
            'academic_year_id' => $year->id,
            'date' => '2026-08-02',
            'time' => '09:00:00',
            'juz' => 1,
            'surah_id' => $surah->id,
            'start_ayah' => 1,
            'end_ayah' => 3,
            'page_count' => 1.5,
            'method' => 'guided',
            'duration_minutes' => 20,
            'fluency_score' => 90,
            'tajwid_score' => 90,
            'makhraj_score' => 90,
            'fashahah_score' => 90,
            'final_score' => 90.0,
            'status' => 'LANCAR',
            'notes' => 'Catatan',
        ]);

        Certificate::create([
            'certificate_number' => 'SRT/2026/08/0001',
            'student_id' => $student->id,
            'juz_count' => 1,
            'issued_date' => '2026-08-10',
            'verification_code' => 'VERIF-ABC-123',
        ]);

        RecitationCheck::create([
            'student_id' => $student->id,
            'surah_id' => $surah->id,
            'start_ayah' => 1,
            'end_ayah' => 5,
            'score' => 90,
            'correct_count' => 5,
            'incorrect_count' => 0,
            'missing_count' => 0,
            'extra_count' => 0,
            'details' => [],
            'checked_at' => now(),
        ]);

        return [$teacher, $student];
    }

    private function solveCaptcha(string $question): string
    {
        preg_match('/(\d+)\s*\+\s*(\d+)/', $question, $m);

        return (string) ((int) $m[1] + (int) $m[2]);
    }

    public function test_counts_endpoint_returns_expected_numbers(): void
    {
        $this->seedData();
        Sanctum::actingAs($this->admin());

        $response = $this->getJson('/api/settings/data/count');

        $response->assertOk()
            ->assertJsonPath('teachers', 1)
            ->assertJsonPath('students', 1)
            ->assertJsonPath('submissions', 1)
            ->assertJsonPath('murajaahs', 1)
            ->assertJsonPath('certificates', 1)
            ->assertJsonPath('recitations', 1)
            ->assertJsonPath('users', 2);
    }

    public function test_captcha_endpoint_returns_question_and_token(): void
    {
        Sanctum::actingAs($this->admin());

        $response = $this->getJson('/api/settings/data/captcha');

        $response->assertOk();
        $this->assertArrayHasKey('token', $response->json());
        $this->assertArrayHasKey('question', $response->json());
        $this->assertStringContainsString('+', $response->json('question'));
    }

    public function test_wipe_rejects_wrong_captcha_and_wrong_confirm(): void
    {
        $this->seedData();
        Sanctum::actingAs($this->admin());

        $captcha = $this->getJson('/api/settings/data/captcha')->json();

        // Jawaban salah => ditolak, data tetap utuh.
        $response = $this->postJson('/api/settings/data/wipe', [
            'token' => $captcha['token'],
            'answer' => '9999',
            'confirm' => 'HAPUS',
        ]);
        $response->assertStatus(422)->assertJsonValidationErrors('answer');
        $this->assertSame(1, Student::withTrashed()->count());
        $this->assertSame(2, User::whereIn('role', ['teacher', 'student'])->count());

        // Jawaban benar tetapi konfirmasi salah => ditolak.
        $captcha2 = $this->getJson('/api/settings/data/captcha')->json();
        $response2 = $this->postJson('/api/settings/data/wipe', [
            'token' => $captcha2['token'],
            'answer' => $this->solveCaptcha($captcha2['question']),
            'confirm' => 'BATAL',
        ]);
        $response2->assertStatus(422)->assertJsonValidationErrors('confirm');
        $this->assertSame(1, Student::withTrashed()->count());
    }

    public function test_wipe_removes_all_operational_data_and_accounts(): void
    {
        $this->seedData();
        Sanctum::actingAs($this->admin());

        $captcha = $this->getJson('/api/settings/data/captcha')->json();

        $response = $this->postJson('/api/settings/data/wipe', [
            'token' => $captcha['token'],
            'answer' => $this->solveCaptcha($captcha['question']),
            'confirm' => 'HAPUS',
        ]);

        $response->assertOk()->assertJsonPath('message', 'Seluruh data berhasil dihapus.');
        $response->assertJsonPath('counts.teachers', 1);
        $response->assertJsonPath('counts.students', 1);
        $response->assertJsonPath('counts.users', 2);

        $this->assertSame(0, Teacher::withTrashed()->count());
        $this->assertSame(0, Student::withTrashed()->count());
        $this->assertSame(0, Submission::withTrashed()->count());
        $this->assertSame(0, Murajaah::withTrashed()->count());
        $this->assertSame(0, Certificate::withTrashed()->count());
        $this->assertSame(0, RecitationCheck::count());

        // Akun guru & siswa terhapus; super admin tetap ada.
        $this->assertSame(0, User::whereIn('role', ['teacher', 'student'])->count());
        $this->assertSame(1, User::where('role', 'super_admin')->count());
    }

    public function test_non_admin_cannot_access_wipe(): void
    {
        $this->seedData();
        $teacherUser = User::where('role', 'teacher')->first();
        Sanctum::actingAs($teacherUser);

        $this->getJson('/api/settings/data/count')->assertForbidden();
        $this->postJson('/api/settings/data/wipe', [
            'token' => 'x',
            'answer' => '5',
            'confirm' => 'HAPUS',
        ])->assertForbidden();
    }
}
