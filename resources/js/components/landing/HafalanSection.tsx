import { useState, type FormEvent, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BookOpen,
  Hash,
  Layers,
  Loader2,
  Search,
  SearchX,
  Target,
} from "lucide-react";
import { hafalanService } from "@/services/api";
import type { PublicHafalanDetail, PublicHafalanResult } from "@/types";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const fmtDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "-";

const fmtDayMonth = (value: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" }).format(
    new Date(value)
  );

const typeLabel = (type: string) =>
  type === "repetition" ? "Murojaah" : "Setoran";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  approved: {
    label: "Disetujui",
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  },
  pending: {
    label: "Menunggu",
    cls: "bg-amber-50 text-amber-700 ring-amber-600/20",
  },
  revision: {
    label: "Revisi",
    cls: "bg-sky-50 text-sky-700 ring-sky-600/20",
  },
  rejected: {
    label: "Ditolak",
    cls: "bg-rose-50 text-rose-700 ring-rose-600/20",
  },
};

const statusMeta = (status: string) =>
  STATUS_META[status] ?? {
    label: status,
    cls: "bg-slate-100 text-slate-600 ring-slate-500/20",
  };

/* -------------------------------------------------------------------------- */
/*  Pieces                                                                     */
/* -------------------------------------------------------------------------- */

function ProgressRing({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative h-36 w-36 shrink-0 self-center sm:self-auto">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={radius} fill="none" stroke="#ECFDF5" strokeWidth="13" />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="url(#hafalanRing)"
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
        <defs>
          <linearGradient id="hafalanRing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold leading-none text-slate-900">
          {Math.round(pct)}%
        </span>
        <span className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Hafalan
        </span>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-emerald-600">
        <Icon className="h-4 w-4" />
        <span className="text-[11px] font-bold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="mt-2 text-2xl font-extrabold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function ActivityTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; name?: string; value?: number; color?: string; fill?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-bold text-slate-700">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="flex items-center gap-1.5 text-slate-500">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: item.color ?? item.fill }}
          />
          {item.name}: <span className="font-bold text-slate-800">{item.value}</span>
        </p>
      ))}
    </div>
  );
}

function ActivityChart({ data }: { data: PublicHafalanDetail["chart"] }) {
  const rows = data.map((point) => ({ ...point, label: fmtDayMonth(point.date) }));
  const total = rows.reduce((sum, row) => sum + row.setoran + row.murajaah, 0);

  if (total === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-center">
        <BookOpen className="h-7 w-7 text-slate-300" />
        <p className="mt-3 text-sm font-semibold text-slate-500">
          Belum ada aktivitas dalam 30 hari terakhir
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Grafik akan terisi saat santri mulai menyetorkan hafalan.
        </p>
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            minTickGap={26}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<ActivityTooltip />} cursor={{ fill: "#f8fafc" }} />
          <Bar
            dataKey="setoran"
            name="Setoran"
            stackId="aktivitas"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            maxBarSize={20}
          />
          <Bar
            dataKey="murajaah"
            name="Murojaah"
            stackId="aktivitas"
            fill="#38bdf8"
            radius={[4, 4, 0, 0]}
            maxBarSize={20}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Panel({
  icon,
  title,
  description,
  iconClassName,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  iconClassName?: string;
}) {
  return (
    <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm animate-fade-up">
      <div
        className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
          iconClassName ?? "bg-slate-50 text-slate-400"
        }`}
      >
        {icon}
      </div>
      <p className="mt-4 font-bold text-slate-800">{title}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{description}</p>
    </div>
  );
}

function ResultSkeleton() {
  return (
    <div className="mx-auto mt-8 max-w-5xl space-y-5 animate-fade-up" aria-hidden="true">
      <div className="h-36 w-full animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Result                                                                     */
/* -------------------------------------------------------------------------- */

function HafalanResult({ data }: { data: PublicHafalanDetail }) {
  const { student, summary, stats, chart, surah_progress, recent } = data;
  const initial = student.name.trim().charAt(0).toUpperCase() || "?";
  const status = statusMeta(student.status);

  return (
    <div className="mx-auto mt-8 max-w-5xl space-y-5 animate-fade-up">
      {/* Identitas + ring progres */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xl font-extrabold text-emerald-700">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                  Santri
                </p>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${status.cls}`}
                >
                  {status.label}
                </span>
              </div>
              <h3 className="mt-1 text-2xl font-extrabold leading-tight text-slate-900">
                {student.name}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {[student.class_name, student.academic_year, student.entry_year && `Angkatan ${student.entry_year}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>

          <ProgressRing value={summary.progress_percentage} />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <Target className="h-4 w-4 shrink-0" />
          <span className="font-semibold">
            {summary.memorization_target
              ? `Target ${summary.memorization_target} juz${
                  summary.starting_juz ? ` (mulai Juz ${summary.starting_juz})` : ""
                }`
              : "Target hafalan belum ditentukan"}
          </span>
          <span className="text-emerald-700/60">|</span>
          <span className="text-emerald-700">
            Terakhir menyetor {fmtDate(summary.last_submission_at)}
          </span>
        </div>
      </div>

      {/* Statistik ringkas */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Layers}
          label="Juz selesai"
          value={String(summary.total_juz_completed)}
          hint={summary.memorization_target ? `dari target ${summary.memorization_target} juz` : undefined}
        />
        <StatCard icon={BookOpen} label="Surah selesai" value={String(summary.total_surah_completed)} />
        <StatCard icon={Hash} label="Ayat terhafal" value={String(summary.total_ayah_covered)} />
        <StatCard
          icon={Target}
          label="Rata-rata nilai"
          value={summary.average_score === null ? "-" : String(summary.average_score)}
          hint={summary.average_score === null ? "belum ada penilaian" : "dari setoran terakhir"}
        />
      </div>

      {/* Grafik aktivitas */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="font-bold text-slate-900">Aktivitas 30 hari terakhir</h4>
            <p className="mt-0.5 text-sm text-slate-500">
              Jumlah setoran dan muroja'ah harian santri
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              {stats.setoran_this_month} setoran bulan ini
            </span>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
              {stats.murajaah_this_month} muroja'ah bulan ini
            </span>
          </div>
        </div>
        <div className="mt-4">
          <ActivityChart data={chart} />
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Setoran ({stats.total_setoran} total)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> Murojaah ({stats.total_murajaah} total)
          </span>
        </div>
      </div>

      {/* Surah + setoran terakhir */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h4 className="font-bold text-slate-900">Progres surah</h4>
          <p className="mt-0.5 text-sm text-slate-500">
            Surah yang telah disentuh santri beserta cakupan ayatnya
          </p>

          {surah_progress.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
              Belum ada progres surah yang tercatat.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {surah_progress.map((surah) => (
                <li key={surah.surah_id} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-xs font-extrabold text-emerald-700">
                      {surah.surah_number}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="min-w-0 truncate font-bold text-slate-800">
                          {surah.name_latin}
                          <span className="ml-2 font-serif text-sm text-slate-400" dir="rtl">
                            {surah.name_arabic}
                          </span>
                        </p>
                        <span className="shrink-0 text-xs font-semibold text-slate-400">
                          {surah.covered_ayahs}/{surah.total_ayahs} ayat
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700"
                            style={{ width: `${Math.min(100, surah.progress_percentage)}%` }}
                          />
                        </div>
                        <span className="w-11 shrink-0 text-right text-xs font-extrabold text-emerald-600">
                          {Math.round(surah.progress_percentage)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h4 className="font-bold text-slate-900">Setoran terakhir</h4>
          <p className="mt-0.5 text-sm text-slate-500">
            Lima setoran hafalan terbaru yang tercatat
          </p>

          {recent.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
              Belum ada setoran yang tercatat.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {recent.map((item, index) => {
                const meta = statusMeta(item.status);
                return (
                  <li key={`${item.submission_date}-${index}`} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50">
                      <BookOpen className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">
                        {item.surah_name ?? "-"}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {fmtDate(item.submission_date)} · Ayat {item.start_ayah}–{item.end_ayah} ·{" "}
                        {typeLabel(item.type)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-extrabold text-emerald-600">
                        {item.final_score === null ? "-" : item.final_score}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${meta.cls}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section                                                                    */
/* -------------------------------------------------------------------------- */

export default function HafalanSection() {
  const [nisn, setNisn] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublicHafalanResult | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = nisn.trim();

    if (!value) {
      setError("Silakan masukkan NISN terlebih dahulu.");
      setResult(null);
      return;
    }
    if (value.length > 30) {
      setError("NISN maksimal 30 karakter.");
      setResult(null);
      return;
    }

    setError(null);
    setResult(null);
    setLoading(true);

    try {
      setResult(await hafalanService.check(value));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="hafalan"
      className="relative scroll-mt-24 overflow-hidden bg-gradient-to-b from-white via-emerald-50/50 to-white py-20"
    >
      <div className="pointer-events-none absolute -left-24 top-8 h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-8 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl" />

      <div className="relative mx-auto max-w-5xl px-6">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Lihat Hafalan
          </p>
          <h2 className="mt-2 text-3xl font-extrabold text-slate-900">
            Pantau progres hafalan santri kapan saja
          </h2>
          <p className="mt-3 leading-relaxed text-slate-500">
            Masukkan NISN santri untuk melihat ringkasan hafalan, grafik aktivitas
            30 hari, dan daftar surah yang telah dihafal.
          </p>
        </div>

        <form onSubmit={submit} className="mx-auto mt-8 max-w-xl" noValidate>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Hash className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="hafalan-nisn"
                name="nisn"
                value={nisn}
                onChange={(e) => setNisn(e.target.value)}
                inputMode="numeric"
                autoComplete="off"
                maxLength={30}
                aria-label="NISN santri"
                aria-invalid={Boolean(error)}
                placeholder="Masukkan NISN santri"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-semibold text-slate-800 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 placeholder:font-normal placeholder:text-slate-400"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#075B30] px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#0D753F] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {loading ? "Memeriksa..." : "Cek Hafalan"}
            </button>
          </div>

          {error && (
            <p className="mt-2 text-sm font-semibold text-rose-600" role="alert">
              {error}
            </p>
          )}
          <p className="mt-2 text-xs text-slate-400">
            NISN terdiri dari 10 digit angka dan dapat dilihat pada kartu pelajar santri.
          </p>
        </form>

        <div aria-live="polite" aria-busy={loading}>
          {loading && <ResultSkeleton />}

          {!loading && result?.status === "error" && (
            <Panel
              icon={<AlertTriangle className="h-6 w-6" />}
              iconClassName="bg-rose-50 text-rose-500"
              title="Gagal memeriksa data"
              description={result.message}
            />
          )}

          {!loading && result?.status === "not_found" && (
            <Panel
              icon={<SearchX className="h-6 w-6" />}
              iconClassName="bg-amber-50 text-amber-500"
              title="NISN tidak ditemukan"
              description={result.message}
            />
          )}

          {!loading && result?.status === "found" && <HafalanResult data={result.data} />}
        </div>
      </div>
    </section>
  );
}
