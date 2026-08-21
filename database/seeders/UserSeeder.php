<?php

namespace Database\Seeders;

use App\Domain\People\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Password default untuk semua akun seeder. Untuk development/production
        // yang ingin password berbeda, set variabel env SEED_USER_PASSWORD di .env.
        $password = (string) env('SEED_USER_PASSWORD', 'password');

        User::create([
            'name' => 'Administrator',
            'email' => 'admin@example.com',
            'password' => Hash::make($password),
            'role' => 'super_admin',
            'is_active' => true,
            'must_change_password' => true,
        ]);

        User::create([
            'name' => 'Ust. Ahmad Fadli',
            'email' => 'guru1@example.com',
            'password' => Hash::make($password),
            'role' => 'teacher',
            'is_active' => true,
            'must_change_password' => true,
        ]);

        User::create([
            'name' => 'Muhammad Rizky',
            'email' => 'siswa1@example.com',
            'password' => Hash::make($password),
            'role' => 'student',
            'is_active' => true,
            'must_change_password' => true,
        ]);

        $this->command->info('Akun seeder dibuat dengan password default (wajib ganti saat login pertama):');
        $this->command->info('  Super Admin : admin@example.com / '.$password);
        $this->command->info('  Guru        : guru1@example.com / '.$password);
        $this->command->info('  Siswa       : siswa1@example.com / '.$password);
    }
}
