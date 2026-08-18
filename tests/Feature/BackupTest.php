<?php

namespace Tests\Feature;

use App\Domain\People\Models\User;
use App\Domain\Settings\Models\AppSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BackupTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::create([
            'name' => 'Admin Test',
            'email' => 'admin@example.com',
            'password' => bcrypt('password'),
            'role' => 'super_admin',
            'is_active' => true,
            'must_change_password' => false,
        ]);
    }

    public function test_backup_now_deletes_old_backup_files_beyond_retention(): void
    {
        Storage::fake('local');
        Sanctum::actingAs($this->admin());

        // Satu file sangat lama + satu file kemarin; retention disetel 7 hari.
        Storage::disk('local')->put('backups/settings-20200101_000000.json', '{}');
        Storage::disk('local')->put('backups/settings-'.now()->subDay()->format('Ymd_His').'.json', '{}');
        AppSetting::updateOrCreate(
            ['key' => 'backup.retention_days'],
            ['value' => 7, 'group' => 'backup']
        );

        $response = $this->postJson('/api/settings/backup');

        $response->assertOk();
        $response->assertJsonPath('values.last_backup_status', 'success');

        $files = Storage::disk('local')->files('backups');
        $this->assertCount(2, $files, 'Hanya tersisa file kemarin + file backup baru.');
        $this->assertFalse(Storage::disk('local')->exists('backups/settings-20200101_000000.json'));
    }

    public function test_download_backup_returns_latest_backup_file(): void
    {
        Storage::fake('local');
        Sanctum::actingAs($this->admin());

        $this->postJson('/api/settings/backup')->assertOk();

        $response = $this->getJson('/api/settings/backup/download');

        $response->assertOk();
        $response->assertHeaderContains('content-disposition', 'attachment');
        $this->assertStringContainsString('"profile"', $response->streamedContent());
    }

    public function test_restore_backup_updates_settings_from_uploaded_file(): void
    {
        Sanctum::actingAs($this->admin());

        $json = json_encode([
            'profile' => ['name' => 'Madrasah Pulih', 'npsn' => '99999999'],
            'application' => ['app_name' => 'Aplikasi Pulih'],
        ]);

        $response = $this->post('/api/settings/backup/restore', [
            'file' => UploadedFile::fake()->createWithContent('backup.json', $json),
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('settings', ['key' => 'profile.name', 'value' => 'Madrasah Pulih']);
        $this->assertDatabaseHas('settings', ['key' => 'application.app_name', 'value' => 'Aplikasi Pulih']);
    }
}
