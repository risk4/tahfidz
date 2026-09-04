<?php

namespace App\Domain\Settings\Services;

use App\Domain\Settings\Models\AppSetting;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Business logic pengaturan aplikasi: nilai default, baca/tulis per group,
 * upload/hapus logo, dan snapshot backup konfigurasi.
 *
 * Nilai rahasia (SMTP password, API key, webhook secret) selalu dikembalikan
 * termasking — kode asli tidak pernah terekspos lewat API.
 */
class SettingsService
{
    /** Kunci yang nilainya rahasia — selalu ditampilkan termasking. */
    private const SECRET_KEYS = ['smtp_password', 'api_key', 'webhook_secret'];

    /** Group → daftar kunci yang boleh di-update lewat API. */
    private const WRITABLE_KEYS = [
        'profile' => ['name', 'npsn', 'nsm', 'madrasah_type', 'address', 'email', 'phone', 'website', 'city', 'province'],
        'application' => ['app_name', 'tagline', 'primary_color', 'timezone', 'language', 'date_format', 'time_format'],
        'notifications' => ['setoran_enabled', 'murajaah_enabled', 'target_enabled', 'announcement_enabled', 'absensi_enabled', 'system_enabled', 'templates'],
        'targets' => ['daily_pages', 'weekly_pages', 'monthly_pages'],
        'murajaah_methods' => ['methods'],
        'recitation_check' => ['save_enabled'],
        'security' => ['session_timeout_minutes', 'two_factor_auth', 'login_notification'],
        'backup' => ['schedule_time', 'retention_days', 'encryption_enabled'],
        'integrations' => [
            'whatsapp_enabled', 'whatsapp_number',
            'smtp_enabled', 'smtp_host', 'smtp_port', 'smtp_from_name', 'smtp_from_email', 'smtp_password',
            'cloud_storage_enabled', 'google_drive_enabled',
            'api_enabled', 'api_key',
            'webhook_enabled', 'webhook_url', 'webhook_secret',
        ],
    ];

    public function defaults(): array
    {
        return [
            'profile' => [
                'name' => 'MTsN 2 Mandailing Natal',
                'npsn' => '10212023',
                'nsm' => '121112130001',
                'madrasah_type' => 'MTs',
                'address' => 'Jl. Pendidikan No. 123, Panyabungan, Kabupaten Mandailing Natal, Sumatera Utara 22978',
                'email' => 'mtsn2madina@example.sch.id',
                'phone' => '0812-3456-7890',
                'website' => 'https://mtsn2madina.sch.id',
                'city' => 'Panyabungan',
                'province' => 'Sumatera Utara',
                'logo_path' => null,
            ],
            'application' => [
                'app_name' => "Tahfidz Qur'an",
                'tagline' => "Menghafal Al-Qur'an, Meraih Surga",
                'logo_path' => null,
                'favicon_path' => null,
                'primary_color' => '#059669',
                'timezone' => 'Asia/Jakarta',
                'language' => 'id',
                'date_format' => 'DD MMMM YYYY',
                'time_format' => '24',
            ],
            'notifications' => [
                'setoran_enabled' => true,
                'murajaah_enabled' => true,
                'target_enabled' => true,
                'announcement_enabled' => true,
                'absensi_enabled' => true,
                'system_enabled' => false,
                'templates' => [
                    'setoran' => 'Halo {{nama}}, setoran hafalan Anda telah dicatat.',
                    'murajaah' => "Halo {{nama}}, muraja'ah Anda telah dicatat.",
                    'target' => 'Selamat {{nama}}, target hafalan tercapai!',
                    'announcement' => 'Pengumuman baru: {{pesan}}',
                    'absensi' => 'Kehadiran Anda telah dicatat.',
                    'system' => 'Pemeliharaan sistem dijadwalkan.',
                ],
            ],
            'targets' => ['daily_pages' => 2, 'weekly_pages' => 10, 'monthly_pages' => 40],
            'murajaah_methods' => [
                'methods' => [
                    ['id' => 1, 'name' => "Muraja'ah Mandiri", 'description' => 'Mengulang hafalan secara mandiri.', 'active' => true, 'sort' => 1],
                    ['id' => 2, 'name' => "Muraja'ah Berulang", 'description' => 'Mengulang hafalan berkali-kali hingga lancar.', 'active' => true, 'sort' => 2],
                    ['id' => 3, 'name' => "Muraja'ah Kelompok", 'description' => "Muraja'ah bersama dalam kelompok halaqah.", 'active' => true, 'sort' => 3],
                    ['id' => 4, 'name' => "Muraja'ah Terbimbing", 'description' => "Muraja'ah dengan bimbingan langsung pembimbing.", 'active' => true, 'sort' => 4],
                ],
            ],
            // Pengecekan bacaan (Web Speech API). Hasil pengecekan saat ini
            // bersifat realtime; flag ini adalah opsi agar nantinya hasil bisa
            // disimpan ke riwayat siswa (fitur penyimpanan belum diimplementasikan).
            'recitation_check' => [
                'save_enabled' => false,
            ],
            'security' => ['session_timeout_minutes' => 30, 'two_factor_auth' => false, 'login_notification' => false],
            // Aset khusus sertifikat (diunggah via endpoint logo dengan key
            // certificate.seal_path — bukan lewat PUT /settings/{group}).
            'certificate' => [
                'seal_path' => null,
            ],
            'backup' => [
                'schedule_time' => '02:00',
                'retention_days' => 30,
                'encryption_enabled' => true,
                'last_backup_at' => null,
                'last_backup_status' => null,
                'last_backup_size' => null,
            ],
            'integrations' => [
                'whatsapp_enabled' => false,
                'whatsapp_number' => '',
                'smtp_enabled' => false,
                'smtp_host' => '',
                'smtp_port' => 587,
                'smtp_from_name' => '',
                'smtp_from_email' => '',
                'smtp_password' => '',
                'cloud_storage_enabled' => false,
                'google_drive_enabled' => false,
                'api_enabled' => false,
                'api_key' => '',
                'webhook_enabled' => false,
                'webhook_url' => '',
                'webhook_secret' => '',
            ],
        ];
    }

    /** Semua pengaturan, dikelompokkan per group, nilai rahasia termasking. */
    public function all(): array
    {
        $result = [];
        foreach (array_keys($this->defaults()) as $group) {
            $result[$group] = $this->group($group);
        }

        return $result;
    }

    /**
     * Nilai per group dengan nilai rahasia termasking (untuk dikirim ke klien).
     */
    public function group(string $group): array
    {
        return $this->maskSecrets($this->rawGroup($group));
    }

    /**
     * Nilai per group tanpa masking — HANYA untuk konsumsi internal
     * (mis. NotificationService butuh password SMTP asli). Jangan pernah
     * mengembalikan hasil method ini ke klien.
     */
    public function rawGroup(string $group): array
    {
        $defaults = $this->defaults()[$group] ?? [];

        // pluck('value', 'key') mengembalikan kunci lengkap ("group.nama_kunci")
        // — buang prefiks group agar sesuai dengan kunci pada defaults.
        $stored = AppSetting::where('group', $group)
            ->pluck('value', 'key')
            ->mapWithKeys(fn ($value, $key) => [str_replace("{$group}.", '', $key) => $value])
            ->toArray();

        return array_replace($defaults, $stored);
    }

    /**
     * Simpan nilai per group (upsert per kunci). Kunci di luar whitelist
     * diabaikan. Nilai rahasia yang kosong/termasking tidak menimpa nilai lama.
     */
    public function update(string $group, array $values): array
    {
        $allowed = self::WRITABLE_KEYS[$group] ?? [];

        foreach ($values as $key => $value) {
            $key = (string) $key;
            if (! in_array($key, $allowed, true)) {
                continue;
            }

            if (in_array($key, self::SECRET_KEYS, true)) {
                $value = trim((string) $value);
                if ($value === '' || str_starts_with($value, '••••')) {
                    continue;
                }
            }

            AppSetting::updateOrCreate(
                ['key' => "{$group}.{$key}"],
                ['value' => $value, 'group' => $group],
            );
        }

        return $this->group($group);
    }

    /**
     * Simpan file logo/favicon ke disk public, hapus file lama bila ada.
     * `$key` berupa `group.nama_kunci`, mis. `profile.logo_path`.
     */
    public function uploadLogo(string $key, UploadedFile $file): string
    {
        [$group] = explode('.', $key, 2);

        $old = AppSetting::where('key', $key)->value('value');
        if ($old && Storage::disk('public')->exists($old)) {
            Storage::disk('public')->delete($old);
        }

        $path = $file->store('logos', 'public');

        AppSetting::updateOrCreate(['key' => $key], ['value' => $path, 'group' => $group]);

        return $path;
    }

    public function deleteLogo(string $key): void
    {
        [$group] = explode('.', $key, 2);

        $old = AppSetting::where('key', $key)->value('value');
        if ($old && Storage::disk('public')->exists($old)) {
            Storage::disk('public')->delete($old);
        }

        AppSetting::updateOrCreate(['key' => $key], ['value' => null, 'group' => $group]);
    }

    /**
     * Backup konfigurasi: simpan snapshot seluruh pengaturan sebagai JSON
     * ke storage lokal dan catat info backup terakhir. Aman & non-destruktif —
     * tidak menyentuh data siswa/submission.
     */
    public function backupNow(): array
    {
        $snapshot = $this->all();
        $json = json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $filename = 'backups/settings-'.now()->format('Ymd_His').'.json';

        Storage::disk('local')->put($filename, $json);

        // Bersihkan file backup lama secara otomatis sesuai retention_days
        // yang tersimpan (default 30 hari). File yang baru dibuat pasti lolos
        // karena usianya 0 hari.
        $retentionDays = (int) ($this->rawGroup('backup')['retention_days'] ?? 30);
        $this->cleanupOldBackups($retentionDays);

        foreach ([
            'last_backup_at' => now()->toDateTimeString(),
            'last_backup_status' => 'success',
            'last_backup_size' => $this->humanFileSize(strlen($json)),
        ] as $key => $value) {
            AppSetting::updateOrCreate(['key' => "backup.{$key}"], ['value' => $value, 'group' => 'backup']);
        }

        return $this->group('backup');
    }

    /**
     * Hapus file backup yang lebih lama dari batas retensi (hari). Nama file
     * memuat timestamp (Ymd_His) sehingga usia file bisa dihitung tanpa metadata.
     * Mengembalikan jumlah file yang dihapus.
     */
    private function cleanupOldBackups(int $retentionDays): int
    {
        $cutoff = now()->subDays(max(1, $retentionDays));
        $deleted = 0;

        foreach ($this->validBackupFiles() as $path) {
            $createdAt = $this->backupDate($path);
            if ($createdAt && $createdAt->lt($cutoff) && Storage::disk('local')->delete($path)) {
                $deleted++;
            }
        }

        return $deleted;
    }

    /**
     * Nama file backup konfigurasi terbaru di disk lokal, atau null bila
     * belum pernah ada backup. File diurutkan alfabetis karena nama file
     * memakai timestamp (Ymd_His) sehingga yang terbaru selalu paling akhir.
     */
    public function latestBackupFilename(): ?string
    {
        $backups = $this->validBackupFiles();

        if (empty($backups)) {
            return null;
        }

        sort($backups);

        return end($backups);
    }

    /**
     * Daftar seluruh file backup beserta metadata (tanggal & ukuran),
     * diurutkan dari yang terbaru ke terlama.
     *
     * @return array<int, array{filename: string, date: string, size: string, latest: bool}>
     */
    public function backups(): array
    {
        $files = $this->validBackupFiles();
        if (empty($files)) {
            return [];
        }

        rsort($files); // nama memakai timestamp Ymd_His => terbaru paling dulu

        $latest = $files[0];

        return collect($files)->map(fn (string $path) => [
            'filename' => $path,
            'date' => $this->backupDate($path)?->toDateTimeString(),
            'size' => $this->humanFileSize(Storage::disk('local')->size($path)),
            'latest' => $path === $latest,
        ])->values()->all();
    }

    /**
     * Validasi bahwa sebuah nama file adalah file backup konfigurasi milik
     * aplikasi (mencegah path traversal / nama file bebas saat download).
     */
    public function isValidBackupFile(?string $filename): bool
    {
        return $filename !== null
            && preg_match('/^backups\/settings-\d{8}_\d{6}\.json$/', $filename) === 1
            && Storage::disk('local')->exists($filename);
    }

    /** Seluruh nama file backup yang valid di disk, tanpa urutan tertentu. */
    private function validBackupFiles(): array
    {
        return array_values(array_filter(
            Storage::disk('local')->files('backups'),
            fn (string $path) => preg_match('/^backups\/settings-\d{8}_\d{6}\.json$/', $path) === 1
        ));
    }

    /** Baca timestamp dari nama file backup, atau null bila tidak cocok. */
    private function backupDate(string $path): ?Carbon
    {
        if (preg_match('/^backups\/settings-(\d{8}_\d{6})\.json$/', $path, $matches) !== 1) {
            return null;
        }

        return Carbon::createFromFormat('Ymd_His', $matches[1]);
    }

    /**
     * Pulihkan pengaturan dari file backup (JSON) yang diunggah.
     *
     * Aman: hanya kunci yang masuk whitelist yang ditulis, nilai rahasia
     * yang termasking/tidak diisi tidak menimpa nilai lama (lihat update()).
     */
    public function restoreFromJson(string $json): array
    {
        $data = json_decode($json, true);

        if (! is_array($data)) {
            throw new \InvalidArgumentException('File backup tidak valid: bukan JSON yang benar.');
        }

        foreach (array_keys($this->defaults()) as $group) {
            $values = $data[$group] ?? null;
            if (! is_array($values)) {
                continue;
            }

            $this->update($group, $values);
        }

        return $this->all();
    }

    private function maskSecrets(array $values): array
    {
        foreach ($values as $key => $value) {
            if (in_array($key, self::SECRET_KEYS, true) && is_string($value) && $value !== '') {
                $values[$key] = '••••••••'.substr($value, -4);
            }
        }

        return $values;
    }

    private function humanFileSize(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $i = 0;
        while ($bytes >= 1024 && $i < count($units) - 1) {
            $bytes /= 1024;
            $i++;
        }

        return round($bytes, 1).' '.$units[$i];
    }
}
