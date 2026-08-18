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
     * Kirim email reset kata sandi (fitur lupa password). Tidak digerbang
     * oleh toggle notifikasi — email ini MUST selalu terkirim, karena
     * pengguna yang lupa password tidak bisa masuk untuk mengubah pengaturan.
     *
     * Prioritas pengirim:
     *   1. SMTP yang dikonfigurasi di Pengaturan → Integrasi (bila aktif &
     *      host/email pengirim lengkap).
     *   2. Mailer default aplikasi (mis. dari .env — biasanya "log" di
     *      pengembangan, atau SMTP default di produksi).
     *
     * Fallback ke mailer default memastikan lupa password tetap berfungsi
     * bahkan sebelum admin mengonfigurasi SMTP, sehingga pengguna tidak
     * terkunci di luar sistem.
     *
     * @return array{status: string, message: string}
     */
    public function sendPasswordReset(string $to, string $resetUrl): array
    {
        $integrations = $this->settings->rawGroup('integrations');

        $appName = $this->settings->rawGroup('application')['app_name'] ?? config('app.name');
        $subject = 'Reset Kata Sandi — '.$appName;
        $body = $this->renderResetEmail($appName, $resetUrl);

        $smtpConfigured = ($integrations['smtp_enabled'] ?? false)
            && ! empty($integrations['smtp_host'])
            && ! empty($integrations['smtp_from_email']);

        try {
            if ($smtpConfigured) {
                $this->configureSmtp($integrations);
                Mail::mailer('smtp')->html($body, function ($message) use ($to, $subject) {
                    $message->to($to)->subject($subject);
                });
            } else {
                Mail::html($body, function ($message) use ($to, $subject) {
                    $message->to($to)->subject($subject);
                });
            }
            $this->log('reset_password', $to, null, 'sent', null, $subject, $body);

            return ['status' => 'sent', 'message' => "Email reset kata sandi berhasil dikirim ke {$to}."];
        } catch (\Throwable $e) {
            $this->log('reset_password', $to, null, 'failed', substr($e->getMessage(), 0, 1000), $subject, $body);

            return ['status' => 'failed', 'message' => 'Gagal mengirim email reset: '.$e->getMessage()];
        }
    }

    private function renderResetEmail(string $appName, string $resetUrl): string
    {
        $link = htmlspecialchars($resetUrl, ENT_QUOTES, 'UTF-8');

        return <<<HTML
        <div style="font-family:Arial,Helvetica,sans-serif;background:#F8FAFC;padding:32px 16px;">
          <div style="max-width:520px;margin:0 auto;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:32px;">
            <h2 style="margin:0 0 8px;color:#172033;font-size:20px;">Reset Kata Sandi</h2>
            <p style="margin:0 0 20px;color:#64748B;font-size:14px;line-height:1.6;">
              Anda menerima email ini karena ada permintaan reset kata sandi untuk akun
              <strong>{$appName}</strong>. Klik tombol di bawah untuk membuat kata sandi baru.
            </p>
            <p style="text-align:center;margin:0 0 24px;">
              <a href="{$link}" style="display:inline-block;background:#0D753F;color:#FFFFFF;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 28px;border-radius:8px;">Buat Kata Sandi Baru</a>
            </p>
            <p style="margin:0 0 8px;color:#94A3B8;font-size:12px;line-height:1.6;">
              Jika tombol di atas tidak berfungsi, salin tautan berikut ke browser Anda:
            </p>
            <p style="margin:0 0 24px;word-break:break-all;color:#0D753F;font-size:12px;">{$link}</p>
            <p style="margin:0;color:#94A3B8;font-size:12px;line-height:1.6;">
              Tautan ini berlaku 60 menit. Jika Anda tidak meminta reset kata sandi, abaikan email ini.
            </p>
          </div>
        </div>
        HTML;
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
