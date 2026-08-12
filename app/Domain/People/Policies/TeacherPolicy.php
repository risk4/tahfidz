<?php

namespace App\Domain\People\Policies;

use App\Domain\People\Models\Teacher;
use App\Domain\People\Models\User;

class TeacherPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isSuperAdmin() || $user->isTeacher();
    }

    public function view(User $user, Teacher $teacher): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Guru hanya boleh melihat profilnya sendiri.
        return $user->isTeacher() && $user->teacher?->id === $teacher->id;
    }

    public function create(User $user): bool
    {
        return $user->isSuperAdmin();
    }

    public function update(User $user, Teacher $teacher): bool
    {
        return $user->isSuperAdmin();
    }

    public function delete(User $user, Teacher $teacher): bool
    {
        return $user->isSuperAdmin();
    }
}
