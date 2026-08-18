<?php

namespace Tests\Feature;

use App\Domain\Notifications\Models\NotificationLog;
use App\Domain\People\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ForgotPasswordTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $email = 'admin@example.com', string $password = 'password-lama'): User
    {
        return User::create([
            'name' => 'Admin Test',
            'email' => $email,
            'password' => bcrypt($password),
            'role' => 'super_admin',
            'is_active' => true,
            'must_change_password' => false,
        ]);
    }

    /** Ambil token asli dari body email reset (berisi tautan beserta token). */
    private function tokenFromNotificationLog(string $email): string
    {
        $log = NotificationLog::where('type', 'reset_password')
            ->where('recipient_email', $email)
            ->firstOrFail();

        $this->assertSame('sent', $log->status);

        preg_match('/[?&]token=([^&"\s]+)/', (string) $log->body, $m);
        $this->assertNotEmpty($m[1] ?? '', 'Token tidak ditemukan di dalam body email reset.');

        return $m[1];
    }

    public function test_forgot_password_sends_email_and_creates_token(): void
    {
        $user = $this->makeUser();

        $response = $this->postJson('/api/auth/forgot-password', ['email' => $user->email]);

        $response->assertOk();
        $response->assertJsonPath('message', 'Jika email terdaftar, tautan reset kata sandi telah dikirim. Silakan periksa kotak masuk Anda.');

        // Token reset harus tercatat di tabel password_reset_tokens.
        $this->assertDatabaseHas('password_reset_tokens', ['email' => $user->email]);

        // Email harus benar-benar dikirim melalui mailer (status 'sent', bukan
        // 'skipped') — fallback ke mailer default membuat ini selalu terjadi.
        $log = NotificationLog::where('type', 'reset_password')->where('recipient_email', $user->email)->first();
        $this->assertNotNull($log);
        $this->assertSame('sent', $log->status);
        $this->assertNotNull($log->sent_at);
        $this->assertDatabaseCount('password_reset_tokens', 1);
    }

    public function test_forgot_password_never_leaks_whether_email_is_registered(): void
    {
        $response = $this->postJson('/api/auth/forgot-password', ['email' => 'tidak-ada@example.com']);

        $response->assertOk();
        $response->assertJsonPath('message', 'Jika email terdaftar, tautan reset kata sandi telah dikirim. Silakan periksa kotak masuk Anda.');
        $this->assertDatabaseCount('password_reset_tokens', 0);
        $this->assertDatabaseCount('notification_logs', 0);
    }

    public function test_forgot_password_requires_valid_email(): void
    {
        $response = $this->postJson('/api/auth/forgot-password', ['email' => 'bukan-email']);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('email');
    }

    public function test_reset_password_changes_password_and_allows_login(): void
    {
        $user = $this->makeUser();

        $this->postJson('/api/auth/forgot-password', ['email' => $user->email])->assertOk();

        $token = $this->tokenFromNotificationLog($user->email);

        $newPassword = 'password-baru-123';

        $resetResponse = $this->postJson('/api/auth/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => $newPassword,
            'password_confirmation' => $newPassword,
        ]);

        $resetResponse->assertOk();
        $resetResponse->assertJsonPath('message', 'Kata sandi berhasil direset. Silakan masuk dengan kata sandi baru.');

        // Password lama tidak berlaku lagi, password baru berhasil.
        $user->refresh();
        $this->assertFalse(Hash::check('password-lama', $user->password));
        $this->assertTrue(Hash::check($newPassword, $user->password));

        // Login dengan password baru harus berhasil.
        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => $newPassword,
        ]);

        $loginResponse->assertOk();
        $loginResponse->assertJsonStructure(['token', 'user']);
    }

    public function test_reset_password_rejects_invalid_token(): void
    {
        $user = $this->makeUser();

        $response = $this->postJson('/api/auth/reset-password', [
            'email' => $user->email,
            'token' => 'token-palsu',
            'password' => 'password-baru-123',
            'password_confirmation' => 'password-baru-123',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('token');
    }
}
