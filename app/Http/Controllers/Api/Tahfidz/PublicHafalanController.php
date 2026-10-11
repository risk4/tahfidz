<?php

namespace App\Http\Controllers\Api\Tahfidz;

use App\Domain\Tahfidz\Services\PublicHafalanService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Endpoint publik "Lihat Hafalan" — memungkinkan pengunjung mengecek
 * perkembangan hafalan santri lewat NISN tanpa harus masuk.
 */
class PublicHafalanController extends Controller
{
    public function __construct(
        private readonly PublicHafalanService $hafalan,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nisn' => ['required', 'string', 'max:30'],
        ]);

        $student = $this->hafalan->findByNisn($validated['nisn']);

        if (! $student) {
            return response()->json([
                'found' => false,
                'message' => 'Data siswa dengan NISN tersebut tidak ditemukan.',
            ], 404);
        }

        return response()->json(array_merge(
            ['found' => true],
            $this->hafalan->payload($student),
        ));
    }
}
