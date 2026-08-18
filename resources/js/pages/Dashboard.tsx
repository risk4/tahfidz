import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users,
  BookOpen,
  RefreshCw,
  Target,
  TrendingUp,
  Plus,
  ClipboardList,
  BookMarked,
  GraduationCap,
  AlertTriangle,
  Info,
  CheckCircle2,
  UserRound,
  Lightbulb,
  ArrowRight,
  Loader2,
  CalendarDays,
  Zap,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { dashboardService } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import type { DashboardOverview, DashboardRange } from '@/types';

/* ================================================================
 * Helpers & small building blocks
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

const STATUS_META: Record<string, { label: string; cls: string }> = {
  approved: { label: 'Disetujui', cls: 'bg-emerald-100 text-emerald-700' },
  pending: { label: 'Menunggu', cls: 'bg-amber-100 text-amber-700' },
  revision: { label: 'Revisi', cls: 'bg-rose-100 text-rose-700' },
  rejected: { label: 'Ditolak', cls: 'bg-slate-200 text-slate-600' },
  LANCAR: { label: 'Lancar', cls: 'bg-emerald-100 text-emerald-700' },
  PERLU_MUROJAAH: { label: 'Perlu Murojaah', cls: 'bg-rose-100 text-rose-700' },
};

function StatusBadge({ status }: { status: string | null | undefined }) {
  const meta = STATUS_META[status ?? ''] ?? { label: status ?? '-', cls: 'bg-slate-100 text-slate-600' };
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.cls}`}>{meta.label}</span>;
}

function Trend({ value, suffix }: { value: number | null; suffix?: string }) {
  if (value === null || value === undefined || value === 0) {
    return <span className="text-xs text-slate-400">Stabil dibanding periode sebelumnya</span>;
  }
  const up = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-emerald-600' : 'text-rose-500'}`}>
      {up ? '↑' : '↓'} {Math.abs(value)}%{suffix ? ` ${suffix}` : ''}
    </span>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50">
        <BookOpen className="h-6 w-6 text-emerald-500" />
      </span>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="max-w-xs text-xs text-slate-400">{description}</p>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ${className ?? ''}`}>
      {children}
    </div>
  );
}

function SectionTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

/* ================================================================
 * KPI cards
 * ================================================================ */

function KpiCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
  secondary,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  icon: typeof Users;
  iconBg: string;
  iconColor: string;
  trend?: React.ReactNode;
  secondary?: string;
  loading?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden">
      {loading ? (
        <div className="space-y-2.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-32" />
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
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {trend}
            {secondary && <span className="text-xs text-slate-400">{secondary}</span>}
          </div>
        </>
      )}
    </Card>
  );
}

/* ================================================================
 * Charts
 * ================================================================ */

const RANGES: { id: DashboardRange; label: string }[] = [
  { id: '7d', label: '7 Hari' },
  { id: '30d', label: '30 Hari' },
  { id: '3m', label: '3 Bulan' },
  { id: '6m', label: '6 Bulan' },
  { id: '1y', label: '1 Tahun' },
];

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-2.5 shadow-xl">
      <p className="mb-1.5 text-xs font-bold text-slate-900">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="flex items-center gap-2 text-xs text-slate-600">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color ?? entry.fill }} />
          <span className="capitalize">{entry.name}:</span>
          <span className="ml-auto font-semibold text-slate-900">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

function GrowthChart({ data, loading }: { data: DashboardOverview['chart']; loading?: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data.length) {
    return <EmptyState title="Belum ada aktivitas" description="Belum terdapat aktivitas Tahfidz pada periode ini." />;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="gradSetoran" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradMurajaah" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradTarget" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.24} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={28} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
            formatter={(value: string) => <span className="text-slate-600">{value}</span>}
          />
          <Area type="monotone" dataKey="setoran" name="Setoran" stroke="#10b981" strokeWidth={2} fill="url(#gradSetoran)" />
          <Area type="monotone" dataKey="murajaah" name="Muraja'ah" stroke="#0ea5e9" strokeWidth={2} fill="url(#gradMurajaah)" />
          <Area type="monotone" dataKey="target" name="Pencapaian Target" stroke="#f59e0b" strokeWidth={2} fill="url(#gradTarget)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function CompareChart({ data, loading }: { data: DashboardOverview['chart']; loading?: boolean }) {
  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!data.length) {
    return <EmptyState title="Belum ada aktivitas" description="Belum terdapat aktivitas Tahfidz pada periode ini." />;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={28} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
            formatter={(value: string) => <span className="text-slate-600">{value}</span>}
          />
          <Bar dataKey="setoran_pages" name="Setoran (halaman)" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={18} />
          <Bar dataKey="murajaah_pages" name="Muraja'ah (halaman)" fill="#0ea5e9" radius={[5, 5, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ================================================================
 * Widgets
 * ================================================================ */

function RecentActivities({ items, loading }: { items: DashboardOverview['recent_activities']; loading?: boolean }) {
  return (
    <Card>
      <SectionTitle
        title="Aktivitas Terbaru"
        subtitle="Setoran & muraja'ah terakhir"
        right={
          <Link to="/submissions" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700">
            Lihat Semua <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="Belum ada aktivitas" description="Belum terdapat aktivitas Tahfidz pada periode ini." />
      ) : (
        <div className="relative space-y-1">
          <span className="absolute bottom-2 left-[18px] top-2 w-px bg-slate-100" aria-hidden />
          {items.map((item, i) => (
            <div key={`${item.type}-${item.id}-${i}`} className="relative flex items-start gap-3 rounded-xl p-2 transition-colors hover:bg-slate-50">
              <span className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-[11px] font-bold text-emerald-700">
                {nameInitials(item.student_name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">{item.student_name}</span>{' '}
                  {item.action} <span className="font-medium text-slate-900">{item.detail || ''}</span>
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {item.time || item.datetime || '-'}
                  {item.teacher_name ? ` · dibimbing ${item.teacher_name}` : ''}
                </p>
              </div>
              <StatusBadge status={item.status} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function RecentSubmissions({ items, loading }: { items: DashboardOverview['recent_submissions']; loading?: boolean }) {
  return (
    <Card className="p-0">
      <div className="flex items-center justify-between px-5 pt-5">
        <div>
          <h2 className="text-[15px] font-bold text-slate-900">Setoran Terbaru</h2>
          <p className="mt-0.5 text-xs text-slate-400">Setoran hafalan terakhir</p>
        </div>
        <Link to="/submissions" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700">
          Lihat Semua <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-y border-slate-100 bg-slate-50/60 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-2.5">Santri</th>
              <th className="px-3 py-2.5">Surah / Ayat</th>
              <th className="px-3 py-2.5">Halaman</th>
              <th className="px-3 py-2.5">Pembimbing</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-5 py-2.5 text-right">Waktu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-3 py-3 first:px-5">
                      <Skeleton className="h-3.5 w-16" />
                    </td>
                  ))}
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState title="Belum ada aktivitas" description="Belum terdapat aktivitas Tahfidz pada periode ini." />
                </td>
              </tr>
            ) : (
              items.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-slate-50/60">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-slate-900">{s.student_name}</p>
                    {s.class_name && <p className="text-xs text-slate-400">{s.class_name}</p>}
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {s.surah}
                    {s.ayah_range ? <span className="text-slate-400"> · ayat {s.ayah_range}</span> : null}
                  </td>
                  <td className="px-3 py-3 text-slate-600">{s.page_count ?? '-'}</td>
                  <td className="px-3 py-3 text-slate-600">{s.teacher_name ?? '-'}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-5 py-3 text-right text-xs text-slate-400">{s.time || s.date || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: tampilan kartu */}
      <div className="divide-y divide-slate-50 md:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
            </div>
          ))
        ) : items.length === 0 ? (
          <EmptyState title="Belum ada aktivitas" description="Belum terdapat aktivitas Tahfidz pada periode ini." />
        ) : (
          items.map((s) => (
            <div key={s.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{s.student_name}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {s.surah}
                  {s.ayah_range ? ` · ayat ${s.ayah_range}` : ''} · {s.page_count ?? '-'} halaman
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-400">
                  {s.teacher_name ? `${s.teacher_name} · ` : ''}
                  {s.time || s.date || '-'}
                </p>
              </div>
              <StatusBadge status={s.status} />
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

const SEVERITY_META: Record<string, { icon: typeof AlertTriangle; cls: string; iconCls: string; label: string }> = {
  danger: { icon: AlertTriangle, cls: 'bg-rose-50', iconCls: 'text-rose-600', label: 'Perlu perhatian' },
  warning: { icon: AlertTriangle, cls: 'bg-amber-50', iconCls: 'text-amber-600', label: 'Perlu perhatian' },
  info: { icon: Info, cls: 'bg-sky-50', iconCls: 'text-sky-600', label: 'Perlu diperhatikan' },
};

function AttentionStudents({ items, loading }: { items: DashboardOverview['attention']; loading?: boolean }) {
  return (
    <Card>
      <SectionTitle
        title="Perlu Perhatian"
        subtitle="Santri yang membutuhkan tindak lanjut"
        right={
          <Link to="/students" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700">
            Lihat Semua <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />
      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="Semua santri dalam kondisi baik" description="Tidak ada santri yang membutuhkan perhatian khusus." />
      ) : (
        <div className="space-y-2.5">
          {items.map((s) => {
            const meta = SEVERITY_META[s.severity] ?? SEVERITY_META.info;
            const Icon = meta.icon;
            return (
              <div key={s.id} className={`flex items-center gap-3 rounded-xl ${meta.cls} p-3`}>
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/70 ${meta.iconCls}`}>
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{s.name}</p>
                  {/* Biarkan pesan membungkus (line-clamp) agar min-content-nya tidak memaksa kartu/grid melebar di layar sempit. */}
                  <p className="line-clamp-2 text-xs text-slate-500">
                    {s.message}
                    {s.class_name ? ` · ${s.class_name}` : ''}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function ClassPerformance({ items, loading }: { items: DashboardOverview['class_performance']; loading?: boolean }) {
  return (
    <Card className="p-0">
      <div className="flex items-center justify-between px-5 pt-5">
        <div>
          <h2 className="text-[15px] font-bold text-slate-900">Performa Kelas</h2>
          <p className="mt-0.5 text-xs text-slate-400">Aktivitas 90 hari terakhir per kelas</p>
        </div>
        <Link to="/progress" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700">
          Lihat Performa <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-y border-slate-100 bg-slate-50/60 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-2.5">Kelas</th>
              <th className="px-3 py-2.5">Santri</th>
              <th className="px-3 py-2.5">Setoran</th>
              <th className="px-3 py-2.5">Muraja'ah</th>
              <th className="px-5 py-2.5 text-right">Target</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-3 py-3 first:px-5">
                      <Skeleton className="h-3.5 w-14" />
                    </td>
                  ))}
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState title="Belum ada kelas" description="Belum terdapat data performa kelas." />
                </td>
              </tr>
            ) : (
              items.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-slate-50/60">
                  <td className="px-5 py-3 font-semibold text-slate-900">{c.name}</td>
                  <td className="px-3 py-3 text-slate-600">{c.students} santri</td>
                  <td className="px-3 py-3 text-slate-600">{c.submissions}</td>
                  <td className="px-3 py-3 text-slate-600">{c.murajaahs}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, c.target_percentage)}%` }} />
                      </div>
                      <span className="w-10 text-right text-xs font-semibold text-slate-700">{c.target_percentage}%</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: tampilan kartu */}
      <div className="divide-y divide-slate-50 md:hidden">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 px-5 py-3.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-1.5 w-full rounded-full" />
              <Skeleton className="h-3 w-40" />
            </div>
          ))
        ) : items.length === 0 ? (
          <EmptyState title="Belum ada kelas" description="Belum terdapat data performa kelas." />
        ) : (
          items.map((c) => (
            <div key={c.id} className="px-5 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-semibold text-slate-900">{c.name}</p>
                <span className="shrink-0 text-xs font-semibold text-slate-700">{c.target_percentage}%</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, c.target_percentage)}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                {c.students} santri · {c.submissions} setoran · {c.murajaahs} muraja'ah
              </p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function TopStudents({ items, loading }: { items: DashboardOverview['top_students']; loading?: boolean }) {
  const medals = ['bg-amber-100 text-amber-700', 'bg-slate-200 text-slate-600', 'bg-orange-100 text-orange-700'];

  return (
    <Card className="min-w-0">
      <SectionTitle
        title="Perkembangan Terbaik"
        subtitle="Santri dengan skor progres & konsistensi tertinggi"
        right={
          <Link to="/students" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700">
            Lihat Semua <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />
      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="Belum ada data" description="Belum terdapat data progres santri." />
      ) : (
        <ol className="space-y-2">
          {items.map((s, i) => (
            <li key={s.id} className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-slate-50">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${medals[i] ?? 'bg-slate-100 text-slate-500'}`}>
                {i + 1}
              </span>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-[11px] font-bold text-emerald-700">
                {nameInitials(s.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{s.name}</p>
                <p className="text-xs text-slate-400">
                  {s.total_juz} Juz · {s.class_name ?? 'Kelas -'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-extrabold text-emerald-600">{s.progress_percentage}%</p>
                <p className="text-[10px] text-slate-400">progres</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function TeacherActivity({ data, loading }: { data?: DashboardOverview['teacher_activity']; loading?: boolean }) {
  if (!data) return null;

  const chips = [
    { label: 'Guru Aktif', value: data.active_teachers, icon: UserRound },
    { label: 'Setoran Dibimbing (30h)', value: data.submissions_30d, icon: ClipboardList },
    { label: 'Muraja\'ah Dibimbing (30h)', value: data.murajaahs_30d, icon: BookMarked },
    { label: 'Rata-rata Santri/Guru', value: data.avg_students_per_teacher, icon: GraduationCap },
  ];

  return (
    <Card className="min-w-0 p-0">
      <div className="px-5 pt-5">
        <SectionTitle title="Aktivitas Pembimbing" subtitle="Statistik pembimbing aktif" />
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {chips.map((c) => (
            <div key={c.label} className="rounded-xl bg-slate-50 p-3">
              <c.icon className="h-4 w-4 text-emerald-600" />
              <p className="mt-1.5 text-xl font-extrabold text-slate-900">{c.value}</p>
              <p className="text-[11px] text-slate-500">{c.label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-y border-slate-100 bg-slate-50/60 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-2.5">Nama</th>
              <th className="px-3 py-2.5">Santri</th>
              <th className="px-3 py-2.5">Setoran</th>
              <th className="px-5 py-2.5 text-right">Muraja'ah</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 4 }).map((__, j) => (
                    <td key={j} className="px-3 py-3 first:px-5">
                      <Skeleton className="h-3.5 w-14" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.teachers.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <EmptyState title="Belum ada pembimbing" description="Belum terdapat data aktivitas pembimbing." />
                </td>
              </tr>
            ) : (
              data.teachers.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-slate-50/60">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sky-50 text-[10px] font-bold text-sky-700">
                        {nameInitials(t.name)}
                      </span>
                      <span className="font-semibold text-slate-900">{t.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{t.students}</td>
                  <td className="px-3 py-3 text-slate-600">{t.submissions}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{t.murajaahs}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: tampilan kartu */}
      <div className="divide-y divide-slate-50 md:hidden">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))
        ) : data.teachers.length === 0 ? (
          <EmptyState title="Belum ada pembimbing" description="Belum terdapat data aktivitas pembimbing." />
        ) : (
          data.teachers.map((t) => (
            <div key={t.id} className="px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sky-50 text-[10px] font-bold text-sky-700">
                  {nameInitials(t.name)}
                </span>
                <p className="min-w-0 truncate text-sm font-semibold text-slate-900">{t.name}</p>
              </div>
              <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 py-1.5">
                  <p className="text-sm font-bold text-slate-900">{t.students}</p>
                  <p className="text-[10px] text-slate-500">Santri</p>
                </div>
                <div className="rounded-lg bg-slate-50 py-1.5">
                  <p className="text-sm font-bold text-slate-900">{t.submissions}</p>
                  <p className="text-[10px] text-slate-500">Setoran</p>
                </div>
                <div className="rounded-lg bg-slate-50 py-1.5">
                  <p className="text-sm font-bold text-slate-900">{t.murajaahs}</p>
                  <p className="text-[10px] text-slate-500">Muraja'ah</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

const INSIGHT_META: Record<string, { icon: typeof Lightbulb; cls: string; iconCls: string }> = {
  success: { icon: CheckCircle2, cls: 'bg-emerald-50', iconCls: 'text-emerald-600' },
  warning: { icon: AlertTriangle, cls: 'bg-amber-50', iconCls: 'text-amber-600' },
  info: { icon: Lightbulb, cls: 'bg-sky-50', iconCls: 'text-sky-600' },
};

function Insights({ items, loading }: { items: DashboardOverview['insights']; loading?: boolean }) {
  return (
    <Card>
      <SectionTitle title="Insight Hari Ini" subtitle="Ringkasan otomatis dari data aktual" />
      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="Belum ada insight" description="Insight akan muncul saat terdapat cukup data." />
      ) : (
        <div className="space-y-2.5">
          {items.map((insight, i) => {
            const meta = INSIGHT_META[insight.type] ?? INSIGHT_META.info;
            const Icon = meta.icon;
            return (
              <div key={i} className={`flex items-start gap-3 rounded-xl ${meta.cls} p-3`}>
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.iconCls}`} />
                <p className="text-sm text-slate-700">{insight.text}</p>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ================================================================
 * Student view
 * ================================================================ */

function StudentView({ data, loading }: { data?: DashboardOverview; loading?: boolean }) {
  const stats = data?.statistics;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Target Tercapai"
          value={loading ? '—' : `${stats?.target_percentage ?? 0}%`}
          icon={Target}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          secondary={loading ? undefined : `dari target hafalan Anda`}
          loading={loading}
        />
        <KpiCard
          label="Juz Selesai"
          value={loading ? '—' : (stats?.target_reached ?? 0)}
          icon={BookOpen}
          iconBg="bg-sky-50"
          iconColor="text-sky-600"
          secondary={loading ? undefined : 'juz yang sudah tuntas'}
          loading={loading}
        />
        <KpiCard
          label="Setoran Saya"
          value={loading ? '—' : (stats?.submissions_today ?? 0)}
          icon={ClipboardList}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          secondary={loading ? undefined : 'hari ini'}
          loading={loading}
        />
        <KpiCard
          label="Muraja'ah Saya"
          value={loading ? '—' : (stats?.murajaahs_today ?? 0)}
          icon={RefreshCw}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          secondary={loading ? undefined : 'hari ini'}
          loading={loading}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <RecentActivities items={data?.recent_activities ?? []} loading={loading} />
        <Insights items={data?.insights ?? []} loading={loading} />
      </div>
    </div>
  );
}

/* ================================================================
 * Main page
 * ================================================================ */

export default function Dashboard() {
  const { user } = useAuth();
  const [range, setRange] = useState<DashboardRange>('30d');

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-overview', range],
    queryFn: () => dashboardService.overview(range),
  });

  const isStudent = user?.role === 'student';
  const isAdmin = user?.role === 'super_admin';
  const todayLabel = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const quickActions = [
    { label: 'Tambah Setoran', href: '/submissions', icon: Plus, color: 'bg-gradient-to-br from-[#075B30] to-[#0D753F] text-white hover:from-[#064A27] hover:to-[#075B30]' },
    { label: 'Tambah Muraja\'ah', href: '/murajaah', icon: BookMarked, color: 'bg-gradient-to-br from-[#075B30] to-[#0D753F] text-white hover:from-[#064A27] hover:to-[#075B30]' },
    // Hanya super admin yang boleh menambah santri.
    ...(isAdmin
      ? [{ label: 'Tambah Santri', href: '/students', icon: GraduationCap, color: 'bg-gradient-to-br from-[#075B30] to-[#0D753F] text-white hover:from-[#064A27] hover:to-[#075B30]' }]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Selamat Datang, {user?.name?.split(' ')[0] ?? 'Admin'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isStudent
              ? 'Pantau progres hafalan dan aktivitasmu hari ini.'
              : 'Pantau perkembangan hafalan dan aktivitas Tahfidz Qur\'an hari ini.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm">
            <CalendarDays className="h-4 w-4 text-emerald-600" />
            {todayLabel}
          </span>
        </div>
      </div>

      {/* Error state (seluruh dashboard) */}
      {isError && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white">
                <AlertTriangle className="h-5 w-5 text-rose-500" />
              </span>
              <div>
                <p className="text-sm font-bold text-rose-700">Dashboard gagal dimuat</p>
                <p className="text-xs text-rose-500">Terjadi masalah saat mengambil data.</p>
              </div>
            </div>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
            >
              <RefreshCw className="h-4 w-4" /> Coba Lagi
            </button>
          </div>
        </div>
      )}

      {/* Student view */}
      {isStudent ? (
        <StudentView data={data} loading={isLoading} />
      ) : (
        <>
          {/* KPI */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <KpiCard
              label="Total Santri"
              value={data?.statistics.total_students ?? '—'}
              icon={Users}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              secondary={isLoading ? undefined : `${data?.statistics.active_students ?? 0} santri aktif`}
              loading={isLoading}
            />
            <KpiCard
              label="Setoran Hari Ini"
              value={data?.statistics.submissions_today ?? '—'}
              icon={BookOpen}
              iconBg="bg-sky-50"
              iconColor="text-sky-600"
              trend={<Trend value={data?.statistics.submissions_trend ?? null} suffix="dari kemarin" />}
              loading={isLoading}
            />
            <KpiCard
              label="Muraja'ah Hari Ini"
              value={data?.statistics.murajaahs_today ?? '—'}
              icon={RefreshCw}
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
              trend={<Trend value={data?.statistics.murajaahs_trend ?? null} suffix="dari kemarin" />}
              loading={isLoading}
            />
            <KpiCard
              label="Rata-rata Hafalan"
              value={data?.statistics.avg_pages_per_student ?? '—'}
              icon={TrendingUp}
              iconBg="bg-cyan-50"
              iconColor="text-cyan-600"
              secondary={isLoading ? undefined : 'halaman/santri hari ini'}
              loading={isLoading}
            />
          </div>

          {/* Quick action */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <Zap className="h-4 w-4 text-emerald-600" /> Aksi Cepat
            </span>
            {quickActions.map((a) => (
              <Link
                key={a.label}
                to={a.href}
                className={`inline-flex items-center gap-1.5 rounded-xl ${a.color} px-3.5 py-2 text-sm font-semibold transition-transform hover:-translate-y-0.5`}
              >
                <a.icon className="h-4 w-4" /> {a.label}
              </Link>
            ))}
          </div>

          {/* Charts */}
          <div className="grid gap-5 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <SectionTitle
                title="Perkembangan Hafalan"
                subtitle="Aktivitas hafalan dalam periode terpilih"
                right={
                  <div className="flex flex-wrap gap-1 rounded-xl border border-slate-100 bg-slate-50 p-1">
                    {RANGES.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setRange(r.id)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                          range === r.id ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                }
              />
              {isLoading || isFetching ? (
                <GrowthChart data={data?.chart ?? []} loading />
              ) : (
                <GrowthChart data={data?.chart ?? []} />
              )}
            </Card>

            <Card className="lg:col-span-2">
              <SectionTitle title="Setoran vs Muraja'ah" subtitle="Jumlah halaman per hari" />
              {isLoading || isFetching ? <CompareChart data={data?.chart ?? []} loading /> : <CompareChart data={data?.chart ?? []} />}
            </Card>
          </div>

          {/* Setoran terbaru */}
          <RecentSubmissions items={data?.recent_submissions ?? []} loading={isLoading} />

          {/* Perhatian + performa kelas */}
          <div className="grid gap-5 lg:grid-cols-2">
            <AttentionStudents items={data?.attention ?? []} loading={isLoading} />
            <ClassPerformance items={data?.class_performance ?? []} loading={isLoading} />
          </div>

          {/* Top santri + pembimbing */}
          <div className="grid gap-5 lg:grid-cols-2">
            <TopStudents items={data?.top_students ?? []} loading={isLoading} />
            <TeacherActivity data={data?.teacher_activity} loading={isLoading} />
          </div>

          {/* Insight */}
          <Insights items={data?.insights ?? []} loading={isLoading} />

          {/* Aktivitas terbaru */}
          <RecentActivities items={data?.recent_activities ?? []} loading={isLoading} />

          {/* Loading footer indicator */}
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat dashboard...
            </div>
          )}
        </>
      )}
    </div>
  );
}
