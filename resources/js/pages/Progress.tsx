import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { classService, progressService } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ClassRoom, ProgressStats, StudentProgressSummary, SurahProgress } from '@/types';
import { formatDate } from '@/utils/date';
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Eye,
  Layers,
  Search,
  Star,
  TrendingUp,
  Users,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';

/* ================================================================
 * Helpers & building blocks
 * ================================================================ */

function nameInitials(value?: string | null): string {
  return (value ?? '?')
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 ${className ?? ''}`} />;
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ${className ?? ''}`}>{children}</div>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 py-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50">
        <BarChart3 className="h-7 w-7 text-emerald-500" />
      </span>
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <p className="max-w-xs text-xs text-slate-400">{description}</p>
    </div>
  );
}

function ProgressBar({ value, className }: { value: number; className?: string }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-slate-100 ${className ?? ''}`}>
      <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${safeValue}%` }} />
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  secondary,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  icon: typeof Users;
  iconBg: string;
  iconColor: string;
  secondary?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      {loading ? (
        <div className="space-y-2.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-28" />
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${iconBg}`}>
              <Icon className={`h-5 w-5 ${iconColor}`} strokeWidth={2} />
            </span>
          </div>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
          {secondary && <p className="mt-1 text-xs text-slate-400">{secondary}</p>}
        </>
      )}
    </Card>
  );
}

function Pagination({
  page,
  lastPage,
  total,
  perPage,
  onPage,
  onPerPage,
}: {
  page: number;
  lastPage: number;
  total: number;
  perPage: number;
  onPage: (p: number) => void;
  onPerPage: (n: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-500">
        Menampilkan <b>{from}</b>-<b>{to}</b> dari <b>{total}</b> data
      </p>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-500">
          <select
            value={perPage}
            onChange={(e) => onPerPage(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            {[15, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / halaman
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Halaman sebelumnya">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 text-sm font-semibold text-slate-700">
            {page} / {lastPage}
          </span>
          <Button size="icon" variant="outline" disabled={page >= lastPage} onClick={() => onPage(page + 1)} aria-label="Halaman berikutnya">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
 * Grafik progress per surah (restyled)
 * ================================================================ */

function SurahProgressChart({ data }: { data: SurahProgress[] }) {
  const activeData = data.filter((item) => item.covered_ayahs > 0 || Number(item.average_score ?? 0) > 0);
  const chartData = activeData.length > 0 ? activeData : data.slice(0, 10);
  const topCompleted = [...data]
    .filter((item) => item.covered_ayahs > 0)
    .sort((a, b) => b.progress_percentage - a.progress_percentage || b.covered_ayahs - a.covered_ayahs)
    .slice(0, 5);

  if (data.length === 0) {
    return (
      <Card>
        <EmptyState title="Belum ada data surah" description="Data progress surah akan muncul setelah ada setoran hafalan." />
      </Card>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <Card>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900">Grafik Progress per Surah</h3>
            <p className="mt-0.5 text-xs text-slate-400">Surah yang sudah memiliki cakupan hafalan.</p>
          </div>
          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{activeData.length} surah aktif</span>
        </div>
        <div className="max-h-[520px] space-y-2.5 overflow-y-auto pr-2">
          {chartData.map((item, index) => {
            const percentage = Math.max(0, Math.min(100, Number(item.progress_percentage) || 0));
            return (
              <div key={item.surah_id} className="rounded-xl bg-slate-50 p-3 transition-colors hover:bg-slate-100">
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <span className="mr-2 inline-grid h-7 w-7 place-items-center rounded-full bg-white text-xs font-bold text-slate-600 shadow-sm">{index + 1}</span>
                    <span className="font-semibold text-slate-900">
                      {item.surah_number}. {item.name_latin}
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-slate-900">{percentage}%</p>
                    <p className="text-xs text-slate-500">
                      {item.covered_ayahs}/{item.total_ayahs} ayat
                    </p>
                  </div>
                </div>
                <ProgressBar value={percentage} className="bg-white shadow-inner" />
              </div>
            );
          })}
        </div>
      </Card>

      <div className="space-y-5">
        <Card>
          <h3 className="text-[15px] font-bold text-slate-900">Top Surah</h3>
          <p className="mb-3 mt-0.5 text-xs text-slate-400">Surah dengan progress tertinggi.</p>
          {topCompleted.length > 0 ? (
            <div className="space-y-3">
              {topCompleted.map((item) => (
                <div key={item.surah_id}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-semibold text-slate-800">{item.name_latin}</span>
                    <span className="font-bold text-emerald-600">{item.progress_percentage}%</span>
                  </div>
                  <ProgressBar value={item.progress_percentage} />
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400">Belum ada surah yang tercakup.</p>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 text-[15px] font-bold text-slate-900">Detail Surah</h3>
          <div className="max-h-[300px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="py-2">Surah</th>
                  <th className="py-2">Ayat</th>
                  <th className="py-2 text-right">Nilai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data
                  .filter((item) => item.covered_ayahs > 0)
                  .map((item) => (
                    <tr key={item.surah_id}>
                      <td className="py-2 font-medium text-slate-800">{item.name_latin}</td>
                      <td className="py-2 text-slate-600">
                        {item.covered_ayahs}/{item.total_ayahs}
                      </td>
                      <td className="py-2 text-right">
                        <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          {item.average_score ?? '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                {data.every((item) => item.covered_ayahs === 0) && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-500">
                      Belum ada detail hafalan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ================================================================
 * Drawer detail siswa
 * ================================================================ */

function Drawer({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="fixed right-0 top-0 flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-l-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Detail progress siswa"
      >
        {children}
      </div>
    </div>
  );
}

function StudentDetailDrawer({
  studentId,
  studentName,
  studentCode,
  onClose,
}: {
  studentId: number;
  studentName?: string;
  studentCode?: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['progress-detail', studentId],
    queryFn: () => progressService.show(studentId),
  });

  const summary: StudentProgressSummary | undefined = data?.summary;
  const surahProgress: SurahProgress[] = data?.surah_progress ?? [];

  return (
    <Drawer onClose={onClose}>
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h3 className="text-lg font-bold text-slate-900">Detail Progress</h3>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Tutup">
          <X className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-gradient-to-br from-emerald-50/60 to-slate-50 p-5">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700">
                {nameInitials(studentName ?? summary?.student?.name)}
              </span>
              <div className="min-w-0">
                <h4 className="text-xl font-extrabold text-slate-900">{studentName ?? summary?.student?.name ?? 'Santri'}</h4>
                <p className="text-sm text-slate-500">{studentCode ?? summary?.student?.student_code ?? '-'}</p>
              </div>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                <TrendingUp className="h-3.5 w-3.5" /> {summary?.progress_percentage ?? 0}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3">
                <BookOpen className="h-4 w-4 text-sky-600" />
                <p className="mt-1.5 text-xl font-extrabold text-slate-900">{summary?.total_ayah_covered ?? 0}</p>
                <p className="text-[11px] text-slate-500">Ayat Tercakup</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                <p className="mt-1.5 text-xl font-extrabold text-slate-900">{summary?.total_surah_completed ?? 0}</p>
                <p className="text-[11px] text-slate-500">Surah Selesai</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <Layers className="h-4 w-4 text-emerald-600" />
                <p className="mt-1.5 text-xl font-extrabold text-slate-900">{summary?.total_juz_completed ?? 0}</p>
                <p className="text-[11px] text-slate-500">Juz Selesai</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <Star className="h-4 w-4 text-amber-600" />
                <p className="mt-1.5 text-xl font-extrabold text-slate-900">{summary?.average_score ?? 0}</p>
                <p className="text-[11px] text-slate-500">Rata-rata Nilai</p>
              </div>
            </div>

            <Card>
              <h4 className="mb-3 text-sm font-bold text-slate-900">Ringkasan Hafalan</h4>
              <ProgressBar value={summary?.progress_percentage ?? 0} />
              <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <p>
                  Progress keseluruhan: <b className="text-slate-900">{summary?.progress_percentage ?? 0}%</b>
                </p>
                <p>
                  Setoran terakhir: <b className="text-slate-900">{summary?.last_submission_at ? formatDate(summary.last_submission_at) : '-'}</b>
                </p>
              </div>
            </Card>

            <SurahProgressChart data={surahProgress} />
          </>
        )}
      </div>
    </Drawer>
  );
}

/* ================================================================
 * Halaman utama
 * ================================================================ */

export default function Progress() {
  const { user } = useAuth();
  const [classFilter, setClassFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detailName, setDetailName] = useState('');
  const [detailCode, setDetailCode] = useState('');

  const isStudent = user?.role === 'student';

  // Search debounce 400ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, classFilter]);

  const { data: listData, isLoading, isError, refetch } = useQuery({
    queryKey: ['progress', classFilter, debouncedSearch, page, perPage],
    queryFn: () =>
      progressService.list({
        page,
        per_page: perPage,
        class_id: classFilter ? Number(classFilter) : undefined,
        search: debouncedSearch || undefined,
      }),
    enabled: !isStudent,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['progress-stats', classFilter],
    queryFn: () => progressService.stats({ class_id: classFilter ? Number(classFilter) : undefined }),
    enabled: !isStudent,
  });

  const { data: myData, isLoading: myLoading } = useQuery({
    queryKey: ['progress-detail', user?.student_id],
    queryFn: () => progressService.show(Number(user?.student_id)),
    enabled: isStudent && Boolean(user?.student_id),
  });

  const { data: classesData } = useQuery({
    queryKey: ['classes-options'],
    queryFn: () => classService.list({ per_page: 100 }),
    enabled: !isStudent,
  });

  const summaries: StudentProgressSummary[] = Array.isArray(listData) ? listData : listData?.data ?? [];
  const classes: ClassRoom[] = Array.isArray(classesData) ? classesData : classesData?.data ?? [];
  const total = (listData as any)?.total ?? summaries.length;
  const lastPage = (listData as any)?.last_page ?? 1;
  const stats = statsData as ProgressStats | undefined;

  const mySummary: StudentProgressSummary | undefined = myData?.summary;
  const mySurah: SurahProgress[] = myData?.surah_progress ?? [];

  /* ===== View siswa ===== */
  if (isStudent) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold text-emerald-600">Tahfidz</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Progress Hafalan Saya</h1>
          <p className="mt-1 text-slate-500">Pantau capaian hafalan dan nilai rata-rata.</p>
        </div>

        {myLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : mySummary ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Progress" value={`${mySummary.progress_percentage}%`} icon={BarChart3} iconBg="bg-emerald-50" iconColor="text-emerald-600" loading={false} />
              <KpiCard label="Ayat Tercakup" value={mySummary.total_ayah_covered} icon={BookOpen} iconBg="bg-sky-50" iconColor="text-sky-600" loading={false} />
              <KpiCard label="Surah Selesai" value={mySummary.total_surah_completed} icon={CheckCircle2} iconBg="bg-indigo-50" iconColor="text-indigo-600" loading={false} />
              <KpiCard label="Rata-rata Nilai" value={mySummary.average_score ?? 0} icon={Star} iconBg="bg-amber-50" iconColor="text-amber-600" loading={false} />
            </div>
            <Card>
              <h3 className="mb-3 text-[15px] font-bold text-slate-900">Ringkasan</h3>
              <ProgressBar value={mySummary.progress_percentage} />
              <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <p>
                  Juz selesai: <b className="text-slate-900">{mySummary.total_juz_completed}</b>
                </p>
                <p>
                  Setoran terakhir: <b className="text-slate-900">{mySummary.last_submission_at ? formatDate(mySummary.last_submission_at) : '-'}</b>
                </p>
              </div>
            </Card>
            <SurahProgressChart data={mySurah} />
          </>
        ) : (
          <Card>
            <EmptyState title="Belum ada data progress" description="Progress akan muncul setelah ada setoran hafalan." />
          </Card>
        )}
      </div>
    );
  }

  /* ===== View admin / guru ===== */
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-emerald-600">Tahfidz</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Progress Hafalan</h1>
        <p className="mt-1 text-slate-500">Pantau capaian hafalan siswa berdasarkan setoran yang sudah tercatat.</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Siswa" value={stats?.total_students ?? 0} icon={Users} iconBg="bg-emerald-50" iconColor="text-emerald-600" secondary="dengan data progress" loading={statsLoading} />
        <KpiCard label="Rata-rata Progress" value={stats?.avg_progress != null ? `${stats.avg_progress}%` : '0%'} icon={TrendingUp} iconBg="bg-sky-50" iconColor="text-sky-600" loading={statsLoading} />
        <KpiCard label="Rata-rata Nilai" value={stats?.avg_score ?? 0} icon={Star} iconBg="bg-amber-50" iconColor="text-amber-600" loading={statsLoading} />
        <KpiCard label="Total Juz Tuntas" value={stats?.total_juz ?? 0} icon={Layers} iconBg="bg-violet-50" iconColor="text-violet-600" loading={statsLoading} />
      </div>

      {/* Filter */}
      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-12">
          <div className="relative md:col-span-6">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Cari nama siswa, kode, atau NIS..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Cari siswa" />
          </div>
          <div className="md:col-span-3">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
              aria-label="Filter kelas"
            >
              <option value="">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-end md:col-span-3">
            <span className="text-xs text-slate-400">{total} siswa dengan progress</span>
          </div>
        </div>
      </Card>

      {/* Error */}
      {isError && (
        <Card className="border-rose-100 bg-rose-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-rose-500" />
              <div>
                <p className="text-sm font-bold text-rose-700">Data progress gagal dimuat.</p>
                <p className="text-xs text-rose-500">Terjadi masalah saat mengambil data.</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <RotateCcw className="h-4 w-4" /> Coba Lagi
            </Button>
          </div>
        </Card>
      )}

      {/* Tabel */}
      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : summaries.length === 0 ? (
          <EmptyState title="Belum ada data progress" description="Belum terdapat data progress hafalan pada filter ini." />
        ) : (
          <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">No</th>
                  <th className="px-3 py-3">Siswa</th>
                  <th className="px-3 py-3">Kelas</th>
                  <th className="px-3 py-3">Progress</th>
                  <th className="px-3 py-3">Ayat</th>
                  <th className="px-3 py-3">Surah</th>
                  <th className="px-3 py-3">Juz</th>
                  <th className="px-3 py-3">Rata-rata Nilai</th>
                  <th className="px-3 py-3">Setoran Terakhir</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summaries.map((summary, i) => (
                  <tr key={summary.student_id} className="transition-colors hover:bg-emerald-50/40">
                    <td className="px-4 py-3 text-slate-400">{(page - 1) * perPage + i + 1}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700">
                          {nameInitials(summary.student?.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{summary.student?.name ?? '-'}</p>
                          <p className="text-xs text-slate-400">{summary.student?.student_code ?? ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{(summary.student as any)?.class_room?.name ?? '-'}</td>
                    <td className="px-3 py-3">
                      <div className="flex min-w-[120px] items-center gap-2">
                        <ProgressBar value={summary.progress_percentage} className="flex-1" />
                        <span className="w-11 shrink-0 text-right font-semibold text-slate-700">{summary.progress_percentage}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{summary.total_ayah_covered}</td>
                    <td className="px-3 py-3 text-slate-600">{summary.total_surah_completed}</td>
                    <td className="px-3 py-3 text-slate-600">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <Layers className="h-3 w-3" /> {summary.student?.memorization_target ?? summary.total_juz_completed} Juz
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{summary.average_score ?? 0}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{summary.last_submission_at ? formatDate(summary.last_submission_at) : '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="icon"
                        variant="outline"
                        title="Detail"
                        aria-label={`Detail ${summary.student?.name ?? 'siswa'}`}
                        onClick={() => {
                          setDetailId(summary.student_id);
                          setDetailName(summary.student?.name ?? '');
                          setDetailCode(summary.student?.student_code ?? '');
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: tampilan kartu */}
          <div className="divide-y divide-slate-100 md:hidden">
            {summaries.map((summary) => (
              <div key={summary.student_id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700">
                      {nameInitials(summary.student?.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{summary.student?.name ?? '-'}</p>
                      <p className="truncate text-xs text-slate-400">
                        {summary.student?.student_code ?? ''}
                        {(summary.student as any)?.class_room?.name ? ` · ${(summary.student as any)?.class_room?.name}` : ''}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    title="Detail"
                    aria-label={`Detail ${summary.student?.name ?? 'siswa'}`}
                    onClick={() => {
                      setDetailId(summary.student_id);
                      setDetailName(summary.student?.name ?? '');
                      setDetailCode(summary.student?.student_code ?? '');
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <ProgressBar value={summary.progress_percentage} className="flex-1" />
                  <span className="w-11 shrink-0 text-right text-xs font-semibold text-slate-700">{summary.progress_percentage}%</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-[10px] text-slate-500">Ayat</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">{summary.total_ayah_covered}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-[10px] text-slate-500">Surah</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">{summary.total_surah_completed}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-[10px] text-slate-500">Juz</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">{summary.student?.memorization_target ?? summary.total_juz_completed}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-[10px] text-slate-500">Rata-rata Nilai</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">{summary.average_score ?? 0}</p>
                  </div>
                </div>

                <p className="mt-2.5 text-xs text-slate-400">
                  Setoran terakhir: {summary.last_submission_at ? formatDate(summary.last_submission_at) : '-'}
                </p>
              </div>
            ))}
          </div>
          </>
        )}

        {!isLoading && summaries.length > 0 && (
          <Pagination
            page={page}
            lastPage={lastPage}
            total={total}
            perPage={perPage}
            onPage={setPage}
            onPerPage={(n) => {
              setPerPage(n);
              setPage(1);
            }}
          />
        )}
      </Card>

      {detailId !== null && (
        <StudentDetailDrawer
          studentId={detailId}
          studentName={detailName}
          studentCode={detailCode}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  );
}
