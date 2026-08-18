<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            AcademicYearSeeder::class,
            UserSeeder::class,
            TeacherSeeder::class,
            ClassSeeder::class,
            TahfidzGroupSeeder::class,
            StudentSeeder::class,
            QuranSeeder::class,
            SubmissionMurajaahSeeder::class,
        ]);
    }
}
