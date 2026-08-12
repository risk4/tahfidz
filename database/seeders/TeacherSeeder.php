<?php

namespace Database\Seeders;

use App\Domain\People\Models\Teacher;
use App\Domain\People\Models\User;
use Illuminate\Database\Seeder;

class TeacherSeeder extends Seeder
{
    public function run(): void
    {
        $userGuru = User::where('email', 'guru1@example.com')->first();

        Teacher::create([
            'user_id' => $userGuru?->id,
            'teacher_code' => 'GR-0001',
            'name' => 'Ust. Ahmad Fadli',
            'nip' => null,
            'phone' => '081200000001',
            'email' => 'guru1@example.com',
            'status' => 'active',
        ]);

        Teacher::create([
            'teacher_code' => 'GR-0002',
            'name' => 'Ustzh. Siti Aminah',
            'phone' => '081200000002',
            'status' => 'active',
        ]);
    }
}
