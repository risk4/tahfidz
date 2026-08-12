<?php

namespace App\Http\Controllers\Api\Quran;

use App\Domain\Quran\Models\QuranAyah;
use App\Domain\Quran\Models\QuranJuz;
use App\Domain\Quran\Models\QuranSurah;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

/**
 * Referensi data Al-Qur'an (read-only) — dipakai klien untuk memilih
 * surah & rentang ayat sebelum membuat submission.
 */
class QuranController extends Controller
{
    public function juz()
    {
        $juz = QuranJuz::orderBy('juz_number')->get();

        return response()->json($juz);
    }

    public function surahs(Request $request)
    {
        $query = QuranSurah::query();

        if ($juzNumber = $request->integer('juz_number')) {
            $query->whereHas('ayahs.juz', fn ($q) => $q->where('juz_number', $juzNumber))->distinct();
        }

        return response()->json($query->orderBy('surah_number')->get());
    }

    public function surah(Request $request, QuranSurah $surah)
    {
        $surah->load(['ayahs' => fn ($q) => $q->orderBy('ayah_number')]);

        return response()->json($surah);
    }

    public function ayahs(Request $request, QuranSurah $surah)
    {
        $this->ensureRealAyahText($surah);

        $query = QuranAyah::where('surah_id', $surah->id)
            ->with('juz:id,juz_number')
            ->orderBy('ayah_number');

        if ($from = $request->integer('from')) {
            $query->where('ayah_number', '>=', $from);
        }

        if ($to = $request->integer('to')) {
            $query->where('ayah_number', '<=', $to);
        }

        if ($request->boolean('paged')) {
            return $query->paginate($request->integer('per_page', 20));
        }

        return response()->json($query->get());
    }

    private function ensureRealAyahText(QuranSurah $surah): void
    {
        $hasPlaceholder = QuranAyah::where('surah_id', $surah->id)
            ->where('text_arabic', 'like', '{%}')
            ->exists();

        if (! $hasPlaceholder) {
            return;
        }

        try {
            $arabicResponse = Http::timeout(15)
                ->get("https://api.alquran.cloud/v1/surah/{$surah->surah_number}/quran-uthmani");

            if (! $arabicResponse->successful()) {
                return;
            }

            $arabicAyahs = collect($arabicResponse->json('data.ayahs', []))
                ->keyBy('numberInSurah');

            $translationResponse = Http::timeout(15)
                ->get("https://api.alquran.cloud/v1/surah/{$surah->surah_number}/id.indonesian");

            $translationAyahs = $translationResponse->successful()
                ? collect($translationResponse->json('data.ayahs', []))->keyBy('numberInSurah')
                : collect();

            QuranAyah::where('surah_id', $surah->id)
                ->get(['id', 'ayah_number'])
                ->each(function (QuranAyah $ayah) use ($arabicAyahs, $translationAyahs) {
                    $arabic = $arabicAyahs->get($ayah->ayah_number);
                    $translation = $translationAyahs->get($ayah->ayah_number);

                    if (! $arabic || empty($arabic['text'])) {
                        return;
                    }

                    $ayah->update([
                        'text_arabic' => $arabic['text'],
                        'text_translation' => $translation['text'] ?? null,
                    ]);
                });
        } catch (\Throwable) {
            // Jika internet/API eksternal tidak tersedia, endpoint tetap mengembalikan data lokal.
        }
    }
}
