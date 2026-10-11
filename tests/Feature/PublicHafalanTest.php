<?php

namespace Tests\Feature;

use App\Domain\Academic\Models\AcademicYear;
use App\Domain\Academic\Models\ClassRoom;
use App\Domain\People\Models\Student;
use App\Domain\People\Models\Teacher;
use App\Domain\Quran\Models\QuranSurah;
use App\Domain\Tahfidz\Models\Murajaah;
use App\Domain\Tahfidz\Models\StudentAyahCoverage;
use App\Domain\Tahfidz\Models\StudentProgressSummary;
use App\Domain\Tahfidz\Models\Submission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicHafalanTest extends TestCase
{
    use RefreshDatabase;

    private AcademicYear $year;

    private ClassRoom $class;

    private QuranSurah $surah;

    private Teacher $teacher;

    protected function setUp(): void
    {
        parent::setUp();

        $this->year = AcademicYear::create([
            'name' => '2025/2026',
            'start_date' => '2025-07-01',
            'end_date' => '2026-06-30',
            'is_active' => true,
        ]);

        $this->class = ClassRoom::create([
            'name' => '7A',
            'grade' => 7,
            'academic_year_id' => $this->year->id,
        ]);

        $this->teacher = Teacher::create([
            'name' => 'Guru Test',
            'teacher_code' => 'GR-001',
            'status' => 'active',
        ]);

        $this->surah = QuranSurah::create([
            'surah_number' => 36,
            'name_arabic' => 'يس',
            'name_latin' => 'Yasin',
            'translation' => 'Yasin',
            'total_ayahs' => 83,
        ]);
    }

    private function makeStudent(array $overrides = []): Student
    {
        return Student::create(array_merge([
            'student_code' => 'ST-001',
            'name' => 'Santri Publik',
            'gender' => 'L',
            'nisn' => '0012345678',
            'class_id' => $this->class->id,
            'academic_year_id' => $this->year->id,
            'status' => 'active',
            'entry_year' => 2025,
            'memorization_target' => 2,
            'starting_juz' => 30,
        ], $overrides));
    }

    private function seedActivity(Student $student): void
    {
        Submission::create([
            'student_id' => $student->id,
            'teacher_id' => $this->teacher->id,
            'academic_year_id' => $this->year->id,
            'submission_date' => now()->toDateString(),
            'submission_time' => '08:00:00',
            'surah_id' => $this->surah->id,
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
        ]);

        Murajaah::create([
            'student_id' => $student->id,
            'teacher_id' => $this->teacher->id,
            'academic_year_id' => $this->year->id,
            'date' => now()->toDateString(),
            'surah_id' => $this->surah->id,
            'start_ayah' => 1,
            'end_ayah' => 3,
            'page_count' => 2.0,
            'method' => 'guided',
            'duration_minutes' => 20,
            'fluency_score' => 85,
            'tajwid_score' => 85,
            'makhraj_score' => 85,
            'fashahah_score' => 85,
            'final_score' => 85.0,
            'status' => 'LANCAR',
        ]);

        StudentAyahCoverage::create([
            'student_id' => $student->id,
            'surah_id' => $this->surah->id,
            'ayah_number' => 1,
            'memorization_status' => StudentAyahCoverage::STATUS_MEMORIZED,
        ]);

        StudentAyahCoverage::create([
            'student_id' => $student->id,
            'surah_id' => $this->surah->id,
            'ayah_number' => 2,
            'memorization_status' => StudentAyahCoverage::STATUS_MEMORIZED,
        ]);

        StudentProgressSummary::updateOrCreate(
            ['student_id' => $student->id],
            [
                'total_ayah_covered' => 2,
                'total_surah_completed' => 0,
                'total_juz_completed' => 0,
                'progress_percentage' => 12.50,
                'average_score' => 87.50,
                'last_submission_at' => now()->toDateString(),
                'updated_at' => now(),
            ]
        );
    }

    public function test_lookup_by_nisn_returns_hafalan_payload(): void
    {
        $student = $this->makeStudent();
        $this->seedActivity($student);

        $response = $this->getJson('/api/hafalan/cek?nisn=0012345678');

        $response->assertOk()
            ->assertJsonPath('found', true)
            ->assertJsonPath('student.name', 'Santri Publik')
            ->assertJsonPath('student.class_name', '7A')
            ->assertJsonPath('student.entry_year', 2025)
            ->assertJsonPath('summary.total_ayah_covered', 2)
            ->assertJsonPath('summary.memorization_target', 2)
            ->assertJsonPath('stats.total_setoran', 1)
            ->assertJsonPath('stats.total_murajaah', 1);

        $json = $response->json();

        $this->assertCount(30, $json['chart']);
        $this->assertArrayHasKey('setoran', $json['chart'][0]);
        $this->assertArrayHasKey('murajaah', $json['chart'][0]);
        $this->assertSame(
            now()->subDays(29)->toDateString(),
            $json['chart'][0]['date']
        );

        $this->assertCount(1, $json['surah_progress']);
        $this->assertSame('Yasin', $json['surah_progress'][0]['name_latin']);
        $this->assertSame(2, $json['surah_progress'][0]['covered_ayahs']);

        $this->assertCount(1, $json['recent']);
        $this->assertSame('Yasin', $json['recent'][0]['surah_name']);
    }

    public function test_lookup_requires_no_authentication(): void
    {
        $this->makeStudent();

        $this->getJson('/api/hafalan/cek?nisn=0012345678')->assertOk();
    }

    public function test_unknown_nisn_returns_404(): void
    {
        $response = $this->getJson('/api/hafalan/cek?nisn=9999999999');

        $response->assertNotFound()
            ->assertJsonPath('found', false);
        $this->assertNotEmpty($response->json('message'));
    }

    public function test_missing_or_empty_nisn_returns_validation_error(): void
    {
        $this->getJson('/api/hafalan/cek')->assertUnprocessable()
            ->assertJsonValidationErrors(['nisn']);

        $this->getJson('/api/hafalan/cek?nisn=')->assertUnprocessable()
            ->assertJsonValidationErrors(['nisn']);

        $this->getJson('/api/hafalan/cek?nisn='.str_repeat('1', 31))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['nisn']);
    }

    public function test_payload_never_exposes_private_student_data(): void
    {
        $this->makeStudent([
            'nis' => '987654321',
            'nik' => '3273012501000001',
            'birth_place' => 'Bandung',
            'birth_date' => '2012-01-25',
            'address' => 'Jl. Rahasia No. 1',
            'phone' => '081234567890',
            'father_name' => 'Bapak Rahasia',
            'guardian_name' => 'Wali Rahasia',
            'guardian_phone' => '089876543210',
            'notes' => 'Catatan internal',
        ]);

        $response = $this->getJson('/api/hafalan/cek?nisn=0012345678');
        $response->assertOk();

        $student = $response->json('student');

        foreach (['id', 'nis', 'nik', 'birth_place', 'birth_date', 'address', 'phone',
            'father_name', 'mother_name', 'guardian_name', 'guardian_phone',
            'guardian_address', 'notes', 'student_code', 'user_id', 'nisn'] as $field) {
            $this->assertArrayNotHasKey($field, $student, "Field publik seharusnya tidak mengekspos `{$field}`.");
        }

        $content = $response->getContent();
        foreach (['081234567890', 'Jl. Rahasia No. 1', '3273012501000001', '089876543210'] as $secret) {
            $this->assertStringNotContainsString($secret, $content);
        }
    }

    public function test_duplicate_nisn_prefers_active_student(): void
    {
        $this->makeStudent(['name' => 'Santri Aktif', 'nisn' => '0011111111']);
        $this->makeStudent([
            'student_code' => 'ST-002',
            'name' => 'Santri Lulus',
            'nisn' => '0011111111',
            'status' => 'graduated',
        ]);

        $this->getJson('/api/hafalan/cek?nisn=0011111111')
            ->assertOk()
            ->assertJsonPath('student.name', 'Santri Aktif')
            ->assertJsonPath('student.status', 'active');
    }

    public function test_deleted_student_is_not_found(): void
    {
        $student = $this->makeStudent();
        $student->delete();

        $this->getJson('/api/hafalan/cek?nisn=0012345678')->assertNotFound();
    }

    public function test_summary_is_recomputed_when_snapshot_missing(): void
    {
        $student = $this->makeStudent();

        $response = $this->getJson('/api/hafalan/cek?nisn=0012345678');

        $response->assertOk()
            ->assertJsonPath('summary.total_ayah_covered', 0);

        $this->assertDatabaseHas('student_progress_summary', ['student_id' => $student->id]);
    }
}
