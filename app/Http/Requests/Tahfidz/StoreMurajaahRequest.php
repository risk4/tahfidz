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
            'teacher_id' => ['nullable', 'exists:teachers,id'],
            'date' => ['required', 'date'],
            'time' => ['nullable', 'date_format:H:i'],
            'juz' => ['nullable', 'integer', 'min:1', 'max:30'],
            'surah_id' => ['required', 'exists:quran_surahs,id'],
            'start_ayah' => ['required', 'integer', 'min:1'],
            'end_ayah' => ['required', 'integer', 'min:1', 'gte:start_ayah'],
            'page_count' => ['nullable', 'numeric', 'min:0.1', 'max:604'],
            'method' => ['nullable', Rule::in(['independent', 'repeated', 'group', 'guided'])],
            'duration_minutes' => ['nullable', 'integer', 'min:1', 'max:600'],
            'fluency_score' => ['nullable', 'integer', 'min:0', 'max:100'],
            'tajwid_score' => ['nullable', 'integer', 'min:0', 'max:100'],
            'makhraj_score' => ['nullable', 'integer', 'min:0', 'max:100'],
            'fashahah_score' => ['nullable', 'integer', 'min:0', 'max:100'],
            'status' => ['nullable', Rule::in(['pending', 'approved', 'revision', 'rejected', 'LANCAR', 'PERLU_MUROJAAH'])],
            'notes' => ['nullable', 'string', 'max:2000'],
            'audio_path' => ['nullable', 'string', 'max:255'],
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
