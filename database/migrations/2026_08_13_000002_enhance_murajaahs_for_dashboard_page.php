<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('murajaahs', function (Blueprint $table) {
            if (! Schema::hasColumn('murajaahs', 'time')) {
                $table->time('time')->nullable()->after('date');
            }

            if (! Schema::hasColumn('murajaahs', 'juz')) {
                $table->unsignedTinyInteger('juz')->nullable()->after('time');
            }

            if (! Schema::hasColumn('murajaahs', 'page_count')) {
                $table->decimal('page_count', 5, 2)->nullable()->after('end_ayah');
            }

            if (! Schema::hasColumn('murajaahs', 'method')) {
                $table->string('method', 32)->default('guided')->after('page_count');
            }

            if (! Schema::hasColumn('murajaahs', 'duration_minutes')) {
                $table->unsignedSmallInteger('duration_minutes')->nullable()->after('method');
            }

            if (! Schema::hasColumn('murajaahs', 'audio_path')) {
                $table->string('audio_path')->nullable()->after('notes');
            }
        });

        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE murajaahs MODIFY status VARCHAR(32) NOT NULL DEFAULT 'pending'");
        }
        DB::table('murajaahs')->where('status', 'LANCAR')->update(['status' => 'approved']);
        DB::table('murajaahs')->where('status', 'PERLU_MUROJAAH')->update(['status' => 'revision']);
    }

    public function down(): void
    {
        DB::table('murajaahs')->where('status', 'approved')->update(['status' => 'LANCAR']);
        DB::table('murajaahs')->whereIn('status', ['pending', 'revision', 'rejected'])->update(['status' => 'PERLU_MUROJAAH']);
        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE murajaahs MODIFY status ENUM('LANCAR', 'PERLU_MUROJAAH') NOT NULL");
        }

        Schema::table('murajaahs', function (Blueprint $table) {
            foreach (['time', 'juz', 'page_count', 'method', 'duration_minutes', 'audio_path'] as $column) {
                if (Schema::hasColumn('murajaahs', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};