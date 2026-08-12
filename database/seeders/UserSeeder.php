<?php

namespace Database\Seeders;

use App\Domain\People\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'name' => 'Administrator',
            'email' => 'admin@example.com',
            'password' => Hash::make('password'),
            'role' => 'super_admin',
            'is_active' => true,
        ]);

        User::create([
            'name' => 'Ust. Ahmad Fadli',
            'email' => 'guru1@example.com',
            'password' => Hash::make('password'),
            'role' => 'teacher',
            'is_active' => true,
        ]);

        User::create([
            'name' => 'Muhammad Rizky',
            'email' => 'siswa1@example.com',
            'password' => Hash::make('password'),
            'role' => 'student',
            'is_active' => true,
        ]);
    }
}
