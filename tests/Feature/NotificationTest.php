<?php

namespace Tests\Feature;

use App\Domain\Academic\Models\AcademicYear;
use App\Domain\Academic\Models\ClassRoom;
use App\Domain\Notifications\Models\NotificationLog;
use App\Domain\People\Models\Student;
use App\Domain\People\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    private function makeYearAndClass(): array
    {
        $year = AcademicYear::create([
            'name' => '2025/2026',
            'start_date' => '2025-07-01',
            'end_date' => '2026-06-30',
            'is_active' => true,
        ]);
        $class = ClassRoom::create([
            'name' => '7A',
            'grade' => 7,
            'academic_year_id' => $year->id,
        ]);

        return [$year, $class];
    }

    private function makeStudentUser(string $email, string $name): array
    {
        [$year, $class] = $this->makeYearAndClass();
        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => bcrypt('password'),
            'role' => 'student',
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $student = Student::create([
            'user_id' => $user->id,
            'student_code' => 'ST-'.strtoupper(substr(md5($email), 0, 6)),
            'name' => $name,
            'gender' => 'L',
            'class_id' => $class->id,
            'academic_year_id' => $year->id,
            'status' => 'active',
        ]);

        return [$user, $student];
    }

    private function log(int $studentId, string $type = 'setoran', string $status = 'sent'): NotificationLog
    {
        return NotificationLog::create([
            'type' => $type,
            'recipient_email' => 'santri@example.com',
            'student_id' => $studentId,
            'subject' => "Setoran Hafalan Baru — {$type}",
            'body' => 'Template notifikasi.',
            'status' => $status,
            'sent_at' => now(),
        ]);
    }

    public function test_student_only_sees_own_notifications(): void
    {
        [$userA, $studentA] = $this->makeStudentUser('santri-a@example.com', 'Santri A');
        [, $studentB] = $this->makeStudentUser('santri-b@example.com', 'Santri B');

        $this->log($studentA->id);
        $this->log($studentB->id);

        Sanctum::actingAs($userA);

        $response = $this->getJson('/api/notifications');

        $response->assertOk();
        $response->assertJsonPath('total', 1);
        $response->assertJsonPath('unread_count', 1);
        $response->assertJsonCount(1, 'data');
        $this->assertEquals($studentA->id, $response->json('data.0.student_id'));
    }

    public function test_admin_sees_all_notifications(): void
    {
        [, $studentA] = $this->makeStudentUser('santri-a@example.com', 'Santri A');
        [, $studentB] = $this->makeStudentUser('santri-b@example.com', 'Santri B');

        $this->log($studentA->id);
        $this->log($studentB->id);

        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => bcrypt('password'),
            'role' => 'super_admin',
            'is_active' => true,
            'must_change_password' => false,
        ]);
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/notifications');

        $response->assertOk();
        $response->assertJsonPath('total', 2);
        $response->assertJsonCount(2, 'data');
    }

    public function test_mark_read_updates_unread_count(): void
    {
        [$userA, $studentA] = $this->makeStudentUser('santri-a@example.com', 'Santri A');
        $log = $this->log($studentA->id);

        Sanctum::actingAs($userA);

        $this->assertTrue($this->getJson('/api/notifications')->json('data.0.is_read') === false);

        $this->postJson("/api/notifications/{$log->id}/read")->assertOk();

        $response = $this->getJson('/api/notifications');
        $response->assertJsonPath('unread_count', 0);
        $response->assertJsonPath('data.0.is_read', true);
    }

    public function test_mark_all_read(): void
    {
        [$userA, $studentA] = $this->makeStudentUser('santri-a@example.com', 'Santri A');
        $this->log($studentA->id, 'setoran');
        $this->log($studentA->id, 'murajaah');

        Sanctum::actingAs($userA);

        $this->postJson('/api/notifications/read')->assertOk();

        $this->getJson('/api/notifications')->assertJsonPath('unread_count', 0);
    }
}
