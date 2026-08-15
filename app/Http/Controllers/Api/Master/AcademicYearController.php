<?php

namespace App\Http\Controllers\Api\Master;

use App\Domain\Academic\Models\AcademicYear;
use App\Http\Controllers\Controller;
use App\Http\Requests\Master\StoreAcademicYearRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AcademicYearController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', AcademicYear::class);

        $perPage = min(max($request->integer('per_page', 20), 5), 100);

        return AcademicYear::orderByDesc('start_date')->paginate($perPage);
    }

    public function store(StoreAcademicYearRequest $request)
    {
        $year = AcademicYear::create($request->validated());

        return response()->json($year, 201);
    }

    public function update(StoreAcademicYearRequest $request, AcademicYear $academicYear)
    {
        $this->authorize('update', $academicYear);

        $academicYear->update($request->validated());

        return response()->json($academicYear);
    }

    /**
     * Hanya satu tahun ajaran boleh aktif. Dijalankan dalam transaction
     * agar tidak ada window kosong/dua aktif sekaligus.
     */
    public function activate(Request $request, AcademicYear $academicYear)
    {
        $this->authorize('activate', $academicYear);

        DB::transaction(function () use ($academicYear) {
            AcademicYear::where('is_active', true)->update(['is_active' => false]);
            $academicYear->update(['is_active' => true]);
        });

        return response()->json($academicYear->fresh());
    }
}
