<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;
use Carbon\Carbon;

class TimetableResource extends JsonResource
{
    public function toArray($request)
        {
            $start = $this->fmt($this->start_time);
            $end   = $this->fmt($this->end_time);
        
            return [
                'id'          => $this->id,
                'day_of_week' => (int) $this->day_of_week,
                'period'      => $this->period ? (int)$this->period : null,
            
                // Normalized (what UIs prefer)
                'start'         => $start,                // "HH:MM"
                'end'           => $end,                  // "HH:MM"
                'start_minutes' => $this->toMinutes($start),
                'end_minutes'   => $this->toMinutes($end),
            
                // Compatibility (in case some views still read these)
                'start_time'    => $start,
                'end_time'      => $end,
            
                'title'      => $this->title,
                'week_start' => $this->week_start ? $this->week_start->format('Y-m-d') : null,
            
                'subject' => $this->whenLoaded('subject', fn () => [
                    'id'   => $this->subject->id ?? null,
                    'name' => $this->subject->name ?? null,
                    'key'  => ($name = $this->subject->name ?? null) ? \Illuminate\Support\Str::slug($name) : null,
                ]),
            
                'degree' => $this->whenLoaded('degree', fn () => [
                    'id'   => $this->degree->id ?? null,
                    'name' => $this->degree->name ?? null,
                ]),
            
                'room' => $this->whenLoaded('room', fn () => [
                    'id'   => $this->room->id ?? null,
                    'name' => $this->room->name ?? null,
                ]),
            
                'teacher' => $this->whenLoaded('teacher', fn () => [
                    'id'        => $this->teacher->id ?? null,
                    'firstname' => $this->teacher->firstname ?? null,
                    'lastname'  => $this->teacher->lastname ?? null,
                ]),
            ];
        }

    /** Normalize any TIME string into "HH:mm". */
    private function fmt($time): ?string
    {
        if (!$time) return null;

        // Already "HH:mm" or "HH:mm:ss"
        if (preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $time)) {
            return substr($time, 0, 5);
        }

        // Fallback if MySQL returns something unexpected
        try {
            return Carbon::parse($time)->format('H:i');
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function toMinutes(?string $hhmm): ?int
    {
        if (!$hhmm || !preg_match('/^\d{2}:\d{2}$/', $hhmm)) return null;
        [$h, $m] = explode(':', $hhmm);
        return ((int)$h) * 60 + (int)$m;
    }
}
