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
        return $user->isSuperAdmin();
    }

    /**
     * Kelola anggota halaqah (tambah/hapus siswa).
     *
     * Hanya super admin. Membolehkan guru menambah siswa ke kelompoknya
     * sendiri akan memberi guru akses penuh ke data pribadi siswa tsb
     * (lihat StudentPolicy::view), sehingga menjadi celah IDOR.
     */
    public function manageMembers(User $user, TahfidzGroup $group): bool
    {
        return $user->isSuperAdmin();
    }

    public function delete(User $user, TahfidzGroup $group): bool
    {
        return $user->isSuperAdmin();
    }
}
