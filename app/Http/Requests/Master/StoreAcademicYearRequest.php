<?php

namespace App\Http\Requests\Master;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAcademicYearRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Domain\Academic\Models\AcademicYear::class);
    }

    public function rules(): array
    {
        $yearId = $this->route('academic_year')?->id ?? $this->route('academicYear')?->id;

        return [
            'name' => ['required', 'string', 'max:20', Rule::unique('academic_years', 'name')->ignore($yearId)],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
