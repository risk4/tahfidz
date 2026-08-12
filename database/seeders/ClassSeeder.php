<?php

namespace Database\Seeders;

use App\Domain\Academic\Models\AcademicYear;
use App\Domain\Academic\Models\ClassRoom;
use Illuminate\Database\Seeder;

class ClassSeeder extends Seeder
{
    public function run(): void
    {
        $yearId = AcademicYear::where('is_active', true)->value('id');

        $classes = [
            ['name' => 'VII-A', 'grade' => 7],
            ['name' => 'VII-B', 'grade' => 7],
            ['name' => 'VIII-A', 'grade' => 8],
            ['name' => 'VIII-B', 'grade' => 8],
            ['name' => 'IX-A', 'grade' => 9],
            ['name' => 'IX-B', 'grade' => 9],
        ];

        foreach ($classes as $class) {
            ClassRoom::create([
                'name' => $class['name'],
                'grade' => $class['grade'],
                'academic_year_id' => $yearId,
            ]);
        }
    }
}
