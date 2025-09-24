<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Room;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    public function index(Request $r)
    {
        $perPage = (int) $r->query('per_page', 50);
        $perPage = max(1, min($perPage, 200));

        $q = Room::query()->select(['id','name','capacity','created_at','updated_at']);

        if ($r->filled('q')) {
            $term = $r->query('q');
            $q->where('name', 'like', "%{$term}%");
        }

        $q->orderBy('name');

        // return paginator when per_page present, else all
        if ($r->has('per_page')) {
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

        return response()->json(['data' => $q->get()]);
    }

    public function store(Request $r)
    {
        $data = $r->validate([
            'name'     => 'required|string|max:255|unique:rooms,name',
            'capacity' => 'nullable|integer|min:1',
        ]);
        $room = Room::create($data);
        return response()->json(['data' => $room], 201);
    }

    public function show(Room $room)
    {
        return response()->json(['data' => $room]);
    }

    public function update(Request $r, Room $room)
    {
        $data = $r->validate([
            'name'     => 'sometimes|string|max:255|unique:rooms,name,' . $room->id,
            'capacity' => 'nullable|integer|min:1',
        ]);
        $room->update($data);
        return response()->json(['data' => $room, 'message' => 'Room updated']);
    }

    public function destroy(Room $room)
    {
        $room->delete();
        return response()->noContent();
    }
}