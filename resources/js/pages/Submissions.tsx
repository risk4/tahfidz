import { Fragment, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { academicYearService, quranService, studentService, submissionService, teacherService } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, toDateInputValue } from '@/utils/date';
import type { AcademicYear, QuranAyah, QuranSurah, Student, Submission, Teacher } from '@/types';
import { ClipboardList, Pause, Pencil, Play, Plus, Search, Trash2, X } from 'lucide-react';

const schema = z.object({
  student_id: z.coerce.number().min(1, 'Siswa wajib dipilih'),
  teacher_id: z.coerce.number().optional(),
  submission_date: z.string().min(1, 'Tanggal setoran wajib diisi'),
  surah_id: z.coerce.number().min(1, 'Surah wajib dipilih'),
  start_ayah: z.coerce.number().min(1, 'Ayat awal wajib diisi'),
  end_ayah: z.coerce.number().min(1, 'Ayat akhir wajib diisi'),
  type: z.enum(['new_memorization', 'repetition']),
  fluency_score: z.coerce.number().min(0).max(100),
  tajwid_score: z.coerce.number().min(0).max(100),
  makhraj_score: z.coerce.number().min(0).max(100),
  fashahah_score: z.coerce.number().min(0).max(100),
  notes: z.string().optional(),
}).refine((data) => data.end_ayah >= data.start_ayah, {
  message: 'Ayat akhir harus lebih besar atau sama dengan ayat awal',
  path: ['end_ayah'],
});

type FormData = z.infer<typeof schema>;

const AUDIO_BASE_URL = 'https://everyayah.com/data/Alafasy_128kbps';

function ayahAudioUrl(surahNumber: number, ayahNumber: number) {
  return `${AUDIO_BASE_URL}/${String(surahNumber).padStart(3, '0')}${String(ayahNumber).padStart(3, '0')}.mp3`;
}

function SubmissionAyahs({ submission }: { submission: Submission }) {
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);
  const [isPlayingRange, setIsPlayingRange] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ['submission-ayahs', submission.surah_id, submission.start_ayah, submission.end_ayah],
    queryFn: () => quranService.ayahs(submission.surah_id, { from: submission.start_ayah, to: submission.end_ayah }),
  });

  const surahNumber = submission.surah?.surah_number;
  const localAyahs: QuranAyah[] = Array.isArray(data) ? data : data?.data ?? [];
  const hasPlaceholderText = localAyahs.some((ayah) => /^\{.+\}$/.test(ayah.text_arabic ?? ''));

  const { data: externalData, isLoading: externalLoading } = useQuery({
    queryKey: ['external-quran-ayahs', surahNumber],
    queryFn: () => quranService.externalAyahs(Number(surahNumber)),
    enabled: Boolean(surahNumber) && hasPlaceholderText,
  });

  const externalAyahs: QuranAyah[] = Array.isArray(externalData)
    ? externalData
        .filter((ayah) => ayah.ayah_number >= submission.start_ayah && ayah.ayah_number <= submission.end_ayah)
        .map((ayah) => ({ ...ayah, id: ayah.ayah_number, surah_id: submission.surah_id, juz_id: 0 }))
    : [];
  const ayahs = hasPlaceholderText && externalAyahs.length > 0 ? externalAyahs : localAyahs;
  const loadingAyahs = isLoading || (hasPlaceholderText && externalLoading);

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
      setPlayingAyah(ayah.ayah_number);
      const audio = new Audio(ayahAudioUrl(surahNumber, ayah.ayah_number));
      try {
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          audio.play().catch(() => resolve());
        });
      } catch {
        // Jika audio gagal, ayat berikutnya tetap bisa dicoba.
      }
    }
    setPlayingAyah(null);
    setIsPlayingRange(false);
  };

  return (
    <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Ayat yang disetorkan</p>
          <h3 className="text-lg font-black text-slate-900">{submission.surah?.name_latin ?? 'Surah'} ayat {submission.start_ayah}-{submission.end_ayah}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setShowTranslation((value) => !value)}>
            {showTranslation ? 'Sembunyikan Terjemahan' : 'Tampilkan Terjemahan'}
          </Button>
          <Button type="button" size="sm" onClick={playRange} disabled={loadingAyahs || ayahs.length === 0 || isPlayingRange} className="bg-emerald-600 hover:bg-emerald-700">
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
  submission_date: new Date().toISOString().slice(0, 10),
  surah_id: 0,
  start_ayah: 1,
  end_ayah: 1,
  type: 'new_memorization',
  fluency_score: 80,
  tajwid_score: 80,
  makhraj_score: 80,
  fashahah_score: 80,
  notes: '',
};

export default function Submissions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [studentFilter, setStudentFilter] = useState('');
  const [surahFilter, setSurahFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['submissions', studentFilter, surahFilter],
    queryFn: () => submissionService.list({
      student_id: studentFilter ? Number(studentFilter) : undefined,
      surah_id: surahFilter ? Number(surahFilter) : undefined,
    }),
  });

  const { data: studentsData } = useQuery({ queryKey: ['students-options'], queryFn: () => studentService.list({ per_page: 200 }) });
  const { data: teachersData } = useQuery({ queryKey: ['teachers-options'], queryFn: () => teacherService.list({ per_page: 200 }), enabled: user?.role === 'super_admin' });
  const { data: surahsData } = useQuery({ queryKey: ['quran-surahs'], queryFn: () => quranService.surahs() });
  const { data: academicYearsData } = useQuery({ queryKey: ['academic-years-options'], queryFn: () => academicYearService.list({ per_page: 100 }) });

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const submissions: Submission[] = Array.isArray(data) ? data : data?.data ?? [];
  const students: Student[] = Array.isArray(studentsData) ? studentsData : studentsData?.data ?? [];
  const teachers: Teacher[] = Array.isArray(teachersData) ? teachersData : teachersData?.data ?? [];
  const surahs: QuranSurah[] = Array.isArray(surahsData) ? surahsData : surahsData?.data ?? [];
  const academicYears: AcademicYear[] = Array.isArray(academicYearsData) ? academicYearsData : academicYearsData?.data ?? [];
  const activeAcademicYear = academicYears.find((year) => year.is_active);
  const selectedSurah = useMemo(() => surahs.find((surah) => surah.id === Number(watch('surah_id'))), [surahs, watch('surah_id')]);

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    reset(defaultValues);
  };

  const createMutation = useMutation({
    mutationFn: submissionService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      closeForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: FormData }) => submissionService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: submissionService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['submissions'] }),
  });

  const onSubmit = (formData: FormData) => {
    const payload = { ...formData, teacher_id: user?.role === 'super_admin' ? formData.teacher_id : undefined };
    if (editingId) updateMutation.mutate({ id: editingId, payload });
    else createMutation.mutate(payload);
  };

  const handleEdit = (submission: Submission) => {
    setEditingId(submission.id);
    reset({
      student_id: submission.student_id,
      teacher_id: submission.teacher_id,
      submission_date: toDateInputValue(submission.submission_date),
      surah_id: submission.surah_id,
      start_ayah: submission.start_ayah,
      end_ayah: submission.end_ayah,
      type: submission.type,
      fluency_score: submission.fluency_score,
      tajwid_score: submission.tajwid_score,
      makhraj_score: submission.makhraj_score,
      fashahah_score: submission.fashahah_score,
      notes: submission.notes ?? '',
    });
    setShowForm(true);
  };

  const handleDelete = (submission: Submission) => {
    if (confirm(`Hapus setoran ${submission.student?.name ?? 'siswa'} tanggal ${formatDate(submission.submission_date)}?`)) {
      deleteMutation.mutate(submission.id);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const canModifyExisting = user?.role === 'super_admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-100">Tahfidz</p>
          <h1 className="text-2xl font-black sm:text-3xl">Setoran Hafalan</h1>
          <p className="mt-1 text-sm text-emerald-50">Input dan pantau setoran hafalan siswa.</p>
          {activeAcademicYear && <p className="mt-2 text-xs text-emerald-100">Tahun ajaran aktif: {activeAcademicYear.name}</p>}
        </div>
        {(user?.role === 'super_admin' || user?.role === 'teacher') && (
          <Button className="bg-white text-emerald-700 hover:bg-emerald-50" onClick={() => { reset(defaultValues); setEditingId(null); setShowForm(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Setoran
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editingId ? 'Edit Setoran' : 'Tambah Setoran'}</CardTitle>
            <Button variant="ghost" size="sm" onClick={closeForm}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Siswa</Label>
                <select {...register('student_id')} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value={0}>Pilih siswa</option>
                  {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
                </select>
                {errors.student_id && <p className="mt-1 text-sm text-red-500">{errors.student_id.message}</p>}
              </div>
              {user?.role === 'super_admin' && !editingId && (
                <div>
                  <Label>Guru Pembimbing</Label>
                  <select {...register('teacher_id')} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value={0}>Pilih guru</option>
                    {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <Label>Tanggal Setoran</Label>
                <Input type="date" {...register('submission_date')} />
                {errors.submission_date && <p className="mt-1 text-sm text-red-500">{errors.submission_date.message}</p>}
              </div>
              <div>
                <Label>Jenis Setoran</Label>
                <select {...register('type')} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="new_memorization">Hafalan Baru</option>
                  <option value="repetition">Pengulangan</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <Label>Surah</Label>
                <select {...register('surah_id')} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value={0}>Pilih surah</option>
                  {surahs.map((surah) => <option key={surah.id} value={surah.id}>{surah.surah_number}. {surah.name_latin} ({surah.total_ayahs} ayat)</option>)}
                </select>
                {errors.surah_id && <p className="mt-1 text-sm text-red-500">{errors.surah_id.message}</p>}
              </div>
              <div>
                <Label>Ayat Awal</Label>
                <Input type="number" min={1} max={selectedSurah?.total_ayahs} {...register('start_ayah')} />
              </div>
              <div>
                <Label>Ayat Akhir</Label>
                <Input type="number" min={1} max={selectedSurah?.total_ayahs} {...register('end_ayah')} />
                {errors.end_ayah && <p className="mt-1 text-sm text-red-500">{errors.end_ayah.message}</p>}
              </div>
              {(['fluency_score', 'tajwid_score', 'makhraj_score', 'fashahah_score'] as const).map((field) => (
                <div key={field}>
                  <Label>{field === 'fluency_score' ? 'Kelancaran' : field === 'tajwid_score' ? 'Tajwid' : field === 'makhraj_score' ? 'Makhraj' : 'Fashahah'}</Label>
                  <Input type="number" min={0} max={100} {...register(field)} />
                </div>
              ))}
              <div className="md:col-span-2">
                <Label>Catatan</Label>
                <textarea {...register('notes')} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={isSaving}>{isSaving ? 'Menyimpan...' : 'Simpan'}</Button>
                <Button type="button" variant="outline" onClick={closeForm}>Batal</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <select value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)} className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm">
                <option value="">Semua siswa</option>
                {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
              </select>
            </div>
            <select value={surahFilter} onChange={(e) => setSurahFilter(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Semua surah</option>
              {surahs.map((surah) => <option key={surah.id} value={surah.id}>{surah.name_latin}</option>)}
            </select>
          </div>

          {isLoading ? <p className="text-sm text-slate-500">Memuat data...</p> : (
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-slate-200">
                <thead><tr className="text-left text-xs font-semibold uppercase text-slate-500"><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">Siswa</th><th className="px-4 py-3">Surah</th><th className="px-4 py-3">Jenis</th><th className="px-4 py-3">Nilai</th><th className="px-4 py-3">Guru</th><th className="px-4 py-3">Aksi</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {submissions.map((submission) => (
                    <Fragment key={submission.id}>
                      <tr className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm">{formatDate(submission.submission_date)}</td>
                        <td className="px-4 py-3 text-sm font-medium">{submission.student?.name ?? '-'}</td>
                        <td className="px-4 py-3 text-sm">{submission.surah?.name_latin ?? '-'}: {submission.start_ayah}-{submission.end_ayah}</td>
                        <td className="px-4 py-3 text-sm">{submission.type === 'new_memorization' ? 'Hafalan Baru' : 'Pengulangan'}</td>
                        <td className="px-4 py-3 text-sm"><span className="rounded-full bg-emerald-100 px-2 py-1 font-semibold text-emerald-700">{submission.final_score}</span></td>
                        <td className="px-4 py-3 text-sm">{submission.teacher?.name ?? '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          {canModifyExisting ? <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => handleEdit(submission)}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="destructive" onClick={() => handleDelete(submission)}><Trash2 className="h-4 w-4" /></Button></div> : <span className="text-slate-400">-</span>}
                        </td>
                      </tr>
                      {editingId === submission.id && (
                        <tr>
                          <td colSpan={7} className="bg-slate-50 px-4 py-4">
                            <SubmissionAyahs submission={submission} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  {submissions.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500"><ClipboardList className="mx-auto mb-2 h-8 w-8 text-slate-300" />Belum ada data setoran.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}