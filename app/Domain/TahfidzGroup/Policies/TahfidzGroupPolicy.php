<?php

namespace App\Domain\TahfidzGroup\Policies;

use App\Domain\People\Models\User;
use App\Domain\TahfidzGroup\Models\TahfidzGroup;

class TahfidzGroupPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isSuperAdmin() || $user->isTeacher();
    }

    public function view(User $user, TahfidzGroup $group): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->isTeacher() && $user->teacher?->id === $group->teacher_id;
    }

    public function create(User $user): bool
    {
        return $user->isSuperAdmin();
    }

    public function update(User $user, TahfidzGroup $group): bool
    {
        // Admin bebas; guru pemilik kelompok boleh mengubah keanggotaan
        // tapi TIDAK boleh mengubah data master lain (dibatasi di Form Request).
        return $user->isSuperAdmin() || ($user->isTeacher() && $user->teacher?->id === $group->teacher_id);
    }

    public function delete(User $user, TahfidzGroup $group): bool
    {
        return $user->isSuperAdmin();
    }
}
