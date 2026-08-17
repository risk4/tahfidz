<?php

namespace Tests\Feature;

use App\Domain\Academic\Models\AcademicYear;
use App\Domain\Academic\Models\ClassRoom;
use App\Domain\People\Models\Student;
use App\Domain\People\Models\Teacher;
use App\Domain\People\Models\User;
use App\Domain\Quran\Models\QuranSurah;
use App\Domain\Settings\Models\AppSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RecitationCheckTest extends TestCase
{
    use RefreshDatabase;

    private function makeSurah(): QuranSurah
    {
        return QuranSurah::create([
            'surah_number' => 1,
            'name_arabic' => 'الفاتحة',
            'name_latin' => 'Al-Fatihah',
            'translation' => 'Pembukaan',
            'total_ayahs' => 7,
        ]);
    }

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

    private function makeStudentUser(): array
    {
        [$year, $class] = $this->makeYearAndClass();
        $user = User::create([
            'name' => 'Santri Test',
            'email' => 'santri@example.com',
            'password' => bcrypt('password'),
            'role' => 'student',
            'is_active' => true,
            'must_change_password' => false,
        ]);
        $student = Student::create([
            'user_id' => $user->id,
            'student_code' => 'ST-001',
            'name' => 'Santri Test',
            'gender' => 'L',
            'class_id' => $class->id,
            'academic_year_id' => $year->id,
            'status' => 'active',
        ]);

        return [$user, $student];
    }

    private function payload(int $surahId, array $details): array
    {
        return [
            'surah_id' => $surahId,
            'start_ayah' => 1,
            'end_ayah' => 3,
            'transcript' => 'transkrip uji',
            'extra_count' => 1,
            'details' => $details,
        ];
    }

    private function enableSaving(): void
    {
        AppSetting::updateOrCreate(
            ['key' => 'recitation_check.save_enabled'],
            ['value' => true, 'group' => 'recitation_check']
        );
    }

    public function test_store_rejected_when_saving_disabled(): void
    {
        [$user] = $this->makeStudentUser();
        $surah = $this->makeSurah();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/recitation-checks', $this->payload($surah->id, [
            ['ayah_number' => 1, 'word' => 'بسم', 'status' => 'correct'],
        ]));

        $response->assertStatus(409);
        $this->assertDatabaseCount('recitation_checks', 0);
    }

    public function test_store_saves_check_and_updates_ayah_statuses(): void
    {
        [$user, $student] = $this->makeStudentUser();
        $surah = $this->makeSurah();
        $this->enableSaving();
        Sanctum::actingAs($user);

        // Ayat 1: 2/2 benar (100%) → memorized.
        // Ayat 2: 1/2 benar (50%) → tidak diubah.
        // Ayat 3: 0/1 benar (0%) → tidak diubah.
        $details = [
            ['ayah_number' => 1, 'word' => 'a', 'status' => 'correct'],
            ['ayah_number' => 1, 'word' => 'b', 'status' => 'correct'],
            ['ayah_number' => 2, 'word' => 'c', 'status' => 'correct'],
            ['ayah_number' => 2, 'word' => 'd', 'status' => 'incorrect'],
            ['ayah_number' => 3, 'word' => 'e', 'status' => 'incorrect'],
        ];

        $response = $this->postJson('/api/recitation-checks', $this->payload($surah->id, $details));

        $response->assertStatus(201);
        $response->assertJsonPath('score', 60);
        $response->assertJsonPath('correct_count', 3);
        $response->assertJsonPath('incorrect_count', 2);

        $this->assertDatabaseHas('recitation_checks', [
            'student_id' => $student->id,
            'surah_id' => $surah->id,
            'start_ayah' => 1,
            'end_ayah' => 3,
            'score' => 60,
        ]);

        $this->assertDatabaseHas('student_ayah_coverage', [
            'student_id' => $student->id,
            'surah_id' => $surah->id,
            'ayah_number' => 1,
            'memorization_status' => 'memorized',
        ]);
        $this->assertDatabaseMissing('student_ayah_coverage', [
            'student_id' => $student->id,
            'surah_id' => $surah->id,
            'ayah_number' => 2,
        ]);
        $this->assertDatabaseMissing('student_ayah_coverage', [
            'student_id' => $student->id,
            'surah_id' => $surah->id,
            'ayah_number' => 3,
        ]);
    }

    public function test_store_rejects_teacher(): void
    {
        [$year, $class] = $this->makeYearAndClass();
        $user = User::create([
            'name' => 'Guru Test',
            'email' => 'guru@example.com',
            'password' => bcrypt('password'),
            'role' => 'teacher',
            'is_active' => true,
            'must_change_password' => false,
        ]);
        Teacher::create([
            'user_id' => $user->id,
            'teacher_code' => 'GR-001',
            'name' => 'Guru Test',
            'status' => 'active',
        ]);
        $surah = $this->makeSurah();
        $this->enableSaving();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/recitation-checks', $this->payload($surah->id, [
            ['ayah_number' => 1, 'word' => 'بسم', 'status' => 'correct'],
        ]));

        $response->assertStatus(403);
        $this->assertDatabaseCount('recitation_checks', 0);
    }

    public function test_index_scoped_to_own_student(): void
    {
        [$user] = $this->makeStudentUser();
        $surah = $this->makeSurah();
        $this->enableSaving();
        Sanctum::actingAs($user);

        $this->postJson('/api/recitation-checks', $this->payload($surah->id, [
            ['ayah_number' => 1, 'word' => 'بسم', 'status' => 'correct'],
        ]))->assertStatus(201);

        $response = $this->getJson('/api/recitation-checks');
        $response->assertOk();
        $response->assertJsonCount(1, 'data');
    }
}
