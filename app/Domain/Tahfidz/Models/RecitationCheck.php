<?php

namespace App\Domain\Tahfidz\Models;

use App\Domain\People\Models\Student;
use App\Domain\Quran\Models\QuranSurah;
use Illuminate\Database\Eloquent\Model;

/**
 * Hasil pengecekan bacaan (Web Speech API) seorang siswa.
 * Menyimpan skor, transkrip, dan hasil per kata (JSON).
 */
class RecitationCheck extends Model
{
    protected $table = 'recitation_checks';

    protected $fillable = [
        'student_id',
        'surah_id',
        'start_ayah',
        'end_ayah',
        'score',
        'correct_count',
        'incorrect_count',
        'missing_count',
        'extra_count',
        'transcript',
        'details',
        'ayah_statuses',
        'checked_at',
    ];

    protected function casts(): array
    {
        return [
            'start_ayah' => 'integer',
            'end_ayah' => 'integer',
            'score' => 'integer',
            'correct_count' => 'integer',
            'incorrect_count' => 'integer',
            'missing_count' => 'integer',
            'extra_count' => 'integer',
            'details' => 'array',
            'ayah_statuses' => 'array',
            'checked_at' => 'datetime',
        ];
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function surah()
    {
        return $this->belongsTo(QuranSurah::class, 'surah_id');
    }
}
