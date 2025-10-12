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
            'period'      => $this->period ? (int) $this->period : null,

            // Always HH:mm (no seconds), never a DateTime
            'start'        => $start,                      // e.g. "19:00"
            'end'          => $end,                        // e.g. "21:00"
            'start_minutes'=> $this->toMinutes($start),    // e.g. 1140
            'end_minutes'  => $this->toMinutes($end),      // e.g. 1260

            'title'      => $this->title,
            'week_start' => $this->week_start ? $this->week_start->format('Y-m-d') : null,

            'subject' => $this->whenLoaded('subject', function () {
                $name = $this->subject->name ?? null;
                return [
                    'id'   => $this->subject->id ?? null,
                    'name' => $name,
                    // a stable key for color mapping on the frontend
                    'key'  => $name ? Str::slug($name) : null,
                ];
            }),

            'degree' => $this->whenLoaded('degree', function () {
                return [
                    'id'   => $this->degree->id ?? null,
                    'name' => $this->degree->name ?? null,
                ];
            }),

            'room' => $this->whenLoaded('room', function () {
                return [
                    'id'   => $this->room->id ?? null,
                    'name' => $this->room->name ?? null,
                ];
            }),

            'teacher' => $this->whenLoaded('teacher', function () {
                $fn = $this->teacher->firstname ?? '';
                $ln = $this->teacher->lastname  ?? '';
                return [
                    'id'        => $this->teacher->id ?? null,
                    'firstname' => $fn,
                    'lastname'  => $ln,
                    'fullname'  => trim($fn.' '.$ln),
                ];
            }),
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
