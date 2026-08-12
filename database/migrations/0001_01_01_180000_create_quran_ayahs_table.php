<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quran_ayahs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('juz_id')->constrained('quran_juz')->restrictOnDelete();
            $table->foreignId('surah_id')->constrained('quran_surahs')->restrictOnDelete();
            $table->unsignedSmallInteger('ayah_number');
            $table->text('text_arabic');
            $table->text('text_translation')->nullable();

            $table->unique(['surah_id', 'ayah_number']);
            $table->index('juz_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quran_ayahs');
    }
};
