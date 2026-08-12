<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quran_juz', function (Blueprint $table) {
            $table->id();
            $table->unsignedTinyInteger('juz_number')->unique();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quran_juz');
    }
};
