<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_ayah_coverage', function (Blueprint $table) {
            $table->string('memorization_status', 20)->default('memorized')->after('ayah_number');
        });

        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            return;
        }

        DB::statement('ALTER TABLE student_ayah_coverage MODIFY first_covered_submission_id BIGINT UNSIGNED NULL');
    }

    public function down(): void
    {
        Schema::table('student_ayah_coverage', function (Blueprint $table) {
            $table->dropColumn('memorization_status');
        });
    }
};