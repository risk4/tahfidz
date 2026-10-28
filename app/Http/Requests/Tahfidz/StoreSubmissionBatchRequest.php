<?php

namespace App\Http\Requests\Tahfidz;

use App\Domain\Tahfidz\Models\Submission;
use App\Rules\AudioPath;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Input setoran beberapa surah utuh sekaligus — rentang ayat tiap surah
 * dihitung otomatis 1..total_ayahs oleh controller.
 */
class StoreSubmissionBatchRequest extends FormRequest
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
            'surah_ids' => ['required', 'array', 'min:1'],
            'surah_ids.*' => ['integer', 'distinct', 'exists:quran_surahs,id'],
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
}
