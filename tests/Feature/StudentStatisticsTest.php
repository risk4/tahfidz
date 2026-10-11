<?php

namespace Tests\Feature;

use App\Domain\Academic\Models\AcademicYear;
use App\Domain\Academic\Models\ClassRoom;
use App\Domain\People\Models\Student;
use App\Domain\People\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentStatisticsTest extends TestCase
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

    private function makeStudent(string $name, string $gender, string $status, ClassRoom $class, AcademicYear $year): Student
    {
        return Student::create([
            'student_code' => strtoupper(substr($name, 0, 4)).'-'.random_int(1000, 9999),
            'name' => $name,
            'gender' => $gender,
            'status' => $status,
            'class_id' => $class->id,
            'academic_year_id' => $year->id,
        ]);
    }

    public function test_index_returns_aggregate_statistics(): void
    {
        $year = AcademicYear::create(['name' => '2025/2026', 'start_date' => '2025-07-01', 'end_date' => '2026-06-30', 'is_active' => true]);
        $class = ClassRoom::create(['name' => '7A', 'grade' => 7, 'academic_year_id' => $year->id]);

        // 7 santri agar melebihi ukuran halaman (per_page minimum 5),
        // sehingga statistik agregat jelas berbeda dari isi halaman.
        foreach (['Budi', 'Ahmad', 'Rizky', 'Fauzan'] as $name) {
            $this->makeStudent($name, 'L', 'active', $class, $year);
        }
        foreach (['Siti', 'Aminah', 'Zahra'] as $name) {
            $this->makeStudent($name, 'P', 'active', $class, $year);
        }

        Sanctum::actingAs($this->admin());

        $response = $this->getJson('/api/students?per_page=5');

        $response->assertOk();
        $this->assertSame(7, $response->json('statistics.total'));
        $this->assertSame(7, $response->json('statistics.active'));
        $this->assertSame(4, $response->json('statistics.male'));
        $this->assertSame(3, $response->json('statistics.female'));
        // Isi halaman terpaginasi, statistik mencakup seluruh data.
        $this->assertCount(5, $response->json('data'));
        $this->assertSame(7, $response->json('total'));
    }

    public function test_statistics_are_zero_when_empty(): void
    {
        Sanctum::actingAs($this->admin());

        $response = $this->getJson('/api/students');

        $response->assertOk();
        $this->assertSame(0, $response->json('statistics.total'));
        $this->assertSame(0, $response->json('statistics.active'));
        $this->assertSame(0, $response->json('statistics.male'));
        $this->assertSame(0, $response->json('statistics.female'));
        $this->assertSame([], $response->json('data'));
    }
}
