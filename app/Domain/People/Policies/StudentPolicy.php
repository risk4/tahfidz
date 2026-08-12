<?php

namespace App\Domain\People\Policies;

use App\Domain\People\Models\Student;
use App\Domain\People\Models\User;

class StudentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isSuperAdmin() || $user->isTeacher();
    }

    public function view(User $user, Student $student): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($user->isTeacher()) {
            return $user->teacher?->supervises($student->id) ?? false;
        }

        // Siswa hanya boleh melihat datanya sendiri.
        return $user->isStudent() && $user->student?->id === $student->id;
    }

    public function create(User $user): bool
    {
        return $user->isSuperAdmin();
    }

    public function update(User $user, Student $student): bool
    {
        return $user->isSuperAdmin();
    }

    public function delete(User $user, Student $student): bool
    {
        return $user->isSuperAdmin();
    }
}
