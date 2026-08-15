<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('submissions', function (Blueprint $table) {
            if (! Schema::hasColumn('submissions', 'submission_time')) {
                $table->time('submission_time')->nullable()->after('submission_date');
            }

            if (! Schema::hasColumn('submissions', 'page_count')) {
                $table->decimal('page_count', 4, 1)->nullable()->after('end_ayah');
            }

            if (! Schema::hasColumn('submissions', 'status')) {
                $table->enum('status', ['pending', 'approved', 'revision', 'rejected'])->default('approved')->after('final_score')->index();
            }

            if (! Schema::hasColumn('submissions', 'audio_path')) {
                $table->string('audio_path')->nullable()->after('notes');
            }
        });
    }

    public function down(): void
    {
        Schema::table('submissions', function (Blueprint $table) {
            foreach (['submission_time', 'page_count', 'status', 'audio_path'] as $column) {
                if (Schema::hasColumn('submissions', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};