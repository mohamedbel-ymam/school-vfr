<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class HomeworkAssigned extends Notification
{
    use Queueable;

    public function __construct(public array $payload) {}

    public function via(object $notifiable): array
    {
        return ['database']; // we're storing in notifications table
    }

    public function toDatabase(object $notifiable): array
    {
        return $this->payload;
    }
}
