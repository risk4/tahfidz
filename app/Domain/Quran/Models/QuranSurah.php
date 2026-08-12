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
}
