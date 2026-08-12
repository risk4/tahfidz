<?php

namespace App\Http\Requests\Master;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Domain\People\Models\Student::class);
    }

    public function rules(): array
    {
        $studentId = $this->route('student')?->id;

        return [
            'user_id' => ['nullable', 'exists:users,id', Rule::unique('students', 'user_id')->ignore($studentId)],
            'student_code' => ['required', 'string', 'max:30', Rule::unique('students', 'student_code')->ignore($studentId)],
            'nis' => ['nullable', 'string', 'max:30'],
            'nisn' => ['nullable', 'string', 'max:30'],
            'name' => ['required', 'string', 'max:150'],
            'gender' => ['required', Rule::in(['L', 'P'])],
            'birth_place' => ['nullable', 'string', 'max:100'],
            'birth_date' => ['nullable', 'date'],
            'class_id' => ['required', 'exists:classes,id'],
            'academic_year_id' => ['required', 'exists:academic_years,id'],
            'status' => ['sometimes', Rule::in(['active', 'inactive', 'graduated'])],
        ];
    }
}
