<?php

namespace App\Http\Controllers\Api\Quran;

use App\Domain\Quran\Models\QuranAyah;
use App\Domain\Quran\Models\QuranJuz;
use App\Domain\Quran\Models\QuranSurah;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
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

        if ($search = $request->string('search')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('name_latin', 'like', "%{$search}%")
                    ->orWhere('name_arabic', 'like', "%{$search}%")
                    ->orWhere('translation', 'like', "%{$search}%")
                    ->orWhere('surah_number', $search);
            });
        }

        if ($place = $request->string('revelation_place')->toString()) {
            if (in_array($place, ['makkiyah', 'madaniyah'], true)) {
                $query->where('revelation_place', $place);
            }
        }

        if ($countFilter = $request->string('ayah_count')->toString()) {
            match ($countFilter) {
                'lt50' => $query->where('total_ayahs', '<', 50),
                '50-100' => $query->whereBetween('total_ayahs', [50, 100]),
                'gt100' => $query->where('total_ayahs', '>', 100),
                default => null,
            };
        }

        if ($juzNumber = $request->integer('juz_number')) {
            $query->whereHas('ayahs.juz', fn ($q) => $q->where('juz_number', $juzNumber))->distinct();
        }

        $query->orderBy('surah_number');

        $respond = function ($surahs) {
            QuranSurah::attachJuzRanges($surahs);

            return response()->json($surahs);
        };

        if ($request->has('per_page')) {
            return $respond($query->paginate($request->integer('per_page', 12)));
        }

        return $respond($query->get());
    }

    /**
     * Statistik referensi Al-Qur'an — dihitung dari database (data statis, di-cache).
     */
    public function statistics()
    {
        $stats = Cache::remember('quran.statistics', now()->addHours(24), function () {
            return [
                'total_surahs' => QuranSurah::count(),
                'total_ayahs' => QuranAyah::count(),
                'total_juz' => QuranJuz::count(),
                'makkiyah' => QuranSurah::where('revelation_place', 'makkiyah')->count(),
                'madaniyah' => QuranSurah::where('revelation_place', 'madaniyah')->count(),
            ];
        });

        return response()->json($stats);
    }

    public function surah(Request $request, QuranSurah $surah)
    {
        $this->ensureRealAyahText($surah);

        $surah->load(['ayahs' => fn ($q) => $q->orderBy('ayah_number')->with('juz:id,juz_number')]);

        QuranSurah::attachJuzRanges([$surah]);

        return response()->json($surah);
    }

    public function ayahs(Request $request, QuranSurah $surah)
    {
        $this->ensureRealAyahText($surah);

        $query = QuranAyah::where('surah_id', $surah->id)
            ->with('juz:id,juz_number')
            ->orderBy('ayah_number');

        if ($search = $request->string('search')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('ayah_number', (int) $search)
                    ->orWhere('text_arabic', 'like', "%{$search}%")
                    ->orWhere('text_translation', 'like', "%{$search}%");
            });
        }

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
