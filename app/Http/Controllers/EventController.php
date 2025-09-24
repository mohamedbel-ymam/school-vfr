<?php

namespace App\Http\Controllers;


use App\Models\Event;
use Illuminate\Http\Request;


class EventController extends Controller
{
public function index(Request $r)
{
$query = Event::query();


if ($r->filled('template')) {
$query->where('template', $r->string('template'));
}
if ($r->filled('from')) {
$query->where('starts_at', '>=', $r->date('from'));
}
if ($r->filled('to')) {
$query->where('starts_at', '<=', $r->date('to'));
}
if ($r->filled('q')) {
$q = trim((string) $r->query('q'));
$query->where(function ($sub) use ($q) {
$sub->where('title', 'like', "%{$q}%")
->orWhere('description', 'like', "%{$q}%")
->orWhere('location', 'like', "%{$q}%");
});
}


$query->orderBy('starts_at');
$events = $query->paginate(min(max((int)$r->query('per_page', 20), 1), 200));
return response()->json(['data' => $events->items(), 'meta' => [
'current_page' => $events->currentPage(),
'last_page' => $events->lastPage(),
'per_page' => $events->perPage(),
'total' => $events->total(),
]]);
}


public function show(Event $event)
{
return response()->json(['data' => $event]);
}
}