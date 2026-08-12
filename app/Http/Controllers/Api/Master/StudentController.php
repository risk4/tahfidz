<?php

namespace App\Http\Controllers\Api\Master;

use App\Domain\People\Models\Student;
use App\Http\Controllers\Controller;
use App\Http\Requests\Master\StoreStudentRequest;
use Illuminate\Http\Request;

class StudentController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Student::class);

        $query = Student::query()->with(['classRoom', 'academicYear']);

        // Guru hanya melihat siswa yang tergabung dalam kelompok binaannya.
        if ($request->user()->isTeacher()) {
            $teacherId = $request->user()->teacher?->id;
            $query->whereHas('tahfidzGroups', fn ($q) => $q->where('teacher_id', $teacherId));
        }

        if ($classId = $request->integer('class_id')) {
            $query->where('class_id', $classId);
        }

        if ($search = $request->string('search')->toString()) {
            $query->where('name', 'like', "%{$search}%");
        }

        return $query->paginate(20);
    }

    public function store(StoreStudentRequest $request)
    {
        $student = Student::create($request->validated());

        return response()->json($student, 201);
    }

    public function show(Request $request, Student $student)
    {
        $this->authorize('view', $student);

        return $student->load(['classRoom', 'academicYear', 'tahfidzGroups']);
    }

    public function update(StoreStudentRequest $request, Student $student)
    {
        $this->authorize('update', $student);

        $student->update($request->validated());

        return response()->json($student);
    }

    public function destroy(Student $student)
    {
        $this->authorize('delete', $student);

        $student->delete();

        return response()->json(['message' => 'Siswa berhasil dihapus.']);
    }
}
