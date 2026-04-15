<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class TimetableResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id'          => $this->id,
            'degree_id'   => $this->degree_id,
            'subject_id'  => $this->subject_id,
            'teacher_id'  => $this->teacher_id,
            'room_id'     => $this->room_id,
            'day_of_week' => $this->day_of_week,
            'period'      => $this->period,
            'start_time'  => $this->start_time,
            'end_time'    => $this->end_time,

            // Computed, always HH:MM when possible (via accessors in the model)
            'start'       => $this->start,
            'end'         => $this->end,

            'title'       => $this->title,
            'week_start'  => $this->week_start instanceof \Carbon\Carbon
    		? $this->week_start->toDateString()
    		: (is_string($this->week_start) ? $this->week_start : null),
            // Optional eager-loaded relations
            'subject'     => $this->whenLoaded('subject', fn () => [
                'id' => $this->subject->id,
                'name' => $this->subject->name,
            ]),
            'teacher'     => $this->whenLoaded('teacher', fn () => [
                'id' => $this->teacher->id,
                'firstname' => $this->teacher->firstname ?? null,
                'lastname'  => $this->teacher->lastname  ?? null,
            ]),
            'room'        => $this->whenLoaded('room', fn () => [
                'id' => $this->room->id,
                'name' => $this->room->name,
            ]),
        ];
    }
}
