<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_progress_summary', function (Blueprint $table) {
            $table->foreignId('student_id')->primary()->constrained('students')->cascadeOnDelete();
            $table->unsignedInteger('total_ayah_covered')->default(0);
            $table->unsignedInteger('total_surah_completed')->default(0);
            $table->unsignedInteger('total_juz_completed')->default(0);
            $table->decimal('progress_percentage', 5, 2)->default(0);
            $table->decimal('average_score', 5, 2)->nullable();
            $table->timestamp('last_submission_at')->nullable();
            $table->timestamp('updated_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_progress_summary');
    }
};
