<?php

namespace App\Domain\Quran\Models;

use Illuminate\Database\Eloquent\Model;

class QuranAyah extends Model
{
    public $timestamps = false;

    protected $table = 'quran_ayahs';

    protected $fillable = ['juz_id', 'surah_id', 'ayah_number', 'text_arabic', 'text_translation'];

    public function juz()
    {
        return $this->belongsTo(QuranJuz::class, 'juz_id');
    }

    public function surah()
    {
        return $this->belongsTo(QuranSurah::class, 'surah_id');
    }
}
