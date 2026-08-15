<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('submissions', function (Blueprint $table) {
            $table->enum('method', ['setoran', 'murojaah', 'tasmi', 'sambung_ayat'])
                ->default('setoran')
                ->after('type');
        });

        // Backfill: metode lama 'repetition' dianggap muroja'ah.
        DB::table('submissions')
            ->where('type', 'repetition')
            ->update(['method' => 'murojaah']);
    }

    public function down(): void
    {
        Schema::table('submissions', function (Blueprint $table) {
            $table->dropColumn('method');
        });
    }
};
