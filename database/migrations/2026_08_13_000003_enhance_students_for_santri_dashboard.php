<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            if (! Schema::hasColumn('students', 'nik')) {
                $table->string('nik', 30)->nullable()->after('nisn');
            }
            if (! Schema::hasColumn('students', 'photo_path')) {
                $table->string('photo_path')->nullable()->after('birth_date');
            }
            if (! Schema::hasColumn('students', 'address')) {
                $table->text('address')->nullable()->after('photo_path');
            }
            if (! Schema::hasColumn('students', 'phone')) {
                $table->string('phone', 30)->nullable()->after('address');
            }
            if (! Schema::hasColumn('students', 'entry_year')) {
                $table->unsignedSmallInteger('entry_year')->nullable()->after('academic_year_id')->index();
            }
            if (! Schema::hasColumn('students', 'father_name')) {
                $table->string('father_name', 150)->nullable()->after('entry_year');
            }
            if (! Schema::hasColumn('students', 'mother_name')) {
                $table->string('mother_name', 150)->nullable()->after('father_name');
            }
            if (! Schema::hasColumn('students', 'guardian_name')) {
                $table->string('guardian_name', 150)->nullable()->after('mother_name');
            }
            if (! Schema::hasColumn('students', 'guardian_phone')) {
                $table->string('guardian_phone', 30)->nullable()->after('guardian_name');
            }
            if (! Schema::hasColumn('students', 'guardian_address')) {
                $table->text('guardian_address')->nullable()->after('guardian_phone');
            }
            if (! Schema::hasColumn('students', 'memorization_target')) {
                $table->unsignedTinyInteger('memorization_target')->nullable()->after('guardian_address');
            }
            if (! Schema::hasColumn('students', 'starting_juz')) {
                $table->unsignedTinyInteger('starting_juz')->nullable()->after('memorization_target');
            }
            if (! Schema::hasColumn('students', 'notes')) {
                $table->text('notes')->nullable()->after('starting_juz');
            }
        });

        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE students MODIFY status ENUM('active','inactive','graduated','transferred') NOT NULL DEFAULT 'active'");
        }
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            foreach (['nik', 'photo_path', 'address', 'phone', 'entry_year', 'father_name', 'mother_name', 'guardian_name', 'guardian_phone', 'guardian_address', 'memorization_target', 'starting_juz', 'notes'] as $column) {
                if (Schema::hasColumn('students', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("UPDATE students SET status = 'inactive' WHERE status = 'transferred'");
            DB::statement("ALTER TABLE students MODIFY status ENUM('active','inactive','graduated') NOT NULL DEFAULT 'active'");
        }
    }
};