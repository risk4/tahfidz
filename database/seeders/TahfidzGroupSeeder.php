<?php

namespace Database\Seeders;

use App\Domain\Academic\Models\AcademicYear;
use App\Domain\People\Models\Teacher;
use App\Domain\TahfidzGroup\Models\TahfidzGroup;
use Illuminate\Database\Seeder;

class TahfidzGroupSeeder extends Seeder
{
    public function run(): void
    {
        $yearId = AcademicYear::where('is_active', true)->value('id');
        $teacherIds = Teacher::pluck('id');

        TahfidzGroup::create([
            'name' => 'Tahfidz A',
            'teacher_id' => $teacherIds[0],
            'academic_year_id' => $yearId,
            'status' => 'active',
        ]);

        TahfidzGroup::create([
            'name' => 'Tahfidz B',
            'teacher_id' => $teacherIds[1] ?? $teacherIds[0],
            'academic_year_id' => $yearId,
            'status' => 'active',
        ]);
    }
}
