<?php

namespace App\Http\Requests\Master;

use App\Domain\People\Models\Teacher;
use Illuminate\Foundation\Http\FormRequest;

class UploadTeacherPhotoRequest extends FormRequest
{
    public function authorize(): bool
    {
        $teacher = $this->route('teacher');

        return $teacher
            ? $this->user()->can('update', $teacher)
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
