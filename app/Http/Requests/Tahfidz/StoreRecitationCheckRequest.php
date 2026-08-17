<?php

namespace App\Http\Requests\Tahfidz;

use App\Domain\Tahfidz\Models\RecitationCheck;
use Illuminate\Foundation\Http\FormRequest;

class StoreRecitationCheckRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', RecitationCheck::class);
    }

    public function rules(): array
    {
        return [
            'surah_id' => ['required', 'integer', 'exists:quran_surahs,id'],
            'start_ayah' => ['required', 'integer', 'min:1'],
            'end_ayah' => ['required', 'integer', 'min:1', 'gte:start_ayah'],
            'transcript' => ['nullable', 'string', 'max:10000'],
            'details' => ['required', 'array', 'min:1'],
            'details.*.ayah_number' => ['required', 'integer', 'min:1'],
            'details.*.word' => ['required', 'string', 'max:500'],
            'details.*.status' => ['required', 'in:correct,incorrect,missing'],
            'details.*.spoken' => ['nullable', 'string', 'max:500'],
        ];
    }
}
