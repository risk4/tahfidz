<?php

namespace App\Http\Requests\Tahfidz;

use App\Domain\Quran\Models\QuranSurah;
use App\Domain\Tahfidz\Models\Submission;
use App\Rules\AudioPath;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreSubmissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Submission::class);
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
            'method' => ['nullable', Rule::in(['setoran', 'murojaah', 'tasmi', 'sambung_ayat'])],
            'status' => ['nullable', Rule::in(['pending', 'approved', 'revision', 'rejected'])],
            'fluency_score' => ['required', 'integer', 'min:0', 'max:100'],
            'tajwid_score' => ['required', 'integer', 'min:0', 'max:100'],
            'makhraj_score' => ['required', 'integer', 'min:0', 'max:100'],
            'fashahah_score' => ['required', 'integer', 'min:0', 'max:100'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'audio_path' => ['nullable', 'string', 'max:255', new AudioPath],
        ];
    }

    /**
     * Pastikan rentang ayat tidak melebihi jumlah ayat pada surah.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            $surah = QuranSurah::find($this->integer('surah_id'));

            if ($surah && $this->integer('end_ayah') > $surah->total_ayahs) {
                $validator->errors()->add(
                    'end_ayah',
                    "end_ayah melebihi total ayat surah ({$surah->total_ayahs})."
                );
            }
        });
    }
}
