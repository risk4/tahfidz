<?php

namespace App\Http\Requests\Master;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreClassRoomRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Domain\Academic\Models\ClassRoom::class);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:30'],
            'grade' => ['required', 'integer', 'min:1', 'max:12'],
            'academic_year_id' => ['required', 'exists:academic_years,id'],
            'homeroom_teacher_id' => ['nullable', 'exists:teachers,id'],
        ];
    }
}
