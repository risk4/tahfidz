<?php

namespace App\Http\Controllers\Api\Master;

use App\Domain\TahfidzGroup\Models\TahfidzGroup;
use App\Http\Controllers\Controller;
use App\Http\Requests\Master\StoreTahfidzGroupRequest;
use Illuminate\Http\Request;

class TahfidzGroupController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', TahfidzGroup::class);

        $query = TahfidzGroup::query()->with('teacher')->withCount('members');

        if ($request->user()->isTeacher()) {
            $teacherId = $request->user()->teacher?->id;

            // Guru tanpa profil Teacher tidak membina halaqah apa pun —
            // jangan sampai where(..., null) menjadi whereNull('teacher_id')
            // yang menampilkan halaqah tanpa pembimbing.
            $query->when($teacherId !== null, fn ($q) => $q->where('teacher_id', $teacherId))
                ->when($teacherId === null, fn ($q) => $q->whereRaw('1 = 0'));
        }

        return $query->paginate(min(max($request->integer('per_page', 20), 5), 100));
    }

    public function store(StoreTahfidzGroupRequest $request)
    {
        $group = TahfidzGroup::create($request->validated());

        return response()->json($group, 201);
    }

    public function show(TahfidzGroup $tahfidzGroup)
    {
        $this->authorize('view', $tahfidzGroup);

        return $tahfidzGroup->load('members');
    }

    public function update(StoreTahfidzGroupRequest $request, TahfidzGroup $tahfidzGroup)
    {
        $this->authorize('update', $tahfidzGroup);

        $tahfidzGroup->update($request->validated());

        return response()->json($tahfidzGroup);
    }

    public function destroy(TahfidzGroup $tahfidzGroup)
    {
        $this->authorize('delete', $tahfidzGroup);

        $tahfidzGroup->delete();

        return response()->json(['message' => 'Kelompok tahfidz berhasil dihapus.']);
    }

    public function addMember(Request $request, TahfidzGroup $tahfidzGroup)
    {
        $this->authorize('manageMembers', $tahfidzGroup);

        $data = $request->validate([
            'student_id' => ['required', 'exists:students,id'],
        ]);

        $tahfidzGroup->members()->syncWithoutDetaching([
            $data['student_id'] => ['joined_at' => now()->toDateString()],
        ]);

        return response()->json(['message' => 'Anggota berhasil ditambahkan.']);
    }

    public function removeMember(TahfidzGroup $tahfidzGroup, int $studentId)
    {
        $this->authorize('manageMembers', $tahfidzGroup);

        $tahfidzGroup->members()->detach($studentId);

        return response()->json(['message' => 'Anggota berhasil dihapus.']);
    }
}
