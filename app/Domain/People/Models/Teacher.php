<?php

namespace App\Domain\People\Models;

use App\Domain\Academic\Models\ClassRoom;
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
        'user_id', 'teacher_code', 'name', 'nip', 'phone', 'email', 'status',
    ];

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
     * Cek apakah guru ini membina siswa tertentu (lewat kelompok tahfidz aktif).
     */
    public function supervises(int $studentId): bool
    {
        return $this->tahfidzGroups()
            ->whereHas('members', fn ($q) => $q->where('students.id', $studentId))
            ->exists();
    }
}
