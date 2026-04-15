<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreContributionRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Only boursiers can create their own contribution proposals
        return $this->user()?->hasRole('boursier');
    }

    public function rules(): array
    {
        return [
            'type'         => ['required', 'in:teaching,mentoring,meetup,donation,other'],
            'title'        => ['nullable', 'string', 'max:255'],
            'details'      => ['nullable', 'string', 'max:2000'],
            'scheduled_at' => ['nullable', 'date', 'after_or_equal:today'],
        ];
    }
}

