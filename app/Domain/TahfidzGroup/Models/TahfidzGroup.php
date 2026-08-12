<?php

namespace App\Domain\TahfidzGroup\Models;

use App\Domain\Academic\Models\AcademicYear;
use App\Domain\People\Models\Student;
use App\Domain\People\Models\Teacher;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TahfidzGroup extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'teacher_id', 'academic_year_id', 'description', 'status'];

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function members()
    {
        return $this->belongsToMany(Student::class, 'tahfidz_group_members', 'tahfidz_group_id', 'student_id')
            ->withPivot('joined_at')
            ->withTimestamps();
    }
}
