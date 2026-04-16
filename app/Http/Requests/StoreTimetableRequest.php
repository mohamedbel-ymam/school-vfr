<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreTimetableRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Gate/permission you already use for admin
        return $this->user()?->can('manage timetables') ?? false;
    }

    public function rules(): array
    {
        return [
            'degree_id'  => ['required','integer','exists:degrees,id'],
            'subject_id' => ['required','integer','exists:subjects,id'],
            'teacher_id' => ['required','integer','exists:users,id'],
            'room_id'    => ['nullable','integer','exists:rooms,id'],

            // accept either 'day' or 'day_of_week'
            'day'        => ['required_without:day_of_week','integer','between:1,7'],
            'day_of_week'=> ['required_without:day','integer','between:1,7'],

            // accept either explicit times or a period index
            'hour_from'  => ['required_without:period','date_format:H:i'],
            'hour_to'    => ['required_without:period','date_format:H:i','after:hour_from'],
            'period'     => ['required_without:hour_from','integer','min:1'],

            // optional ISO week anchor (Date, Monday of that week)
            'week_start' => ['nullable','date'],
            'title'      => ['nullable','string','max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            // French messages to match what you saw in UI
            'day.required_without'         => 'Champs requis manquants: Jour',
            'day_of_week.required_without' => 'Champs requis manquants: Jour',
            'hour_from.required_without'   => "L'heure de début est requise (ou indiquer une période).",
            'hour_to.required_without'     => "L'heure de fin est requise (ou indiquer une période).",
            'hour_to.after'                => "L'heure de fin doit être après l'heure de début.",
            'period.required_without'      => 'Veuillez indiquer la période ou les heures de début/fin.',
        ];
    }
}
