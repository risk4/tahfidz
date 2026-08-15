<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Klasifikasi tempat turun (Makkiyah/Madaniyah) per surah,
     * mengikuti sumber rujukan (api.alquran.cloud — 86 Makkiyah, 28 Madaniyah).
     */
    private const MAKKIYAH = [
        1, 6, 7, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 23, 25, 26, 27, 28, 29, 30, 31, 32, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 50, 51, 52, 53, 54, 56, 67, 68, 69, 70, 71, 72, 73, 74, 75, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 111, 112, 113, 114,
    ];

    public function up(): void
    {
        Schema::table('quran_surahs', function (Blueprint $table) {
            $table->string('revelation_place', 20)->nullable()->after('translation');
        });

        DB::table('quran_surahs')
            ->whereIn('surah_number', self::MAKKIYAH)
            ->update(['revelation_place' => 'makkiyah']);

        DB::table('quran_surahs')
            ->whereNull('revelation_place')
            ->update(['revelation_place' => 'madaniyah']);
    }

    public function down(): void
    {
        Schema::table('quran_surahs', function (Blueprint $table) {
            $table->dropColumn('revelation_place');
        });
    }
};
