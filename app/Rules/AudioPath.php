<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * audio_path diisi manual oleh pengguna dan dirender sebagai <audio src>
 * di frontend. Nilai yang diizinkan hanya:
 *   1. URL http(s) absolut tanpa karakter berbahaya (spasi, kutip, <, >, \),
 *   2. path relatif aplikasi (huruf/angka/-/_/./) tanpa traversal "..".
 *
 * Skema lain (javascript:, data:, ftp:, //host) ditolak untuk mencegah
 * injeksi konten aktif melalui atribut src.
 */
class AudioPath implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null || $value === '') {
            return; // nullable ditangani aturan lain
        }

        $value = trim((string) $value);

        if ($value === '') {
            return;
        }

        if (preg_match('#^https?://#i', $value) === 1) {
            if (preg_match('#[\s"\'<>\\\\]#', $value) === 1) {
                $fail('URL audio mengandung karakter yang tidak diizinkan.');
            }

            return;
        }

        if (preg_match('#^[A-Za-z0-9_\-./]+$#', $value) === 1 && ! str_contains($value, '..')) {
            return;
        }

        $fail(':attribute harus berupa URL http(s) atau path relatif aplikasi.');
    }
}
