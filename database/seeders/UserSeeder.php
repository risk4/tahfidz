<?php

namespace Database\Seeders;

use App\Domain\People\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Password acak per akun. Untuk development lokal yang ingin password
        // tetap, set variabel env SEED_USER_PASSWORD di .env.
        $password = (string) env('SEED_USER_PASSWORD', '');

        $adminPassword = $password ?: Str::password(16);
        $teacherPassword = $password ?: Str::password(16);
        $studentPassword = $password ?: Str::password(16);

        User::create([
            'name' => 'Administrator',
            'email' => 'admin@example.com',
            'password' => Hash::make($adminPassword),
            'role' => 'super_admin',
            'is_active' => true,
            'must_change_password' => true,
        ]);

        User::create([
            'name' => 'Ust. Ahmad Fadli',
            'email' => 'guru1@example.com',
            'password' => Hash::make($teacherPassword),
            'role' => 'teacher',
            'is_active' => true,
            'must_change_password' => true,
        ]);

        User::create([
            'name' => 'Muhammad Rizky',
            'email' => 'siswa1@example.com',
            'password' => Hash::make($studentPassword),
            'role' => 'student',
            'is_active' => true,
            'must_change_password' => true,
        ]);

        $this->command->info('Akun seeder dibuat dengan password acak (wajib ganti saat login pertama):');
        $this->command->info('  Super Admin : admin@example.com / '.$adminPassword);
        $this->command->info('  Guru        : guru1@example.com / '.$teacherPassword);
        $this->command->info('  Siswa       : siswa1@example.com / '.$studentPassword);
    }
}
