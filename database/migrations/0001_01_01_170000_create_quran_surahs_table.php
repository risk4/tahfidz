<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quran_surahs', function (Blueprint $table) {
            $table->id();
            $table->unsignedTinyInteger('surah_number')->unique();
            $table->string('name_arabic', 100);
            $table->string('name_latin', 100);
            $table->string('translation', 150);
            $table->unsignedSmallInteger('total_ayahs');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quran_surahs');
    }
};
