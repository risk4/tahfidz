<?php

namespace App\Domain\People\Support;

use App\Domain\People\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * Scope bersama untuk membatasi query ke santri binaan guru:
 * kelas yang diampu sebagai wali kelas + halaqah yang dibimbing.
 *
 * Guru tanpa profil Teacher tidak memiliki binaan apa pun, sehingga
 * hasilnya harus kosong. Tanpa guard eksplisit, where('kolom', null)
 * berubah menjadi whereNull dan justru menampilkan data kelas/halaqah
 * yang belum memiliki pembimbing.
 */
final class SupervisedStudentScope
{
    public static function apply(Builder $query, User $user, bool $viaRelation = false): void
    {
        if (! $user->isTeacher()) {
            return;
        }

        $teacherId = $user->teacher?->id;

        if ($teacherId === null) {
            $query->whereRaw('1 = 0');

            return;
        }

        $supervised = function ($q) use ($teacherId): void {
            $q->whereHas('classRoom', fn ($class) => $class->where('homeroom_teacher_id', $teacherId))
                ->orWhereHas('tahfidzGroups', fn ($group) => $group->where('teacher_id', $teacherId));
        };

        if ($viaRelation) {
            $query->whereHas('student', fn ($student) => $student->where($supervised));
        } else {
            $query->where($supervised);
        }
    }
}
