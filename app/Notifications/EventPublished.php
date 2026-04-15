<?php

namespace App\Notifications;

use App\Models\Event;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class EventPublished extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Event $event) {}

    public function via($notifiable)
    {
        return ['database']; // add 'broadcast' if you use Echo later
    }

    public function toArray($notifiable)
    {
        $e = $this->event->fresh();
        return [
            'type'        => 'event.published',
            'event_id'    => $e->id,
            'title'       => $e->title,
            'template'    => $e->template,
            'starts_at'   => optional($e->starts_at)->toDateTimeString(),
            'ends_at'     => optional($e->ends_at)->toDateTimeString(),
            'location'    => $e->location,
            'image_url'   => $e->image_url,
            'description' => (string) str($e->description)->limit(180),
            'cta_text'    => 'Voir l’événement',
            'cta_url'     => "/evenements/{$e->id}",
        ];
    }
}
