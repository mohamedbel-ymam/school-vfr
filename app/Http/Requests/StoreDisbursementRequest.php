<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDisbursementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('admin');
    }

    public function rules(): array
    {
        return [
            'period_start'   => ['required', 'date'],
            'period_end'     => ['required', 'date', 'after:period_start'],
            'amount'         => ['nullable', 'integer', 'min:100', 'max:20000'],
            'payment_method' => ['nullable', 'string', 'max:100'],
            'note'           => ['nullable', 'string', 'max:500'],
        ];
    }
}

