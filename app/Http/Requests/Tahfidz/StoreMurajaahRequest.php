<?php

namespace App\Http\Requests\Tahfidz;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMurajaahRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Domain\Tahfidz\Models\Murajaah::class);
    }

    public function rules(): array
    {
        return [
            'student_id' => ['required', 'exists:students,id'],
            'date' => ['required', 'date'],
            'surah_id' => ['required', 'exists:quran_surahs,id'],
            'start_ayah' => ['required', 'integer', 'min:1'],
            'end_ayah' => ['required', 'integer', 'min:1', 'gte:start_ayah'],
            'fluency_score' => ['required', 'integer', 'min:0', 'max:100'],
            'tajwid_score' => ['required', 'integer', 'min:0', 'max:100'],
            'makhraj_score' => ['required', 'integer', 'min:0', 'max:100'],
            'fashahah_score' => ['required', 'integer', 'min:0', 'max:100'],
            'status' => ['required', Rule::in(['LANCAR', 'PERLU_MUROJAAH'])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function withValidator(\Illuminate\Validation\Validator $validator): void
    {
        $validator->after(function ($validator) {
            $surah = \App\Domain\Quran\Models\QuranSurah::find($this->integer('surah_id'));

            if ($surah && $this->integer('end_ayah') > $surah->total_ayahs) {
                $validator->errors()->add(
                    'end_ayah',
                    "end_ayah melebihi total ayat surah ({$surah->total_ayahs})."
                );
            }
        });
    }
}
