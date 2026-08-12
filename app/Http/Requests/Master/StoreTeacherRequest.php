<?php

namespace App\Http\Requests\Master;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTeacherRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Domain\People\Models\Teacher::class);
    }

    public function rules(): array
    {
        $teacherId = $this->route('teacher')?->id;

        return [
            'user_id' => ['nullable', 'exists:users,id', Rule::unique('teachers', 'user_id')->ignore($teacherId)],
            'teacher_code' => ['required', 'string', 'max:30', Rule::unique('teachers', 'teacher_code')->ignore($teacherId)],
            'name' => ['required', 'string', 'max:150'],
            'nip' => ['nullable', 'string', 'max:30'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:150'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
        ];
    }
}
