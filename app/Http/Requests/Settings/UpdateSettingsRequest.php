<?php

namespace App\Http\Requests\Settings;

use App\Domain\Settings\Models\AppSetting;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validasi update pengaturan. Rule disesuaikan dengan group pada URL
 * (PUT /api/settings/{group}); `sometimes` agar update parsial aman.
 */
class UpdateSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', AppSetting::class) ?? false;
    }

    public function rules(): array
    {
        return match ($this->route('group')) {
            'profile' => [
                'name' => ['sometimes', 'required', 'string', 'max:255'],
                'npsn' => ['sometimes', 'nullable', 'string', 'max:20'],
                'nsm' => ['sometimes', 'nullable', 'string', 'max:30'],
                'madrasah_type' => ['sometimes', 'nullable', Rule::in(['MI', 'MTs', 'MA', 'Pesantren', 'Lainnya'])],
                'address' => ['sometimes', 'nullable', 'string', 'max:1000'],
                'email' => ['sometimes', 'nullable', 'email', 'max:255'],
                'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
                'website' => ['sometimes', 'nullable', 'url', 'max:255'],
                'city' => ['sometimes', 'nullable', 'string', 'max:150'],
                'province' => ['sometimes', 'nullable', 'string', 'max:150'],
            ],
            'application' => [
                'app_name' => ['sometimes', 'required', 'string', 'max:150'],
                'tagline' => ['sometimes', 'nullable', 'string', 'max:255'],
                'primary_color' => ['sometimes', 'nullable', 'string', 'regex:/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/'],
                'timezone' => ['sometimes', 'nullable', 'string', 'max:50'],
                'language' => ['sometimes', 'nullable', 'string', 'max:10'],
                'date_format' => ['sometimes', 'nullable', 'string', 'max:30'],
                'time_format' => ['sometimes', 'nullable', Rule::in(['12', '24'])],
            ],
            'notifications' => [
                'setoran_enabled' => ['sometimes', 'boolean'],
                'murajaah_enabled' => ['sometimes', 'boolean'],
                'target_enabled' => ['sometimes', 'boolean'],
                'announcement_enabled' => ['sometimes', 'boolean'],
                'absensi_enabled' => ['sometimes', 'boolean'],
                'system_enabled' => ['sometimes', 'boolean'],
                'templates' => ['sometimes', 'array'],
                'templates.*' => ['nullable', 'string', 'max:1000'],
            ],
            'targets' => [
                'daily_pages' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:100'],
                'weekly_pages' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:1000'],
                'monthly_pages' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:4000'],
            ],
            'murajaah_methods' => [
                'methods' => ['sometimes', 'array', 'max:50'],
                'methods.*.id' => ['sometimes', 'integer'],
                'methods.*.name' => ['required', 'string', 'max:100'],
                'methods.*.description' => ['nullable', 'string', 'max:500'],
                'methods.*.active' => ['sometimes', 'boolean'],
                'methods.*.sort' => ['sometimes', 'integer', 'min:0', 'max:999'],
            ],
            'recitation_check' => [
                'save_enabled' => ['sometimes', 'boolean'],
            ],
            'security' => [
                'session_timeout_minutes' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:1440'],
                'two_factor_auth' => ['sometimes', 'boolean'],
                'login_notification' => ['sometimes', 'boolean'],
            ],
            'backup' => [
                'schedule_time' => ['sometimes', 'nullable', 'date_format:H:i'],
                'retention_days' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:365'],
                'encryption_enabled' => ['sometimes', 'boolean'],
            ],
            'integrations' => [
                'whatsapp_enabled' => ['sometimes', 'boolean'],
                'whatsapp_number' => ['sometimes', 'nullable', 'string', 'max:30'],
                'smtp_enabled' => ['sometimes', 'boolean'],
                'smtp_host' => ['sometimes', 'nullable', 'string', 'max:255'],
                'smtp_port' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:65535'],
                'smtp_from_name' => ['sometimes', 'nullable', 'string', 'max:150'],
                'smtp_from_email' => ['sometimes', 'nullable', 'email', 'max:255'],
                'smtp_password' => ['sometimes', 'nullable', 'string', 'max:255'],
                'cloud_storage_enabled' => ['sometimes', 'boolean'],
                'google_drive_enabled' => ['sometimes', 'boolean'],
                'api_enabled' => ['sometimes', 'boolean'],
                'api_key' => ['sometimes', 'nullable', 'string', 'max:255'],
                'webhook_enabled' => ['sometimes', 'boolean'],
                'webhook_url' => ['sometimes', 'nullable', 'url', 'max:255'],
                'webhook_secret' => ['sometimes', 'nullable', 'string', 'max:255'],
            ],
            default => abort(404, 'Grup pengaturan tidak ditemukan.'),
        };
    }
}
