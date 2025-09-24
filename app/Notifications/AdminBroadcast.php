<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class AdminBroadcast extends Notification
{
    use Queueable;

    public function __construct(
        public string $title,
        public string $message,
        public array $meta = [] // audience info, created_by, degree_id, etc.
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'title' => $this->title,
            'message' => $this->message,
            'meta' => $this->meta,
        ];
    }
}
