<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_ayah_coverage', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('surah_id')->constrained('quran_surahs')->restrictOnDelete();
            $table->unsignedSmallInteger('ayah_number');
            $table->foreignId('first_covered_submission_id')->constrained('submissions')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['student_id', 'surah_id', 'ayah_number'], 'uniq_student_ayah');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_ayah_coverage');
    }
};
