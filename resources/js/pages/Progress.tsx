import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { classService, progressService } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/utils/date';
import type { ClassRoom, StudentProgressSummary, SurahProgress } from '@/types';
import { BarChart3, BookOpen, CheckCircle2, Eye, Layers, Star, X } from 'lucide-react';

function StatCard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: typeof BarChart3; color: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`grid h-12 w-12 place-items-center rounded-2xl ${color}`}><Icon className="h-6 w-6" /></div>
        <div><p className="text-sm text-slate-500">{title}</p><p className="text-2xl font-black text-slate-900">{value}</p></div>
      </CardContent>
    </Card>
  );
}

function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  return <div className="h-3 w-full rounded-full bg-slate-100"><div className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${safeValue}%` }} /></div>;
}

function SurahProgressChart({ data }: { data: SurahProgress[] }) {
  const activeData = data.filter((item) => item.covered_ayahs > 0 || Number(item.average_score ?? 0) > 0);
  const chartData = activeData.length > 0 ? activeData : data.slice(0, 10);
  const topCompleted = [...data]
    .filter((item) => item.covered_ayahs > 0)
    .sort((a, b) => b.progress_percentage - a.progress_percentage || b.covered_ayahs - a.covered_ayahs)
    .slice(0, 5);

  if (data.length === 0) {
    return <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">Belum ada data surah.</div>;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900">Grafik Progress per Surah</h3>
            <p className="text-sm text-slate-500">Menampilkan surah yang sudah memiliki cakupan hafalan.</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">{activeData.length} surah aktif</span>
        </div>
        <div className="max-h-[520px] space-y-3 overflow-y-auto pr-2">
          {chartData.map((item, index) => {
            const percentage = Math.max(0, Math.min(100, Number(item.progress_percentage) || 0));
            const color = percentage >= 100 ? 'from-emerald-500 to-teal-500' : percentage >= 50 ? 'from-sky-500 to-cyan-500' : 'from-amber-500 to-orange-500';
            return (
              <div key={item.surah_id} className="group rounded-2xl bg-slate-50 p-3 transition hover:bg-slate-100">
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <span className="mr-2 inline-grid h-7 w-7 place-items-center rounded-full bg-white text-xs font-black text-slate-600 shadow-sm">{index + 1}</span>
                    <span className="font-bold text-slate-900">{item.surah_number}. {item.name_latin}</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-black text-slate-900">{percentage}%</p>
                    <p className="text-xs text-slate-500">{item.covered_ayahs}/{item.total_ayahs} ayat</p>
                  </div>
                </div>
                <div className="h-4 overflow-hidden rounded-full bg-white shadow-inner">
                  <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700 group-hover:brightness-110`} style={{ width: `${percentage}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-cyan-600 p-5 text-white shadow-lg">
          <h3 className="text-lg font-black">Top Surah</h3>
          <p className="mb-4 text-sm text-emerald-50">Surah dengan progress tertinggi.</p>
          <div className="space-y-3">
            {topCompleted.length > 0 ? topCompleted.map((item) => (
              <div key={item.surah_id} className="rounded-2xl bg-white/15 p-3 backdrop-blur">
                <div className="flex justify-between text-sm font-bold"><span>{item.name_latin}</span><span>{item.progress_percentage}%</span></div>
                <div className="mt-2 h-2 rounded-full bg-white/20"><div className="h-2 rounded-full bg-white" style={{ width: `${Math.min(100, item.progress_percentage)}%` }} /></div>
              </div>
            )) : <p className="text-sm text-emerald-50">Belum ada surah yang tercakup.</p>}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-black text-slate-900">Detail Surah</h3>
          <div className="max-h-[300px] overflow-y-auto">
            <table className="w-full divide-y divide-slate-100 text-sm">
              <thead><tr className="text-left text-xs uppercase text-slate-500"><th className="py-2">Surah</th><th className="py-2">Ayat</th><th className="py-2">Nilai</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.filter((item) => item.covered_ayahs > 0).map((item) => <tr key={item.surah_id}><td className="py-2 font-medium text-slate-800">{item.name_latin}</td><td className="py-2 text-slate-600">{item.covered_ayahs}/{item.total_ayahs}</td><td className="py-2 text-slate-600">{item.average_score ?? '-'}</td></tr>)}
                {data.every((item) => item.covered_ayahs === 0) && <tr><td colSpan={3} className="py-6 text-center text-slate-500">Belum ada detail hafalan.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Progress() {
  const { user } = useAuth();
  const [classFilter, setClassFilter] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const isStudent = user?.role === 'student';

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['progress', classFilter],
    queryFn: () => progressService.list({ class_id: classFilter ? Number(classFilter) : undefined }),
    enabled: !isStudent,
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['progress-detail', user?.student_id],
    queryFn: () => progressService.show(Number(user?.student_id)),
    enabled: isStudent && Boolean(user?.student_id),
  });

  const { data: selectedDetailData, isLoading: selectedDetailLoading } = useQuery({
    queryKey: ['progress-detail', selectedStudentId],
    queryFn: () => progressService.show(Number(selectedStudentId)),
    enabled: !isStudent && Boolean(selectedStudentId),
  });

  const { data: classesData } = useQuery({
    queryKey: ['classes-options'],
    queryFn: () => classService.list({ per_page: 100 }),
    enabled: !isStudent,
  });

  const summaries: StudentProgressSummary[] = Array.isArray(listData) ? listData : listData?.data ?? [];
  const classes: ClassRoom[] = Array.isArray(classesData) ? classesData : classesData?.data ?? [];
  const studentSummary: StudentProgressSummary | undefined = detailData?.summary;
  const studentSurahProgress: SurahProgress[] = detailData?.surah_progress ?? [];
  const selectedStudent = selectedDetailData?.student;
  const selectedSummary: StudentProgressSummary | undefined = selectedDetailData?.summary;
  const selectedSurahProgress: SurahProgress[] = selectedDetailData?.surah_progress ?? [];
  const loading = listLoading || detailLoading;

  const totalStudents = summaries.length;
  const averageProgress = totalStudents > 0 ? Math.round(summaries.reduce((sum, item) => sum + Number(item.progress_percentage ?? 0), 0) / totalStudents) : 0;
  const averageScore = totalStudents > 0 ? Math.round(summaries.reduce((sum, item) => sum + Number(item.average_score ?? 0), 0) / totalStudents) : 0;

  if (isStudent) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white shadow-xl">
          <p className="text-sm font-medium text-emerald-100">Tahfidz</p>
          <h1 className="text-2xl font-black sm:text-3xl">Progress Hafalan Saya</h1>
          <p className="mt-1 text-sm text-emerald-50">Pantau capaian hafalan dan nilai rata-rata.</p>
        </div>
        {loading ? <p className="text-sm text-slate-500">Memuat data...</p> : studentSummary ? (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard title="Progress" value={`${studentSummary.progress_percentage}%`} icon={BarChart3} color="bg-emerald-100 text-emerald-700" />
              <StatCard title="Ayat Tercakup" value={studentSummary.total_ayah_covered} icon={BookOpen} color="bg-blue-100 text-blue-700" />
              <StatCard title="Surah Selesai" value={studentSummary.total_surah_completed} icon={CheckCircle2} color="bg-indigo-100 text-indigo-700" />
              <StatCard title="Rata-rata Nilai" value={studentSummary.average_score ?? 0} icon={Star} color="bg-amber-100 text-amber-700" />
            </div>
            <Card><CardHeader><CardTitle>Ringkasan</CardTitle></CardHeader><CardContent className="space-y-3"><ProgressBar value={studentSummary.progress_percentage} /><p className="text-sm text-slate-600">Juz selesai: <strong>{studentSummary.total_juz_completed}</strong></p><p className="text-sm text-slate-600">Setoran terakhir: <strong>{studentSummary.last_submission_at ? formatDate(studentSummary.last_submission_at) : '-'}</strong></p></CardContent></Card>
            <SurahProgressChart data={studentSurahProgress} />
          </>
        ) : <Card><CardContent className="p-8 text-center text-sm text-slate-500">Belum ada data progress. Progress akan muncul setelah ada setoran hafalan.</CardContent></Card>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-emerald-600 to-cyan-600 p-6 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-100">Tahfidz</p>
          <h1 className="text-2xl font-black sm:text-3xl">Progress Hafalan</h1>
          <p className="mt-1 text-sm text-emerald-50">Pantau capaian hafalan siswa berdasarkan setoran yang sudah tercatat.</p>
        </div>
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="rounded-md border border-white/30 bg-white px-3 py-2 text-sm text-slate-900">
          <option value="">Semua kelas</option>
          {classes.map((classRoom) => <option key={classRoom.id} value={classRoom.id}>{classRoom.name}</option>)}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total Siswa" value={totalStudents} icon={Layers} color="bg-slate-100 text-slate-700" />
        <StatCard title="Rata-rata Progress" value={`${averageProgress}%`} icon={BarChart3} color="bg-emerald-100 text-emerald-700" />
        <StatCard title="Rata-rata Nilai" value={averageScore} icon={Star} color="bg-amber-100 text-amber-700" />
      </div>

      <Card>
        <CardContent className="p-4">
          {loading ? <p className="text-sm text-slate-500">Memuat data...</p> : (
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-slate-200">
                <thead><tr className="text-left text-xs font-semibold uppercase text-slate-500"><th className="px-4 py-3">Siswa</th><th className="px-4 py-3">Progress</th><th className="px-4 py-3">Ayat</th><th className="px-4 py-3">Surah</th><th className="px-4 py-3">Juz</th><th className="px-4 py-3">Rata-rata Nilai</th><th className="px-4 py-3">Setoran Terakhir</th><th className="px-4 py-3">Aksi</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {summaries.map((summary) => <tr key={summary.student_id} className={selectedStudentId === summary.student_id ? 'bg-emerald-50' : 'hover:bg-slate-50'}><td className="px-4 py-3 text-sm font-medium"><div>{summary.student?.name ?? '-'}</div><div className="text-xs text-slate-500">{summary.student?.student_code ?? ''}</div></td><td className="px-4 py-3 text-sm"><div className="flex min-w-40 items-center gap-2"><ProgressBar value={summary.progress_percentage} /><span className="w-12 font-semibold">{summary.progress_percentage}%</span></div></td><td className="px-4 py-3 text-sm">{summary.total_ayah_covered}</td><td className="px-4 py-3 text-sm">{summary.total_surah_completed}</td><td className="px-4 py-3 text-sm">{summary.total_juz_completed}</td><td className="px-4 py-3 text-sm"><span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-700">{summary.average_score ?? 0}</span></td><td className="px-4 py-3 text-sm">{summary.last_submission_at ? formatDate(summary.last_submission_at) : '-'}</td><td className="px-4 py-3 text-sm"><Button size="sm" variant={selectedStudentId === summary.student_id ? 'default' : 'outline'} onClick={() => setSelectedStudentId(summary.student_id)}><Eye className="h-4 w-4" /> View</Button></td></tr>)}
                  {summaries.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500"><BarChart3 className="mx-auto mb-2 h-8 w-8 text-slate-300" />Belum ada data progress.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStudentId && (
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-start justify-between gap-4 bg-gradient-to-r from-slate-900 to-emerald-900 text-white">
            <div>
              <p className="text-sm font-medium text-emerald-100">Detail Progress Siswa</p>
              <CardTitle className="mt-1 text-2xl font-black">{selectedStudent?.name ?? 'Memuat...'}</CardTitle>
              {selectedStudent?.student_code && <p className="mt-1 text-sm text-slate-200">Kode siswa: {selectedStudent.student_code}</p>}
            </div>
            <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={() => setSelectedStudentId(null)}><X className="h-4 w-4" /> Tutup</Button>
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            {selectedDetailLoading ? <p className="text-sm text-slate-500">Memuat detail progress...</p> : selectedSummary ? (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <StatCard title="Progress" value={`${selectedSummary.progress_percentage}%`} icon={BarChart3} color="bg-emerald-100 text-emerald-700" />
                  <StatCard title="Ayat Tercakup" value={selectedSummary.total_ayah_covered} icon={BookOpen} color="bg-blue-100 text-blue-700" />
                  <StatCard title="Surah Selesai" value={selectedSummary.total_surah_completed} icon={CheckCircle2} color="bg-indigo-100 text-indigo-700" />
                  <StatCard title="Rata-rata Nilai" value={selectedSummary.average_score ?? 0} icon={Star} color="bg-amber-100 text-amber-700" />
                </div>
                <SurahProgressChart data={selectedSurahProgress} />
              </>
            ) : <p className="text-sm text-slate-500">Detail progress tidak tersedia.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}