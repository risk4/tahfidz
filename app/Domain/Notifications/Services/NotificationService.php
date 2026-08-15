<?php

namespace App\Domain\Notifications\Services;

use App\Domain\Notifications\Models\NotificationLog;
use App\Domain\People\Models\Student;
use App\Domain\Settings\Services\SettingsService;
use Illuminate\Support\Facades\Mail;

/**
 * Enforcement nyata notifikasi: mengirim email via SMTP yang dikonfigurasi
 * di menu Pengaturan → Integrasi, memakai template dari Pengaturan →
 * Notifikasi.
 *
 * Setiap percobaan kirim dicatat di tabel `notification_logs` (sent /
 * skipped / failed). Method `send()` tidak pernah melempar exception —
 * kegagalan SMTP tidak boleh mengganggu alur utama (mis. menyimpan submission).
 */
class NotificationService
{
    // Placeholder pakai kurung ganda ({{nama}}) agar konsisten dengan render().
    private const SUBJECTS = [
        'setoran' => 'Setoran Hafalan Baru — {{nama}}',
        'murajaah' => "Muraja'ah Baru — {{nama}}",
        'target' => 'Target Hafalan Tercapai — {{nama}}',
        'announcement' => 'Pengumuman Baru',
        'absensi' => 'Absensi Santri',
        'system' => 'Pemberitahuan Sistem',
    ];

    public function __construct(private readonly SettingsService $settings)
    {
    }

    /**
     * Kirim notifikasi email bertipe `$type` (kunci toggle/template di
     * pengaturan `notifications`). `$data` dipakai untuk mengganti placeholder
     * `{{kunci}}` pada template.
     *
     * Alur: cek toggle → cek template → cek SMTP aktif → kirim → catat.
     */
    public function send(string $type, ?string $to, array $data = [], ?int $studentId = null): void
    {
        if (! $to) {
            return; // tidak ada penerima — tidak perlu dicatat
        }

        $notif = $this->settings->rawGroup('notifications');

        if (! ($notif["{$type}_enabled"] ?? false)) {
            $this->log($type, $to, $studentId, 'skipped', 'Notifikasi jenis ini dinonaktifkan.');

            return;
        }

        $template = $notif['templates'][$type] ?? '';
        if ($template === '') {
            $this->log($type, $to, $studentId, 'skipped', 'Template notifikasi kosong.');

            return;
        }

        $subject = $this->render(self::SUBJECTS[$type] ?? 'Notifikasi', $data);
        $body = $this->render($template, $data);

        $integrations = $this->settings->rawGroup('integrations');
        if (! ($integrations['smtp_enabled'] ?? false)) {
            $this->log($type, $to, $studentId, 'skipped', 'SMTP belum diaktifkan (menu Integrasi).', $subject, $body);

            return;
        }

        try {
            $this->configureSmtp($integrations);
            Mail::mailer('smtp')->html($body, function ($message) use ($to, $subject) {
                $message->to($to)->subject($subject);
            });
            $this->log($type, $to, $studentId, 'sent', null, $subject, $body);
        } catch (\Throwable $e) {
            $this->log($type, $to, $studentId, 'failed', substr($e->getMessage(), 0, 1000), $subject, $body);
        }
    }

    /**
     * Kirim email uji dengan konfigurasi SMTP tertentu (tombol "Kirim Email Uji"
     * di menu Integrasi). Mengembalikan hasil untuk ditampilkan ke pengguna.
     *
     * @return array{status: string, message: string}
     */
    public function sendTest(string $to, array $smtp): array
    {
        if (! ($smtp['smtp_enabled'] ?? false)) {
            return ['status' => 'failed', 'message' => 'SMTP belum diaktifkan. Aktifkan Email/SMTP di menu Integrasi terlebih dahulu.'];
        }

        if (empty($smtp['smtp_host']) || empty($smtp['smtp_from_email'])) {
            return ['status' => 'failed', 'message' => 'Konfigurasi SMTP belum lengkap (host & email pengirim wajib diisi).'];
        }

        try {
            $this->configureSmtp($smtp);
            Mail::mailer('smtp')->html(
                "<p>Email uji dari aplikasi Tahfidz Qur'an.</p><p>Konfigurasi SMTP berfungsi dengan baik.</p>",
                function ($message) use ($to) {
                    $message->to($to)->subject('Email Uji — Tahfidz Qur\'an');
                }
            );
            $this->log('test', $to, null, 'sent', null, 'Email Uji — Tahfidz Qur\'an');

            return ['status' => 'sent', 'message' => "Email uji berhasil dikirim ke {$to}."];
        } catch (\Throwable $e) {
            $this->log('test', $to, null, 'failed', substr($e->getMessage(), 0, 1000), 'Email Uji — Tahfidz Qur\'an');

            return ['status' => 'failed', 'message' => 'Gagal mengirim email uji: '.$e->getMessage()];
        }
    }

    /**
     * Notifikasi sekali-saja saat target hafalan tercapai (dipanggil dari
     * ProgressService::recompute). Dedup via notification_logs agar tidak
     * terkirim berulang pada setiap recompute.
     */
    public function notifyTargetAchieved(Student $student): void
    {
        $already = NotificationLog::where('type', 'target')
            ->where('student_id', $student->id)
            ->exists();

        if ($already) {
            return;
        }

        $this->send('target', $student->user?->email, ['nama' => $student->name], $student->id);
    }

    private function configureSmtp(array $smtp): void
    {
        config(['mail.default' => 'smtp']);
        config(['mail.mailers.smtp' => array_merge(config('mail.mailers.smtp', []), [
            'transport' => 'smtp',
            'scheme' => null,
            'url' => null,
            'host' => $smtp['smtp_host'] ?? '',
            'port' => (int) ($smtp['smtp_port'] ?? 587),
            'username' => $smtp['smtp_from_email'] ?? '',
            'password' => $smtp['smtp_password'] ?? '',
            'timeout' => 10,
        ])]);
        config(['mail.from' => [
            'address' => $smtp['smtp_from_email'] ?? config('mail.from.address'),
            'name' => $smtp['smtp_from_name'] ?: config('app.name'),
        ]]);
    }

    private function render(string $template, array $data): string
    {
        foreach ($data as $key => $value) {
            $template = str_replace('{{'.$key.'}}', (string) $value, $template);
        }

        return $template;
    }

    private function log(string $type, string $to, ?int $studentId, string $status, ?string $error, ?string $subject = null, ?string $body = null): void
    {
        try {
            NotificationLog::create([
                'type' => $type,
                'recipient_email' => $to,
                'student_id' => $studentId,
                'subject' => $subject,
                'body' => $body,
                'status' => $status,
                'error' => $error,
                'sent_at' => $status === 'sent' ? now() : null,
            ]);
        } catch (\Throwable) {
            // kegagalan mencatat log tidak boleh mengganggu alur utama
        }
    }
}
