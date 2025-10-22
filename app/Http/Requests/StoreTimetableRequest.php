<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreTimetableRequest extends FormRequest
{
    public function authorize(): bool {
        return $this->user()?->can('manage timetables') ?? false;
    }

    public function rules()
    {
        return [
            'degree_id'  => ['required','integer','exists:degrees,id'],
            'subject_id' => ['required','integer','exists:subjects,id'],
            'teacher_id' => ['required','integer','exists:users,id'],
            'room_id'    => ['nullable','integer','exists:rooms,id'],

            // accept day or day_of_week
            'day'        => ['required_without:day_of_week','integer','between:1,7'],
            'day_of_week'=> ['required_without:day','integer','between:1,7'],

            // accept times or a period string
            'hour_from'  => ['required_without:period','date_format:H:i'],
            'hour_to'    => ['required_without:period','date_format:H:i','after:hour_from'],
            'period'     => ['nullable','string'],

            // accept week_start or week_start_date
            'week_start'      => ['required_without:week_start_date','date_format:Y-m-d'],
            'week_start_date' => ['required_without:week_start','date_format:Y-m-d'],

            'title'      => ['nullable','string','max:255'],
        ];
    }

    public function prepareForValidation()
    {
        // normalize aliases
        $day   = $this->input('day') ?? $this->input('day_of_week') ?? $this->input('dow');
        $start = $this->input('hour_from') ?? $this->input('start_time') ?? $this->input('start') ?? $this->input('from');
        $end   = $this->input('hour_to')   ?? $this->input('end_time')   ?? $this->input('end')   ?? $this->input('to');
        $week  = $this->input('week_start') ?? $this->input('week_start_date') ?? $this->input('week');

        // parse "09:00-10:30" period if times missing
        if ((!$start || !$end) && ($period = (string) $this->input('period', ''))) {
            if (preg_match('/^\s*(\d{1,2})\s*[:h.]\s*(\d{1,2})\s*[-–—àto]+\s*(\d{1,2})\s*[:h.]\s*(\d{1,2})\s*$/i', $period, $m)) {
                $start = sprintf('%02d:%02d', $m[1], $m[2]);
                $end   = sprintf('%02d:%02d', $m[3], $m[4]);
            }
        }

        $this->merge([
            'day'        => $day,
            'hour_from'  => $start,
            'hour_to'    => $end,
            'week_start' => $week,
        ]);
    }

    public function messages(): array {
        return [
            'teacher_id.exists' => "L'enseignant sélectionné est introuvable.",
            'degree_id.exists'  => "Le niveau sélectionné est introuvable.",
            'subject_id.exists' => "La matière sélectionnée est introuvable.",
            'room_id.exists'    => "La salle sélectionnée est introuvable.",
            // ✅ fix the key to match your rule
            'hour_to.after'     => "L'heure de fin doit être après l'heure de début.",
        ];
    }
}
