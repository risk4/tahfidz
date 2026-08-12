<?php

namespace App\Domain\Tahfidz\Models;

use App\Domain\People\Models\Student;
use App\Domain\Quran\Models\QuranSurah;
use Illuminate\Database\Eloquent\Model;

class StudentAyahCoverage extends Model
{
    protected $table = 'student_ayah_coverage';

    public const STATUS_IN_PROGRESS = 'in_progress';

    public const STATUS_MEMORIZED = 'memorized';

    protected $fillable = ['student_id', 'surah_id', 'ayah_number', 'memorization_status', 'first_covered_submission_id'];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function surah()
    {
        return $this->belongsTo(QuranSurah::class, 'surah_id');
    }

    public function submission()
    {
        return $this->belongsTo(Submission::class, 'first_covered_submission_id');
    }
}
