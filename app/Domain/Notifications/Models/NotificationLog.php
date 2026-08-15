<?php

namespace App\Domain\Notifications\Models;

use App\Domain\People\Models\Student;
use Illuminate\Database\Eloquent\Model;

/**
 * Riwayat pengiriman notifikasi (email). Satu baris per percobaan kirim —
 * dipakai untuk debugging (menu Pengaturan) dan dedup notifikasi sekali-saja
 * (mis. pencapaian target hafalan).
 */
class NotificationLog extends Model
{
    protected $table = 'notification_logs';

    protected $fillable = [
        'type', 'recipient_email', 'student_id', 'subject', 'body',
        'status', 'error', 'sent_at',
    ];

    protected function casts(): array
    {
        return ['sent_at' => 'datetime'];
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }
}
