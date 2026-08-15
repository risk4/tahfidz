<?php

namespace App\Domain\Tahfidz\Services;

use App\Domain\Tahfidz\Models\Murajaah;

/**
 * Business logic seputar murajaah: perhitungan final_score.
 *
 * Murajaah tidak menambah cakupan hafalan seperti submission. Namun status
 * per-ayat dari murajaah (melalui MurajaahController::updateAyahStatus) tetap
 * tersimpan di student_ayah_coverage dengan first_covered_submission_id NULL,
 * dan baris tersebut dipertahankan saat coverage submission dibangun ulang.
 */
class MurajaahService
{
    public function calculateFinalScore(array $data): float
    {
        $scores = [
            (float) ($data['fluency_score'] ?? 0),
            (float) ($data['tajwid_score'] ?? 0),
            (float) ($data['makhraj_score'] ?? 0),
            (float) ($data['fashahah_score'] ?? 0),
        ];

        return round(array_sum($scores) / count($scores), 2);
    }

    public function create(array $data): Murajaah
    {
        $data = $this->normalize($data);
        $data['final_score'] = $this->calculateFinalScore($data);

        return Murajaah::create($data);
    }

    public function update(Murajaah $murajaah, array $data): Murajaah
    {
        $data = $this->normalize($data, $murajaah);
        $data['final_score'] = $this->calculateFinalScore($data);
        $murajaah->update($data);

        return $murajaah->fresh();
    }

    public function delete(Murajaah $murajaah): void
    {
        $murajaah->delete();
    }

    /**
     * Normalisasi data sebelum simpan.
     *
     * Pada create (tanpa $existing), field yang tidak dikirim memakai nilai
     * default (status pending, skor 0, metode guided). Pada update, field
     * yang tidak dikirim mempertahankan nilai yang sudah tersimpan agar
     * partial update tidak menimpa data lama.
     */
    private function normalize(array $data, ?Murajaah $existing = null): array
    {
        $status = $data['status'] ?? $existing?->status ?? 'pending';

        $data['status'] = match ($status) {
            'LANCAR' => 'approved',
            'PERLU_MUROJAAH' => 'revision',
            default => $status,
        };

        $data['method'] = $data['method'] ?? $existing?->method ?? 'guided';

        foreach (['fluency_score', 'tajwid_score', 'makhraj_score', 'fashahah_score'] as $field) {
            $data[$field] = $data[$field] ?? $existing?->{$field} ?? 0;
        }

        return $data;
    }
}
