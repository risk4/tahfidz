<?php

namespace App\Domain\Tahfidz\Models;

use App\Domain\People\Models\Student;
use Illuminate\Database\Eloquent\Model;

class StudentProgressSummary extends Model
{
    protected $table = 'student_progress_summary';

    protected $primaryKey = 'student_id';

    public $incrementing = false;

    const CREATED_AT = null;

    protected $fillable = [
        'student_id', 'total_ayah_covered', 'total_surah_completed',
        'total_juz_completed', 'progress_percentage', 'average_score',
        'last_submission_at',
    ];

    protected function casts(): array
    {
        return ['last_submission_at' => 'datetime'];
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }
}
