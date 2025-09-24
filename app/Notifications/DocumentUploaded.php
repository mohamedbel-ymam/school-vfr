<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class DocumentUploaded extends Notification
{
    use Queueable;

    public function __construct(public array $payload) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        // payload example: ['title'=>'Doc...', 'message'=>'Nouveau document', 'meta'=>[...]]
        return $this->payload;
    }
}
