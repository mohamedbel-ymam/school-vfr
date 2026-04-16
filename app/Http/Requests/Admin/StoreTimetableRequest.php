<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreTimetableRequest extends FormRequest
{
    public function authorize(): bool
    {
        // TEMP to unblock 403s — switch back to a Gate later if you want
        return true;

        // If you prefer Gate/Role instead, use:
        // return $this->user()?->can('manage timetables')
        //     || $this->user()?->can('admin')
        //     || $this->user()?->can('isAdmin')
        //     || (method_exists($this->user(), 'hasAnyRole') && $this->user()->hasAnyRole(['admin','superadmin']))
        //     ?? false;
    }

    public function rules(): array
    {
        return [
            'degree_id'   => ['required','integer','exists:degrees,id'],
            'subject_id'  => ['required','integer','exists:subjects,id'],
            'teacher_id'  => ['required','integer','exists:users,id'],
            'room_id'     => ['nullable','integer','exists:rooms,id'],

            // Accept either 'day' or 'day_of_week'
            'day'         => ['required_without:day_of_week','integer','between:1,7'],
            'day_of_week' => ['required_without:day','integer','between:1,7'],

            // Accept explicit times OR a period index
            'hour_from'   => ['required_without:period','date_format:H:i'],
            'hour_to'     => ['required_without:period','date_format:H:i','after:hour_from'],
            'period'      => ['required_without:hour_from','integer','min:1'],

            'week_start'  => ['nullable','date'],
            'title'       => ['nullable','string','max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'day.required_without'         => 'Champs requis manquants: Jour',
            'day_of_week.required_without' => 'Champs requis manquants: Jour',
            'hour_from.required_without'   => "L'heure de début est requise (ou indiquer une période).",
            'hour_to.required_without'     => "L'heure de fin est requise (ou indiquer une période).",
            'hour_to.after'                => "L'heure de fin doit être après l'heure de début.",
            'period.required_without'      => 'Veuillez indiquer la période ou les heures de début/fin.',
        ];
    }
}

