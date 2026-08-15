<?php

namespace App\Domain\People\Models;

use App\Domain\Academic\Models\ClassRoom;
use App\Domain\People\Models\Student;
use App\Domain\TahfidzGroup\Models\TahfidzGroup;
use App\Domain\Tahfidz\Models\Murajaah;
use App\Domain\Tahfidz\Models\Submission;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Teacher extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id', 'teacher_code', 'name', 'gender', 'nip', 'nuptk',
        'birth_place', 'birth_date', 'photo_path', 'phone', 'email',
        'address', 'subject', 'status',
    ];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function homeroomClasses()
    {
        return $this->hasMany(ClassRoom::class, 'homeroom_teacher_id');
    }

    public function tahfidzGroups()
    {
        return $this->hasMany(TahfidzGroup::class);
    }

    public function submissions()
    {
        return $this->hasMany(Submission::class);
    }

    public function murajaahs()
    {
        return $this->hasMany(Murajaah::class);
    }

    /**
     * Cek apakah guru ini membina siswa tertentu.
     *
     * Guru dianggap membina siswa bila:
     * - siswa terdaftar di kelas yang wali kelasnya guru ini (homeroom), ATAU
     * - siswa tergabung dalam kelompok tahfidz binaan guru ini.
     */
    public function supervises(int $studentId): bool
    {
        return Student::query()
            ->where('students.id', $studentId)
            ->where(function ($q) {
                $q->whereHas('classRoom', fn ($class) => $class->where('homeroom_teacher_id', $this->id))
                    ->orWhereHas('tahfidzGroups', fn ($group) => $group->where('teacher_id', $this->id));
            })
            ->exists();
    }
}
