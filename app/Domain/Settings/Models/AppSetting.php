<?php

namespace App\Domain\Settings\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Pengaturan aplikasi (key/value JSON) — tabel `settings`.
 *
 * Satu baris per kunci; `key` unik (format: `group.nama_kunci`),
 * `value` disimpan sebagai JSON, `group` menandai bagian pengaturan.
 */
class AppSetting extends Model
{
    protected $table = 'settings';

    protected $fillable = ['key', 'value', 'group'];

    protected function casts(): array
    {
        return ['value' => 'array'];
    }
}
