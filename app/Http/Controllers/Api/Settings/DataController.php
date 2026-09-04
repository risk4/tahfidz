<?php

namespace App\Http\Controllers\Api\Settings;

use App\Domain\Settings\Models\AppSetting;
use App\Domain\Settings\Services\DataService;
use App\Http\Controllers\Controller;
use App\Services\Audit\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Fitur "Hapus Data" — reset seluruh data operasional. Khusus super admin.
 *
 * Alur dua langkah agar terlalu aman untuk penghapusan tak disengaja:
 * 1. GET  /api/settings/data/captcha — membuat challenge (soal aritmetika).
 * 2. POST /api/settings/data/wipe  — menghapus setelah captcha terjawab benar.
 */
class DataController extends Controller
{
    public function __construct(
        private readonly DataService $data,
        private readonly AuditLogService $auditLog,
    ) {}

    /** GET /api/settings/data/count — ringkasan data yang akan dihapus. */
    public function counts()
    {
        $this->authorize('viewAny', AppSetting::class);

        return response()->json($this->data->counts());
    }

    /** GET /api/settings/data/captcha — soal + token yang harus dijawab. */
    public function captcha()
    {
        $this->authorize('update', AppSetting::class);

        return response()->json($this->data->generateCaptcha());
    }

    /** POST /api/settings/data/wipe — hapus data setelah captcha lolos. */
    public function wipe(Request $request)
    {
        $this->authorize('update', AppSetting::class);

        $request->validate([
            'token' => ['required', 'string'],
            'answer' => ['required', 'string'],
            'confirm' => ['required', 'in:HAPUS'],
        ], [
            'token.required' => 'Token captcha tidak ditemukan. Muat ulang halaman lalu coba lagi.',
            'answer.required' => 'Jawaban captcha wajib diisi.',
            'confirm.required' => 'Ketikkan HAPUS untuk mengonfirmasi penghapusan.',
            'confirm.in' => 'Ketikkan HAPUS (huruf kapital) untuk mengonfirmasi penghapusan.',
        ]);

        if (! $this->data->verifyCaptcha($request->input('token'), $request->input('answer'))) {
            throw ValidationException::withMessages([
                'answer' => 'Jawaban captcha salah atau sudah kedaluwarsa. Silakan muat ulang dan coba lagi.',
            ]);
        }

        $counts = $this->data->wipe();

        $this->auditLog->record($request->user(), 'wipe_all_data', 'data', null, $request);

        return response()->json([
            'message' => 'Seluruh data berhasil dihapus.',
            'counts' => $counts,
        ]);
    }
}
