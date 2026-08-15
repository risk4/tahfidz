import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { studentService, teacherService, classService, tahfidzGroupService, academicYearService, submissionService, progressService } from '@/services/api';
import { formatDate } from '@/utils/date';
import type { Submission, StudentProgressSummary } from '@/types';
import { Link } from 'react-router-dom';
import { Users, GraduationCap, School, BookOpen, Calendar, ArrowRight, Activity, PieChart, Trophy, ClipboardList, BookMarked, BarChart3, Zap } from 'lucide-react';

function yearProgress(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const now = Date.now();
  if (e <= s) return 0;
  return Math.max(0, Math.min(100, Math.round(((now - s) / (e - s)) * 100)));
}

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

function AnalyticsSection({
  submissions,
  submissionsTotal,
  summaries,
  actions,
}: {
  submissions: Submission[];
  submissionsTotal: number;
  summaries: StudentProgressSummary[];
  actions: { label: string; href: string; icon: typeof ClipboardList; color: string }[];
}) {
  const newCount = submissions.filter((s) => s.type === 'new_memorization').length;
  const repetitionCount = submissions.filter((s) => s.type === 'repetition').length;
  const avgScore = submissions.length
    ? Math.round(submissions.reduce((a, s) => a + Number(s.final_score ?? 0), 0) / submissions.length)
    : 0;
  const recent = submissions.slice(0, 5);

  const perStudent: Record<string, number> = {};
  for (const s of submissions) {
    const name = s.student?.name ?? 'Tanpa nama';
    perStudent[name] = (perStudent[name] || 0) + 1;
  }
  const topStudents = Object.entries(perStudent).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const buckets = [
    { label: '0-25%', min: 0, max: 25 },
    { label: '26-50%', min: 26, max: 50 },
    { label: '51-75%', min: 51, max: 75 },
    { label: '76-100%', min: 76, max: 100 },
  ];
  const dist = buckets.map((b) => ({
    ...b,
    count: summaries.filter((x) => Number(x.progress_percentage ?? 0) >= b.min && Number(x.progress_percentage ?? 0) <= b.max).length,
  }));
  const maxDist = Math.max(1, ...dist.map((d) => d.count));

  return (
    <section className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 animate-fade-up" style={{ animationDelay: '600ms' }}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Statistik Setoran</p>
            <ClipboardList className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Setoran', value: submissionsTotal, c: 'text-emerald-600' },
              { label: 'Hafalan Baru', value: newCount, c: 'text-sky-600' },
              { label: 'Pengulangan', value: repetitionCount, c: 'text-violet-600' },
              { label: 'Rata-rata Nilai', value: avgScore, c: 'text-amber-600' },
            ].map((m) => (
              <div key={m.label} className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{m.label}</p>
                <p className={`mt-1 text-2xl font-extrabold ${m.c}`}>{m.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 animate-fade-up" style={{ animationDelay: '700ms' }}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Aktivitas Terbaru</p>
            <Activity className="h-4 w-4 text-emerald-500" />
          </div>
          <ul className="space-y-3">
            {recent.length ? recent.map((s) => (
              <li key={s.id} className="flex items-center gap-2.5 text-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-700">{nameInitials(s.student?.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-slate-800">{s.student?.name ?? '-'}</span>
                  <span className="block text-xs text-slate-400">{s.surah?.name_latin ?? '-'} {s.start_ayah}-{s.end_ayah} · {s.type === 'new_memorization' ? 'Baru' : 'Ulangan'}</span>
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{s.final_score}</span>
              </li>
            )) : <li className="py-6 text-center text-sm text-slate-500">Belum ada aktivitas.</li>}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 animate-fade-up" style={{ animationDelay: '800ms' }}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Top Santri</p>
            <Trophy className="h-4 w-4 text-amber-500" />
          </div>
          <ol className="space-y-2.5">
            {topStudents.length ? topStudents.map(([name, count], i) => (
              <li key={name} className="flex items-center gap-2.5 text-sm">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{name}</span>
                <span className="font-semibold text-emerald-600">{count}<span className="ml-0.5 text-xs font-normal text-slate-400">x</span></span>
              </li>
            )) : <li className="py-6 text-center text-sm text-slate-500">Belum ada data.</li>}
          </ol>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 animate-fade-up" style={{ animationDelay: '900ms' }}>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Distribusi Hafalan</p>
            <PieChart className="h-4 w-4 text-emerald-500" />
          </div>
          {summaries.length ? (
            <div className="space-y-3">
              {dist.map((d) => (
                <div key={d.label} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-xs font-medium text-slate-500">{d.label}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.round((d.count / maxDist) * 100)}%` }} />
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs font-semibold text-slate-600">{d.count}</span>
                </div>
              ))}
            </div>
          ) : <p className="py-6 text-center text-sm text-slate-500">Belum ada data progress.</p>}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 animate-fade-up" style={{ animationDelay: '1000ms' }}>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Aksi Cepat</p>
            <Zap className="h-4 w-4 text-amber-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {actions.map((a) => (
              <Link key={a.label} to={a.href} className="flex items-center gap-2.5 rounded-xl border border-slate-100 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-sm">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${a.color}`}><a.icon className="h-4 w-4" /></span>
                <span className="text-sm font-medium text-slate-700">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: academicYears } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => academicYearService.list({ per_page: 1 }),
  });

  const { data: students } = useQuery({
    queryKey: ['students-count'],
    queryFn: () => studentService.list({ per_page: 1 }),
  });

  const { data: teachers } = useQuery({
    queryKey: ['teachers-count'],
    queryFn: () => teacherService.list({ per_page: 1 }),
  });

  const { data: classes } = useQuery({
    queryKey: ['classes-count'],
    queryFn: () => classService.list({ per_page: 1 }),
  });

  const { data: tahfidzGroups } = useQuery({
    queryKey: ['tahfidz-groups-count'],
    queryFn: () => tahfidzGroupService.list({ per_page: 1 }),
  });

  const academicYearItems = Array.isArray(academicYears) ? academicYears : academicYears?.data ?? [];
  const activeYear = academicYearItems.find((y: { is_active: boolean }) => y.is_active);

  const { data: submissionsData } = useQuery({
    queryKey: ['dashboard-submissions'],
    queryFn: () => submissionService.list({ per_page: 100 }),
    enabled: user?.role !== 'student',
  });

  const { data: progressListData } = useQuery({
    queryKey: ['dashboard-progress-list'],
    queryFn: () => progressService.list({ per_page: 100 }),
    enabled: user?.role !== 'student',
  });

  const submissionItems: Submission[] = Array.isArray(submissionsData) ? submissionsData : submissionsData?.data ?? [];
  const submissionsTotal = submissionsData?.total ?? submissionItems.length;
  const progressSummaries: StudentProgressSummary[] = Array.isArray(progressListData) ? progressListData : progressListData?.data ?? [];

  const quickActions = [
    { label: 'Tambah Santri', href: '/students', icon: GraduationCap, color: 'bg-emerald-100 text-emerald-600', roles: ['super_admin', 'teacher'] },
    { label: 'Tambah Guru', href: '/teachers', icon: Users, color: 'bg-sky-100 text-sky-600', roles: ['super_admin'] },
    { label: 'Catat Setoran', href: '/submissions', icon: ClipboardList, color: 'bg-violet-100 text-violet-600', roles: ['super_admin', 'teacher'] },
    { label: 'Kelola Murajaah', href: '/murajaah', icon: BookMarked, color: 'bg-amber-100 text-amber-600', roles: ['super_admin', 'teacher'] },
    { label: 'Progress Hafalan', href: '/progress', icon: BarChart3, color: 'bg-teal-100 text-teal-600', roles: ['super_admin', 'teacher', 'student'] },
  ];
  const quickActionsVisible = quickActions.filter((a) => user && a.roles.includes(user.role));

  const stats = [
    {
      label: 'Total Siswa',
      value: students?.total || 0,
      icon: GraduationCap,
      bg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      href: '/students',
    },
    {
      label: 'Total Guru',
      value: teachers?.total || 0,
      icon: Users,
      bg: 'bg-sky-50',
      iconColor: 'text-sky-600',
      href: '/teachers',
    },
    {
      label: 'Total Kelas',
      value: classes?.total || 0,
      icon: School,
      bg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      href: '/classes',
    },
    {
      label: 'Kelompok Tahfidz',
      value: tahfidzGroups?.total || 0,
      icon: BookOpen,
      bg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      href: '/tahfidz-groups',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header sapaan */}
      <div className="animate-fade-up">
        <div>
          <p className="text-sm text-slate-500">Assalamu'alaikum,</p>
          <p className="text-xl font-bold text-slate-900">{user?.name}</p>
          <p className="mt-0.5 text-sm text-slate-500">Semangat menjaga kalam Allah hari ini! 🌿</p>
        </div>
      </div>

      {/* Statistik (khusus admin) */}
      {user?.role === 'super_admin' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Link
              key={s.label}
              to={s.href}
              className={`group rounded-2xl ${s.bg} p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200 animate-fade-up`}
              style={{ animationDelay: `${100 + i * 100}ms` }}
            >
              <p className="text-sm font-medium text-slate-500">{s.label}</p>
              <div className="mt-2 flex items-end justify-between">
                <p className={`text-3xl font-extrabold ${s.iconColor}`}>{s.value}</p>
                <s.icon className={`h-6 w-6 ${s.iconColor} opacity-70 transition-transform duration-300 group-hover:scale-110`} />
              </div>
              <p className="mt-2 flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors group-hover:text-emerald-600">
                Lihat detail <ArrowRight className="h-3 w-3" />
              </p>
            </Link>
          ))}
        </div>
      )}

      {/* Progress + tahun ajaran */}
      <div className="grid gap-4 lg:grid-cols-2 animate-fade-up" style={{ animationDelay: '500ms' }}>
        {/* Progress tahun ajaran */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Progress Tahun Ajaran</p>
            <p className="text-xs text-slate-400">
              {activeYear ? `${yearProgress(activeYear.start_date, activeYear.end_date)}%` : '—'}
            </p>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="flex h-full items-center justify-end rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${yearProgress(activeYear?.start_date, activeYear?.end_date)}%` }}
            >
              <span className="px-1 text-[8px] font-bold text-white">
                {yearProgress(activeYear?.start_date, activeYear?.end_date)}%
              </span>
            </div>
          </div>
          <div className="mt-2 flex justify-between text-xs text-slate-400">
            <span>{activeYear ? formatDate(activeYear.start_date) : '—'}</span>
            <span>{activeYear ? formatDate(activeYear.end_date) : '—'}</span>
          </div>
        </div>

        {/* Tahun ajaran aktif */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
                <Calendar className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Tahun Ajaran Aktif</p>
                {activeYear ? (
                  <>
                    <p className="text-xs text-slate-400">{activeYear.name}</p>
                    <p className="text-xs text-slate-400">
                      {formatDate(activeYear.start_date)} - {formatDate(activeYear.end_date)}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-slate-400">Belum ada tahun ajaran aktif</p>
                )}
              </div>
            </div>
            {activeYear && (
              <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                Berjalan
              </span>
            )}
          </div>
        </div>
      </div>

      {user?.role !== 'student' && (
        <AnalyticsSection
          submissions={submissionItems}
          submissionsTotal={submissionsTotal}
          summaries={progressSummaries}
          actions={quickActionsVisible}
        />
      )}
    </div>
  );
}
