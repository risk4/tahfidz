import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { quranService } from '@/services/api';
import type { PaginatedResponse, QuranAyah, QuranStatistics, QuranSurah } from '@/types';
import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  Eye,
  EyeOff,
  Layers,
  Loader2,
  MapPin,
  Moon,
  Pause,
  Play,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

const PER_PAGE = 12;

function useDebounce<T>(value: T, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
function toArabicNumeral(n: number): string {
  return String(n)
    .split('')
    .map((d) => ARABIC_DIGITS[Number(d)] ?? d)
    .join('');
}

function placeLabel(place?: string | null): string {
  return place === 'makkiyah' ? 'Makkiyah' : 'Madaniyah';
}

/* ===================== Skeleton ===================== */

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="h-12 w-12 animate-pulse rounded-xl bg-slate-100" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
              <div className="h-6 w-1/2 animate-pulse rounded bg-slate-100" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SurahCardSkeleton() {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100" />
            <div className="space-y-2">
              <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
          <div className="h-6 w-16 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="flex gap-2">
          <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-slate-100" />
        </div>
      </CardContent>
    </Card>
  );
}

function AyahSkeleton() {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
        </div>
        <div className="space-y-2">
          <div className="h-5 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-5 w-3/4 animate-pulse rounded bg-slate-100" />
          <div className="h-5 w-1/2 animate-pulse rounded bg-slate-100" />
        </div>
      </CardContent>
    </Card>
  );
}

/* ===================== Stat card ===================== */

function StatCard({ icon: Icon, title, value, tone }: { icon: typeof BookOpen; title: string; value: string; tone: string }) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${tone}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#64748B]">{title}</p>
          <p className="truncate text-2xl font-bold text-[#172033]">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function QuranStats({ stats }: { stats?: QuranStatistics }) {
  if (!stats) return <StatsSkeleton />;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard icon={BookOpen} title="Total Surah" value={stats.total_surahs.toLocaleString('id-ID')} tone="bg-[#E8F5EE] text-[#0D753F]" />
      <StatCard icon={FileText} title="Total Ayat" value={stats.total_ayahs.toLocaleString('id-ID')} tone="bg-sky-50 text-sky-600" />
      <StatCard icon={Layers} title="Total Juz" value={stats.total_juz.toLocaleString('id-ID')} tone="bg-violet-50 text-violet-600" />
      <StatCard icon={Moon} title="Surah Makkiyah" value={stats.makkiyah.toLocaleString('id-ID')} tone="bg-amber-50 text-amber-600" />
      <StatCard icon={MapPin} title="Surah Madaniyah" value={stats.madaniyah.toLocaleString('id-ID')} tone="bg-orange-50 text-orange-600" />
    </div>
  );
}

/* ===================== Surah card ===================== */

function PlaceBadge({ place }: { place?: string | null }) {
  const isMakki = place === 'makkiyah';
  return (
    <span className={`rounded-full px-2.5 py-1 font-medium ${isMakki ? 'bg-violet-50 text-violet-700' : 'bg-amber-50 text-amber-700'}`}>
      {placeLabel(place)}
    </span>
  );
}

function SurahCard({ s }: { s: QuranSurah }) {
  return (
    <Card className="group rounded-2xl border-slate-200 shadow-sm transition-all duration-200 hover:border-[#0D753F] hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E8F5EE] text-sm font-bold text-[#0D753F]">
              {String(s.surah_number).padStart(2, '0')}
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-[#172033]">{s.name_latin}</p>
              <p className="truncate text-xs text-[#64748B]">{s.translation}</p>
            </div>
          </div>
          <p dir="rtl" lang="ar" className="font-arabic shrink-0 text-xl text-[#0D753F]">
            {s.name_arabic}
          </p>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <PlaceBadge place={s.revelation_place} />
          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-[#64748B]">{s.total_ayahs} Ayat</span>
          {s.juz_range && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-[#64748B]">
              {s.juz_range.min === s.juz_range.max ? `Juz ${s.juz_range.min}` : `Juz ${s.juz_range.min}-${s.juz_range.max}`}
            </span>
          )}
        </div>
        <Link
          to={`/surah/${s.id}`}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0D753F] transition-colors hover:text-[#075B30]"
          aria-label={`Lihat ayat ${s.name_latin}`}
        >
          <BookMarked className="h-4 w-4" aria-hidden="true" /> Lihat Ayat
        </Link>
      </CardContent>
    </Card>
  );
}

/* ===================== Halaman daftar surah ===================== */

export default function Quran() {
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const [draft, setDraft] = useState({ juz: '', place: '', count: '' });
  const [filters, setFilters] = useState({ juz: '', place: '', count: '' });
  const [page, setPage] = useState(1);

  const params = useMemo(
    () => ({
      search: debounced || undefined,
      juz_number: filters.juz ? Number(filters.juz) : undefined,
      revelation_place: filters.place || undefined,
      ayah_count: filters.count || undefined,
      page,
      per_page: PER_PAGE,
    }),
    [debounced, filters, page]
  );

  const { data, isLoading, isError, refetch } = useQuery<PaginatedResponse<QuranSurah>>({
    queryKey: ['quran-surahs', params],
    queryFn: () => quranService.surahs(params),
  });
  const { data: stats } = useQuery<QuranStatistics>({
    queryKey: ['quran-statistics'],
    queryFn: () => quranService.statistics(),
  });

  const rows = data?.data ?? [];
  const hasActiveFilters = !!debounced || !!filters.juz || !!filters.place || !!filters.count;

  const resetAll = () => {
    setSearch('');
    setDraft({ juz: '', place: '', count: '' });
    setFilters({ juz: '', place: '', count: '' });
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <p className="text-sm font-semibold text-emerald-600">Al-Qur'an</p>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Surah & Ayat</h1>
        <p className="mt-1 text-slate-500">Kelola dan jelajahi referensi Al-Qur'an untuk program Tahfidz</p>
      </div>

      {/* Statistics */}
      <QuranStats stats={stats} />

      {/* Search & filter */}
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" aria-hidden="true" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari surah, nomor surah, atau ayat..."
              aria-label="Cari surah"
              className="h-12 rounded-xl pl-10 text-[15px]"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#64748B]">Juz</span>
              <select
                value={draft.juz}
                onChange={(e) => setDraft({ ...draft, juz: e.target.value })}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm text-[#172033] outline-none transition-colors focus:border-[#0D753F]"
              >
                <option value="">Semua Juz</option>
                {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
                  <option key={j} value={j}>
                    Juz {j}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#64748B]">Tempat Turun</span>
              <select
                value={draft.place}
                onChange={(e) => setDraft({ ...draft, place: e.target.value })}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm text-[#172033] outline-none transition-colors focus:border-[#0D753F]"
              >
                <option value="">Semua</option>
                <option value="makkiyah">Makkiyah</option>
                <option value="madaniyah">Madaniyah</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#64748B]">Jumlah Ayat</span>
              <select
                value={draft.count}
                onChange={(e) => setDraft({ ...draft, count: e.target.value })}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm text-[#172033] outline-none transition-colors focus:border-[#0D753F]"
              >
                <option value="">Semua</option>
                <option value="lt50">&lt; 50</option>
                <option value="50-100">50 - 100</option>
                <option value="gt100">&gt; 100</option>
              </select>
            </label>
            <div className="flex items-end gap-2 md:col-span-3 xl:col-span-2">
              <Button
                onClick={() => {
                  setFilters(draft);
                  setPage(1);
                }}
                className="h-11 flex-1 bg-gradient-to-br from-[#075B30] to-[#0D753F] text-white hover:from-[#064A27] hover:to-[#075B30]"
              >
                <Filter className="h-4 w-4" aria-hidden="true" /> Filter
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setDraft({ juz: '', place: '', count: '' });
                  setFilters({ juz: '', place: '', count: '' });
                  setPage(1);
                }}
                className="h-11"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" /> Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <div>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#64748B]">Daftar Surah</h2>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: PER_PAGE }).map((_, i) => (
              <SurahCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <Card className="rounded-2xl border-slate-200">
            <CardContent className="grid place-items-center p-12 text-center">
              <BookOpen className="mb-3 h-10 w-10 text-rose-400" aria-hidden="true" />
              <h3 className="font-bold text-slate-900">Data Al-Qur'an gagal dimuat.</h3>
              <Button variant="outline" onClick={() => refetch()} className="mt-4">
                Coba Lagi
              </Button>
            </CardContent>
          </Card>
        ) : rows.length === 0 ? (
          <Card className="rounded-2xl border-slate-200">
            <CardContent className="grid place-items-center p-12 text-center">
              <Search className="mb-3 h-10 w-10 text-slate-300" aria-hidden="true" />
              <h3 className="font-bold text-slate-900">Surah tidak ditemukan</h3>
              <p className="mt-1 text-sm text-[#64748B]">Coba gunakan kata kunci atau filter yang berbeda.</p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={resetAll} className="mt-4">
                  <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> Reset Filter
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((s) => (
                <SurahCard key={s.id} s={s} />
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#64748B]">
                Menampilkan {(data!.current_page - 1) * data!.per_page + 1}–
                {Math.min(data!.current_page * data!.per_page, data!.total)} dari {data!.total} surah
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  aria-label="Halaman sebelumnya"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Prev
                </Button>
                <span className="rounded-xl bg-[#E8F5EE] px-3 py-1.5 text-sm font-bold text-[#0D753F]">
                  {data!.current_page} / {data!.last_page}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data!.last_page}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Halaman berikutnya"
                >
                  Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ===================== Halaman detail surah ===================== */

type SurahDetailData = QuranSurah & { ayahs: QuranAyah[] };

function AyahCard({ ayah, playing, loading, onToggle, showTranslation }: { ayah: QuranAyah; playing: boolean; loading: boolean; onToggle: () => void; showTranslation: boolean }) {
  const isPlaceholder = ayah.text_arabic.trim().startsWith('{');
  return (
    <Card className={`rounded-2xl border-slate-200 shadow-sm transition-colors ${
      playing ? 'border-[#0D753F] bg-[#F4FAF7] ring-1 ring-[#0D753F]/30' : ''
    }`}>
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#E8F5EE] text-sm font-bold text-[#0D753F]" aria-label={`Ayat ${ayah.ayah_number}`}>
            {toArabicNumeral(ayah.ayah_number)}
          </span>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {ayah.juz && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-[#64748B]">Juz {ayah.juz.juz_number}</span>
            )}
            <button
              type="button"
              onClick={onToggle}
              aria-label={playing ? `Jeda bacaan ayat ${ayah.ayah_number}` : `Putar bacaan ayat ${ayah.ayah_number}`}
              title={playing ? 'Jeda' : 'Putar'}
              className={`grid h-8 w-8 place-items-center rounded-lg transition-colors ${
                playing ? 'bg-[#0D753F] text-white' : 'bg-[#E8F5EE] text-[#0D753F] hover:bg-[#0D753F] hover:text-white'
              }`}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : playing ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </div>
        <p
          dir="rtl"
          lang="ar"
          className={`font-arabic mt-4 leading-[2.6] text-[#172033] ${
            isPlaceholder ? 'text-lg text-slate-400' : 'text-2xl sm:text-[1.75rem]'
          }`}
        >
          {ayah.text_arabic}
        </p>
        {showTranslation && ayah.text_translation && (
          <p className="mt-4 border-t border-slate-100 pt-4 text-[15px] leading-relaxed text-[#64748B]">{ayah.text_translation}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function SurahDetail() {
  const { id } = useParams();
  const surahId = Number(id);
  const [search, setSearch] = useState('');
  const [readingMode, setReadingMode] = useState(false);

  // ===== Tampilkan/sembunyikan terjemahan (semua ayat dalam surah) =====
  const [showTranslations, setShowTranslations] = useState(true);
  const toggleAllTranslations = () => setShowTranslations((v) => !v);

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
    const surahNumber = surah?.surah_number;
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

  const { data: surah, isLoading, isError, refetch } = useQuery<SurahDetailData>({
    queryKey: ['quran-surah', surahId],
    queryFn: () => quranService.surah(surahId),
    enabled: Number.isFinite(surahId) && surahId > 0,
  });
  const { data: allSurahs } = useQuery<QuranSurah[] | { data: QuranSurah[] }>({
    queryKey: ['quran-surahs-all'],
    queryFn: () => quranService.surahs(),
  });

  useEffect(() => {
    window.scrollTo({ top: 0 });
    stopAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surahId]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const ayahs = useMemo(() => surah?.ayahs ?? [], [surah]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ayahs;
    return ayahs.filter(
      (a) =>
        String(a.ayah_number) === q ||
        a.text_arabic.toLowerCase().includes(q) ||
        (a.text_translation ?? '').toLowerCase().includes(q)
    );
  }, [ayahs, search]);

  const allList = useMemo(() => (Array.isArray(allSurahs) ? allSurahs : (allSurahs?.data ?? [])), [allSurahs]);
  const idx = useMemo(() => allList.findIndex((s) => s.id === surahId), [allList, surahId]);
  const prev = idx > 0 ? allList[idx - 1] : null;
  const next = idx >= 0 && idx < allList.length - 1 ? allList[idx + 1] : null;

  if (!Number.isFinite(surahId) || surahId <= 0) {
    return (
      <Card className="rounded-2xl border-slate-200">
        <CardContent className="grid place-items-center p-12 text-center">
          <p className="font-bold text-slate-900">Surah tidak ditemukan.</p>
          <Link to="/surah-ayat" className="mt-4 text-sm font-semibold text-[#0D753F] hover:text-[#075B30]">
            Kembali ke daftar surah
          </Link>
        </CardContent>
      </Card>
    );
  }

  const header = surah && (
    <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
      <div className="bg-gradient-to-br from-[#075B30] to-[#0D753F] p-6 text-white sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/60">Surah ke-{surah.surah_number}</p>
            <h1 className="mt-1 text-3xl font-bold">{surah.name_latin}</h1>
            <p className="mt-1 text-sm text-white/70">{surah.translation}</p>
          </div>
          <p dir="rtl" lang="ar" className="font-arabic shrink-0 text-3xl text-[#B8F3D8]">
            {surah.name_arabic}
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white/10 px-3 py-1 font-medium text-white/90 ring-1 ring-white/10">
            {placeLabel(surah.revelation_place)}
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 font-medium text-white/90 ring-1 ring-white/10">
            {surah.total_ayahs} Ayat
          </span>
          {surah.juz_range && (
            <span className="rounded-full bg-white/10 px-3 py-1 font-medium text-white/90 ring-1 ring-white/10">
              {surah.juz_range.min === surah.juz_range.max ? `Juz ${surah.juz_range.min}` : `Juz ${surah.juz_range.min}-${surah.juz_range.max}`}
            </span>
          )}
        </div>
      </div>
    </Card>
  );

  const ayahSection = (
    <>
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <AyahSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <Card className="rounded-2xl border-slate-200">
          <CardContent className="grid place-items-center p-12 text-center">
            <BookOpen className="mb-3 h-10 w-10 text-rose-400" aria-hidden="true" />
            <h3 className="font-bold text-slate-900">Data Al-Qur'an gagal dimuat.</h3>
            <Button variant="outline" onClick={() => refetch()} className="mt-4">
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl border-slate-200">
          <CardContent className="grid place-items-center p-12 text-center">
            <Search className="mb-3 h-10 w-10 text-slate-300" aria-hidden="true" />
            <h3 className="font-bold text-slate-900">Ayat tidak ditemukan</h3>
            <p className="mt-1 text-sm text-[#64748B]">Coba gunakan kata kunci atau nomor ayat yang berbeda.</p>
            <Button variant="outline" onClick={() => setSearch('')} className="mt-4">
              Reset Pencarian
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((a) => (
            <AyahCard
              key={a.id}
              ayah={a}
              playing={playingAyah === a.ayah_number && !audioLoading}
              loading={playingAyah === a.ayah_number && audioLoading}
              onToggle={() => togglePlay(a.ayah_number)}
              showTranslation={showTranslations}
            />
          ))}
        </div>
      )}
    </>
  );

  const navigation = (
    <div className="grid gap-3 sm:grid-cols-2">
      {prev ? (
        <Link
          to={`/surah/${prev.id}`}
          className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-[#0D753F]"
        >
          <ArrowLeft className="h-5 w-5 shrink-0 text-[#64748B] transition-colors group-hover:text-[#0D753F]" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block text-xs font-medium text-[#64748B]">Surah Sebelumnya</span>
            <span className="block truncate text-sm font-bold text-[#172033]">{prev.name_latin}</span>
          </span>
        </Link>
      ) : (
        <div aria-hidden="true" />
      )}
      {next ? (
        <Link
          to={`/surah/${next.id}`}
          className="group flex items-center justify-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm transition-all hover:border-[#0D753F]"
        >
          <span className="min-w-0">
            <span className="block text-xs font-medium text-[#64748B]">Surah Berikutnya</span>
            <span className="block truncate text-sm font-bold text-[#172033]">{next.name_latin}</span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 text-[#64748B] transition-colors group-hover:text-[#0D753F]" aria-hidden="true" />
        </Link>
      ) : (
        <div aria-hidden="true" />
      )}
    </div>
  );

  const readingContent = (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6">
      {header}
      {ayahSection}
      {navigation}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/surah-ayat"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#64748B] shadow-sm transition-colors hover:text-[#172033]"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Kembali
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" aria-hidden="true" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari ayat..."
              aria-label="Cari ayat"
              className="h-11 w-56 rounded-xl pl-10 sm:w-72"
            />
          </div>
          <select
            value={reciter}
            onChange={(e) => {
              setReciter(e.target.value);
              stopAudio();
            }}
            aria-label="Pilih qari"
            className="h-11 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm text-[#172033] outline-none transition-colors focus:border-[#0D753F]"
          >
            <option value="Alafasy_128kbps">Qari: Alafasy</option>
            <option value="Husary_128kbps">Qari: Husary</option>
            <option value="Minshawy_Murattal_128kbps">Qari: Minshawy</option>
            <option value="Muhammad_Ayyoub_128kbps">Qari: Muhammad Ayyoub</option>
            <option value="Hudhaify_128kbps">Qari: Hudhaify</option>
          </select>
          <Button
            variant="outline"
            onClick={toggleAllTranslations}
            className="h-11"
            aria-pressed={showTranslations}
            aria-label={showTranslations ? 'Sembunyikan semua terjemahan' : 'Tampilkan semua terjemahan'}
          >
            {showTranslations ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            {showTranslations ? 'Sembunyikan Terjemahan' : 'Tampilkan Terjemahan'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setReadingMode(true)}
            className="h-11"
            aria-label="Aktifkan mode baca"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" /> Mode Baca
          </Button>
        </div>
      </div>

      {audioError && (
        <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          Audio gagal dimuat. Periksa koneksi internet Anda.
        </p>
      )}

      {header}
      {ayahSection}
      {navigation}

      {/* Mode baca — overlay layar penuh, sidebar & topbar tersembunyi */}
      {readingMode && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#F8FAFC]">
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
              <p className="text-sm font-bold text-[#172033]">
                {surah ? `${surah.name_latin} — Mode Baca` : 'Mode Baca'}
              </p>
              <button
                onClick={() => setReadingMode(false)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#075B30] to-[#0D753F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:from-[#064A27] hover:to-[#075B30]"
              >
                <X className="h-4 w-4" aria-hidden="true" /> Keluar Mode Baca
              </button>
            </div>
          </div>
          {readingContent}
        </div>
      )}
    </div>
  );
}
