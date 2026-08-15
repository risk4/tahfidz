<?php

namespace App\Http\Requests\Tahfidz;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSubmissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Domain\Tahfidz\Models\Submission::class);
    }

    public function rules(): array
    {
        return [
            'student_id' => ['required', 'exists:students,id'],
            'submission_date' => ['required', 'date'],
            'submission_time' => ['nullable', 'date_format:H:i'],
            'surah_id' => ['required', 'exists:quran_surahs,id'],
            'start_ayah' => ['required', 'integer', 'min:1'],
            'end_ayah' => ['required', 'integer', 'min:1', 'gte:start_ayah'],
            'page_count' => ['nullable', 'numeric', 'min:0.1', 'max:999.9'],
            'type' => ['required', Rule::in(['new_memorization', 'repetition'])],
            'status' => ['nullable', Rule::in(['pending', 'approved', 'revision', 'rejected'])],
            'fluency_score' => ['required', 'integer', 'min:0', 'max:100'],
            'tajwid_score' => ['required', 'integer', 'min:0', 'max:100'],
            'makhraj_score' => ['required', 'integer', 'min:0', 'max:100'],
            'fashahah_score' => ['required', 'integer', 'min:0', 'max:100'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'audio_path' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * Pastikan rentang ayat tidak melebihi jumlah ayat pada surah.
     */
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
