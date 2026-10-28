<?php

namespace Tests\Feature;

use App\Domain\Academic\Models\AcademicYear;
use App\Domain\Academic\Models\ClassRoom;
use App\Domain\People\Models\Student;
use App\Domain\People\Models\Teacher;
use App\Domain\People\Models\User;
use App\Domain\Quran\Models\QuranSurah;
use App\Domain\Tahfidz\Models\StudentAyahCoverage;
use App\Domain\Tahfidz\Models\Submission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Endpoint batch: mencatat satu atau beberapa surah utuh sekaligus
 * (rentang tiap surah dihitung 1..total_ayahs).
 */
class SubmissionBatchTest extends TestCase
{
    use RefreshDatabase;

    private AcademicYear $year;
    private Student $student;
    private Teacher $teacher;
    private QuranSurah $fatihah;
    private QuranSurah $ikhlas;

    protected function setUp(): void
    {
        parent::setUp();

        $this->year = AcademicYear::create([
            'name' => '2025/2026',
            'start_date' => '2025-07-01',
            'end_date' => '2026-06-30',
            'is_active' => true,
        ]);

        $class = ClassRoom::create([
            'name' => '7A',
            'grade' => 7,
            'academic_year_id' => $this->year->id,
        ]);

        $this->teacher = Teacher::create([
            'teacher_code' => 'GR-BATCH',
            'name' => 'Guru Batch',
            'status' => 'active',
        ]);

        $this->student = Student::create([
            'student_code' => 'ST-BATCH',
            'name' => 'Santri Batch',
            'gender' => 'L',
            'class_id' => $class->id,
            'academic_year_id' => $this->year->id,
            'status' => 'active',
            'nis' => '99001',
        ]);

        $this->fatihah = QuranSurah::create([
            'surah_number' => 1,
            'name_arabic' => 'الفاتحة',
            'name_latin' => 'Al-Fatihah',
            'translation' => 'Pembukaan',
            'total_ayahs' => 7,
        ]);

        $this->ikhlas = QuranSurah::create([
            'surah_number' => 112,
            'name_arabic' => 'الإخلاص',
            'name_latin' => 'Al-Ikhlas',
            'translation' => 'Ikhlas',
            'total_ayahs' => 4,
        ]);
    }

    private function makeAdmin(): User
    {
        return User::create([
            'name' => 'Admin Batch',
            'email' => 'admin-batch@example.com',
            'password' => bcrypt('password'),
            'role' => 'super_admin',
            'is_active' => true,
            'must_change_password' => false,
        ]);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'student_id' => $this->student->id,
            'teacher_id' => $this->teacher->id,
            'submission_date' => '2026-10-15',
            'submission_time' => '08:30',
            'surah_ids' => [$this->fatihah->id, $this->ikhlas->id],
            'page_count' => 1,
            'type' => 'new_memorization',
            'method' => 'setoran',
            'status' => 'approved',
            'fluency_score' => 90,
            'tajwid_score' => 88,
            'makhraj_score' => 92,
            'fashahah_score' => 91,
            'notes' => 'Dua surah utuh',
        ], $overrides);
    }

    public function test_batch_menyimpan_beberapa_surah_utuh_sekaligus(): void
    {
        Sanctum::actingAs($this->makeAdmin());

        $this->postJson('/api/submissions/batch', $this->payload())
            ->assertCreated()
            ->assertJsonCount(2, 'data');

        $submissions = Submission::where('student_id', $this->student->id)->get();
        $this->assertSame(2, $submissions->count());

        $fatihah = $submissions->firstWhere('surah_id', $this->fatihah->id);
        $ikhlas = $submissions->firstWhere('surah_id', $this->ikhlas->id);

        $this->assertNotNull($fatihah);
        $this->assertNotNull($ikhlas);

        // Rentang tiap surah utuh: 1..total_ayahs.
        $this->assertSame(1, (int) $fatihah->start_ayah);
        $this->assertSame(7, (int) $fatihah->end_ayah);
        $this->assertSame(1, (int) $ikhlas->start_ayah);
        $this->assertSame(4, (int) $ikhlas->end_ayah);

        // Konteks & mapping metode ikut terisi per baris.
        $this->assertSame('setoran', $fatihah->method);
        $this->assertSame('new_memorization', $fatihah->type);
        $this->assertSame($this->year->id, (int) $fatihah->academic_year_id);
        $this->assertSame(90.25, (float) $fatihah->final_score);

        // Coverage seluruh ayat kedua surah ditandai tercakup (7 + 4).
        $this->assertSame(11, StudentAyahCoverage::where('student_id', $this->student->id)->count());
    }

    public function test_batch_menolak_waktu_sudah_terpakai(): void
    {
        Sanctum::actingAs($this->makeAdmin());

        $this->postJson('/api/submissions/batch', $this->payload())->assertCreated();

        $this->postJson('/api/submissions/batch', $this->payload([
            'surah_ids' => [$this->fatihah->id],
        ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['submission_time']);

        $this->assertSame(2, Submission::where('student_id', $this->student->id)->count());
    }

    public function test_batch_wajib_memilih_minimal_satu_surah(): void
    {
        Sanctum::actingAs($this->makeAdmin());

        $this->postJson('/api/submissions/batch', $this->payload(['surah_ids' => []]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['surah_ids']);

        $this->assertSame(0, Submission::count());
    }

    public function test_batch_menolak_surah_tidak_dikenal_tanpa_membuat_data(): void
    {
        Sanctum::actingAs($this->makeAdmin());

        $this->postJson('/api/submissions/batch', $this->payload([
            'surah_ids' => [$this->fatihah->id, 999999],
        ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['surah_ids.1']);

        $this->assertSame(0, Submission::count());
    }

    public function test_batch_menolak_surah_ganda(): void
    {
        Sanctum::actingAs($this->makeAdmin());

        $this->postJson('/api/submissions/batch', $this->payload([
            'surah_ids' => [$this->fatihah->id, $this->fatihah->id],
        ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['surah_ids.1']);

        $this->assertSame(0, Submission::count());
    }

    public function test_batch_guru_hanya_untuk_siswa_binaan(): void
    {
        $teacherUser = User::create([
            'name' => 'Guru Batch Tanpa Binaan',
            'email' => 'guru-batch@example.com',
            'password' => bcrypt('password'),
            'role' => 'teacher',
            'is_active' => true,
            'must_change_password' => false,
        ]);
        Teacher::create([
            'user_id' => $teacherUser->id,
            'teacher_code' => 'GR-BATCH-2',
            'name' => 'Guru Tanpa Binaan',
        ]);

        Sanctum::actingAs($teacherUser);

        $this->postJson('/api/submissions/batch', $this->payload())
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['student_id']);

        $this->assertSame(0, Submission::count());
    }

    public function test_batch_menolak_tanpa_autentikasi(): void
    {
        $this->postJson('/api/submissions/batch', $this->payload())
            ->assertUnauthorized();
    }
}

