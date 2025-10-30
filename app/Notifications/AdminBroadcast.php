<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
// use Illuminate\Notifications\Messages\MailMessage; // if you later add mail

class AdminBroadcast extends Notification /* implements ShouldQueue */
{
    use Queueable;

    public string $title;
    public string $message;
    public array $meta;

    /**
     * $meta should include: broadcast_id, audience, degree_id, user_id(s), sent_by, channels...
     */
    public function __construct(string $title, string $message, array $meta = [])
    {
        $this->title   = $title;
        $this->message = $message;
        $this->meta    = $meta;
    }

    public function via($notifiable): array
    {
        // For now we only persist in DB (UI reads from /admin/notifications & /notifications)
        return ['database'];
        // If you add mail later, return ['database','mail'] and implement toMail()
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
