<?php

namespace App\Domain\Tahfidz\Models;

use App\Domain\Academic\Models\AcademicYear;
use App\Domain\People\Models\Student;
use App\Domain\People\Models\Teacher;
use App\Domain\Quran\Models\QuranSurah;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Model dasar. Business logic (perhitungan final_score, sinkronisasi
 * student_ayah_coverage) diimplementasikan di SubmissionService pada STEP 3,
 * bukan di sini — model tetap tipis sesuai prinsip arsitektur.
 */
class Submission extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'student_id', 'teacher_id', 'academic_year_id', 'submission_date',
        'surah_id', 'start_ayah', 'end_ayah', 'type',
        'fluency_score', 'tajwid_score', 'makhraj_score', 'fashahah_score',
        'final_score', 'notes',
    ];

    protected function casts(): array
    {
        return ['submission_date' => 'date'];
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
