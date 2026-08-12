<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tahfidz_group_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tahfidz_group_id')->constrained('tahfidz_groups')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->date('joined_at')->nullable();
            $table->timestamps();

            $table->unique(['tahfidz_group_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tahfidz_group_members');
    }
};
