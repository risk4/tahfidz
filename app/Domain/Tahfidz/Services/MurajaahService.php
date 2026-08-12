<?php

namespace App\Domain\Tahfidz\Services;

use App\Domain\Tahfidz\Models\Murajaah;

/**
 * Business logic seputar murajaah: perhitungan final_score.
 * Murajaah adalah setoran ulang hafalan, sehingga tidak mengubah
 * student_ayah_coverage (hanya submission tipe new_memorization yang menambah cakupan).
 */
class MurajaahService
{
    public function calculateFinalScore(array $data): float
    {
        $scores = [
            (float) $data['fluency_score'],
            (float) $data['tajwid_score'],
            (float) $data['makhraj_score'],
            (float) $data['fashahah_score'],
        ];

        return round(array_sum($scores) / count($scores), 2);
    }

    public function create(array $data): Murajaah
    {
        $data['final_score'] = $this->calculateFinalScore($data);

        return Murajaah::create($data);
    }

    public function update(Murajaah $murajaah, array $data): Murajaah
    {
        $data['final_score'] = $this->calculateFinalScore($data);
        $murajaah->update($data);

        return $murajaah->fresh();
    }

    public function delete(Murajaah $murajaah): void
    {
        $murajaah->delete();
    }
}
