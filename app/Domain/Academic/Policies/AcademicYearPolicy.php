<?php

namespace App\Domain\Academic\Policies;

use App\Domain\People\Models\User;

class AcademicYearPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isSuperAdmin();
    }

    public function view(User $user): bool
    {
        return $user->isSuperAdmin();
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

    public function activate(User $user): bool
    {
        return $user->isSuperAdmin();
    }
}
