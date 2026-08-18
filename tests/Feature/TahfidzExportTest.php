<?php

namespace Tests\Feature;

use App\Domain\Academic\Models\AcademicYear;
use App\Domain\Academic\Models\ClassRoom;
use App\Domain\People\Models\Student;
use App\Domain\People\Models\Teacher;
use App\Domain\People\Models\User;
use App\Domain\Quran\Models\QuranSurah;
use App\Domain\Tahfidz\Models\Murajaah;
use App\Domain\Tahfidz\Models\Submission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TahfidzExportTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdmin(): User
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

    private function makeData(): array
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
        $teacher = Teacher::create([
            'name' => 'Guru Test',
            'teacher_code' => 'GR-001',
            'status' => 'active',
        ]);
        $student = Student::create([
            'student_code' => 'ST-001',
            'name' => 'Santri Test',
            'gender' => 'L',
            'class_id' => $class->id,
            'academic_year_id' => $year->id,
            'status' => 'active',
            'nis' => '12345',
        ]);
        $surah = QuranSurah::create([
            'surah_number' => 36,
            'name_arabic' => 'يس',
            'name_latin' => 'Yasin',
            'translation' => 'Yasin',
            'total_ayahs' => 83,
        ]);

        $submission = Submission::create([
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
            'notes' => 'Catatan setoran',
        ]);

        $murajaah = Murajaah::create([
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
            'notes' => 'Catatan murajaah',
        ]);

        return [$submission, $murajaah];
    }

    public function test_submission_export_returns_csv(): void
    {
        [$submission] = $this->makeData();
        Sanctum::actingAs($this->makeAdmin());

        $response = $this->get('/api/submissions/export?format=csv');

        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $content = $response->streamedContent();
        $this->assertStringContainsString('Tanggal', $content);
        $this->assertStringContainsString($submission->student->name, $content);
        $this->assertStringContainsString('Yasin', $content);
    }

    public function test_murajaah_export_returns_csv(): void
    {
        [, $murajaah] = $this->makeData();
        Sanctum::actingAs($this->makeAdmin());

        $response = $this->get('/api/murajaahs/export?format=csv');

        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $content = $response->streamedContent();
        $this->assertStringContainsString('Tanggal', $content);
        $this->assertStringContainsString($murajaah->student->name, $content);
        $this->assertStringContainsString('Yasin', $content);
    }

    public function test_submission_export_xlsx_returns_file(): void
    {
        $this->makeData();
        Sanctum::actingAs($this->makeAdmin());

        $response = $this->get('/api/submissions/export?format=xlsx');

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }
}