<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class EventController extends Controller
{
    public function index(Request $r) {
        $q = Event::query();
        if ($r->filled('template')) $q->where('template', $r->string('template'));
        if ($r->filled('q')) {
            $term = trim((string)$r->query('q'));
            $q->where(fn($s)=>$s->where('title','like',"%$term%")
                ->orWhere('description','like',"%$term%")
                ->orWhere('location','like',"%$term%"));
        }
        $q->orderByDesc('starts_at');
        $page = $q->paginate(min(max((int)$r->query('per_page',20),1),200));
        return response()->json(['data'=>$page->items(),'meta'=>[
            'current_page'=>$page->currentPage(),'last_page'=>$page->lastPage(),
            'per_page'=>$page->perPage(),'total'=>$page->total(),
        ]]);
    }

    public function store(Request $r) {
        $data = $r->validate([
            'title'       => ['required','string','max:255'],
            'template'    => ['required', Rule::in(['GENERAL','EXAM','MEETING','HOLIDAY','WORKSHOP','ANNOUNCEMENT','EMERGENCY'])],
            'starts_at'   => ['required','date'],
            'ends_at'     => ['nullable','date','after_or_equal:starts_at'],
            'location'    => ['nullable','string','max:255'],
            'description' => ['nullable','string'],
            'data'        => ['nullable'],
            'image'       => ['nullable','image','mimes:jpg,jpeg,png,webp,gif','max:4096'],
        ]);

        // If 'data' comes as JSON string in multipart, decode it
        if (is_string($data['data'] ?? null)) {
            $decoded = json_decode($data['data'], true);
            if (json_last_error() === JSON_ERROR_NONE) $data['data'] = $decoded;
        }

        $data['created_by'] = (int) $r->user()->id;

        if ($r->hasFile('image')) {
            $path = $r->file('image')->store('événements', 'public');
            $data['image_path'] = $path;
        }

        $event = Event::create($data);
        return response()->json(['data'=>$event], 201);
    }

    public function show(Event $event) {
        return response()->json(['data'=>$event]);
    }

    public function update(Request $r, Event $event) {
        $data = $r->validate([
            'title'       => ['sometimes','string','max:255'],
            'template'    => ['sometimes', Rule::in(['GENERAL','EXAM','MEETING','HOLIDAY','WORKSHOP','ANNOUNCEMENT','EMERGENCY'])],
            'starts_at'   => ['sometimes','date'],
            'ends_at'     => ['nullable','date','after_or_equal:starts_at'],
            'location'    => ['nullable','string','max:255'],
            'description' => ['nullable','string'],
            'data'        => ['nullable'],
            'image'       => ['nullable','image','mimes:jpg,jpeg,png,webp,gif','max:4096'],
            'remove_image'=> ['nullable','boolean'],
        ]);

        if (is_string($data['data'] ?? null)) {
            $decoded = json_decode($data['data'], true);
            if (json_last_error() === JSON_ERROR_NONE) $data['data'] = $decoded;
        }

        // Replace image if uploaded
        if ($r->hasFile('image')) {
            if ($event->image_path) Storage::disk('public')->delete($event->image_path);
            $data['image_path'] = $r->file('image')->store('événements', 'public');
        }

        // Explicit remove
        if (($data['remove_image'] ?? false) && $event->image_path) {
            Storage::disk('public')->delete($event->image_path);
            $data['image_path'] = null;
        }

        unset($data['remove_image']);

        $event->fill($data)->save();
        return response()->json(['data'=>$event]);
    }

    public function destroy(Event $event) {
        // Delete image file if present; then delete row
        if ($event->image_path) {
            Storage::disk('public')->delete($event->image_path);
        }
        $event->delete();
        return response()->noContent(); // 204
    }
}
