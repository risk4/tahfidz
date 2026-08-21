<?php

namespace App\Http\Controllers\Api\Auth;

use App\Domain\Notifications\Services\NotificationService;
use App\Domain\People\Models\User;
use App\Http\Controllers\Controller;
use App\Services\Audit\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        private readonly AuditLogService $auditLog,
        private readonly NotificationService $notifications,
    ) {}

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email atau password salah.'],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Akun tidak aktif. Hubungi administrator.'],
            ]);
        }

        $user->forceFill(['last_login_at' => now()])->save();

        $token = $user->createToken('api-token')->plainTextToken;

        $this->auditLog->record($user, 'login', User::class, $user->id, $request);

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'must_change_password' => (bool) $user->must_change_password,
                'teacher_id' => $user->teacher?->id,
                'student_id' => $user->student?->id,
            ],
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        $this->auditLog->record($user, 'logout', User::class, $user->id, $request);

        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Berhasil logout.']);
    }

    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'must_change_password' => (bool) $user->must_change_password,
            'teacher_id' => $user->teacher?->id,
            'student_id' => $user->student?->id,
        ]);
    }

    /**
     * POST /api/auth/forgot-password — kirim tautan reset kata sandi ke email.
     *
     * Jawaban selalu sama (sukses) agar tidak membocorkan apakah sebuah email
     * terdaftar atau tidak; email hanya dikirim bila akun ditemukan.
     */
    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::where('email', $request->input('email'))->first();

        if ($user) {
            $token = Password::broker()->createToken($user);
            $resetUrl = rtrim((string) config('app.url'), '/').'/reset-password'.
                '?token='.$token.'&email='.urlencode($user->email);

            $this->notifications->sendPasswordReset($user->email, $resetUrl);
        }

        return response()->json([
            'message' => 'Jika email terdaftar, tautan reset kata sandi telah dikirim. Silakan periksa kotak masuk Anda.',
        ]);
    }

    /**
     * POST /api/auth/reset-password — atur kata sandi baru memakai token
     * dari email reset (broker bawaan Laravel, tabel password_reset_tokens).
     */
    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $status = Password::broker()->reset($data, function (User $user, string $password) {
            $user->forceFill([
                'password' => $password,
                'must_change_password' => false,
            ])->save();

            // Reset lewat email terjadi tanpa sesi aktif: cabut semua token
            // Sanctum agar sesi lama (mis. perangkat hilang) ikut mati.
            $user->tokens()->delete();

            $this->auditLog->record($user, 'reset_password', User::class, $user->id, request());
        });

        return match ($status) {
            Password::PASSWORD_RESET => response()->json(['message' => 'Kata sandi berhasil direset. Silakan masuk dengan kata sandi baru.']),
            Password::INVALID_TOKEN => throw ValidationException::withMessages([
                'token' => ['Tautan reset tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru.'],
            ]),
            default => throw ValidationException::withMessages([
                'email' => ['Email tidak ditemukan.'],
            ]),
        };
    }

    /**
     * Ubah password pengguna (dipakai untuk mewajibkan ganti password
     * saat akun dibuat dengan password sementara / default).
     */
    public function changePassword(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Password saat ini salah.'],
            ]);
        }

        $user->forceFill([
            'password' => $data['password'],
            'must_change_password' => false,
        ])->save();

        // Rotasi sesi: token lain tetap aktif setelah ganti password menjadi
        // celah (perangkat hilang / token curian tidak ikut mati).
        $currentTokenId = $user->currentAccessToken()?->id;
        $user->tokens()
            ->when($currentTokenId, fn ($query) => $query->where('id', '!=', $currentTokenId))
            ->delete();

        $this->auditLog->record($user, 'change_password', User::class, $user->id, $request);

        return response()->json(['message' => 'Password berhasil diubah.']);
    }
}
