<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBoursierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('admin');
    }

    public function rules(): array
    {
        return [
            'name'           => ['sometimes', 'string', 'max:255'],
            'email'          => ['sometimes', 'email', Rule::unique('users', 'email')->ignore($this->boursier->user_id ?? null)],
            'password'       => ['sometimes', 'string', 'min:8'],
            'university'     => ['nullable', 'string', 'max:255'],
            'field_of_study' => ['nullable', 'string', 'max:255'],
            'start_year'     => ['nullable', 'digits:4'],
            'duration_years' => ['nullable', 'integer', 'min:1', 'max:6'],
            'status'         => ['nullable', 'in:active,paused,ended'],
        ];
    }
}

