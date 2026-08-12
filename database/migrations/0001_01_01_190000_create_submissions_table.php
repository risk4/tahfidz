<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('teacher_id')->constrained('teachers')->restrictOnDelete();
            $table->foreignId('academic_year_id')->constrained('academic_years')->restrictOnDelete();
            $table->date('submission_date');
            $table->foreignId('surah_id')->constrained('quran_surahs')->restrictOnDelete();
            $table->unsignedSmallInteger('start_ayah');
            $table->unsignedSmallInteger('end_ayah');
            $table->enum('type', ['new_memorization', 'repetition']);
            $table->unsignedTinyInteger('fluency_score');
            $table->unsignedTinyInteger('tajwid_score');
            $table->unsignedTinyInteger('makhraj_score');
            $table->unsignedTinyInteger('fashahah_score');
            $table->decimal('final_score', 5, 2);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['student_id', 'surah_id']);
            $table->index('teacher_id');
            $table->index('academic_year_id');
            $table->index('submission_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('submissions');
    }
};
