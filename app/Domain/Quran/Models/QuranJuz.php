<?php

namespace App\Domain\Quran\Models;

use Illuminate\Database\Eloquent\Model;

class QuranJuz extends Model
{
    public $timestamps = false;

    protected $table = 'quran_juz';

    protected $fillable = ['juz_number'];

    public function ayahs()
    {
        return $this->hasMany(QuranAyah::class, 'juz_id');
    }
}
