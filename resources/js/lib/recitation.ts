// Utilitas pengecekan bacaan Al-Qur'an.
//
// Alur: teks hasil speech-to-text (tanpa harakat) dinormalisasi lalu
// disejajarkan (alignment) per kata dengan teks ayat yang benar.
// Kata yang cocok ditandai benar, yang tidak cocok ditandai salah,
// dan yang tidak terbaca ditandai hilang.

export type WordStatus = 'correct' | 'incorrect' | 'missing';

export interface WordResult {
  /** Nomor ayat asal kata. */
  ayahNumber: number;
  /** Teks asli kata (dengan harakat). */
  word: string;
  /** Bentuk ternormalisasi (tanpa harakat). */
  normalized: string;
  status: WordStatus;
  /** Kata yang diucapkan (jika ada padanannya). */
  spoken?: string;
}

export interface AlignResult {
  words: WordResult[];
  /** Kata yang diucapkan tapi tidak ada padanannya di teks. */
  extras: string[];
}

export interface RecitationSummary {
  total: number;
  correct: number;
  incorrect: number;
  missing: number;
  /** Persentase kata benar (0–100). */
  score: number;
}

/**
 * Normalisasi teks Arab untuk pencocokan:
 * - buang harakat/tanda (fathah, kasrah, dammah, sukun, tasydid, dst.),
 * - samakan bentuk alif (آ أ إ ٱ → ا), ة → ه, ى → ي,
 * - buang karakter non-huruf Arab (angka, tanda akhir ayat, dst.).
 */
export function normalizeArabic(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u0670\u0640\u06D6-\u06ED]/g, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/\u0629/g, '\u0647')
    .replace(/\u0649/g, '\u064A')
    .replace(/[^\u0621-\u064A\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Pecah teks jadi kata-kata ternormalisasi (tanpa harakat). */
export function tokenize(text: string): string[] {
  return normalizeArabic(text)
    .split(' ')
    .filter(Boolean);
}

/**
 * Pecah teks ayat asli jadi token untuk ditampilkan per kata.
 * Token yang tidak mengandung huruf Arab (mis. penanda akhir ayat) dibuang.
 */
export function tokenizeDisplay(text: string): string[] {
  return text
    .split(/\s+/)
    .filter((t) => /[\u0621-\u064A]/.test(t));
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  let prev = new Array<number>(bl + 1);
  let curr = new Array<number>(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;
  for (let i = 1; i <= al; i++) {
    curr[0] = i;
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[bl];
}

/** Kemiripan dua kata (0–1) berdasarkan jarak Levenshtein. */
export function wordSimilarity(a: string, b: string): number {
  const na = normalizeArabic(a);
  const nb = normalizeArabic(b);
  if (na === nb) return 1;
  if (na.length === 0 || nb.length === 0) return 0;
  const maxLen = Math.max(na.length, nb.length);
  return Math.max(0, 1 - levenshtein(na, nb) / maxLen);
}

/** Ambang kemiripan agar sebuah kata dianggap benar. */
export const MATCH_THRESHOLD = 0.6;

/**
 * Sejajarkan kata yang diucapkan terhadap kata yang diharapkan
 * (Needleman–Wunsch). Mengembalikan hasil per kata yang diharapkan.
 */
export function alignWords(expected: { ayahNumber: number; word: string }[], spoken: string[]): AlignResult {
  const n = expected.length;
  const m = spoken.length;

  // dp[i][j] = skor terbaik untuk expected[0..i-1] vs spoken[0..j-1]
  // op[i][j] = 0 diagonal (cocok/tidak), 1 naik (kata hilang), 2 kiri (kata ekstra)
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  const op: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    dp[i][0] = -i;
    op[i][0] = 1;
  }
  for (let j = 1; j <= m; j++) {
    dp[0][j] = -j;
    op[0][j] = 2;
  }

  for (let i = 1; i <= n; i++) {
    const ei = expected[i - 1];
    for (let j = 1; j <= m; j++) {
      const sim = wordSimilarity(ei.word, spoken[j - 1]);
      const match = sim >= MATCH_THRESHOLD ? sim : 0;
      const diag = dp[i - 1][j - 1] + match;
      const up = dp[i - 1][j] - 1;
      const left = dp[i][j - 1] - 1;
      if (diag >= up && diag >= left) {
        dp[i][j] = diag;
        op[i][j] = 0;
      } else if (up >= left) {
        dp[i][j] = up;
        op[i][j] = 1;
      } else {
        dp[i][j] = left;
        op[i][j] = 2;
      }
    }
  }

  // Traceback
  const words: WordResult[] = [];
  const extras: string[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && op[i][j] === 0) {
      const sim = wordSimilarity(expected[i - 1].word, spoken[j - 1]);
      const e = expected[i - 1];
      words.unshift({
        ayahNumber: e.ayahNumber,
        word: e.word,
        normalized: normalizeArabic(e.word),
        status: sim >= MATCH_THRESHOLD ? 'correct' : 'incorrect',
        spoken: spoken[j - 1],
      });
      i--;
      j--;
    } else if (i > 0 && op[i][j] === 1) {
      const e = expected[i - 1];
      words.unshift({
        ayahNumber: e.ayahNumber,
        word: e.word,
        normalized: normalizeArabic(e.word),
        status: 'missing',
      });
      i--;
    } else {
      extras.unshift(spoken[j - 1]);
      j--;
    }
  }

  return { words, extras };
}

export function summarize(words: WordResult[]): RecitationSummary {
  const total = words.length;
  const correct = words.filter((w) => w.status === 'correct').length;
  const incorrect = words.filter((w) => w.status === 'incorrect').length;
  const missing = total - correct - incorrect;
  return {
    total,
    correct,
    incorrect,
    missing,
    score: total ? Math.round((correct / total) * 100) : 0,
  };
}
