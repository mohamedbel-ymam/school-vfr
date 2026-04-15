<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class AdminBroadcast extends Notification
{
    use Queueable;

    public string $title;
    public string $message;
    public array $meta;

    public function __construct(string $title, string $message, array $meta = [])
    {
        $this->title   = $title;
        $this->message = $message;
        $this->meta    = $meta;
    }

    public function via($notifiable): array
    {
        return ['database']; // add 'mail' later if you want
    }

    public function toDatabase($notifiable): array
    {
        return [
            'broadcast_id' => $this->meta['broadcast_id'] ?? null,
            'title'        => $this->title,
            'message'      => $this->message,
            'audience'     => $this->meta['audience'] ?? null,
            'degree_id'    => $this->meta['degree_id'] ?? null,
            'user_id'      => $this->meta['user_id'] ?? null,
            'user_ids'     => $this->meta['user_ids'] ?? [],
            'sent_by'      => $this->meta['sent_by'] ?? null,
            'channels'     => $this->meta['channels'] ?? ['database'],
        ];
    }
}
