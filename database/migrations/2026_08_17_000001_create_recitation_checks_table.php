<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recitation_checks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('surah_id')->constrained('quran_surahs')->restrictOnDelete();
            $table->unsignedSmallInteger('start_ayah');
            $table->unsignedSmallInteger('end_ayah');
            $table->unsignedTinyInteger('score')->comment('Persentase kata benar (0-100)');
            $table->unsignedInteger('correct_count');
            $table->unsignedInteger('incorrect_count');
            $table->unsignedInteger('missing_count');
            $table->unsignedInteger('extra_count')->default(0);
            $table->text('transcript')->nullable()->comment('Transkrip hasil speech-to-text');
            $table->json('details')->comment('Hasil per kata: {ayah_number, word, status, spoken}');
            $table->json('ayah_statuses')->nullable()->comment('Status per-ayat yang diperbarui: {ayah_number: status}');
            $table->timestamp('checked_at');
            $table->timestamps();

            $table->index(['student_id', 'surah_id']);
            $table->index('checked_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recitation_checks');
    }
};
