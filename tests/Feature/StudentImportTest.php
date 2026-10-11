<?php

namespace Tests\Feature;

use App\Domain\Academic\Models\AcademicYear;
use App\Domain\Academic\Models\ClassRoom;
use App\Domain\People\Models\Student;
use App\Domain\People\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentImportTest extends TestCase
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

    private function makeYearAndClass(): array
    {
        $year = AcademicYear::create([
            'name' => '2024/2025',
            'start_date' => '2024-07-01',
            'end_date' => '2025-06-30',
            'is_active' => true,
        ]);
        $class = ClassRoom::create([
            'name' => '7A',
            'grade' => 7,
            'academic_year_id' => $year->id,
        ]);

        return [$year, $class];
    }

    private function csvUpload(string $csv): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('students.csv', $csv);
    }

    public function test_import_generates_student_code_and_uses_active_year(): void
    {
        [$year, $class] = $this->makeYearAndClass();
        Sanctum::actingAs($this->makeAdmin());

        // Tanpa kolom student_code maupun tahun ajaran.
        $csv = "name,gender,class_name\n"
            ."Santri Impor,L,7A\n";

        $response = $this->post('/api/students/import', ['file' => $this->csvUpload($csv)]);

        $response->assertOk();
        $this->assertSame(1, $response->json('imported'));

        $student = Student::where('name', 'Santri Impor')->first();
        $this->assertNotNull($student);
        $this->assertMatchesRegularExpression('/^ST-\d+$/', $student->student_code);
        $this->assertSame($class->id, $student->class_id);
        $this->assertSame($year->id, $student->academic_year_id);
    }

    public function test_import_generates_unique_codes_for_multiple_rows(): void
    {
        $this->makeYearAndClass();
        Sanctum::actingAs($this->makeAdmin());

        $csv = "name,gender,class_name\n"
            ."Santri A,L,7A\n"
            ."Santri B,P,7A\n";

        $this->post('/api/students/import', ['file' => $this->csvUpload($csv)])->assertOk();

        $codes = Student::pluck('student_code')->all();
        $this->assertCount(2, $codes);
        $this->assertCount(2, array_unique($codes));
    }

    public function test_import_still_accepts_student_code_and_numeric_ids(): void
    {
        [$year, $class] = $this->makeYearAndClass();
        Sanctum::actingAs($this->makeAdmin());

        $csv = "student_code,name,gender,class_id,academic_year_id\n"
            ."IMP-002,Santri Lama,P,{$class->id},{$year->id}\n";

        $response = $this->post('/api/students/import', ['file' => $this->csvUpload($csv)]);

        $response->assertOk();
        $this->assertSame(1, $response->json('imported'));
        $this->assertSame($class->id, Student::where('student_code', 'IMP-002')->value('class_id'));
    }

    public function test_import_skips_unknown_class_name(): void
    {
        $this->makeYearAndClass();
        Sanctum::actingAs($this->makeAdmin());

        $csv = "name,gender,class_name\n"
            ."Santri Salah,L,9Z\n";

        $response = $this->post('/api/students/import', ['file' => $this->csvUpload($csv)]);

        $response->assertOk();
        $this->assertSame(0, $response->json('imported'));
        $this->assertCount(1, $response->json('skipped'));
        $this->assertNull(Student::where('name', 'Santri Salah')->first());
    }

    public function test_import_template_uses_name_columns_without_student_code(): void
    {
        Sanctum::actingAs($this->makeAdmin());

        $response = $this->get('/api/students/import-template?format=csv');

        $response->assertOk();
        $content = $response->streamedContent();
        $this->assertStringContainsString('class_name', $content);
        $this->assertStringNotContainsString('student_code', $content);
    }
}
