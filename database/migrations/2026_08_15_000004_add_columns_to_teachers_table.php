<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teachers', function (Blueprint $table) {
            $table->string('nuptk', 30)->nullable()->after('nip');
            $table->string('gender', 1)->nullable()->after('name');
            $table->string('birth_place', 100)->nullable()->after('gender');
            $table->date('birth_date')->nullable()->after('birth_place');
            $table->string('photo_path')->nullable()->after('birth_date');
            $table->text('address')->nullable()->after('phone');
            $table->string('subject', 100)->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('teachers', function (Blueprint $table) {
            $table->dropColumn(['nuptk', 'gender', 'birth_place', 'birth_date', 'photo_path', 'address', 'subject']);
        });
    }
};
