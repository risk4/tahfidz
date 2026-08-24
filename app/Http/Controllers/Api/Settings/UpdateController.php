<?php

namespace App\Http\Controllers\Api\Settings;

use App\Domain\Settings\Models\AppSetting;
use App\Domain\Settings\Services\AppUpdateService;
use App\Http\Controllers\Controller;
use App\Services\Audit\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Endpoint "Cek Update": membandingkan versi aplikasi dengan GitHub dan
 * menjalankan pembaruan langsung dari aplikasi (tanpa terminal VPS).
 *
 * Proses pembaruan di-stream sebagai NDJSON ({type: step|output|done})
 * agar log tampil realtime di UI dan tidak terkena timeout HTTP.
 */
class UpdateController extends Controller
{
    public function __construct(
        private readonly AppUpdateService $updates,
        private readonly AuditLogService $auditLog,
    ) {}

    /** GET /api/settings/update/check — bandingkan versi lokal vs origin. */
    public function check(Request $request): JsonResponse
    {
        $this->authorize('viewAny', AppSetting::class);

        return response()->json($this->updates->check());
    }

    /** GET /api/settings/update/status — status proses pembaruan terakhir. */
    public function status(Request $request): JsonResponse
    {
        $this->authorize('viewAny', AppSetting::class);

        return response()->json($this->updates->status());
    }

    /**
     * POST /api/settings/update/run — jalankan pembaruan (streaming).
     * Kegagalan koneksi klien tidak menghentikan proses; status akhir
     * selalu tersedia via endpoint status.
     */
    public function run(Request $request)
    {
        $this->authorize('viewAny', AppSetting::class);

        if ($this->updates->isRunning()) {
            return response()->json(['message' => 'Masih ada proses pembaruan yang berjalan.'], 409);
        }

        $user = $request->user();
        $this->auditLog->record($user, 'update_application', 'settings', null, $request);

        ignore_user_abort(true);
        set_time_limit(0);

        $events = $this->updates->runWithEvents();

        return response()->stream(function () use ($events) {
            // Pastikan buffer middleware tidak menahan stream.
            while (ob_get_level() > 0) {
                @ob_end_flush();
            }

            foreach ($events as $event) {
                echo json_encode($event, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), "\n";
                flush();
            }
        }, 200, [
            'Content-Type' => 'application/x-ndjson; charset=utf-8',
            'Cache-Control' => 'no-store, no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }
}
