<?php

namespace App\Http\Controllers\Api\Tahfidz;

use App\Domain\People\Models\Student;
use App\Domain\People\Models\User;
use App\Domain\People\Support\SupervisedStudentScope;
use App\Domain\Settings\Services\SettingsService;
use App\Domain\Tahfidz\Models\Certificate;
use App\Domain\Tahfidz\Models\StudentProgressSummary;
use App\Domain\Tahfidz\Services\CertificateService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CertificateController extends Controller
{
    public function __construct(
        private readonly CertificateService $certificates,
        private readonly SettingsService $settings,
    ) {}

    /**
     * Daftar sertifikat yang telah diterbitkan.
     *
     * Super admin melihat semua; guru hanya untuk santri binaannya;
     * santri hanya miliknya sendiri.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Certificate::query()
            ->with(['student:id,name,student_code,class_id', 'student.classRoom:id,name']);

        if ($user->isStudent()) {
            $query->where('student_id', $user->student?->id);
        } elseif ($user->isTeacher()) {
            SupervisedStudentScope::apply($query, $user, viaRelation: true);
        } elseif (! $user->isSuperAdmin()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($studentId = $request->integer('student_id')) {
            $query->where('student_id', $studentId);
        }

        if ($classId = $request->integer('class_id')) {
            $query->whereHas('student', fn ($q) => $q->where('class_id', $classId));
        }

        if ($search = $request->string('search')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('certificate_number', 'like', "%{$search}%")
                    ->orWhereHas('student', fn ($s) => $s
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('student_code', 'like', "%{$search}%"));
            });
        }

        $perPage = min(max($request->integer('per_page', 15), 5), 100);

        return $query->orderByDesc('created_at')->paginate($perPage)->withQueryString();
    }

    /** Statistik ringkas untuk kartu KPI halaman sertifikat. */
    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->isSuperAdmin() && ! $user->isTeacher()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $certQuery = Certificate::query();
        SupervisedStudentScope::apply($certQuery, $user, viaRelation: true);

        $eligibleQuery = StudentProgressSummary::query()
            ->where('total_juz_completed', '>=', 1);
        SupervisedStudentScope::apply($eligibleQuery, $user, viaRelation: true);

        return response()->json([
            'total_certificates' => (int) (clone $certQuery)->count(),
            'total_recipients' => (int) (clone $certQuery)->distinct('student_id')->count('student_id'),
            'eligible_students' => (int) (clone $eligibleQuery)->count(),
            'kamil_count' => (int) (clone $certQuery)->where('juz_count', '>=', 30)->count(),
        ]);
    }

    /**
     * Daftar santri yang memenuhi syarat menerima sertifikat
     * (memiliki minimal satu juz tuntas) beserta tingkat tertinggi
     * yang sudah bersertifikat.
     */
    public function eligible(Request $request)
    {
        $user = $request->user();

        if (! $user->isSuperAdmin() && ! $user->isTeacher()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $query = StudentProgressSummary::query()
            ->where('total_juz_completed', '>=', 1)
            ->with(['student:id,name,student_code,class_id', 'student.classRoom:id,name']);

        SupervisedStudentScope::apply($query, $user, viaRelation: true);

        if ($search = $request->string('search')->toString()) {
            $query->whereHas('student', fn ($q) => $q
                ->where('name', 'like', "%{$search}%")
                ->orWhere('student_code', 'like', "%{$search}%"));
        }

        // Tingkat juz tertinggi yang sudah bersertifikat per santri.
        $certifiedMax = Certificate::query()
            ->select('student_id', DB::raw('MAX(juz_count) as certified_max'))
            ->groupBy('student_id');

        $rows = $query
            ->leftJoinSub($certifiedMax, 'certified', fn ($join) => $join->on('student_progress_summary.student_id', '=', 'certified.student_id'))
            ->orderByDesc('total_juz_completed')
            ->limit(min(max($request->integer('per_page', 100), 10), 200))
            ->get([
                'student_progress_summary.student_id',
                'total_juz_completed',
                DB::raw('COALESCE(certified.certified_max, 0) as certified_max'),
            ]);

        $students = Student::withTrashed()
            ->whereIn('id', $rows->pluck('student_id'))
            ->get()
            ->keyBy('id');

        return response()->json([
            'data' => $rows->map(function ($row) use ($students) {
                /** @var Student|null $student */
                $student = $students->get($row->student_id);

                return [
                    'student_id' => (int) $row->student_id,
                    'name' => $student?->name,
                    'student_code' => $student?->student_code,
                    'class_name' => $student?->classRoom?->name,
                    'starting_juz' => (int) ($student?->starting_juz ?? 0),
                    'total_juz_completed' => (int) $row->total_juz_completed,
                    'certified_max_juz' => (int) $row->certified_max,
                    'juz_label' => $this->simpleJuzLabel((int) $row->total_juz_completed, $student),
                    'already_certified' => (int) $row->certified_max >= (int) $row->total_juz_completed,
                ];
            })->filter(fn ($row) => $row['name'] !== null)->values(),
        ]);
    }

    /** Terbitkan sertifikat baru. */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->isSuperAdmin() && ! $user->isTeacher()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $validated = $request->validate([
            'student_id' => ['required', 'integer', 'exists:students,id'],
            'juz_count' => ['required', 'integer', 'min:1', 'max:30'],
            'issued_date' => ['required', 'date'],
            'pembina_name' => ['nullable', 'string', 'max:120'],
            'pengajar_name' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        /** @var Student $student */
        $student = Student::findOrFail($validated['student_id']);

        if ($user->isTeacher() && ! ($user->teacher?->supervises($student->id) ?? false)) {
            return response()->json(['message' => 'Santri bukan binaan Anda.'], 403);
        }

        try {
            $certificate = $this->certificates->issue(
                $student,
                (int) $validated['juz_count'],
                $validated['issued_date'],
                $validated['pembina_name'] ?? null,
                $validated['pengajar_name'] ?? null,
                $validated['notes'] ?? null,
                $user->id,
            );
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'errors' => ['juz_count' => [$e->getMessage()]],
            ], 422);
        }

        return response()->json([
            'message' => 'Sertifikat berhasil diterbitkan.',
            'certificate' => $this->certificates->payload($certificate),
        ], 201);
    }

    /** Detail satu sertifikat (data siap-render). */
    public function show(Request $request, Certificate $certificate): JsonResponse
    {
        $user = $request->user();
        $this->authorizeView($user, $certificate);

        return response()->json(['certificate' => $this->certificates->payload($certificate)]);
    }

    /** Hapus (cabut) sertifikat. */
    public function destroy(Request $request, Certificate $certificate): JsonResponse
    {
        $user = $request->user();

        if (! $user->isSuperAdmin() && ! $user->isTeacher()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($user->isTeacher() && ! ($user->teacher?->supervises($certificate->student_id) ?? false)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $certificate->delete();

        return response()->json(['message' => 'Sertifikat berhasil dihapus.']);
    }

    /**
     * Verifikasi publik via kode QR — tanpa autentikasi.
     * Hanya mengekspos data minimum yang aman untuk publik.
     */
    public function verify(string $verificationCode): JsonResponse
    {
        $certificate = Certificate::withTrashed()
            ->with(['student:id,name,deleted_at', 'student.classRoom:id,name'])
            ->where('verification_code', $verificationCode)
            ->first();

        if (! $certificate || $certificate->trashed() || ! $certificate->student) {
            return response()->json([
                'valid' => false,
                'message' => 'Sertifikat tidak ditemukan atau telah dicabut.',
            ]);
        }

        $profile = $this->settings->rawGroup('profile');

        return response()->json([
            'valid' => true,
            'certificate' => [
                'certificate_number' => $certificate->certificate_number,
                'juz_count' => (int) $certificate->juz_count,
                'juz_label' => $this->certificates->juzLabel($certificate->student, (int) $certificate->juz_count),
                'issued_date' => $certificate->issued_date?->toDateString(),
                'institution_name' => $profile['name'],
                'student_name' => $certificate->student->name,
                'class_name' => $certificate->student->classRoom?->name,
            ],
        ]);
    }

    /**
     * Label juz berbasis urutan target hafalan (mulai dari starting_juz
     * dan mundur), konsisten dengan logika target pada ProgressService.
     */
    private function simpleJuzLabel(int $count, ?Student $student): string
    {
        if ($count <= 0) {
            return '-';
        }

        $start = (int) ($student?->starting_juz ?? 0);
        if ($start < 1 || $start > 30) {
            $start = 30;
        }

        $numbers = [];
        for ($i = 0; $i < $count; $i++) {
            $j = $start - $i;
            if ($j < 1) {
                $j += 30;
            }
            $numbers[] = $j;
        }
        sort($numbers);

        $min = (int) reset($numbers);
        $max = (int) end($numbers);

        return $min === $max ? "Juz {$min}" : "Juz {$min} – {$max}";
    }

    private function authorizeView(User $user, Certificate $certificate): void
    {
        if ($user->isSuperAdmin()) {
            return;
        }

        if ($user->isStudent() && $user->student?->id === $certificate->student_id) {
            return;
        }

        if ($user->isTeacher() && ($user->teacher?->supervises($certificate->student_id) ?? false)) {
            return;
        }

        abort(403, 'Forbidden.');
    }
}
