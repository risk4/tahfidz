<?php

namespace Database\Seeders;

use App\Domain\Academic\Models\AcademicYear;
use App\Domain\Academic\Models\ClassRoom;
use App\Domain\People\Models\Student;
use App\Domain\People\Models\User;
use App\Domain\TahfidzGroup\Models\TahfidzGroup;
use Illuminate\Database\Seeder;

class StudentSeeder extends Seeder
{
    public function run(): void
    {
        $yearId = AcademicYear::where('is_active', true)->value('id');
        $classId = ClassRoom::where('name', 'VII-A')->value('id');
        $userSiswa = User::where('email', 'siswa1@example.com')->first();

        $student = Student::create([
            'user_id' => $userSiswa?->id,
            'student_code' => 'ST-0001',
            'nis' => '2026001',
            'nisn' => null,
            'name' => 'Muhammad Rizky',
            'gender' => 'L',
            'class_id' => $classId,
            'academic_year_id' => $yearId,
            'status' => 'active',
        ]);

        $groupA = TahfidzGroup::where('name', 'Tahfidz A')->first();
        $groupA?->members()->attach($student->id, ['joined_at' => now()->toDateString()]);
    }
}
