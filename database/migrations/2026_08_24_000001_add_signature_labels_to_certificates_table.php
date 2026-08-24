<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('certificates', function (Blueprint $table) {
            $table->string('pembina_label', 60)->nullable()->after('pembina_name')->comment('Label peran tanda tangan kiri, mis. Kepala Madrasah');
            $table->string('pengajar_label', 60)->nullable()->after('pengajar_name')->comment('Label peran tanda tangan kanan');
        });
    }

    public function down(): void
    {
        Schema::table('certificates', function (Blueprint $table) {
            $table->dropColumn(['pembina_label', 'pengajar_label']);
        });
    }
};
