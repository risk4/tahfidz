<?php

namespace App\Domain\Tahfidz\Policies;

use App\Domain\People\Models\User;
use App\Domain\Tahfidz\Models\Murajaah;

class MurajaahPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isSuperAdmin() || $user->isTeacher();
    }

    public function view(User $user, Murajaah $murajaah): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($user->isTeacher()) {
            return $user->teacher?->supervises($murajaah->student_id) ?? false;
        }

        // Siswa hanya boleh melihat murajaah miliknya sendiri.
        return $user->isStudent() && $user->student?->id === $murajaah->student_id;
    }

    public function create(User $user): bool
    {
        return $user->isSuperAdmin() || $user->isTeacher();
    }

    public function update(User $user, Murajaah $murajaah): bool
    {
        return $user->isSuperAdmin();
    }

    public function delete(User $user, Murajaah $murajaah): bool
    {
        return $user->isSuperAdmin();
    }
}
