<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBoursierRequest extends FormRequest {
    public function authorize(): bool { return $this->user()->hasRole('admin'); }
    public function rules(): array
{
    return [
        'first_name'     => ['required', 'string', 'max:255'],
        'last_name'      => ['required', 'string', 'max:255'],
        'name'           => ['nullable', 'string', 'max:255'], // optional, we'll recompute anyway
        'email'          => ['required', 'email', 'unique:users,email'],
        'password'       => ['required', 'string', 'min:8'],
        'university'     => ['nullable', 'string', 'max:255'],
        'field_of_study' => ['nullable', 'string', 'max:255'],
        'start_year'     => ['nullable', 'digits:4'],
        'duration_years' => ['nullable', 'integer', 'min:1', 'max:6'],
    ];
}

}
