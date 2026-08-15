<?php

namespace App\Domain\Quran\Models;

use Illuminate\Database\Eloquent\Model;

class QuranSurah extends Model
{
    public $timestamps = false;

    protected $table = 'quran_surahs';

    protected $fillable = ['surah_number', 'name_arabic', 'name_latin', 'translation', 'total_ayahs'];

    public function ayahs()
    {
        return $this->hasMany(QuranAyah::class, 'surah_id');
    }

    /**
     * Tempelkan atribut `juz_range` ({min, max}) pada koleksi surah — satu query
     * untuk semua surah sekaligus (dipakai oleh daftar surah & relasi surah di
     * data setoran/murajaah agar kolom Juz bisa terisi otomatis).
     */
    public static function attachJuzRanges($surahs): void
    {
        // Terima paginator atau koleksi model surah; ekstrak item aslinya.
        if ($surahs instanceof \Illuminate\Contracts\Pagination\Paginator) {
            $surahs = $surahs->getCollection();
        } elseif (! $surahs instanceof \Illuminate\Support\Collection && ! $surahs instanceof \Illuminate\Database\Eloquent\Collection) {
            $surahs = collect($surahs);
        }

        $surahs = $surahs->filter();
        if ($surahs->isEmpty()) {
            return;
        }

        $ranges = QuranAyah::query()
            ->join('quran_juz', 'quran_ayahs.juz_id', '=', 'quran_juz.id')
            ->whereIn('quran_ayahs.surah_id', $surahs->pluck('id'))
            ->select('quran_ayahs.surah_id')
            ->selectRaw('MIN(quran_juz.juz_number) as min_juz, MAX(quran_juz.juz_number) as max_juz')
            ->groupBy('quran_ayahs.surah_id')
            ->get()
            ->keyBy('surah_id');

        foreach ($surahs as $surah) {
            $range = $ranges->get($surah->id);
            $surah->juz_range = $range ? ['min' => (int) $range->min_juz, 'max' => (int) $range->max_juz] : null;
        }
    }
}
