import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { quranService, submissionService } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect, type SearchableOption } from '@/components/ui/searchable-select';
import { formatDate, toDateInputValue } from '@/utils/date';
import type { QuranAyah, QuranSurah, Student, Submission, Teacher } from '@/types';
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  Pause,
  Play,
  Search,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';

/* ============================================================
 * Skema validasi
 * ============================================================ */

const schema = z
  .object({
    student_id: z.coerce.number().min(1, 'Santri wajib dipilih'),
    teacher_id: z.coerce.number().optional(),
    submission_date: z.string().min(1, 'Tanggal wajib diisi'),
    submission_time: z.string().min(1, 'Waktu wajib diisi'),
    type: z.enum(['new_memorization', 'repetition']),
    method: z.enum(['setoran', 'murojaah', 'tasmi', 'sambung_ayat']),
    surah_id: z.coerce.number().min(1, 'Surah wajib dipilih'),
    start_ayah: z.coerce.number().min(1, 'Ayat mulai wajib diisi'),
    end_ayah: z.coerce.number().min(1, 'Ayat selesai wajib diisi'),
    page_count: z.coerce.number().min(0.1, 'Jumlah halaman wajib diisi').max(999.9),
    status: z.enum(['pending', 'approved', 'revision', 'rejected']),
    fluency_score: z.coerce.number().min(0).max(100),
    tajwid_score: z.coerce.number().min(0).max(100),
    makhraj_score: z.coerce.number().min(0).max(100),
    fashahah_score: z.coerce.number().min(0).max(100),
    notes: z.string().max(200, 'Catatan maksimal 200 karakter').optional(),
    audio_path: z.string().optional(),
  })
  .refine((d) => d.end_ayah >= d.start_ayah, {
    path: ['end_ayah'],
    message: 'Ayat selesai tidak boleh lebih kecil dari ayat mulai',
  });

type FormData = z.infer<typeof schema>;

/* ============================================================
 * Helper kecil
 * ============================================================ */

const METHOD_LABEL: Record<string, string> = {
  setoran: 'Setoran',
  murojaah: "Muroja'ah",
  tasmi: "Tasmi'",
  sambung_ayat: 'Sambung Ayat',
};

const photoUrl = (p?: string | null) => (p ? (p.startsWith('/storage/') || p.startsWith('http') ? p : `/storage/${p}`) : '');

function avatarOption(name: string, photo?: string | null): { avatar: string | null; avatarText: string } {
  return {
    avatar: photoUrl(photo) || null,
    avatarText: name.slice(0, 2).toUpperCase(),
  };
}

/* ============================================================
 * Drawer
 * ============================================================ */

export function SubmissionDrawer({
  editing,
  students,
  teachers,
  surahs,
  searchStudents,
  onClose,
  onSaved,
}: {
  editing?: Submission | null;
  students: Student[];
  teachers: Teacher[];
  surahs: QuranSurah[];
  searchStudents: (q: string) => void;
  onClose: () => void;
  onSaved: (m: string) => void;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isTeacherRole = user?.role === 'teacher';
  const isAdmin = user?.role === 'super_admin';
  const currentTeacherId = user?.teacher_id;

  // State UI
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [serverError, setServerError] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [ayahStatus, setAyahStatus] = useState<Record<number, boolean>>({});

  // ===== Audio bacaan ayat (everyayah.com CDN) =====
  const [reciter, setReciter] = useState('Alafasy_128kbps');
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = () => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
    setPlayingAyah(null);
    setAudioLoading(false);
  };

  const togglePlay = (ayahNumber: number) => {
    const surahNumber = selectedSurah?.surah_number;
    if (!surahNumber) return;
    const audio = audioRef.current;

    // Ayat yang sama sedang diputar → jeda/lanjutkan
    if (playingAyah === ayahNumber && audio) {
      if (audio.paused) {
        setAudioError(false);
        audio.play().catch(() => setAudioError(true));
      } else {
        audio.pause();
      }
      return;
    }

    setAudioError(false);
    setAudioLoading(true);
    const a = audio ?? new Audio();
    a.src = `https://everyayah.com/data/${reciter}/${String(surahNumber).padStart(3, '0')}${String(ayahNumber).padStart(3, '0')}.mp3`;
    a.preload = 'auto';
    a.onended = () => {
      setPlayingAyah(null);
      setAudioLoading(false);
    };
    a.onerror = () => {
      setPlayingAyah(null);
      setAudioLoading(false);
      setAudioError(true);
    };
    a.onplaying = () => setAudioLoading(false);
    audioRef.current = a;
    setPlayingAyah(ayahNumber);
    a.play().catch(() => {
      setPlayingAyah(null);
      setAudioLoading(false);
      setAudioError(true);
    });
  };

  // Hentikan audio saat drawer ditutup
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  // Debounce pencarian santri
  const studentQueryRef = useRef('');
  useEffect(() => {
    studentQueryRef.current = studentQuery;
    const t = setTimeout(() => searchStudents(studentQuery), 350);
    return () => clearTimeout(t);
  }, [studentQuery, searchStudents]);

  // React-hook-form
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<z.input<typeof schema>, any, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: editing
      ? {
          student_id: editing.student_id,
          teacher_id: editing.teacher_id,
          submission_date: editing.submission_date ? toDateInputValue(editing.submission_date) : toDateInputValue(new Date()),
          submission_time: editing.submission_time?.slice(0, 5) || nowTime(),
          type: editing.type,
          method: editing.method ?? (editing.type === 'repetition' ? 'murojaah' : 'setoran'),
          surah_id: editing.surah_id,
          start_ayah: editing.start_ayah,
          end_ayah: editing.end_ayah,
          page_count: Number(editing.page_count || 1),
          status: editing.status || 'approved',
          fluency_score: editing.fluency_score || 90,
          tajwid_score: editing.tajwid_score || 90,
          makhraj_score: editing.makhraj_score || 90,
          fashahah_score: editing.fashahah_score || 90,
          notes: editing.notes || '',
          audio_path: editing.audio_path || '',
        }
      : {
          student_id: 0,
          teacher_id: currentTeacherId || undefined,
          submission_date: toDateInputValue(new Date()),
          submission_time: nowTime(),
          type: 'new_memorization',
          method: 'setoran',
          surah_id: 0,
          start_ayah: 1,
          end_ayah: 1,
          page_count: 1,
          status: isAdmin ? 'approved' : 'pending',
          fluency_score: 90,
          tajwid_score: 90,
          makhraj_score: 90,
          fashahah_score: 90,
          notes: '',
          audio_path: '',
        },
  });

  const w = watch() as FormData;

  // Hentikan audio saat surah diganti
  useEffect(() => {
    stopAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w.surah_id]);

  // Santri / surah terpilih
  const selectedStudent = students.find((s) => s.id === Number(w.student_id)) ?? null;
  const selectedSurah = surahs.find((s) => s.id === Number(w.surah_id)) ?? null;

  // Pembimbing — wali kelas / guru otomatis & terkunci
  const isTeacherLocked = isTeacherRole && !!currentTeacherId;

  // Daftar ayat surah terpilih
  const { data: ayahsData } = useQuery({
    queryKey: ['surah-ayahs-drawer', w.surah_id],
    queryFn: () => quranService.ayahs(Number(w.surah_id), { paged: false }),
    enabled: !!w.surah_id && w.surah_id > 0,
  });
  const ayahs: QuranAyah[] = Array.isArray(ayahsData) ? ayahsData : (ayahsData as any)?.data ?? [];

  // Default status hafal mengikuti rentang ayat (input Ayat Mulai/Selesai → daftar)
  useEffect(() => {
    const start = Number(w.start_ayah);
    const end = Number(w.end_ayah);
    if (selectedSurah && start >= 1 && end >= start) {
      setAyahStatus((prev) => {
        const merged = { ...prev };
        for (let a = start; a <= end; a++) merged[a] = true;
        return merged;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w.surah_id, w.start_ayah, w.end_ayah]);

  // Sinkron balik: klik "Sudah Hafal" / "Tandai semua hafal" → perbarui Ayat Mulai & Ayat Selesai
  const ayahStatusRef = useRef<Record<number, boolean>>({});
  ayahStatusRef.current = ayahStatus;
  useEffect(() => {
    if (!selectedSurah) return;
    const marked = Object.entries(ayahStatusRef.current)
      .filter(([, v]) => v)
      .map(([k]) => Number(k))
      .sort((a, b) => a - b);
    if (marked.length === 0) return;

    const min = marked[0];
    const max = marked[marked.length - 1];
    if (Number(w.start_ayah) !== min) setValue('start_ayah', min);
    if (Number(w.end_ayah) !== max) setValue('end_ayah', max);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ayahStatus]);

  const ayahCount = selectedSurah && Number(w.end_ayah) >= Number(w.start_ayah)
    ? Number(w.end_ayah) - Number(w.start_ayah) + 1
    : 0;

  const hafalCount = Object.values(ayahStatus).filter(Boolean).length;

  // Opsi kelas unik dari daftar santri (wali kelas bisa punya > 1 kelas)
  const classOptions = useMemo(() => {
    const seen = new Map<number, string>();
    students.forEach((s) => {
      if (s.class_room?.id && !seen.has(s.class_room.id)) {
        seen.set(s.class_room.id, s.class_room.name ?? 'Kelas');
      }
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [students]);

  // Opsi dropdown — difilter berdasarkan kelas yang dipilih
  const studentOptions: SearchableOption[] = students
    .filter((s) => s.status === 'active')
    .filter((s) => !selectedClassId || s.class_room?.id === Number(selectedClassId))
    .map((s) => ({
      value: s.id,
      label: s.name,
      secondary: s.class_room?.name ?? 'Kelas -',
      ...avatarOption(s.name, s.photo_path),
      data: s,
    }));

  const teacherOptions: SearchableOption[] = teachers.map((t) => ({
    value: t.id,
    label: t.name,
    secondary: t.subject ?? 'Guru',
    ...avatarOption(t.name, t.photo_path),
    data: t,
  }));

  const surahOptions: SearchableOption[] = surahs.map((s) => ({
    value: s.id,
    label: s.name_latin,
    secondary: `${s.surah_number}. ${s.translation ?? ''} · ${s.total_ayahs} ayat`.trim(),
    data: s,
  }));

  // Simpan
  const save = useMutation({
    mutationFn: (d: FormData) =>
      editing ? submissionService.update(editing.id, d) : submissionService.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['submissions'] });
      qc.invalidateQueries({ queryKey: ['dashboard-overview'] });
      qc.invalidateQueries({ queryKey: ['students-options'] });
      onSaved(editing ? 'Setoran berhasil diperbarui' : 'Setoran berhasil ditambahkan');
      reset();
      onClose();
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
      const errors = err?.response?.data?.errors;
      if (errors && Object.keys(errors).length) {
        setServerError(Object.values(errors)[0][0]);
      } else {
        setServerError(err?.response?.data?.message || 'Gagal menyimpan setoran. Periksa kembali isian form.');
      }
    },
  });

  const onSubmit = handleSubmit((d) => save.mutate(d));

  // Tutup dengan konfirmasi bila ada perubahan
  const requestClose = () => {
    if (isDirty) setConfirmDiscard(true);
    else onClose();
  };

  const forceClose = () => {
    reset();
    setConfirmDiscard(false);
    onClose();
  };

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
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]" onClick={requestClose} />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={editing ? 'Edit Setoran' : 'Tambah Setoran'}
        className="absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-2xl sm:w-[85%] md:w-[75%] lg:w-[680px]"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-[#172033]">
              {editing ? 'Edit Setoran' : 'Tambah Setoran'}
            </h2>
            <p className="text-sm text-[#64748B]">Catat setoran hafalan santri</p>
          </div>
          <button
            onClick={requestClose}
            className="rounded-xl p-2 text-[#64748B] transition-colors hover:bg-slate-100"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Body (scroll) */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {serverError && (
            <div role="alert" className="flex items-start gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#B91C1C]" />
              <div>
                <p className="text-sm font-bold text-[#B91C1C]">Gagal menyimpan</p>
                <p className="text-sm text-[#B91C1C]/90">{serverError}</p>
              </div>
            </div>
          )}

          {/* A. Informasi Santri */}
          <section className="rounded-2xl border border-[#E2E8F0] p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#172033]">
              <UserRound className="h-4 w-4 text-[#0D753F]" /> Informasi Santri
            </h3>

            {/* Pilih kelas terlebih dahulu — wali kelas bisa memiliki > 1 kelas */}
            <label className="mb-1.5 block text-sm font-medium text-[#172033]">
              Kelas <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setValue('student_id', 0);
                  setStudentQuery('');
                }}
                aria-label="Pilih kelas"
                className="h-11 w-full appearance-none rounded-xl border border-[#E2E8F0] bg-white px-3 pr-9 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0D753F]/15"
              >
                <option value="">Pilih kelas...</option>
                {classOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
            </div>
            {!selectedClassId && (
              <p className="mt-1.5 text-xs text-amber-600">Pilih kelas terlebih dahulu untuk melihat daftar santri.</p>
            )}

            <label className="mb-1.5 mt-4 block text-sm font-medium text-[#172033]">
              Santri <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              autoFocus={!!selectedClassId}
              options={studentOptions}
              value={w.student_id || null}
              onChange={(v) => setValue('student_id', Number(v) || 0)}
              placeholder="Pilih santri..."
              searchPlaceholder="Cari nama santri..."
              emptyText={selectedClassId ? 'Tidak ada santri di kelas ini.' : 'Pilih kelas terlebih dahulu.'}
            />
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
              <Input
                className="rounded-xl pl-9"
                placeholder="Cari santri lain berdasarkan nama..."
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
              />
            </div>
            {errors.student_id && <p className="mt-1.5 text-xs text-rose-600">{errors.student_id.message}</p>}

            {/* Info tambahan santri terpilih */}
            {selectedStudent && (
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-[#E8F5EE] p-4 sm:grid-cols-4">
                {infoRow('Kelas', selectedStudent.class_room?.name)}
                {infoRow('Pembimbing', selectedStudent.tahfidz_groups?.[0]?.teacher?.name)}
                {infoRow('Hafalan Terakhir', selectedStudent.tahfidz_profile?.total_juz ? `${selectedStudent.tahfidz_profile.total_juz} Juz` : null)}
                {infoRow('Setoran Terakhir', selectedStudent.tahfidz_profile?.setoran_terakhir ? formatDate(selectedStudent.tahfidz_profile.setoran_terakhir) : null)}
              </div>
            )}
          </section>

          {/* B. Informasi Hafalan */}
          <section className="rounded-2xl border border-[#E2E8F0] p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#172033]">
              <BookOpen className="h-4 w-4 text-[#0D753F]" /> Informasi Hafalan
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-[#172033]">
                  Surah <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  options={surahOptions}
                  value={w.surah_id || null}
                  onChange={(v) => {
                    setValue('surah_id', Number(v) || 0);
                    setAyahStatus({});
                  }}
                  placeholder="Pilih surah..."
                  searchPlaceholder="Cari surah atau nomor..."
                />
                {errors.surah_id && <p className="mt-1.5 text-xs text-rose-600">{errors.surah_id.message}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#172033]">
                  Ayat Mulai <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  max={selectedSurah?.total_ayahs ?? 999}
                  placeholder="Contoh: 1"
                  className="rounded-xl"
                  {...register('start_ayah')}
                />
                {errors.start_ayah && <p className="mt-1.5 text-xs text-rose-600">{errors.start_ayah.message}</p>}
                {Number(w.start_ayah) > (selectedSurah?.total_ayahs ?? 999) && (
                  <p className="mt-1.5 text-xs text-rose-600">Tidak boleh lebih dari {selectedSurah?.total_ayahs} ayat</p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#172033]">
                  Ayat Selesai <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  max={selectedSurah?.total_ayahs ?? 999}
                  placeholder="Contoh: 10"
                  className="rounded-xl"
                  {...register('end_ayah')}
                />
                {errors.end_ayah && <p className="mt-1.5 text-xs text-rose-600">{errors.end_ayah.message}</p>}
                {Number(w.end_ayah) > (selectedSurah?.total_ayahs ?? 999) && (
                  <p className="mt-1.5 text-xs text-rose-600">Ayat melebihi jumlah ayat pada surah yang dipilih</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-[#172033]">
                  Metode <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    {...register('method')}
                    className="h-11 w-full appearance-none rounded-xl border border-[#E2E8F0] bg-white px-3 pr-9 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0D753F]/15"
                  >
                    {Object.entries(METHOD_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                </div>
              </div>
            </div>

            {/* Ringkasan hitungan */}
            {selectedSurah && ayahCount > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0D753F] px-3 py-1 text-xs font-bold text-white">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {ayahCount} Ayat
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F5EE] px-3 py-1 text-xs font-semibold text-[#0D753F]">
                  <Check className="h-3.5 w-3.5" /> {hafalCount} ditandai hafal
                </span>
              </div>
            )}

            {/* Daftar ayat */}
            {selectedSurah && (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#64748B]">
                    Daftar Ayat — {selectedSurah.name_latin}
                  </p>
                  <div className="flex items-center gap-2">
                    <select
                      value={reciter}
                      onChange={(e) => {
                        setReciter(e.target.value);
                        stopAudio();
                      }}
                      aria-label="Pilih qari"
                      className="rounded-lg border border-[#E2E8F0] bg-white px-1.5 py-1 text-xs text-[#64748B] outline-none focus:border-[#0D753F]"
                    >
                      <option value="Alafasy_128kbps">Qari: Alafasy</option>
                      <option value="Husary_128kbps">Qari: Husary</option>
                      <option value="Minshawy_Murattal_128kbps">Qari: Minshawy</option>
                      <option value="Muhammad_Ayyoub_128kbps">Qari: Muhammad Ayyoub</option>
                      <option value="Hudhaify_128kbps">Qari: Hudhaify</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const all = ayahs.map((a) => a.ayah_number);
                        const next: Record<number, boolean> = {};
                        all.forEach((n) => (next[n] = true));
                        setAyahStatus(next);
                      }}
                      className="text-xs font-semibold text-[#0D753F] hover:underline"
                    >
                      Tandai semua hafal
                    </button>
                  </div>
                </div>
                {audioError && (
                  <p role="status" className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
                    Audio gagal dimuat. Periksa koneksi internet Anda.
                  </p>
                )}
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-[#E2E8F0] p-2">
                  {ayahs.length === 0 ? (
                    <p className="p-3 text-center text-sm text-[#94A3B8]">Memuat daftar ayat...</p>
                  ) : (
                    ayahs.map((a) => {
                      const hafal = !!ayahStatus[a.ayah_number];
                      const isPlaying = playingAyah === a.ayah_number && !audioLoading;
                      const isLoadingAudio = playingAyah === a.ayah_number && audioLoading;
                      return (
                        <div
                          key={a.id}
                          className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 ${
                            hafal ? 'bg-[#E8F5EE]/70' : 'hover:bg-slate-50'
                          } ${isPlaying ? 'ring-1 ring-[#0D753F]/40' : ''}`}
                        >
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
                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => togglePlay(a.ayah_number)}
                              aria-label={isPlaying ? `Jeda bacaan ayat ${a.ayah_number}` : `Putar bacaan ayat ${a.ayah_number}`}
                              title={isPlaying ? 'Jeda' : 'Putar'}
                              className={`grid h-7 w-7 place-items-center rounded-lg transition-colors ${
                                isPlaying
                                  ? 'bg-[#0D753F] text-white'
                                  : 'bg-[#E8F5EE] text-[#0D753F] hover:bg-[#0D753F] hover:text-white'
                              }`}
                            >
                              {isLoadingAudio ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                              ) : isPlaying ? (
                                <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                              ) : (
                                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                            </button>
                            <span className="relative">
                              <select
                                value={hafal ? 'hafal' : 'belum'}
                                onChange={(e) =>
                                  setAyahStatus((p) => ({ ...p, [a.ayah_number]: e.target.value === 'hafal' }))
                                }
                                className={`appearance-none rounded-lg border px-2 py-1 text-xs font-semibold ${
                                  hafal
                                    ? 'border-[#0D753F] bg-white text-[#0D753F]'
                                    : 'border-[#E2E8F0] bg-white text-[#64748B]'
                                }`}
                                aria-label={`Status hafal ayat ${a.ayah_number}`}
                              >
                                <option value="hafal">Sudah Hafal</option>
                                <option value="belum">Belum Hafal</option>
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[#94A3B8]" />
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </section>

          {/* C. Informasi Setoran */}
          <section className="rounded-2xl border border-[#E2E8F0] p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#172033]">
              <Clock className="h-4 w-4 text-[#0D753F]" /> Informasi Setoran
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#172033]">
                  Tanggal <span className="text-rose-500">*</span>
                </label>
                <Input type="date" className="rounded-xl" {...register('submission_date')} />
                {errors.submission_date && <p className="mt-1.5 text-xs text-rose-600">{errors.submission_date.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#172033]">
                  Waktu <span className="text-rose-500">*</span>
                </label>
                <Input type="time" className="rounded-xl" {...register('submission_time')} />
                {errors.submission_time && <p className="mt-1.5 text-xs text-rose-600">{errors.submission_time.message}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-[#172033]">
                  Pembimbing <span className="text-rose-500">*</span>
                </label>
                {isTeacherLocked ? (
                  <Input
                    value={teachers.find((t) => t.id === currentTeacherId)?.name ?? ''}
                    disabled
                    className="rounded-xl bg-slate-50 text-[#64748B]"
                  />
                ) : (
                  <SearchableSelect
                    options={teacherOptions}
                    value={w.teacher_id || null}
                    onChange={(v) => setValue('teacher_id', Number(v) || undefined)}
                    placeholder="Pilih pembimbing..."
                    searchPlaceholder="Cari nama pembimbing..."
                  />
                )}
                {errors.teacher_id && <p className="mt-1.5 text-xs text-rose-600">{errors.teacher_id.message}</p>}
                {isTeacherLocked && (
                  <p className="mt-1 text-xs text-[#94A3B8]">Pembimbing otomatis mengikuti akun Anda.</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-[#172033]">
                  Status <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    {...register('status')}
                    className="h-11 w-full appearance-none rounded-xl border border-[#E2E8F0] bg-white px-3 pr-9 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0D753F]/15"
                  >
                    <option value="pending">Menunggu</option>
                    <option value="approved">Disetujui</option>
                    <option value="revision">Direvisi</option>
                    <option value="rejected">Ditolak</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                </div>
                <p className="mt-1 text-xs text-[#94A3B8]">
                  {isAdmin ? 'Super admin — default Disetujui.' : 'Guru — default Menunggu persetujuan.'}
                </p>
              </div>
            </div>
          </section>

          {/* D. Keterangan */}
          <section className="rounded-2xl border border-[#E2E8F0] p-5">
            <h3 className="mb-4 text-sm font-bold text-[#172033]">Keterangan</h3>
            <label className="mb-1.5 block text-sm font-medium text-[#172033]">Catatan (Opsional)</label>
            <textarea
              {...register('notes')}
              rows={3}
              maxLength={200}
              placeholder="Tambahkan catatan jika diperlukan..."
              className="w-full resize-none rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0D753F]/15"
            />
            <div className="mt-1 flex items-center justify-between">
              {errors.notes ? (
                <p className="text-xs text-rose-600">{errors.notes.message}</p>
              ) : (
                <p className="text-xs text-[#94A3B8]">Contoh: "Bacaan sudah lancar, perlu memperbaiki mad."</p>
              )}
              <span className="text-xs text-[#94A3B8]">{(w.notes ?? '').length}/200</span>
            </div>
          </section>
        </div>

        {/* Footer sticky */}
        <footer className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-[#E2E8F0] bg-white px-6 py-4">
          <Button type="button" variant="outline" onClick={requestClose}>
            Batal
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isSubmitting || save.isPending}
            className="min-w-[150px] bg-[#0D753F] hover:bg-[#075B30]"
          >
            {isSubmitting || save.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Simpan Setoran
              </>
            )}
          </Button>
        </footer>
      </aside>

      {/* Konfirmasi buang data */}
      {confirmDiscard && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-extrabold text-[#172033]">Batalkan input?</h3>
            <p className="mt-1 text-sm text-[#64748B]">Data yang sudah Anda masukkan belum disimpan.</p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmDiscard(false)}>
                Tetap Edit
              </Button>
              <Button variant="destructive" onClick={forceClose}>
                <Trash2 className="mr-2 h-4 w-4" /> Buang Data
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
