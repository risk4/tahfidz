<?php

namespace App\Http\Requests\Settings;

use App\Domain\Settings\Models\AppSetting;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UploadLogoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', AppSetting::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'key' => ['required', Rule::in(['profile.logo_path', 'application.logo_path', 'application.favicon_path'])],
            'file' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ];
    }

    public function messages(): array
    {
        return [
            'file.max' => 'Ukuran logo maksimal 2 MB.',
            'file.mimes' => 'Logo harus berformat JPG, JPEG, PNG, atau WebP.',
        ];
    }
}
