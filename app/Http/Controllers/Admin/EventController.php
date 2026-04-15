<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\User;
use App\Notifications\EventPublished;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class EventController extends Controller
{
    private function normalizeDate(?string $v): ?string
    {
        if ($v === null || $v === '') return $v;
        $v = trim($v);
        if (preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/', $v)) {
            return str_replace('T', ' ', $v) . ':00';
        }
        return $v;
    }

    /** GET /admin/evenements */
    public function index(Request $r)
    {
        $q = Event::query();

        if ($r->filled('template')) {
            $q->where('template', (string) $r->query('template'));
        }

        if ($r->filled('q')) {
            $term = trim((string) $r->query('q'));
            $q->where(function ($s) use ($term) {
                $s->where('title', 'like', "%{$term}%")
                  ->orWhere('description', 'like', "%{$term}%")
                  ->orWhere('location', 'like', "%{$term}%");
            });
        }

        if ($r->filled('from')) {
            $q->where('starts_at', '>=', $this->normalizeDate($r->query('from')));
        }
        if ($r->filled('to')) {
            $q->where('starts_at', '<=', $this->normalizeDate($r->query('to')));
        }

        $q->orderByDesc('starts_at');

        $perPage = (int) $r->query('per_page', 20);
        $perPage = max(1, min($perPage, 200));
        $page = $q->paginate($perPage);

        return response()->json([
            'data' => $page->items(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page'    => $page->lastPage(),
                'per_page'     => $page->perPage(),
                'total'        => $page->total(),
            ],
        ]);
    }

    /** POST /admin/evenements */
    public function store(Request $r)
    {
        $r->merge([
            'starts_at' => $this->normalizeDate($r->input('starts_at')),
            'ends_at'   => $this->normalizeDate($r->input('ends_at')),
        ]);

        $data = $r->validate([
            'title'       => ['required', 'string', 'max:255'],
            'template'    => ['required', Rule::in(['GENERAL','EXAM','MEETING','HOLIDAY','WORKSHOP','ANNOUNCEMENT','EMERGENCY'])],
            'starts_at'   => ['required', 'date'],
            'ends_at'     => ['nullable', 'date', 'after_or_equal:starts_at'],
            'location'    => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'data'        => ['nullable'],
            'image'       => ['nullable','file','mimetypes:image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif','max:7168'],
        ]);

        if (is_string($data['data'] ?? null)) {
            $decoded = json_decode($data['data'], true);
            if (json_last_error() === JSON_ERROR_NONE) $data['data'] = $decoded;
        }

        $data['created_by'] = (int) $r->user()->id;

        if ($r->hasFile('image')) {
            $data['image_path'] = $r->file('image')->store('events', 'public');
        }

        $event = Event::create($data);

        // Notifications (don’t crash on failure)
        try {
            $roles    = $event->data['roles']     ?? ['student','teacher','parent'];
            $degreeId = $event->data['degree_id'] ?? null;

            $aud = User::query()->whereIn('role', $roles);
            if ($degreeId) $aud->where('degree_id', $degreeId);

            $aud->select('id')->chunkById(1000, function ($chunk) use ($event) {
                Notification::send($chunk, new EventPublished($event));
            });
        } catch (\Throwable $e) { report($e); }

        return response()->json(['data' => $event], 201);
    }

    /** GET /admin/evenements/{event} */
    public function show(Event $event)
    {
        return response()->json(['data' => $event]);
    }

    /** PUT /admin/evenements/{event} */
    public function update(Request $r, Event $event)
    {
        $r->merge([
            'starts_at' => $this->normalizeDate($r->input('starts_at')),
            'ends_at'   => $this->normalizeDate($r->input('ends_at')),
        ]);

        $data = $r->validate([
            'title'        => ['sometimes', 'string', 'max:255'],
            'template'     => ['sometimes', Rule::in(['GENERAL','EXAM','MEETING','HOLIDAY','WORKSHOP','ANNOUNCEMENT','EMERGENCY'])],
            'starts_at'    => ['sometimes', 'date'],
            'ends_at'      => ['nullable', 'date', 'after_or_equal:starts_at'],
            'location'     => ['nullable', 'string', 'max:255'],
            'description'  => ['nullable', 'string'],
            'data'         => ['nullable'],
            'image'        => ['nullable','file','mimetypes:image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif','max:7168'],
            'remove_image' => ['nullable', 'boolean'],
        ]);

        if (is_string($data['data'] ?? null)) {
            $decoded = json_decode($data['data'], true);
            if (json_last_error() === JSON_ERROR_NONE) $data['data'] = $decoded;
        }

        if ($r->hasFile('image')) {
            if ($event->image_path) Storage::disk('public')->delete($event->image_path);
            $data['image_path'] = $r->file('image')->store('events', 'public');
        }

        if ($r->boolean('remove_image') && $event->image_path) {
            Storage::disk('public')->delete($event->image_path);
            $data['image_path'] = null;
        }
        unset($data['remove_image']);

        $was = $event->replicate();
        $event->fill($data)->save();

        // Optional: notify on important changes
        try {
            $dirty = ['title','starts_at','ends_at','location','description','template','image_path'];
            $changed = false;
            foreach ($dirty as $k) { if ($event->$k != $was->$k) { $changed = true; break; } }
            if ($changed) {
                $roles    = $event->data['roles']     ?? ['student','teacher','parent'];
                $degreeId = $event->data['degree_id'] ?? null;

                $aud = User::query()->whereIn('role', $roles);
                if ($degreeId) $aud->where('degree_id', $degreeId);

                $aud->select('id')->chunkById(1000, function ($chunk) use ($event) {
                    Notification::send($chunk, new EventPublished($event));
                });
            }
        } catch (\Throwable $e) { report($e); }

        return response()->json(['data' => $event]);
    }

    /** DELETE /admin/evenements/{event} */
    public function destroy(Event $event)
    {
        if ($event->image_path) Storage::disk('public')->delete($event->image_path);
        $event->delete();
        return response()->noContent();
    }
}
