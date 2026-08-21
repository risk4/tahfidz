<?php

namespace App\Http\Controllers\Api\Tahfidz;

use App\Domain\People\Support\SupervisedStudentScope;
use App\Domain\Settings\Services\SettingsService;
use App\Domain\Tahfidz\Models\RecitationCheck;
use App\Domain\Tahfidz\Services\RecitationCheckService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Tahfidz\StoreRecitationCheckRequest;
use Illuminate\Http\Request;

/**
 * Pengecekan bacaan (Web Speech API). Hasil pengecekan bersifat realtime;
 * penyimpanan ke riwayat siswa hanya aktif bila opsi "Simpan Hasil ke
 * Riwayat" diaktifkan (Pengaturan → Pengecekan Bacaan).
 */
class RecitationCheckController extends Controller
{
    public function __construct(
        private readonly RecitationCheckService $recitationCheckService,
        private readonly SettingsService $settings,
    ) {}

    /** GET /api/recitation-checks/config — flag penyimpanan riwayat. */
    public function config(Request $request)
    {
        $saveEnabled = (bool) ($this->settings->rawGroup('recitation_check')['save_enabled'] ?? false);

        return response()->json(['save_enabled' => $saveEnabled]);
    }

    /** GET /api/recitation-checks — riwayat pengecekan bacaan. */
    public function index(Request $request)
    {
        $this->authorize('viewAny', RecitationCheck::class);

        $query = RecitationCheck::query()
            ->with(['student.classRoom', 'surah']);

        // Guru hanya melihat riwayat siswa binaannya (wali kelas / halaqah).
        SupervisedStudentScope::apply($query, $request->user(), viaRelation: true);

        if ($request->user()->isStudent()) {
            // Siswa hanya melihat riwayat miliknya sendiri.
            $query->where('student_id', $request->user()->student?->id ?? 0);
        }

        if ($studentId = $request->integer('student_id')) {
            $query->where('student_id', $studentId);
        }

        $perPage = min(max((int) $request->query('per_page', 15), 1), 100);

        return $query
            ->orderByDesc('checked_at')
            ->paginate($perPage);
    }

    /** POST /api/recitation-checks — simpan hasil pengecekan. */
    public function store(StoreRecitationCheckRequest $request)
    {
        $this->authorize('create', RecitationCheck::class);

        // Opsi penyimpanan harus aktif di Pengaturan.
        $saveEnabled = (bool) ($this->settings->rawGroup('recitation_check')['save_enabled'] ?? false);
        if (! $saveEnabled) {
            return response()->json([
                'message' => 'Penyimpanan riwayat pengecekan bacaan belum diaktifkan di Pengaturan.',
            ], 409);
        }

        $check = $this->recitationCheckService->create($request->user(), $request->validated());
        $check->load(['student.classRoom', 'surah']);

        return response()->json($check, 201);
    }
}
