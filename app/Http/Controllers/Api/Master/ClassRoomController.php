<?php

namespace App\Http\Controllers\Api\Master;

use App\Domain\Academic\Models\ClassRoom;
use App\Http\Controllers\Controller;
use App\Http\Requests\Master\StoreClassRoomRequest;
use Illuminate\Http\Request;

class ClassRoomController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', ClassRoom::class);

        $query = ClassRoom::query()->with(['homeroomTeacher', 'academicYear']);

        if ($academicYearId = $request->integer('academic_year_id')) {
            $query->where('academic_year_id', $academicYearId);
        }

        return $query->orderBy('name')->paginate(min(max($request->integer('per_page', 20), 5), 100));
    }

    public function store(StoreClassRoomRequest $request)
    {
        $class = ClassRoom::create($request->validated());

        return response()->json($class, 201);
    }

    public function update(StoreClassRoomRequest $request, ClassRoom $class)
    {
        $this->authorize('update', $class);

        $class->update($request->validated());

        return response()->json($class);
    }

    public function destroy(ClassRoom $class)
    {
        $this->authorize('delete', $class);

        $class->delete();

        return response()->json(['message' => 'Kelas berhasil dihapus.']);
    }
}
