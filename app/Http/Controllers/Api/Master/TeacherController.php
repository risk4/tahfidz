<?php

namespace App\Http\Controllers\Api\Master;

use App\Domain\People\Models\Teacher;
use App\Http\Controllers\Controller;
use App\Http\Requests\Master\StoreTeacherRequest;
use Illuminate\Http\Request;

class TeacherController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Teacher::class);

        $query = Teacher::query();

        // Guru hanya boleh melihat data dirinya sendiri di listing.
        if ($request->user()->isTeacher()) {
            $query->where('id', $request->user()->teacher?->id);
        }

        if ($search = $request->string('search')->toString()) {
            $query->where('name', 'like', "%{$search}%");
        }

        return $query->paginate(20);
    }

    public function store(StoreTeacherRequest $request)
    {
        $teacher = Teacher::create($request->validated());

        return response()->json($teacher, 201);
    }

    public function show(Teacher $teacher)
    {
        $this->authorize('view', $teacher);

        return $teacher;
    }

    public function update(StoreTeacherRequest $request, Teacher $teacher)
    {
        $this->authorize('update', $teacher);

        $teacher->update($request->validated());

        return response()->json($teacher);
    }

    public function destroy(Teacher $teacher)
    {
        $this->authorize('delete', $teacher);

        $teacher->delete();

        return response()->json(['message' => 'Guru berhasil dihapus.']);
    }
}
