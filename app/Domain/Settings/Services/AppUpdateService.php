<?php

namespace App\Domain\Settings\Services;

use Illuminate\Support\Facades\Log;
use RuntimeException;
use Symfony\Component\Process\Process;

/**
 * Layanan "Cek Update": membandingkan kode aplikasi yang berjalan dengan
 * repository GitHub lalu menjalankan proses pembaruan langsung dari
 * aplikasi — pengganti eksekusi deploy.sh lewat terminal di VPS.
 *
 * Proses pembaruan dieksekusi sebagai generator event (langkah + baris
 * keluaran) agar bisa di-stream ke klien secara realtime (NDJSON),
 * sekaligus direkam ke file status di storage/app untuk dipantau ulang.
 *
 * Keamanan: seluruh perintah adalah whitelist tetap (tanpa input pengguna)
 * dan hanya boleh dijalankan oleh super admin (dicek di controller).
 */
class AppUpdateService
{
    /** File status pembaruan di storage/app. */
    private const STATE_FILE = 'app-update-state.json';

    /** Status "running" dianggap basi setelah batas waktu ini (menit). */
    private const STALE_MINUTES = 45;

    private const GIT_TIMEOUT = 120;

    private const PROCESS_TIMEOUT = 1800;

    /** Apakah langkah kritis terakhir gagal sehingga alur harus dihentikan. */
    private bool $aborted = false;

    /**
     * Informasi versi aplikasi yang sedang berjalan.
     */
    public function currentVersion(): array
    {
        $head = $this->git([
            'log', '-1', '--pretty=format:%H%x1f%h%x1f%s%x1f%an%x1f%aI', 'HEAD',
        ]);

        [$hash, $short, $subject, $author, $date] = array_pad(explode("\x1f", $head), 5, null);

        return [
            'branch' => $this->git(['rev-parse', '--abbrev-ref', 'HEAD']),
            'commit_hash' => $hash,
            'commit_short' => $short,
            'subject' => $subject,
            'author_name' => $author,
            'commit_date' => $date,
        ];
    }

    /**
     * Bandingkan versi lokal dengan branch yang sama di origin (GitHub).
     * Selalu melakukan `git fetch` agar informasi benar-benar mutakhir.
     */
    public function check(): array
    {
        $result = [
            'up_to_date' => false,
            'error' => null,
            'current' => null,
            'remote' => null,
            'behind' => 0,
            'pending_commits' => [],
            'dirty_files' => 0,
        ];

        try {
            $result['current'] = $this->currentVersion();
        } catch (\Throwable $e) {
            $result['error'] = str_contains($e->getMessage(), 'proc_open')
                ? 'Fungsi PHP "proc_open" dinonaktifkan oleh server sehingga pembaruan tidak dapat menjalankan '
                    .'perintah git/composer/npm. Hapus "proc_open" dan "proc_get_status" dari daftar '
                    .'disable_functions pada pengaturan PHP Anda, lalu mulai ulang layanan PHP.'
                : 'Perintah git tidak dapat dijalankan: '.$e->getMessage();

            return $result;
        }

        try {
            $porcelain = $this->git(['status', '--porcelain']);
            $result['dirty_files'] = $porcelain === '' ? 0 : count(preg_split("/\r\n|\r|\n/", trim($porcelain)));
        } catch (\Throwable) {
            $result['dirty_files'] = 0;
        }

        $branch = $result['current']['branch'] ?: 'main';

        try {
            $this->git(['fetch', 'origin', '--prune'], self::GIT_TIMEOUT);
        } catch (\Throwable $e) {
            $result['error'] = 'Gagal menghubungi repository GitHub. Periksa koneksi atau kredensial git. ('.$e->getMessage().')';

            return $result;
        }

        try {
            $remoteHash = $this->git(['rev-parse', 'origin/'.$branch]);
            $behind = (int) $this->git(['rev-list', '--count', 'HEAD..origin/'.$branch]);

            $result['remote'] = ['branch' => $branch, 'commit_hash' => $remoteHash];
            $result['behind'] = $behind;
            $result['up_to_date'] = $behind === 0;
            $result['pending_commits'] = $this->pendingCommits($branch);
        } catch (\Throwable $e) {
            $result['error'] = 'Branch origin/'.$branch.' tidak dapat dibaca. ('.$e->getMessage().')';
        }

        return $result;
    }

    /**
     * Daftar commit yang belum diterapkan pada instalasi lokal.
     *
     * @return array<int, array{sha_short:string, subject:string, author_name:?string, date:?string}>
     */
    public function pendingCommits(string $branch): array
    {
        $output = $this->git([
            'log', 'HEAD..origin/'.$branch, '--reverse', '--pretty=format:%h%x09%s%x09%an%x09%aI',
        ]);

        if ($output === '') {
            return [];
        }

        return collect(preg_split("/\r\n|\r|\n/", $output))
            ->filter()
            ->map(function ($line) {
                [$sha, $subject, $author, $date] = array_pad(explode("\t", $line, 4), 4, null);

                return [
                    'sha_short' => $sha,
                    'subject' => $subject,
                    'author_name' => $author,
                    'date' => $date,
                ];
            })
            ->all();
    }

    /**
     * Apakah proses pembaruan sedang berjalan (belum basi)?
     */
    public function isRunning(): bool
    {
        $state = $this->readState();

        if (($state['status'] ?? null) !== 'running') {
            return false;
        }

        $startedAt = isset($state['started_at']) ? strtotime((string) $state['started_at']) : false;

        if ($startedAt === false) {
            return false;
        }

        return (time() - $startedAt) < (self::STALE_MINUTES * 60);
    }

    /**
     * Ringkasan status pembaruan untuk UI.
     */
    public function status(): array
    {
        $state = $this->readState();

        return [
            'running' => $this->isRunning(),
            'last_run' => in_array($state['status'] ?? null, ['success', 'failed'], true)
                ? [
                    'status' => $state['status'],
                    'finished_at' => $state['finished_at'] ?? null,
                    'message' => $state['message'] ?? null,
                ]
                : null,
        ];
    }

    /**
     * Jalankan seluruh alur pembaruan sebagai generator event:
     * {type: step|output|done}. Tidak melempar exception — kegagalan
     * dilaporkan lewat event done dengan success=false.
     */
    public function runWithEvents(): \Generator
    {
        if ($this->isRunning()) {
            yield ['type' => 'done', 'success' => false, 'message' => 'Masih ada proses pembaruan lain yang berjalan.'];

            return;
        }

        $this->beginState();
        $this->aborted = false;

        try {
            yield from $this->runStep('Sinkronisasi dengan GitHub', ['git', 'fetch', 'origin', '--prune']);

            if (! $this->aborted) {
                $branch = 'main';

                try {
                    $branch = $this->git(['rev-parse', '--abbrev-ref', 'HEAD']) ?: 'main';
                } catch (\Throwable) {
                }

                yield from $this->runStep(
                    "Menarik kode terbaru dari origin/{$branch}",
                    ['git', 'reset', '--hard', 'origin/'.$branch],
                );
            }

            // Dependensi PHP (composer) — wajib ada di lingkungan produksi.
            if (! $this->aborted) {
                if ($this->commandExists('composer')) {
                    $composerArgs = [
                        'composer', 'install', '--no-interaction', '--prefer-dist', '--optimize-autoloader',
                    ];

                    if (app()->environment('production')) {
                        $composerArgs[] = '--no-dev';
                    }

                    yield from $this->runStep('Memperbarui dependensi PHP (composer)', $composerArgs);
                } else {
                    $this->logLine('[SKIP] composer tidak ditemukan — dependensi PHP dilewati.');
                    yield ['type' => 'output', 'line' => '[SKIP] composer tidak ditemukan — dependensi PHP dilewati.'];
                }
            }

            // Build aset frontend (npm) — hanya bila npm tersedia.
            if (! $this->aborted) {
                if ($this->commandExists('npm')) {
                    yield ['type' => 'step', 'key' => 'assets', 'label' => 'Membangun aset frontend (npm)'];
                    $this->logLine('→ Membangun aset frontend (npm)');

                    yield from $this->runCommand(
                        ['npm', 'ci', '--prefer-offline', '--no-audit', '--no-fund'],
                        critical: false,
                    );

                    if ($this->lastExitFailed) {
                        $this->logLine('[WARN] npm ci gagal — mencoba npm install...');
                        yield ['type' => 'output', 'line' => '[WARN] npm ci gagal — mencoba npm install...'];
                        yield from $this->runCommand(['npm', 'install', '--no-audit', '--no-fund'], critical: false);
                    }

                    yield from $this->runCommand(['npm', 'run', 'build']);
                } else {
                    $this->logLine('[SKIP] npm tidak ditemukan — build aset dilewati.');
                    yield ['type' => 'output', 'line' => '[SKIP] npm tidak ditemukan — build aset dilewati.'];
                }
            }

            // Perintah Laravel.
            if (! $this->aborted) {
                $php = PHP_BINARY;
                $artisan = base_path('artisan');

                yield from $this->runStep('Menjalankan migrasi database', [$php, $artisan, 'migrate', '--force']);

                if (! $this->aborted) {
                    yield ['type' => 'step', 'key' => 'housekeeping', 'label' => 'Housekeeping Laravel'];
                    $this->logLine('→ Housekeeping Laravel');

                    yield from $this->runCommand([$php, $artisan, 'storage:link'], critical: false);
                    yield from $this->runCommand([$php, $artisan, 'config:clear'], critical: false);
                    yield from $this->runCommand([$php, $artisan, 'cache:clear'], critical: false);
                    yield from $this->runCommand([$php, $artisan, 'route:clear'], critical: false);
                    yield from $this->runCommand([$php, $artisan, 'view:clear'], critical: false);
                    yield from $this->runCommand([$php, $artisan, 'config:cache']);
                    yield from $this->runCommand([$php, $artisan, 'route:cache']);
                    yield from $this->runCommand([$php, $artisan, 'view:cache']);
                }

                // Permission storage (hanya relevan di Linux/VPS).
                if (! $this->aborted && PHP_OS_FAMILY !== 'Windows') {
                    yield from $this->runStep(
                        'Menyesuaikan permission storage',
                        ['chmod', '-R', '775', 'storage', 'bootstrap/cache'],
                        critical: false,
                    );
                }
            }
        } catch (\Throwable $e) {
            Log::error('Update aplikasi gagal: '.$e->getMessage());

            $message = 'Terjadi kesalahan tak terduga: '.$e->getMessage();
            $this->finishState(false, $message);
            $this->aborted = true;

            yield ['type' => 'output', 'line' => '[ERROR] '.$message];
            yield ['type' => 'done', 'success' => false, 'message' => $message];

            return;
        }

        if ($this->aborted) {
            return; // status gagal sudah ditulis oleh runCommand.
        }

        $this->finishState(true, 'Aplikasi berhasil diperbarui ke versi terbaru.');

        yield ['type' => 'done', 'success' => true, 'message' => 'Aplikasi berhasil diperbarui ke versi terbaru.'];
    }

    /* ================================================================
     * Eksekusi proses
     * ================================================================ */

    /** Flag hasil eksekusi terakhir (untuk pola fallback npm). */
    private bool $lastExitFailed = false;

    /**
     * Satu langkah bernama: emit event step lalu jalankan perintahnya.
     */
    private function runStep(string $label, array $command, bool $critical = true): \Generator
    {
        yield ['type' => 'step', 'key' => $label, 'label' => $label];

        yield from $this->runCommand($command, $label, $critical);
    }

    /**
     * Jalankan perintah sambil men-streaming keluarannya sebagai event.
     */
    private function runCommand(array $command, ?string $label = null, bool $critical = true): \Generator
    {
        $this->lastExitFailed = false;

        $display = $label ?? implode(' ', $command);
        if ($label !== null) {
            $this->logLine("→ {$label}");
        }

        $process = new Process($command, base_path(), null, null, self::PROCESS_TIMEOUT);
        $process->start();

        foreach ($process as $type => $buffer) {
            foreach (preg_split("/\r\n|\r|\n/", (string) $buffer) as $line) {
                $line = rtrim((string) $line);

                if ($line === '') {
                    continue;
                }

                $this->logLine($line);
                yield ['type' => 'output', 'line' => $line];
            }
        }

        if ($process->isSuccessful()) {
            return;
        }

        $error = trim($process->getErrorOutput() ?: $process->getOutput());
        $message = "{$display} gagal.".($error !== '' ? " {$error}" : '');

        $this->lastExitFailed = true;

        if (! $critical) {
            $this->logLine("[WARN] {$message}");
            yield ['type' => 'output', 'line' => "[WARN] {$message}"];

            return;
        }

        $this->logLine("[ERROR] {$message}");
        yield ['type' => 'output', 'line' => "[ERROR] {$message}"];
        yield ['type' => 'done', 'success' => false, 'message' => $message];

        $this->finishState(false, $message);
        $this->aborted = true;
    }

    /* ================================================================
     * Helper git & sistem
     * ================================================================ */

    private function git(array $args, int $timeout = self::GIT_TIMEOUT): string
    {
        $process = new Process(array_merge(['git'], $args), base_path());
        $process->setTimeout($timeout);
        $process->run();

        if (! $process->isSuccessful()) {
            throw new RuntimeException(trim($process->getErrorOutput() ?: $process->getOutput()) ?: 'git gagal dijalankan.');
        }

        return trim($process->getOutput());
    }

    private function commandExists(string $binary): bool
    {
        $finder = Process::fromShellCommandline(
            PHP_OS_FAMILY === 'Windows' ? 'where :binary' : 'command -v :binary',
            null,
            null,
            null,
            15,
        );
        $finder->run(null, ['binary' => $binary]);

        return $finder->successful();
    }

    /* ================================================================
     * State persistence (storage/app/app-update-state.json)
     * ================================================================ */

    private function statePath(): string
    {
        return storage_path('app/'.self::STATE_FILE);
    }

    private function readState(): array
    {
        $path = $this->statePath();

        if (! is_file($path)) {
            return [];
        }

        try {
            return json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR) ?? [];
        } catch (\Throwable) {
            return [];
        }
    }

    private function writeState(array $state): void
    {
        $path = $this->statePath();

        try {
            @file_put_contents($path, json_encode($state, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        } catch (\Throwable) {
            // Kegagalan penulisan status tidak boleh menggagalkan update.
        }
    }

    private function beginState(): void
    {
        $this->writeState([
            'status' => 'running',
            'started_at' => now()->toIso8601String(),
            'finished_at' => null,
            'message' => null,
            'log' => [],
        ]);
    }

    private function logLine(string $line): void
    {
        $state = $this->readState();
        $log = $state['log'] ?? [];
        $log[] = $line;
        $state['log'] = array_slice($log, -500);
        $this->writeState($state);
    }

    private function finishState(bool $success, string $message): void
    {
        $state = $this->readState();
        $state['status'] = $success ? 'success' : 'failed';
        $state['finished_at'] = now()->toIso8601String();
        $state['message'] = $message;
        $this->writeState($state);
    }
}
