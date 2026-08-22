<?php

namespace App\Domain\Tahfidz\Models;

use App\Domain\People\Models\Student;
use App\Domain\People\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Certificate extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'certificate_number', 'student_id', 'juz_count', 'issued_date',
        'pembina_name', 'pengajar_name', 'verification_code', 'notes', 'issued_by',
    ];

    protected function casts(): array
    {
        return [
            'juz_count' => 'integer',
            'issued_date' => 'date',
        ];
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function issuer()
    {
        return $this->belongsTo(User::class, 'issued_by');
    }
}
