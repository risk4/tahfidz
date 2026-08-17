<?php

namespace App\Domain\Tahfidz\Policies;

use App\Domain\People\Models\User;
use App\Domain\Tahfidz\Models\RecitationCheck;

class RecitationCheckPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isSuperAdmin() || $user->isTeacher() || $user->isStudent();
    }

    public function view(User $user, RecitationCheck $recitationCheck): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($user->isTeacher()) {
            return $user->teacher?->supervises($recitationCheck->student_id) ?? false;
        }

        // Siswa hanya boleh melihat riwayat miliknya sendiri.
        return $user->isStudent() && $user->student?->id === $recitationCheck->student_id;
    }

    public function create(User $user): bool
    {
        // Pengecekan bacaan adalah murajaah mandiri siswa — hanya siswa yang
        // menyimpan hasilnya (untuk dirinya sendiri).
        return $user->isStudent();
    }
}
