<?php

namespace App\Providers;

use App\Domain\Academic\Models\AcademicYear;
use App\Domain\Academic\Models\ClassRoom;
use App\Domain\Academic\Policies\AcademicYearPolicy;
use App\Domain\Academic\Policies\ClassRoomPolicy;
use App\Domain\People\Models\Student;
use App\Domain\People\Models\Teacher;
use App\Domain\People\Policies\StudentPolicy;
use App\Domain\People\Policies\TeacherPolicy;
use App\Domain\Tahfidz\Models\Murajaah;
use App\Domain\Tahfidz\Models\Submission;
use App\Domain\Tahfidz\Policies\MurajaahPolicy;
use App\Domain\Tahfidz\Policies\SubmissionPolicy;
use App\Domain\TahfidzGroup\Models\TahfidzGroup;
use App\Domain\TahfidzGroup\Policies\TahfidzGroupPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        AcademicYear::class => AcademicYearPolicy::class,
        ClassRoom::class => ClassRoomPolicy::class,
        Teacher::class => TeacherPolicy::class,
        Student::class => StudentPolicy::class,
        TahfidzGroup::class => TahfidzGroupPolicy::class,
        Submission::class => SubmissionPolicy::class,
        Murajaah::class => MurajaahPolicy::class,
    ];

    public function boot(): void
    {
        $this->registerPolicies();
    }
}
