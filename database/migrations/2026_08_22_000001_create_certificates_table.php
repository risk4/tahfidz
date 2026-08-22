<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('certificates', function (Blueprint $table) {
            $table->id();
            $table->string('certificate_number', 40)->unique()->comment('Nomor sertifikat, mis. SRT/2026/08/0001');
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->unsignedTinyInteger('juz_count')->comment('Tingkat capaian hafalan dalam juz (1-30)');
            $table->date('issued_date')->comment('Tanggal penerbitan sertifikat');
            $table->string('pembina_name', 120)->nullable()->comment('Nama pembina tanda tangan kiri');
            $table->string('pengajar_name', 120)->nullable()->comment('Nama pengajar tanda tangan kanan');
            $table->string('verification_code', 64)->unique()->comment('Kode unik verifikasi untuk QR code');
            $table->text('notes')->nullable();
            $table->foreignId('issued_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            // Satu santri hanya boleh memiliki satu sertifikat per tingkat juz.
            $table->unique(['student_id', 'juz_count']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('certificates');
    }
};
