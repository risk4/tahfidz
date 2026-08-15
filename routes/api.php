<?php

use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Dashboard\DashboardController;
use App\Http\Controllers\Api\Master\AcademicYearController;
use App\Http\Controllers\Api\Master\ClassRoomController;
use App\Http\Controllers\Api\Master\StudentController;
use App\Http\Controllers\Api\Master\TahfidzGroupController;
use App\Http\Controllers\Api\Quran\QuranController;
use App\Http\Controllers\Api\Tahfidz\MurajaahController;
use App\Http\Controllers\Api\Tahfidz\ProgressController;
use App\Http\Controllers\Api\Tahfidz\SubmissionController;

use App\Http\Controllers\Api\Master\TeacherController;
use App\Http\Controllers\Api\Settings\SettingsController;
use Illuminate\Support\Facades\Route;

// ===== AUTH =====
Route::post('/auth/login', [AuthController::class, 'login'])
    ->middleware('throttle:10,1'); // rate limit login: 10x/menit

Route::middleware(['auth:sanctum', 'password.changed'])->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/auth/change-password', [AuthController::class, 'changePassword']);

    // ===== MASTER DATA (STEP 2 scope) =====
    Route::apiResource('academic-years', AcademicYearController::class)
        ->only(['index', 'store', 'update']);
    Route::post('/academic-years/{academicYear}/activate', [AcademicYearController::class, 'activate']);

    Route::get('/teachers/export', [TeacherController::class, 'export']);
    Route::get('/teachers/import-template', [TeacherController::class, 'importTemplate']);
    Route::post('/teachers/import', [TeacherController::class, 'import']);
    Route::get('/teachers/stats', [TeacherController::class, 'stats']);
    Route::get('/teachers/{teacher}/performance', [TeacherController::class, 'performance']);
    Route::apiResource('teachers', TeacherController::class);

    Route::get('/students/export', [StudentController::class, 'export']);
    Route::get('/students/import-template', [StudentController::class, 'importTemplate']);
    Route::post('/students/import', [StudentController::class, 'import']);
    Route::apiResource('students', StudentController::class);
    Route::apiResource('santri', StudentController::class)->parameters(['santri' => 'student']);

    Route::apiResource('classes', ClassRoomController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->parameters(['classes' => 'class']);

    Route::apiResource('tahfidz-groups', TahfidzGroupController::class);
    Route::post('/tahfidz-groups/{tahfidzGroup}/members', [TahfidzGroupController::class, 'addMember']);
    Route::delete('/tahfidz-groups/{tahfidzGroup}/members/{studentId}', [TahfidzGroupController::class, 'removeMember']);

    // ===== QURAN REFERENCE (STEP 3) — data rujukan hanya-baca =====
    Route::get('/quran/juz', [QuranController::class, 'juz']);
    Route::get('/quran/surahs', [QuranController::class, 'surahs']);
    Route::get('/quran/surahs/{surah}', [QuranController::class, 'surah']);
    Route::get('/quran/surahs/{surah}/ayahs', [QuranController::class, 'ayahs']);

    // ===== SUBMISSION & MURAJAAH (STEP 3) =====
    Route::apiResource('submissions', SubmissionController::class);
    Route::apiResource('murajaahs', MurajaahController::class);
    Route::apiResource('murajaah', MurajaahController::class)->parameters(['murajaah' => 'murajaah']);
    Route::get('/murajaahs/{murajaah}/ayah-statuses', [MurajaahController::class, 'ayahStatuses']);
    Route::patch('/murajaahs/{murajaah}/ayah-status', [MurajaahController::class, 'updateAyahStatus']);

    // ===== PROGRESS (STEP 3) =====
    Route::get('/progress/stats', [ProgressController::class, 'stats']);
    Route::get('/progress', [ProgressController::class, 'index']);
    Route::get('/progress/{student}', [ProgressController::class, 'show']);

    // ===== DASHBOARD =====
    Route::get('/dashboard/overview', [DashboardController::class, 'overview']);

    // ===== SETTINGS (halaman Pengaturan — khusus super admin via policy) =====
    Route::get('/settings', [SettingsController::class, 'index']);
    Route::put('/settings/{group}', [SettingsController::class, 'update']);
    Route::post('/settings/logo', [SettingsController::class, 'uploadLogo']);
    Route::delete('/settings/logo', [SettingsController::class, 'deleteLogo']);
    Route::post('/settings/test-email', [SettingsController::class, 'testEmail']);
    Route::get('/settings/users', [SettingsController::class, 'users']);
    Route::post('/settings/users/{user}/toggle-active', [SettingsController::class, 'toggleUserActive']);
    Route::get('/settings/activity-logs', [SettingsController::class, 'activityLogs']);
    Route::get('/settings/sessions', [SettingsController::class, 'sessions']);
    Route::delete('/settings/sessions/{tokenId}', [SettingsController::class, 'revokeSession']);
    Route::post('/settings/logout-all', [SettingsController::class, 'logoutAll']);
    Route::post('/settings/backup', [SettingsController::class, 'backupNow']);

    // Endpoint quran/submissions/murajaah/progress/reports akan ditambahkan
    // di STEP 3 dan STEP 4/5 sesuai rencana bertahap — belum di file ini.
});

