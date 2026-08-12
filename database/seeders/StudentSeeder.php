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

        // Beberapa siswa dummy tambahan untuk keperluan testing listing/pagination
        foreach (range(2, 6) as $i) {
            $s = Student::create([
                'student_code' => 'ST-000' . $i,
                'name' => "Siswa Dummy {$i}",
                'gender' => $i % 2 === 0 ? 'P' : 'L',
                'class_id' => $classId,
                'academic_year_id' => $yearId,
                'status' => 'active',
            ]);
            $groupA?->members()->attach($s->id, ['joined_at' => now()->toDateString()]);
        }
    }
}
