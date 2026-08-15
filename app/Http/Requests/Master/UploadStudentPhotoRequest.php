<?php

namespace App\Http\Requests\Master;

use App\Domain\People\Models\Student;
use Illuminate\Foundation\Http\FormRequest;

class UploadStudentPhotoRequest extends FormRequest
{
    public function authorize(): bool
    {
        $student = $this->route('student');

        return $student
            ? $this->user()->can('update', $student)
            : false;
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ];
    }

    public function messages(): array
    {
        return [
            'file.required' => 'Pilih file foto terlebih dahulu.',
            'file.image' => 'File harus berupa gambar.',
            'file.mimes' => 'Foto harus berformat JPG, JPEG, PNG, atau WebP.',
            'file.max' => 'Ukuran foto maksimal 2 MB.',
        ];
    }
}
