<?php

namespace App\Domain\Tahfidz\Models;

use App\Domain\Academic\Models\AcademicYear;
use App\Domain\People\Models\Student;
use App\Domain\People\Models\Teacher;
use App\Domain\Quran\Models\QuranSurah;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Murajaah extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'murajaahs';

    protected $fillable = [
        'student_id', 'teacher_id', 'academic_year_id', 'date',
        'surah_id', 'start_ayah', 'end_ayah',
        'fluency_score', 'tajwid_score', 'makhraj_score', 'fashahah_score',
        'final_score', 'status', 'notes',
    ];

    protected function casts(): array
    {
        return ['date' => 'date'];
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }

    public function academicYear()
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function surah()
    {
        return $this->belongsTo(QuranSurah::class, 'surah_id');
    }
}
