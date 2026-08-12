<?php

namespace App\Providers;

use App\Domain\Tahfidz\Services\MurajaahService;
use App\Domain\Tahfidz\Services\ProgressService;
use App\Domain\Tahfidz\Services\SubmissionService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Services domain Tahfidz dibuat singleton agar dependency injection
        // polos (tanpa interface) tetap ter-resolve sekali.
        $this->app->singleton(ProgressService::class);
        $this->app->singleton(SubmissionService::class);
        $this->app->singleton(MurajaahService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
