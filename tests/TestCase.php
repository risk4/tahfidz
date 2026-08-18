<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Config;

abstract class TestCase extends BaseTestCase
{
    /**
     * Pengaman keras: jangan pernah membiarkan test berjalan terhadap
     * database non-test. RefreshDatabase menjalankan migrate:fresh — bila
     * konfigurasi meleset (mis. env shell menimpa pengaturan phpunit.xml),
     * test WAJIB gagal di sini, bukan menghapus data database asli.
     */
    protected function setUp(): void
    {
        // Lapis 1: cek env mentah SEBELUM app boot. Laravel membaca $_SERVER
        // lebih dulu (lihat helper env()), jadi inilah penentu utama — dan
        // masih jauh sebelum RefreshDatabase sempat menjalankan migrate.
        $rawConnection = $_SERVER['DB_CONNECTION'] ?? ($_ENV['DB_CONNECTION'] ?? getenv('DB_CONNECTION'));

        if ($rawConnection !== 'sqlite') {
            $this->fail(
                'Test dibatalkan: DB_CONNECTION bukan sqlite (nilai: '.var_export($rawConnection, true).'). '.
                'Periksa phpunit.xml — test tidak boleh menyentuh database asli.'
            );
        }

        parent::setUp();

        // Lapis 2: konfirmasi config yang benar-benar dipakai setelah boot.
        $connection = Config::get('database.default');
        $database = Config::get("database.connections.{$connection}.database");

        if ($connection !== 'sqlite' || $database !== ':memory:') {
            $this->fail(
                "Test dibatalkan: database default '{$connection}' ({$database}) bukan sqlite :memory:. ".
                'Periksa phpunit.xml — test tidak boleh menyentuh database asli.'
            );
        }
    }
}
