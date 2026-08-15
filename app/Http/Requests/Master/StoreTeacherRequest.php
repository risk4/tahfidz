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
            'gender' => ['nullable', Rule::in(['L', 'P'])],
            'nip' => ['nullable', 'string', 'max:30'],
            'nuptk' => ['nullable', 'string', 'max:30'],
            'birth_place' => ['nullable', 'string', 'max:100'],
            'birth_date' => ['nullable', 'date'],
            'photo_path' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:150', Rule::unique('teachers', 'email')->ignore($teacherId)],
            'address' => ['nullable', 'string', 'max:500'],
            'subject' => ['nullable', 'string', 'max:100'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
            // Akun login opsional: bila password diisi, buat/link akun User role teacher.
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
        ];
    }

    public function messages(): array
    {
        return [
            'password.min' => 'Password minimal 8 karakter.',
            'password.confirmed' => 'Konfirmasi password tidak cocok.',
        ];
    }
}
