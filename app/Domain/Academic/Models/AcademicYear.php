<?php

namespace App\Domain\Academic\Models;

use App\Domain\People\Models\Student;
use App\Domain\Tahfidz\Models\Murajaah;
use App\Domain\Tahfidz\Models\Submission;
use App\Domain\TahfidzGroup\Models\TahfidzGroup;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AcademicYear extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'start_date', 'end_date', 'is_active'];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'is_active' => 'boolean',
        ];
    }

    public function classes()
    {
        return $this->hasMany(ClassRoom::class);
    }

    public function tahfidzGroups()
    {
        return $this->hasMany(TahfidzGroup::class);
    }

    public function students()
    {
        return $this->hasMany(Student::class);
    }

    public function submissions()
    {
        return $this->hasMany(Submission::class);
    }

    public function murajaahs()
    {
        return $this->hasMany(Murajaah::class);
    }
}
