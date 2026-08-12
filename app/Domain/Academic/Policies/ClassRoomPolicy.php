<?php

namespace App\Domain\Academic\Policies;

use App\Domain\People\Models\User;

class ClassRoomPolicy
{
    public function viewAny(User $user): bool
    {
        // Admin: penuh. Guru & siswa: hanya baca (dibatasi lagi di controller/query scope).
        return true;
    }

    public function create(User $user): bool
    {
        return $user->isSuperAdmin();
    }

    public function update(User $user): bool
    {
        return $user->isSuperAdmin();
    }

    public function delete(User $user): bool
    {
        return $user->isSuperAdmin();
    }
}
