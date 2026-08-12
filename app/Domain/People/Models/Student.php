<?php

namespace App\Domain\People\Models;

use App\Domain\Academic\Models\AcademicYear;
use App\Domain\Academic\Models\ClassRoom;
use App\Domain\Tahfidz\Models\Murajaah;
use App\Domain\Tahfidz\Models\StudentAyahCoverage;
use App\Domain\Tahfidz\Models\StudentProgressSummary;
use App\Domain\Tahfidz\Models\Submission;
use App\Domain\TahfidzGroup\Models\TahfidzGroup;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Student extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id', 'student_code', 'nis', 'nisn', 'name', 'gender',
        'birth_place', 'birth_date', 'class_id', 'academic_year_id', 'status',
    ];

    protected function casts(): array
    {
        return ['birth_date' => 'date'];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function classRoom()
    {
        return $this->belongsTo(ClassRoom::class, 'class_id');
    }

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function tahfidzGroups()
    {
        return $this->belongsToMany(TahfidzGroup::class, 'tahfidz_group_members')
            ->withPivot('joined_at')
            ->withTimestamps();
    }

    public function submissions()
    {
        return $this->hasMany(Submission::class);
    }

    public function murajaahs()
    {
        return $this->hasMany(Murajaah::class);
    }

    public function ayahCoverage()
    {
        return $this->hasMany(StudentAyahCoverage::class);
    }

    public function progressSummary()
    {
        return $this->hasOne(StudentProgressSummary::class);
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
