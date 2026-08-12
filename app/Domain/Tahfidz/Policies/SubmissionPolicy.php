<?php

namespace App\Domain\Tahfidz\Policies;

use App\Domain\People\Models\User;
use App\Domain\Tahfidz\Models\Submission;

class SubmissionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isSuperAdmin() || $user->isTeacher();
    }

    public function view(User $user, Submission $submission): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($user->isTeacher()) {
            return $user->teacher?->supervises($submission->student_id) ?? false;
        }

        // Siswa hanya boleh melihat submission miliknya sendiri.
        return $user->isStudent() && $user->student?->id === $submission->student_id;
    }

    public function create(User $user): bool
    {
        return $user->isSuperAdmin() || $user->isTeacher();
    }

    public function update(User $user, Submission $submission): bool
    {
        return $user->isSuperAdmin();
    }

    public function delete(User $user, Submission $submission): bool
    {
        return $user->isSuperAdmin();
    }
}
