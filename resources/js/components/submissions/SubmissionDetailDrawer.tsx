import { useQuery } from '@tanstack/react-query';
import { quranService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/utils/date';
import type { QuranAyah, Submission } from '@/types';
import { BookOpen, CheckCircle2, Clock, Loader2, UserRound, X } from 'lucide-react';

/* ============================================================
 * Helper kecil (konsisten dengan SubmissionDrawer & halaman)
 * ============================================================ */

const statusMap = {
  approved: ['Disetujui', 'bg-emerald-50 text-emerald-700 ring-emerald-100'],
  pending: ['Menunggu', 'bg-sky-50 text-sky-700 ring-sky-100'],
  revision: ['Direvisi', 'bg-orange-50 text-orange-700 ring-orange-100'],
  rejected: ['Ditolak', 'bg-rose-50 text-rose-700 ring-rose-100'],
} as const;

const methodLabel = (m?: string, t?: string) =>
  ({ setoran: 'Setoran', murojaah: "Muroja'ah", tasmi: "Tasmi'", sambung_ayat: 'Sambung Ayat' } as Record<string, string>)[m ?? ''] ??
  (t === 'repetition' ? "Muroja'ah" : 'Setoran');

const photoUrl = (p?: string | null) =>
  p ? (p.startsWith('/storage/') || p.startsWith('http') ? p : `/storage/${p}`) : '';

function timeLabel(v?: string | null) {
  return v ? v.slice(0, 5) : '--:--';
}

function StatusBadge({ status = 'approved' }: { status?: Submission['status'] }) {
  const [l, c] = statusMap[status || 'approved'];
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${c}`}>{l}</span>;
}

/* ============================================================
 * Drawer detail setoran — mengikuti desain Tambah Setoran
 * ============================================================ */

export function SubmissionDetailDrawer({
  s,
  onClose,
  onEdit,
}: {
  s: Submission;
  onClose: () => void;
  onEdit?: () => void;
}) {
  // Daftar ayat surah terkait untuk menampilkan rentang yang disetor
  const { data: ayahsData } = useQuery({
    queryKey: ['surah-ayahs-detail', s.surah_id],
    queryFn: () => quranService.ayahs(Number(s.surah_id), { paged: false }),
    enabled: !!s.surah_id,
  });
  const ayahs: QuranAyah[] = Array.isArray(ayahsData) ? ayahsData : (ayahsData as any)?.data ?? [];
  const submittedAyahs = ayahs.filter((a) => a.ayah_number >= Number(s.start_ayah) && a.ayah_number <= Number(s.end_ayah));
  const ayahCount = Number(s.end_ayah) - Number(s.start_ayah) + 1;

  const infoRow = (label: string, value: string | number | null | undefined) =>
    value ? (
      <div>
        <p className="text-[11px] font-medium text-[#94A3B8]">{label}</p>
        <p className="text-sm font-semibold text-[#172033]">{value}</p>
      </div>
    ) : null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay transparan */}
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]" onClick={onClose} />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Detail Setoran"
        className="absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-2xl sm:w-[85%] md:w-[75%] lg:w-[680px]"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-[#172033]">Detail Setoran</h2>
            <p className="text-sm text-[#64748B]">Catat setoran hafalan santri</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-[#64748B] transition-colors hover:bg-slate-100"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Body (scroll) */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* A. Informasi Santri */}
          <section className="rounded-2xl border border-[#E2E8F0] p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#172033]">
              <UserRound className="h-4 w-4 text-[#0D753F]" /> Informasi Santri
            </h3>
            <div className="flex items-center gap-3">
              {s.student?.photo_path ? (
                <img
                  src={photoUrl(s.student.photo_path)}
                  alt="Foto santri"
                  className="h-11 w-11 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#E8F5EE] text-sm font-bold text-[#0D753F]">
                  {(s.student?.name ?? '--').slice(0, 2).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate font-bold text-[#172033]">{s.student?.name ?? '-'}</p>
                <p className="truncate text-sm text-[#64748B]">
                  {s.student?.nis || s.student?.student_code || '-'} · {s.student?.class_room?.name || 'Kelas -'}
                </p>
              </div>
              <div className="ml-auto">
                <StatusBadge status={s.status} />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-[#E8F5EE] p-4 sm:grid-cols-4">
              {infoRow('Kelas', s.student?.class_room?.name)}
              {infoRow('Pembimbing', s.student?.tahfidz_groups?.[0]?.teacher?.name)}
              {infoRow('Hafalan Terakhir', s.student?.tahfidz_profile?.total_juz ? `${s.student.tahfidz_profile.total_juz} Juz` : null)}
              {infoRow('Setoran Terakhir', s.student?.tahfidz_profile?.setoran_terakhir ? formatDate(s.student.tahfidz_profile.setoran_terakhir) : null)}
            </div>
          </section>

          {/* B. Informasi Hafalan */}
          <section className="rounded-2xl border border-[#E2E8F0] p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#172033]">
              <BookOpen className="h-4 w-4 text-[#0D753F]" /> Informasi Hafalan
            </h3>
            <div className="flex items-start justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-slate-50/60 p-4">
              <div>
                <p className="text-[11px] font-medium text-[#94A3B8]">Surah ke-{s.surah?.surah_number}</p>
                <p className="text-base font-bold text-[#172033]">{s.surah?.name_latin ?? '-'}</p>
                <p className="text-sm text-[#64748B]">
                  Ayat {s.start_ayah}–{s.end_ayah} · {methodLabel(s.method, s.type)}
                </p>
              </div>
              <p dir="rtl" lang="ar" className="font-arabic shrink-0 text-xl text-[#0D753F]">
                {s.surah?.name_arabic}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0D753F] px-3 py-1 text-xs font-bold text-white">
                <CheckCircle2 className="h-3.5 w-3.5" /> {ayahCount} Ayat
              </span>
              <span className="rounded-full bg-[#E8F5EE] px-3 py-1 text-xs font-semibold text-[#0D753F]">
                {methodLabel(s.method, s.type)}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-[#64748B]">
                {s.page_count ? `${Number(s.page_count).toLocaleString('id-ID')} Halaman` : '-'}
              </span>
            </div>

            {/* Daftar ayat yang disetor */}
            {submittedAyahs.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#64748B]">
                  Ayat Disetor — {s.surah?.name_latin}
                </p>
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-[#E2E8F0] p-2">
                  {submittedAyahs.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg bg-[#E8F5EE]/70 px-2 py-1.5">
                      <span className="min-w-0 flex-1 truncate text-sm">
                        <b className="text-[#0D753F]">{a.ayah_number}.</b>{' '}
                        {a.text_arabic ? (
                          <span dir="rtl" lang="ar" className="font-arabic text-base text-[#172033]">
                            {a.text_arabic}
                          </span>
                        ) : (
                          <span className="text-[#172033]">{`Ayat ${a.ayah_number}`}</span>
                        )}
                      </span>
                      <span className="shrink-0 rounded-lg border border-[#0D753F] bg-white px-2 py-1 text-xs font-semibold text-[#0D753F]">
                        Sudah Hafal
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* C. Informasi Setoran */}
          <section className="rounded-2xl border border-[#E2E8F0] p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#172033]">
              <Clock className="h-4 w-4 text-[#0D753F]" /> Informasi Setoran
            </h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {infoRow('Tanggal', formatDate(s.submission_date))}
              {infoRow('Waktu', timeLabel(s.submission_time))}
              {infoRow('Pembimbing', s.teacher?.name)}
              {infoRow('Status', statusMap[s.status || 'approved'][0])}
            </div>
            {s.audio_path && (
              <audio controls src={s.audio_path} className="mt-4 w-full">
                Browser Anda tidak mendukung pemutar audio.
              </audio>
            )}
          </section>

          {/* D. Keterangan */}
          <section className="rounded-2xl border border-[#E2E8F0] p-5">
            <h3 className="mb-2 text-sm font-bold text-[#172033]">Keterangan</h3>
            <p className="text-sm leading-relaxed text-[#64748B]">{s.notes || 'Belum ada catatan.'}</p>
          </section>
        </div>

        {/* Footer sticky */}
        <footer className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-[#E2E8F0] bg-white px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Tutup
          </Button>
          {onEdit && (
            <Button onClick={onEdit} className="min-w-[140px] bg-[#0D753F] hover:bg-[#075B30]">
              <Loader2 className="mr-2 hidden h-4 w-4" /> Edit Setoran
            </Button>
          )}
        </footer>
      </aside>
    </div>
  );
}
