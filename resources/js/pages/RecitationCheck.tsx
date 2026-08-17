import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { quranService, recitationService } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { QuranSurah, RecitationCheckPayload } from '@/types';
import { alignWords, summarize, tokenize, tokenizeDisplay, type AlignResult, type RecitationSummary, type WordResult } from '@/lib/recitation';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Languages,
  Loader2,
  Mic,
  Pause,
  Play,
  Square,
  XCircle,
} from 'lucide-react';

interface ExternalAyah {
  ayah_number: number;
  text_arabic: string;
  text_translation: string | null;
}

const RECITERS = [
  { value: 'Alafasy_128kbps', label: 'Qari: Alafasy' },
  { value: 'Husary_128kbps', label: 'Qari: Husary' },
  { value: 'Minshawy_Murattal_128kbps', label: 'Qari: Minshawy' },
  { value: 'Muhammad_Ayyoub_128kbps', label: 'Qari: Muhammad Ayyoub' },
  { value: 'Hudhaify_128kbps', label: 'Qari: Hudhaify' },
];

/** Batas jumlah kata agar pencocokan tetap cepat di perangkat HP. */
const MAX_WORDS = 600;

function SkeletonBlock() {
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </CardContent>
    </Card>
  );
}

function AyahBlock({
  ayah,
  tokens,
  results,
  playing,
  loading,
  showTranslation,
  onToggle,
}: {
  ayah: ExternalAyah;
  tokens: string[];
  results: WordResult[] | null;
  playing: boolean;
  loading: boolean;
  showTranslation: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#E8F5EE] text-sm font-bold text-[#0D753F]">
          {ayah.ayah_number}
        </span>
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
      <p dir="rtl" lang="ar" className="font-arabic mt-4 text-2xl leading-[2.6] text-[#172033]">
        {results ? (
          <>
            {tokens.map((tok, i) => {
              const r = results[i];
              const cls = r
                ? r.status === 'correct'
                  ? 'text-emerald-600'
                  : r.status === 'incorrect'
                    ? 'rounded bg-rose-100 px-0.5 text-rose-700'
                    : 'text-slate-400 line-through decoration-slate-300'
                : '';
              return (
                <span key={i} className={cls} title={r?.spoken ? `Terdeteksi: ${r.spoken}` : undefined}>
                  {tok}{' '}
                </span>
              );
            })}
          </>
        ) : (
          ayah.text_arabic
        )}
      </p>
      {showTranslation && ayah.text_translation && (
        <p className="mt-3 border-t border-slate-100 pt-3 text-sm leading-relaxed text-[#64748B]">{ayah.text_translation}</p>
      )}
    </div>
  );
}

export default function RecitationCheck() {
  const [surahId, setSurahId] = useState('');
  const [startAyah, setStartAyah] = useState('1');
  const [endAyah, setEndAyah] = useState('1');
  const [showTranslation, setShowTranslation] = useState(true);
  const [reciter, setReciter] = useState('Alafasy_128kbps');

  // ===== Audio bacaan ayat (everyayah.com CDN) =====
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

  // ===== Speech recognition (Web Speech API) =====
  const supported = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const secureContext = typeof window !== 'undefined' && window.isSecureContext;
  const [recording, setRecording] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [transcript, setTranscript] = useState('');
  const [recognitionError, setRecognitionError] = useState('');
  const [result, setResult] = useState<AlignResult | null>(null);
  const [summary, setSummary] = useState<RecitationSummary | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const { user } = useAuth();
  const isStudent = user?.role === 'student';
  const { data: checkConfig } = useQuery({
    queryKey: ['recitation-check-config'],
    queryFn: () => recitationService.config(),
    staleTime: 60_000,
  });
  const saveEnabled = isStudent && !!checkConfig?.save_enabled;

  const saveMutation = useMutation({
    mutationFn: (payload: RecitationCheckPayload) => recitationService.create(payload),
    onSuccess: () => setSaveStatus('saved'),
    onError: () => setSaveStatus('error'),
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recordingRef = useRef(false);
  const abortedRef = useRef(false);
  const finalRef = useRef('');
  const restartTimerRef = useRef<number | null>(null);

  const clearRecognition = () => {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    const r = recognitionRef.current;
    if (r) {
      try {
        r.abort();
      } catch {
        // abaikan
      }
      recognitionRef.current = null;
    }
  };

  // ===== Data surah & ayat =====
  const { data: surahsData } = useQuery<QuranSurah[] | { data: QuranSurah[] }>({
    queryKey: ['surahs-options'],
    queryFn: () => quranService.surahs(),
  });
  const surahs = Array.isArray(surahsData) ? surahsData : (surahsData?.data ?? []);
  const selectedSurah = surahs.find((s) => String(s.id) === surahId) ?? null;
  const surahNumber = selectedSurah?.surah_number ?? selectedSurah?.id ?? null;
  const totalAyahs = selectedSurah?.total_ayahs ?? 0;

  const { data: allAyahs, isLoading: loadingAyahs, isError: ayahsError, refetch: refetchAyahs } = useQuery<ExternalAyah[]>({
    queryKey: ['quran-ayahs-external', surahNumber],
    queryFn: () => quranService.externalAyahs(surahNumber as number),
    enabled: surahNumber !== null,
  });

  const rangeAyahs = useMemo(() => {
    if (!allAyahs) return [];
    const from = Math.max(1, Number(startAyah) || 1);
    const to = Math.min(totalAyahs || Infinity, Math.max(from, Number(endAyah) || from));
    return allAyahs.filter((a) => a.ayah_number >= from && a.ayah_number <= to);
  }, [allAyahs, startAyah, endAyah, totalAyahs]);

  const expected = useMemo(
    () => rangeAyahs.flatMap((a) => tokenizeDisplay(a.text_arabic).map((word) => ({ ayahNumber: a.ayah_number, word }))),
    [rangeAyahs]
  );

  const resultsByAyah = useMemo(() => {
    const map: Record<number, WordResult[]> = {};
    for (const w of result?.words ?? []) {
      (map[w.ayahNumber] ??= []).push(w);
    }
    return map;
  }, [result]);

  const ayahTokens = useMemo(() => {
    const map: Record<number, string[]> = {};
    for (const a of rangeAyahs) map[a.ayah_number] = tokenizeDisplay(a.text_arabic);
    return map;
  }, [rangeAyahs]);

  const tooManyWords = expected.length > MAX_WORDS;
  const canRecord = supported && !recording && expected.length > 0 && !tooManyWords && !loadingAyahs;

  // Reset hasil & hentikan rekaman bila pilihan surah/rentang berubah
  useEffect(() => {
    clearRecognition();
    recordingRef.current = false;
    abortedRef.current = false;
    setRecording(false);
    setListening(false);
    setInterim('');
    setTranscript('');
    setRecognitionError('');
    setResult(null);
    setSummary(null);
    setSaveStatus('idle');
    stopAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surahId, startAyah, endAyah]);

  useEffect(() => {
    return () => {
      clearRecognition();
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const finalize = () => {
    recordingRef.current = false;
    setRecording(false);
    setListening(false);
    const spoken = tokenize(finalRef.current);
    if (spoken.length === 0) {
      setRecognitionError('Tidak ada suara yang tertangkap. Pastikan mikrofon aktif dan izinkan akses mikrofon, lalu coba lagi.');
      return;
    }
    const aligned = alignWords(expected, spoken);
    setResult(aligned);
    setSummary(summarize(aligned.words));
    setTranscript(finalRef.current.trim());

    if (saveEnabled && selectedSurah && rangeAyahs.length > 0) {
      setSaveStatus('saving');
      saveMutation.mutate({
        surah_id: selectedSurah.id,
        start_ayah: rangeAyahs[0].ayah_number,
        end_ayah: rangeAyahs[rangeAyahs.length - 1].ayah_number,
        transcript: finalRef.current.trim(),
        extra_count: aligned.extras.length,
        details: aligned.words.map((w) => ({
          ayah_number: w.ayahNumber,
          word: w.word,
          status: w.status,
          spoken: w.spoken ?? null,
        })),
      });
    } else {
      setSaveStatus('idle');
    }
  };

  const startRecording = () => {
    if (!supported || !canRecord) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    setRecognitionError('');
    setResult(null);
    setSummary(null);
    setTranscript('');
    setInterim('');
    finalRef.current = '';
    abortedRef.current = false;
    recordingRef.current = true;
    setRecording(true);

    const rec = new SR();
    rec.lang = 'ar';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => setListening(true);

    rec.onresult = (event) => {
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const text = r[0].transcript;
        if (r.isFinal) finalRef.current += text + ' ';
        else interimText += text;
      }
      setInterim(interimText);
    };

    rec.onerror = (event) => {
      abortedRef.current = true;
      recordingRef.current = false;
      setRecording(false);
      setListening(false);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setRecognitionError(
          window.isSecureContext
            ? 'Akses mikrofon ditolak. Izinkan akses mikrofon di browser, lalu coba lagi.'
            : 'Akses mikrofon diblokir karena halaman diakses via HTTP. Gunakan HTTPS atau localhost, lalu coba lagi.'
        );
      } else if (event.error === 'no-speech') {
        setRecognitionError('Tidak ada suara terdeteksi. Dekatkan mikrofon dan baca dengan suara jelas.');
      } else if (event.error === 'audio-capture') {
        setRecognitionError('Mikrofon tidak tersedia di perangkat ini.');
      } else if (event.error === 'network') {
        setRecognitionError('Kesalahan jaringan saat mengenali suara. Coba lagi.');
      } else {
        setRecognitionError(`Terjadi kesalahan pengenalan suara (${event.error}). Coba lagi.`);
      }
    };

    rec.onend = () => {
      setListening(false);
      if (recordingRef.current && !abortedRef.current) {
        // Browser berhenti setelah hening — lanjutkan merekam.
        restartTimerRef.current = window.setTimeout(() => {
          try {
            rec.start();
          } catch {
            // abaikan
          }
        }, 300);
      } else if (!abortedRef.current) {
        finalize();
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      setRecording(false);
      setListening(false);
      setRecognitionError('Gagal memulai pengenalan suara. Coba lagi.');
    }
  };

  const stopRecording = () => {
    recordingRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      finalize();
    }
  };

  const changeSurah = (id: string) => {
    setSurahId(id);
    const s = surahs.find((x) => String(x.id) === id);
    setStartAyah('1');
    setEndAyah(String(s?.total_ayahs ?? 1));
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-emerald-600">Tahfidz</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Pengecekan Bacaan</h1>
        <p className="mt-1 text-slate-500">
          Pilih surah & rentang ayat, lalu bacakan hafalannya lewat mikrofon. Aplikasi akan menandai kata yang salah.
        </p>
      </div>

      {!supported && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>
            Browser/perangkat ini belum mendukung pengenalan suara (Web Speech API). Gunakan <b>Chrome di Android atau desktop</b> agar
            fitur rekam bisa dipakai.
          </p>
        </div>
      )}

      {supported && !secureContext && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>
            Halaman ini dibuka via <b>HTTP (tidak aman)</b> — browser memblokir akses mikrofon pada halaman non-HTTPS. Gunakan{' '}
            <b>HTTPS</b> (mis. tunnel ngrok/cloudflared) atau <b>localhost</b> agar fitur rekam berfungsi.
          </p>
        </div>
      )}

      {/* Pilihan surah & rentang */}
      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="sm:col-span-1">
              <span className="text-sm font-semibold text-slate-700">Surah</span>
              <select
                value={surahId}
                onChange={(e) => changeSurah(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0D753F]"
              >
                <option value="">Pilih surah...</option>
                {surahs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name_latin}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-sm font-semibold text-slate-700">Ayat mulai</span>
              <input
                type="number"
                min={1}
                max={totalAyahs || undefined}
                value={startAyah}
                onChange={(e) => setStartAyah(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0D753F]"
              />
            </label>
            <label>
              <span className="text-sm font-semibold text-slate-700">Ayat sampai</span>
              <input
                type="number"
                min={1}
                max={totalAyahs || undefined}
                value={endAyah}
                onChange={(e) => setEndAyah(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0D753F]"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={reciter}
                onChange={(e) => {
                  setReciter(e.target.value);
                  stopAudio();
                }}
                aria-label="Pilih qari"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0D753F]"
              >
                {RECITERS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <Button variant="outline" size="sm" onClick={() => setShowTranslation((v) => !v)} aria-pressed={showTranslation}>
                <Languages className="h-4 w-4" aria-hidden="true" />
                {showTranslation ? 'Sembunyikan Terjemahan' : 'Tampilkan Terjemahan'}
              </Button>
            </div>
            {selectedSurah && (
              <p className="text-xs font-medium text-slate-500">
                {rangeAyahs.length} ayat · {expected.length} kata
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Panel rekam & hasil */}
      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-bold text-slate-900">Mikrofon</p>
              <p className="mt-0.5 text-sm text-slate-500">
                {recording
                  ? 'Sedang mendengarkan — bacakan ayat di bawah dengan suara jelas.'
                  : 'Tekan tombol rekam, lalu bacakan hafalanmu. Setelah selesai, tekan Berhenti.'}
              </p>
            </div>
            {recording ? (
              <Button variant="destructive" onClick={stopRecording}>
                <Square className="h-4 w-4" aria-hidden="true" /> Berhenti
              </Button>
            ) : (
              <Button className="bg-gradient-to-br from-[#075B30] to-[#0D753F] shadow-sm hover:from-[#064A27] hover:to-[#075B30]" onClick={startRecording} disabled={!canRecord}>
                <Mic className="h-4 w-4" aria-hidden="true" /> Mulai Rekam
              </Button>
            )}
          </div>

          {listening && (
            <div role="status" className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
              <p className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Mendengarkan…
              </p>
              {interim && (
                <p dir="rtl" lang="ar" className="font-arabic mt-2 text-lg leading-relaxed text-emerald-800">
                  {interim}
                </p>
              )}
            </div>
          )}

          {recognitionError && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {recognitionError}
            </p>
          )}

          {!selectedSurah && !recording && (
            <p role="status" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500">
              Pilih surah & rentang ayat di atas terlebih dahulu untuk mengaktifkan tombol rekam.
            </p>
          )}

          {tooManyWords && (
            <p role="status" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Rentang ini terlalu panjang ({expected.length} kata, maksimal {MAX_WORDS}). Persempit rentang ayatnya agar pengecekan akurat.
            </p>
          )}

          {summary && (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-slate-900">Hasil Pengecekan</p>
                <p className={`text-2xl font-extrabold ${summary.score >= 90 ? 'text-emerald-600' : summary.score >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                  {summary.score}%
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                  <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                  {summary.correct} benar
                </span>
                <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-700">
                  <XCircle className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                  {summary.incorrect} salah
                </span>
                <span className="rounded-full bg-slate-200 px-3 py-1 text-slate-600">{summary.missing} tidak terbaca</span>
              </div>
              <p className="text-xs text-slate-500">
                {summary.score >= 90
                  ? 'Luar biasa! Bacaanmu lancar.'
                  : summary.score >= 70
                    ? 'Cukup baik, tapi masih ada beberapa kata yang perlu diperbaiki.'
                    : 'Masih perlu banyak latihan. Dengarkan bacaan qari lalu ulangi.'}
              </p>
              {transcript && (
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Transkrip suara</p>
                  <p dir="rtl" lang="ar" className="font-arabic text-lg leading-relaxed text-slate-700">
                    {transcript}
                  </p>
                </div>
              )}
              {saveStatus === 'saving' && (
                <p role="status" className="flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Menyimpan ke riwayat…
                </p>
              )}
              {saveStatus === 'saved' && (
                <p role="status" className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Tersimpan ke riwayat siswa.
                </p>
              )}
              {saveStatus === 'error' && (
                <p role="alert" className="text-xs font-semibold text-rose-600">Gagal menyimpan ke riwayat. Hasil tetap tampil di layar.</p>
              )}
              {isStudent && saveStatus === 'idle' && !saveEnabled && (
                <p role="status" className="text-xs text-slate-400">
                  Mode saat ini: Realtime — hasil tidak disimpan. Admin dapat mengubahnya di Pengaturan → Pengecekan Bacaan.
                </p>
              )}
              {result && result.extras.length > 0 && (
                <p className="text-xs text-slate-500">
                  Terdeteksi <b>{result.extras.length} kata</b> yang tidak ada di teks: <span dir="rtl" lang="ar">{result.extras.join('، ')}</span>
                </p>
              )}
              <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                <span>
                  <span className="mr-1 inline-block h-3 w-3 rounded bg-emerald-100 ring-1 ring-emerald-300" /> benar
                </span>
                <span>
                  <span className="mr-1 inline-block h-3 w-3 rounded bg-rose-100 ring-1 ring-rose-300" /> salah
                </span>
                <span>
                  <span className="mr-1 inline-block h-3 w-3 rounded bg-slate-200 ring-1 ring-slate-300" /> tidak terbaca
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daftar ayat */}
      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <p className="font-bold text-slate-900">
              {selectedSurah ? `${selectedSurah.name_latin} — Ayat ${rangeAyahs.length ? rangeAyahs[0].ayah_number : '-'} s.d. ${rangeAyahs.length ? rangeAyahs[rangeAyahs.length - 1].ayah_number : '-'}` : 'Ayat'}
            </p>
            {audioError && (
              <p role="status" className="text-xs text-amber-700">
                Audio gagal dimuat. Periksa koneksi internet Anda.
              </p>
            )}
          </div>

          {!selectedSurah ? (
            <div className="grid place-items-center py-10 text-center">
              <BookOpen className="mb-3 h-10 w-10 text-slate-300" aria-hidden="true" />
              <p className="text-sm text-slate-500">Pilih surah terlebih dahulu untuk melihat ayatnya.</p>
            </div>
          ) : loadingAyahs ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : ayahsError ? (
            <div className="grid place-items-center py-10 text-center">
              <AlertTriangle className="mb-3 h-10 w-10 text-rose-400" aria-hidden="true" />
              <p className="text-sm text-slate-600">Teks ayat tidak dapat dimuat. Periksa koneksi internet Anda.</p>
              <Button variant="outline" onClick={() => refetchAyahs()} className="mt-4">
                Coba Lagi
              </Button>
            </div>
          ) : rangeAyahs.length === 0 ? (
            <div className="grid place-items-center py-10 text-center">
              <AlertTriangle className="mb-3 h-10 w-10 text-amber-300" aria-hidden="true" />
              <p className="text-sm text-slate-500">Tidak ada ayat dalam rentang tersebut. Periksa kembali nomor ayat.</p>
            </div>
          ) : (
            rangeAyahs.map((a) => (
              <AyahBlock
                key={a.ayah_number}
                ayah={a}
                tokens={ayahTokens[a.ayah_number] ?? []}
                results={resultsByAyah[a.ayah_number] ?? null}
                playing={playingAyah === a.ayah_number && !audioLoading}
                loading={playingAyah === a.ayah_number && audioLoading}
                showTranslation={showTranslation}
                onToggle={() => togglePlay(a.ayah_number)}
              />
            ))
          )}
        </CardContent>
      </Card>

      {surahs.length === 0 && !surahId && <SkeletonBlock />}
    </div>
  );
}
