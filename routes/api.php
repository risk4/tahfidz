<?php

use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Master\AcademicYearController;
use App\Http\Controllers\Api\Master\ClassRoomController;
use App\Http\Controllers\Api\Master\StudentController;
use App\Http\Controllers\Api\Master\TahfidzGroupController;
use App\Http\Controllers\Api\Quran\QuranController;
use App\Http\Controllers\Api\Tahfidz\MurajaahController;
use App\Http\Controllers\Api\Tahfidz\ProgressController;
use App\Http\Controllers\Api\Tahfidz\SubmissionController;

use App\Http\Controllers\Api\Master\TeacherController;
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
    Route::get('/progress', [ProgressController::class, 'index']);
    Route::get('/progress/{student}', [ProgressController::class, 'show']);

    // Endpoint quran/submissions/murajaah/progress/reports akan ditambahkan
    // di STEP 3 dan STEP 4/5 sesuai rencana bertahap — belum di file ini.
});

