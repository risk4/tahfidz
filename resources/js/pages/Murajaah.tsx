import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { academicYearService, murajaahService, quranService, studentService, teacherService } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, toDateInputValue } from '@/utils/date';
import type { AcademicYear, AyahMemorizationStatus, MemorizationStatus, Murajaah as MurajaahType, QuranAyah, QuranSurah, Student, Teacher } from '@/types';
import { BookMarked, Pause, Pencil, Play, Plus, Search, Trash2, X } from 'lucide-react';

const schema = z.object({
  student_id: z.coerce.number().min(1, 'Siswa wajib dipilih'),
  teacher_id: z.coerce.number().optional(),
  date: z.string().min(1, 'Tanggal murajaah wajib diisi'),
  surah_id: z.coerce.number().min(1, 'Surah wajib dipilih'),
  start_ayah: z.coerce.number().min(1, 'Ayat awal wajib diisi'),
  end_ayah: z.coerce.number().min(1, 'Ayat akhir wajib diisi'),
  fluency_score: z.coerce.number().min(0).max(100),
  tajwid_score: z.coerce.number().min(0).max(100),
  makhraj_score: z.coerce.number().min(0).max(100),
  fashahah_score: z.coerce.number().min(0).max(100),
  status: z.enum(['LANCAR', 'PERLU_MUROJAAH']),
  notes: z.string().optional(),
}).refine((data) => data.end_ayah >= data.start_ayah, {
  message: 'Ayat akhir harus lebih besar atau sama dengan ayat awal',
  path: ['end_ayah'],
});

type FormData = z.infer<typeof schema>;

const AUDIO_BASE_URL = 'https://everyayah.com/data/Alafasy_128kbps';

const memorizationStatusLabels: Record<MemorizationStatus, string> = {
  not_memorized: 'Belum Dihafal',
  in_progress: 'Sedang Dihafal',
  memorized: 'Sudah Hafal',
};

function ayahAudioUrl(surahNumber: number, ayahNumber: number) {
  return `${AUDIO_BASE_URL}/${String(surahNumber).padStart(3, '0')}${String(ayahNumber).padStart(3, '0')}.mp3`;
}

function MurajaahAyahs({ murajaah }: { murajaah: MurajaahType }) {
  const queryClient = useQueryClient();
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);
  const [isPlayingRange, setIsPlayingRange] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);
  const { data, isLoading } = useQuery({
    queryKey: ['murajaah-ayahs', murajaah.surah_id, murajaah.start_ayah, murajaah.end_ayah],
    queryFn: () => quranService.ayahs(murajaah.surah_id, { from: murajaah.start_ayah, to: murajaah.end_ayah }),
  });

  const { data: statusData } = useQuery({
    queryKey: ['murajaah-ayah-statuses', murajaah.id],
    queryFn: () => murajaahService.ayahStatuses(murajaah.id),
  });

  const surahNumber = murajaah.surah?.surah_number;
  const localAyahs: QuranAyah[] = Array.isArray(data) ? data : data?.data ?? [];
  const hasPlaceholderText = localAyahs.some((ayah) => /^\{.+\}$/.test(ayah.text_arabic ?? ''));

  const { data: externalData, isLoading: externalLoading } = useQuery({
    queryKey: ['external-quran-ayahs', surahNumber],
    queryFn: () => quranService.externalAyahs(Number(surahNumber)),
    enabled: Boolean(surahNumber) && hasPlaceholderText,
  });

  const externalAyahs: QuranAyah[] = Array.isArray(externalData)
    ? externalData
        .filter((ayah) => ayah.ayah_number >= murajaah.start_ayah && ayah.ayah_number <= murajaah.end_ayah)
        .map((ayah) => ({ ...ayah, id: ayah.ayah_number, surah_id: murajaah.surah_id, juz_id: 0 }))
    : [];
  const ayahs = hasPlaceholderText && externalAyahs.length > 0 ? externalAyahs : localAyahs;
  const loadingAyahs = isLoading || (hasPlaceholderText && externalLoading);
  const statusMap = new Map<number, MemorizationStatus>(
    ((Array.isArray(statusData) ? statusData : []) as AyahMemorizationStatus[]).map((item) => [item.ayah_number, item.memorization_status])
  );

  const statusMutation = useMutation({
    mutationFn: ({ ayahNumber, status }: { ayahNumber: number; status: MemorizationStatus }) =>
      murajaahService.updateAyahStatus(murajaah.id, { ayah_number: ayahNumber, memorization_status: status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['murajaah-ayah-statuses', murajaah.id] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      queryClient.invalidateQueries({ queryKey: ['progress-detail'] });
    },
  });

  const playAyah = (ayahNumber: number) => {
    if (!surahNumber) return;

    setIsPlayingRange(false);
    setPlayingAyah(ayahNumber);
    const audio = new Audio(ayahAudioUrl(surahNumber, ayahNumber));
    audio.onended = () => setPlayingAyah(null);
    audio.onerror = () => setPlayingAyah(null);
    audio.play().catch(() => setPlayingAyah(null));
  };

  const playRange = async () => {
    if (!surahNumber || ayahs.length === 0) return;

    setIsPlayingRange(true);
    for (const ayah of ayahs) {
      if (!surahNumber) break;
      setPlayingAyah(ayah.ayah_number);
      const audio = new Audio(ayahAudioUrl(surahNumber, ayah.ayah_number));
      try {
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          audio.play().catch(() => resolve());
        });
      } catch {
        // Abaikan kegagalan audio individual agar ayat berikutnya tetap bisa dicoba.
      }
    }
    setPlayingAyah(null);
    setIsPlayingRange(false);
  };

  return (
    <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Ayat yang dimurajaah</p>
          <h3 className="text-lg font-black text-slate-900">{murajaah.surah?.name_latin ?? 'Surah'} ayat {murajaah.start_ayah}-{murajaah.end_ayah}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setShowTranslation((value) => !value)}>
            {showTranslation ? 'Sembunyikan Terjemahan' : 'Tampilkan Terjemahan'}
          </Button>
          <Button type="button" size="sm" onClick={playRange} disabled={isLoading || ayahs.length === 0 || isPlayingRange} className="bg-emerald-600 hover:bg-emerald-700">
            {isPlayingRange ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlayingRange ? 'Memutar...' : 'Play Semua'}
          </Button>
        </div>
      </div>

      {loadingAyahs ? <p className="text-sm text-slate-500">Memuat ayat...</p> : (
        <div className="space-y-3">
          {ayahs.map((ayah) => (
            <div key={ayah.id} className={`rounded-2xl border bg-white p-4 transition ${playingAyah === ayah.ayah_number ? 'border-emerald-400 shadow-md ring-2 ring-emerald-100' : 'border-slate-100'}`}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">{ayah.ayah_number}</span>
                <Button type="button" size="sm" variant="outline" onClick={() => playAyah(ayah.ayah_number)} disabled={!surahNumber}>
                  {playingAyah === ayah.ayah_number ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  Play
                </Button>
              </div>
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Status Hafalan Ayat</span>
                <select
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                  value={statusMap.get(ayah.ayah_number) ?? 'not_memorized'}
                  disabled={statusMutation.isPending}
                  onChange={(event) => statusMutation.mutate({ ayahNumber: ayah.ayah_number, status: event.target.value as MemorizationStatus })}
                >
                  {Object.entries(memorizationStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <p className="text-right font-serif text-3xl leading-loose text-slate-950" dir="rtl" lang="ar">{ayah.text_arabic}</p>
              {showTranslation && ayah.text_translation && <p className="mt-3 border-t border-slate-100 pt-3 text-sm leading-relaxed text-slate-600">{ayah.text_translation}</p>}
            </div>
          ))}
          {ayahs.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Ayat tidak ditemukan untuk rentang ini.</div>}
        </div>
      )}
    </div>
  );
}

const defaultValues: FormData = {
  student_id: 0,
  teacher_id: 0,
  date: new Date().toISOString().slice(0, 10),
  surah_id: 0,
  start_ayah: 1,
  end_ayah: 1,
  fluency_score: 80,
  tajwid_score: 80,
  makhraj_score: 80,
  fashahah_score: 80,
  status: 'LANCAR',
  notes: '',
};

export default function Murajaah() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [studentFilter, setStudentFilter] = useState('');
  const [surahFilter, setSurahFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['murajaahs', studentFilter, surahFilter],
    queryFn: () => murajaahService.list({
      student_id: studentFilter ? Number(studentFilter) : undefined,
      surah_id: surahFilter ? Number(surahFilter) : undefined,
    }),
  });
  const { data: studentsData } = useQuery({ queryKey: ['students-options'], queryFn: () => studentService.list({ per_page: 200 }) });
  const { data: teachersData } = useQuery({ queryKey: ['teachers-options'], queryFn: () => teacherService.list({ per_page: 200 }), enabled: user?.role === 'super_admin' });
  const { data: surahsData } = useQuery({ queryKey: ['quran-surahs'], queryFn: () => quranService.surahs() });
  const { data: academicYearsData } = useQuery({ queryKey: ['academic-years-options'], queryFn: () => academicYearService.list({ per_page: 100 }) });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues });

  const murajaahs: MurajaahType[] = Array.isArray(data) ? data : data?.data ?? [];
  const students: Student[] = Array.isArray(studentsData) ? studentsData : studentsData?.data ?? [];
  const teachers: Teacher[] = Array.isArray(teachersData) ? teachersData : teachersData?.data ?? [];
  const surahs: QuranSurah[] = Array.isArray(surahsData) ? surahsData : surahsData?.data ?? [];
  const academicYears: AcademicYear[] = Array.isArray(academicYearsData) ? academicYearsData : academicYearsData?.data ?? [];
  const activeAcademicYear = academicYears.find((year) => year.is_active);
  const selectedSurahId = Number(watch('surah_id'));
  const watchedStartAyah = Number(watch('start_ayah'));
  const watchedEndAyah = Number(watch('end_ayah'));
  const selectedSurah = useMemo(() => surahs.find((surah) => surah.id === selectedSurahId), [surahs, selectedSurahId]);
  const ayahOptions = useMemo(() => Array.from({ length: selectedSurah?.total_ayahs ?? 0 }, (_, index) => index + 1), [selectedSurah?.total_ayahs]);

  useEffect(() => {
    if (!selectedSurah) return;

    if (watchedStartAyah < 1 || watchedStartAyah > selectedSurah.total_ayahs) {
      setValue('start_ayah', 1, { shouldValidate: true });
    }

    if (watchedEndAyah < 1 || watchedEndAyah > selectedSurah.total_ayahs || watchedEndAyah < watchedStartAyah) {
      setValue('end_ayah', Math.max(1, Math.min(selectedSurah.total_ayahs, watchedStartAyah || 1)), { shouldValidate: true });
    }
  }, [selectedSurah, setValue, watchedEndAyah, watchedStartAyah]);

  const closeForm = () => { setShowForm(false); setEditingId(null); reset(defaultValues); };

  const createMutation = useMutation({ mutationFn: murajaahService.create, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['murajaahs'] }); closeForm(); } });
  const updateMutation = useMutation({ mutationFn: ({ id, payload }: { id: number; payload: FormData }) => murajaahService.update(id, payload), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['murajaahs'] }); closeForm(); } });
  const deleteMutation = useMutation({ mutationFn: murajaahService.delete, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['murajaahs'] }) });

  const onSubmit = (formData: FormData) => {
    const payload = { ...formData, teacher_id: user?.role === 'super_admin' ? formData.teacher_id : undefined };
    if (editingId) updateMutation.mutate({ id: editingId, payload });
    else createMutation.mutate(payload);
  };

  const handleEdit = (murajaah: MurajaahType) => {
    setEditingId(murajaah.id);
    reset({
      student_id: murajaah.student_id,
      teacher_id: murajaah.teacher_id,
      date: toDateInputValue(murajaah.date),
      surah_id: murajaah.surah_id,
      start_ayah: murajaah.start_ayah,
      end_ayah: murajaah.end_ayah,
      fluency_score: murajaah.fluency_score,
      tajwid_score: murajaah.tajwid_score,
      makhraj_score: murajaah.makhraj_score,
      fashahah_score: murajaah.fashahah_score,
      status: murajaah.status,
      notes: murajaah.notes ?? '',
    });
    setShowForm(true);
  };

  const handleDelete = (murajaah: MurajaahType) => {
    if (confirm(`Hapus murajaah ${murajaah.student?.name ?? 'siswa'} tanggal ${formatDate(murajaah.date)}?`)) deleteMutation.mutate(murajaah.id);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const canModifyExisting = user?.role === 'super_admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-indigo-600 to-sky-600 p-6 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-100">Tahfidz</p>
          <h1 className="text-2xl font-black sm:text-3xl">Murajaah</h1>
          <p className="mt-1 text-sm text-indigo-50">Catat pengulangan hafalan dan kualitas bacaan siswa.</p>
          {activeAcademicYear && <p className="mt-2 text-xs text-indigo-100">Tahun ajaran aktif: {activeAcademicYear.name}</p>}
        </div>
        <Button className="bg-white text-indigo-700 hover:bg-indigo-50" onClick={() => { reset(defaultValues); setEditingId(null); setShowForm(true); }}><Plus className="mr-2 h-4 w-4" /> Tambah Murajaah</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle>{editingId ? 'Edit Murajaah' : 'Tambah Murajaah'}</CardTitle><Button variant="ghost" size="sm" onClick={closeForm}><X className="h-4 w-4" /></Button></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
              <div><Label>Siswa</Label><select {...register('student_id')} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value={0}>Pilih siswa</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select>{errors.student_id && <p className="mt-1 text-sm text-red-500">{errors.student_id.message}</p>}</div>
              {user?.role === 'super_admin' && !editingId && <div><Label>Guru Pembimbing</Label><select {...register('teacher_id')} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value={0}>Pilih guru</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></div>}
              <div><Label>Tanggal Murajaah</Label><Input type="date" {...register('date')} />{errors.date && <p className="mt-1 text-sm text-red-500">{errors.date.message}</p>}</div>
              <div><Label>Status</Label><select {...register('status')} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="LANCAR">Lancar</option><option value="PERLU_MUROJAAH">Perlu Murajaah</option></select></div>
              <div className="md:col-span-2"><Label>Surah</Label><select {...register('surah_id')} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value={0}>Pilih surah</option>{surahs.map((surah) => <option key={surah.id} value={surah.id}>{surah.surah_number}. {surah.name_latin} ({surah.total_ayahs} ayat)</option>)}</select>{errors.surah_id && <p className="mt-1 text-sm text-red-500">{errors.surah_id.message}</p>}</div>
              <div>
                <Label>Ayat Awal</Label>
                <select {...register('start_ayah')} disabled={!selectedSurah} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60">
                  {!selectedSurah && <option value={0}>Pilih surah terlebih dahulu</option>}
                  {ayahOptions.map((ayahNumber) => <option key={ayahNumber} value={ayahNumber}>Ayat {ayahNumber}</option>)}
                </select>
                {errors.start_ayah && <p className="mt-1 text-sm text-red-500">{errors.start_ayah.message}</p>}
              </div>
              <div>
                <Label>Ayat Akhir</Label>
                <select {...register('end_ayah')} disabled={!selectedSurah} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60">
                  {!selectedSurah && <option value={0}>Pilih surah terlebih dahulu</option>}
                  {ayahOptions.filter((ayahNumber) => ayahNumber >= watchedStartAyah).map((ayahNumber) => <option key={ayahNumber} value={ayahNumber}>Ayat {ayahNumber}</option>)}
                </select>
                {selectedSurah && <p className="mt-1 text-xs text-slate-500">Surah {selectedSurah.name_latin} memiliki {selectedSurah.total_ayahs} ayat.</p>}
                {errors.end_ayah && <p className="mt-1 text-sm text-red-500">{errors.end_ayah.message}</p>}
              </div>
              {(['fluency_score', 'tajwid_score', 'makhraj_score', 'fashahah_score'] as const).map((field) => <div key={field}><Label>{field === 'fluency_score' ? 'Kelancaran' : field === 'tajwid_score' ? 'Tajwid' : field === 'makhraj_score' ? 'Makhraj' : 'Fashahah'}</Label><Input type="number" min={0} max={100} {...register(field)} /></div>)}
              <div className="md:col-span-2"><Label>Catatan</Label><textarea {...register('notes')} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
              <div className="flex gap-2 md:col-span-2"><Button type="submit" disabled={isSaving}>{isSaving ? 'Menyimpan...' : 'Simpan'}</Button><Button type="button" variant="outline" onClick={closeForm}>Batal</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card><CardContent className="p-4">
        <div className="mb-4 grid gap-3 md:grid-cols-2"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><select value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)} className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm"><option value="">Semua siswa</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></div><select value={surahFilter} onChange={(e) => setSurahFilter(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Semua surah</option>{surahs.map((surah) => <option key={surah.id} value={surah.id}>{surah.name_latin}</option>)}</select></div>
        {isLoading ? <p className="text-sm text-slate-500">Memuat data...</p> : (
          <div className="space-y-5">
            {murajaahs.map((murajaah) => (
              <div key={murajaah.id} className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:shadow-md">
                <div className="grid gap-4 border-b border-slate-100 bg-slate-50 p-4 lg:grid-cols-[1.2fr_1.1fr_0.8fr_0.7fr_auto] lg:items-center">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">Tanggal</p>
                    <p className="font-bold text-slate-900">{formatDate(murajaah.date)}</p>
                    <p className="mt-1 text-sm text-slate-500">Guru: {murajaah.teacher?.name ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">Siswa</p>
                    <p className="font-bold text-slate-900">{murajaah.student?.name ?? '-'}</p>
                    <p className="mt-1 text-sm text-slate-500">{murajaah.student?.student_code ?? ''}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">Surah</p>
                    <p className="font-bold text-slate-900">{murajaah.surah?.name_latin ?? '-'}</p>
                    <p className="mt-1 text-sm text-slate-500">Ayat {murajaah.start_ayah}-{murajaah.end_ayah}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${murajaah.status === 'LANCAR' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{murajaah.status === 'LANCAR' ? 'Lancar' : 'Perlu Murajaah'}</span>
                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">Nilai {murajaah.final_score}</span>
                  </div>
                  <div className="flex justify-start gap-2 lg:justify-end">
                    {canModifyExisting ? <><Button size="sm" variant="outline" onClick={() => handleEdit(murajaah)}><Pencil className="h-4 w-4" /> Edit</Button><Button size="sm" variant="destructive" onClick={() => handleDelete(murajaah)}><Trash2 className="h-4 w-4" /></Button></> : <span className="text-sm text-slate-400">-</span>}
                  </div>
                </div>
                <div className="p-4">
                  {editingId === murajaah.id && <MurajaahAyahs murajaah={murajaah} />}
                  {murajaah.notes && <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600"><strong>Catatan:</strong> {murajaah.notes}</div>}
                </div>
              </div>
            ))}
            {murajaahs.length === 0 && <div className="px-4 py-10 text-center text-sm text-slate-500"><BookMarked className="mx-auto mb-2 h-8 w-8 text-slate-300" />Belum ada data murajaah.</div>}
          </div>
        )}
      </CardContent></Card>
    </div>
  );
}