<?php

namespace App\Http\Controllers\Api\Settings;

use App\Domain\Notifications\Services\NotificationService;
use App\Domain\People\Models\User;
use App\Domain\Settings\Models\AppSetting;
use App\Domain\Settings\Services\SettingsService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateSettingsRequest;
use App\Http\Requests\Settings\UploadLogoRequest;
use App\Services\Audit\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/**
 * Pusat konfigurasi aplikasi (halaman Pengaturan).
 *
 * Semua endpoint hanya untuk super admin — dijamin lewat policy
 * (SettingsPolicy terdaftar di AuthServiceProvider) dan gate frontend.
 */
class SettingsController extends Controller
{
    public function __construct(
        private readonly SettingsService $settings,
        private readonly AuditLogService $auditLog,
        private readonly NotificationService $notifications,
    ) {}

    /** GET /api/settings — seluruh pengaturan, nilai rahasia termasking. */
    public function index(Request $request)
    {
        $this->authorize('viewAny', AppSetting::class);

        return response()->json($this->settings->all());
    }

    /**
     * GET /api/branding — informasi publik untuk halaman login.
     *
     * Tidak memerlukan autentikasi sehingga logo & nama aplikasi
     * bisa ditampilkan sebelum user masuk.
     */
    public function branding()
    {
        $profile = $this->settings->group('profile');
        $application = $this->settings->group('application');

        return response()->json([
            'app_name'     => $application['app_name'] ?? $profile['name'] ?? null,
            'logo_path'    => $application['logo_path'] ?? $profile['logo_path'] ?? null,
            'favicon_path' => $application['favicon_path'] ?? null,
        ]);
    }

    /** PUT /api/settings/{group} — simpan satu group pengaturan. */
    public function update(UpdateSettingsRequest $request, string $group)
    {
        $values = $this->settings->update($group, $request->validated());

        $this->auditLog->record($request->user(), 'update_settings', 'settings', null, $request);

        return response()->json(['group' => $group, 'values' => $values]);
    }

    /** POST /api/settings/logo — upload logo madrasah / aplikasi / favicon. */
    public function uploadLogo(UploadLogoRequest $request)
    {
        $path = $this->settings->uploadLogo($request->input('key'), $request->file('file'));

        $this->auditLog->record($request->user(), 'upload_logo', 'settings', null, $request);

        return response()->json(['path' => $path]);
    }

    /** DELETE /api/settings/logo — hapus logo (khusus super admin via policy). */
    public function deleteLogo(Request $request)
    {
        $this->authorize('update', AppSetting::class);

        $request->validate([
            'key' => ['required', Rule::in(['profile.logo_path', 'application.logo_path', 'application.favicon_path'])],
        ]);

        $this->settings->deleteLogo($request->input('key'));

        $this->auditLog->record($request->user(), 'delete_logo', 'settings', null, $request);

        return response()->json(['message' => 'Logo berhasil dihapus.']);
    }

    /** GET /api/settings/users — daftar pengguna (dengan statistik per role). */
    public function users(Request $request)
    {
        $this->authorize('viewAny', AppSetting::class);

        $perPage = min(max($request->integer('per_page', 15), 5), 100);

        $users = User::query()
            ->with(['teacher:id,name', 'student:id,name'])
            ->orderByDesc('id')
            ->paginate($perPage);

        $roleCounts = User::query()
            ->selectRaw('role, count(*) as total')
            ->groupBy('role')
            ->pluck('total', 'role');

        return response()->json([
            'users' => $users,
            'role_counts' => $roleCounts,
        ]);
    }

    /** POST /api/settings/users/{user}/toggle-active — aktif/nonaktifkan akun. */
    public function toggleUserActive(Request $request, User $user)
    {
        $this->authorize('update', AppSetting::class);

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Tidak dapat menonaktifkan akun sendiri.'], 422);
        }

        $user->update(['is_active' => ! $user->is_active]);

        $this->auditLog->record($request->user(), 'toggle_user_active', User::class, $user->id, $request);

        return response()->json($user->fresh());
    }

    /** GET /api/settings/activity-logs — log aktivitas (tabel audit_logs). */
    public function activityLogs(Request $request)
    {
        $this->authorize('viewAny', AppSetting::class);

        $perPage = min(max($request->integer('per_page', 15), 5), 100);

        return DB::table('audit_logs')
            ->leftJoin('users', 'users.id', '=', 'audit_logs.user_id')
            ->select(
                'audit_logs.id',
                'audit_logs.action',
                'audit_logs.model',
                'audit_logs.model_id',
                'audit_logs.ip_address',
                'audit_logs.user_agent',
                'audit_logs.created_at',
                'users.name as user_name',
                'users.email as user_email',
            )
            ->orderByDesc('audit_logs.created_at')
            ->paginate($perPage);
    }

    /** DELETE /api/settings/activity-logs — hapus seluruh log aktivitas. */
    public function clearActivityLogs(Request $request)
    {
        $this->authorize('update', AppSetting::class);

        // Retensi minimum 24 jam: jejak aktivitas terbaru selalu tersisa agar
        // insiden keamanan masih dapat diinvestigasi meskipun admin menghapus
        // log. Hanya log yang lebih tua dari satu hari yang dihapus.
        $deleted = DB::table('audit_logs')
            ->where('created_at', '<', now()->subDay())
            ->delete();

        $this->auditLog->record($request->user(), 'clear_activity_logs', 'activity_log', null, $request);

        return response()->json([
            'message' => "{$deleted} log aktivitas yang lebih lama dari 24 jam berhasil dihapus.",
        ]);
    }

    /** GET /api/settings/sessions — sesi (token Sanctum) akun saat ini. */
    public function sessions(Request $request)
    {
        $this->authorize('viewAny', AppSetting::class);

        $current = $request->user()->currentAccessToken()?->id;

        $sessions = $request->user()->tokens()
            ->orderByDesc('id')
            ->get()
            ->map(fn ($token) => [
                'id' => $token->id,
                'name' => $token->name,
                'created_at' => $token->created_at?->toDateTimeString(),
                'last_used_at' => $token->last_used_at?->toDateTimeString(),
                'current' => $token->id === $current,
            ]);

        return response()->json($sessions);
    }

    /** DELETE /api/settings/sessions/{tokenId} — cabut satu sesi lain. */
    public function revokeSession(Request $request, int $tokenId)
    {
        $this->authorize('update', AppSetting::class);

        $token = $request->user()->tokens()->findOrFail($tokenId);

        if ($token->id === $request->user()->currentAccessToken()?->id) {
            return response()->json(['message' => 'Tidak dapat mencabut sesi yang sedang aktif.'], 422);
        }

        $token->delete();

        $this->auditLog->record($request->user(), 'revoke_session', 'sanctum_token', $tokenId, $request);

        return response()->json(['message' => 'Sesi berhasil dicabut.']);
    }

    /** POST /api/settings/logout-all — akhiri semua sesi kecuali sesi ini. */
    public function logoutAll(Request $request)
    {
        $this->authorize('update', AppSetting::class);

        $count = $request->user()->tokens()
            ->where('id', '!=', $request->user()->currentAccessToken()->id)
            ->delete();

        $this->auditLog->record($request->user(), 'logout_all_devices', 'sanctum_token', null, $request);

        return response()->json(['message' => "{$count} sesi lain telah diakhiri."]);
    }

    /**
     * POST /api/settings/test-email — kirim email uji via SMTP terkonfigurasi.
     * Diteruskan ke alamat admin saat ini (atau field `to` bila diisi).
     */
    public function testEmail(Request $request)
    {
        $this->authorize('update', AppSetting::class);

        $request->validate(['to' => ['nullable', 'email']]);

        $to = $request->input('to') ?: $request->user()->email;

        $result = $this->notifications->sendTest($to, $this->settings->rawGroup('integrations'));

        return response()->json($result);
    }

    /** POST /api/settings/backup — backup konfigurasi sekarang juga. */
    public function backupNow(Request $request)
    {
        $this->authorize('update', AppSetting::class);

        $backup = $this->settings->backupNow();

        $this->auditLog->record($request->user(), 'backup_now', 'settings', null, $request);

        return response()->json(['group' => 'backup', 'values' => $backup]);
    }

    /** GET /api/settings/backup/download — unduh file backup terbaru. */
    public function downloadBackup(Request $request)
    {
        $this->authorize('update', AppSetting::class);

        $filename = $this->settings->latestBackupFilename();

        if (! $filename) {
            return response()->json(['message' => 'Belum ada backup yang dapat diunduh.'], 404);
        }

        $this->auditLog->record($request->user(), 'download_backup', 'settings', null, $request);

        return Storage::disk('local')->download($filename, basename($filename));
    }

    /** POST /api/settings/backup/restore — pulihkan pengaturan dari file backup. */
    public function restoreBackup(Request $request)
    {
        $this->authorize('update', AppSetting::class);

        $request->validate([
            'file' => ['required', 'file', 'mimes:json,txt', 'max:5120'],
        ], [
            'file.required' => 'Pilih file backup terlebih dahulu.',
            'file.mimes' => 'File backup harus berformat JSON (.json).',
            'file.max' => 'Ukuran file backup maksimal 5 MB.',
        ]);

        try {
            $this->settings->restoreFromJson($request->file('file')->get());
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $this->auditLog->record($request->user(), 'restore_backup', 'settings', null, $request);

        return response()->json(['message' => 'Pengaturan berhasil dipulihkan dari backup.']);
    }
}
