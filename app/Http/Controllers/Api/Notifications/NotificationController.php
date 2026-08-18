<?php

namespace App\Http\Controllers\Api\Notifications;

use App\Domain\Notifications\Models\NotificationLog;
use App\Domain\People\Models\User;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Pusat notifikasi in-app (ikon lonceng di topbar).
 *
 * Sumber datanya tabel notification_logs (riwayat pengiriman notifikasi).
 * Scope per role:
 *   - super_admin : semua notifikasi
 *   - teacher     : notifikasi santri binaannya (wali kelas / halaqah)
 *   - student     : notifikasi miliknya sendiri
 */
class NotificationController extends Controller
{
    /** GET /api/notifications — daftar notifikasi untuk pengguna saat ini. */
    public function index(Request $request)
    {
        $ids = $this->scopedStudentIds($request->user());
        $perPage = min(max($request->integer('per_page', 15), 5), 50);

        $query = NotificationLog::query()
            ->with('student:id,name')
            ->when($ids !== null, fn ($q) => $q->whereIn('student_id', $ids))
            ->orderByDesc('id');

        $unreadCount = (clone $query)->whereNull('read_at')->count();
        $total = (clone $query)->count();

        $paginator = $query->paginate($perPage);

        $data = collect($paginator->items())->map(fn (NotificationLog $log) => [
            'id' => $log->id,
            'type' => $log->type,
            'subject' => $log->subject,
            'body' => $log->body,
            'status' => $log->status,
            'error' => $log->error,
            'student_id' => $log->student_id,
            'student_name' => $log->student?->name,
            'recipient_email' => $log->recipient_email,
            'sent_at' => $log->sent_at?->toDateTimeString(),
            'created_at' => $log->created_at?->toDateTimeString(),
            'is_read' => $log->read_at !== null,
        ])->values();

        return response()->json([
            'data' => $data,
            'unread_count' => $unreadCount,
            'total' => $total,
            'last_page' => $paginator->lastPage(),
            'current_page' => $paginator->currentPage(),
        ]);
    }

    /** POST /api/notifications/{notification}/read — tandai satu notifikasi dibaca. */
    public function markRead(Request $request, int $notification)
    {
        $ids = $this->scopedStudentIds($request->user());

        $log = NotificationLog::query()
            ->when($ids !== null, fn ($q) => $q->whereIn('student_id', $ids))
            ->findOrFail($notification);

        $log->update(['read_at' => now()]);

        return response()->json(['message' => 'Notifikasi ditandai dibaca.']);
    }

    /** POST /api/notifications/read — tandai semua notifikasi dibaca. */
    public function markAllRead(Request $request)
    {
        $ids = $this->scopedStudentIds($request->user());

        NotificationLog::query()
            ->when($ids !== null, fn ($q) => $q->whereIn('student_id', $ids))
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'Semua notifikasi ditandai dibaca.']);
    }

    /**
     * ID santri dalam lingkup pengguna (null = semua), sama seperti
     * DashboardService agar konsisten antar halaman.
     */
    private function scopedStudentIds(User $user): ?array
    {
        if ($user->isSuperAdmin()) {
            return null;
        }

        if ($user->isTeacher()) {
            $teacherId = $user->teacher?->id;

            if (! $teacherId) {
                return [];
            }

            return DB::table('students as st')
                ->leftJoin('classes as c', 'c.id', '=', 'st.class_id')
                ->leftJoin('tahfidz_group_members as tgm', 'tgm.student_id', '=', 'st.id')
                ->leftJoin('tahfidz_groups as tg', 'tg.id', '=', 'tgm.tahfidz_group_id')
                ->where(function ($q) use ($teacherId) {
                    $q->where('c.homeroom_teacher_id', $teacherId)
                        ->orWhere('tg.teacher_id', $teacherId);
                })
                ->distinct()
                ->pluck('st.id')
                ->all();
        }

        if ($user->isStudent()) {
            return $user->student ? [$user->student->id] : [];
        }

        return [];
    }
}
