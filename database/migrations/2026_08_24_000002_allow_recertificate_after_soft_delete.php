<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Unique lama tetap menghalangi penerbitan ulang setelah sertifikat
        // di-soft delete, namun index ini juga dipakai foreign key sehingga
        // harus dilepas bersama constraint-nya terlebih dahulu.
        Schema::table('certificates', function (Blueprint $table) {
            $table->dropForeign(['student_id']);
            $table->dropUnique(['student_id', 'juz_count']);
        });

        Schema::table('certificates', function (Blueprint $table) {
            $table->unique(['student_id', 'juz_count', 'deleted_at']);
            $table->foreign('student_id')->references('id')->on('students')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('certificates', function (Blueprint $table) {
            $table->dropForeign(['student_id']);
            $table->dropUnique(['student_id', 'juz_count', 'deleted_at']);
        });

        Schema::table('certificates', function (Blueprint $table) {
            $table->unique(['student_id', 'juz_count']);
            $table->foreign('student_id')->references('id')->on('students')->cascadeOnDelete();
        });
    }
};
