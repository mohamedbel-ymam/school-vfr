<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreTimetableRequest extends FormRequest
{
    public function authorize(): bool {
        return $this->user()?->can('manage timetables') ?? false;
    }

    public function rules(): array {
        return [
            'degree_id'  => ['required','exists:degrees,id'],
            'subject_id' => ['required','exists:subjects,id'],
            'teacher_id' => ['required','exists:users,id'],
            'room_id'    => ['nullable','exists:rooms,id'],
            'day_of_week'=> ['required','integer','between:1,7'],

            // On autorise soit period, soit starts_at/ends_at
            'period'     => ['nullable','string','max:50'],
            'starts_at'  => ['nullable','date_format:H:i'],
            'ends_at'    => ['nullable','date_format:H:i','after:starts_at'],

            'title'      => ['nullable','string','max:255'],
        ];
    }

    public function messages(): array {
        return [
            'teacher_id.exists' => "L'enseignant sélectionné est introuvable.",
            'degree_id.exists'  => "Le diplôme sélectionné est introuvable.",
            'subject_id.exists' => "La matière sélectionnée est introuvable.",
            'room_id.exists'    => "La salle sélectionnée est introuvable.",
            'ends_at.after'     => "L'heure de fin doit être après l'heure de début.",
        ];
    }
}