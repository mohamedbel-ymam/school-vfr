<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Subject;
use Illuminate\Http\Request;

class SubjectController extends Controller
{
    public function index(Request $r)
    {
        $perPage = (int) $r->query('per_page', 50);
        $perPage = max(1, min($perPage, 200));

        $q = Subject::query()->select(['id','name','code','created_at','updated_at']);

        if ($r->filled('q')) {
            $term = $r->query('q');
            $q->where(function ($s) use ($term) {
                $s->where('name','like',"%{$term}%")
                  ->orWhere('code','like',"%{$term}%");
            });
        }

        $q->orderBy('name');

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
            'name' => 'required|string|max:255|unique:subjects,name',
            'code' => 'nullable|string|max:50|unique:subjects,code',
        ]);

        $subject = Subject::create($data);
        return response()->json(['data' => $subject], 201);
    }

    public function show(Subject $subject)
    {
        return response()->json(['data' => $subject]);
    }

    public function update(Request $r, Subject $subject)
    {
        $data = $r->validate([
            'name' => 'sometimes|string|max:255|unique:subjects,name,' . $subject->id,
            'code' => 'nullable|string|max:50|unique:subjects,code,' . $subject->id,
        ]);

        $subject->update($data);
        return response()->json(['data' => $subject, 'message' => 'Matière updated']);
    }

    public function destroy(Subject $subject)
    {
        $subject->delete();
        return response()->noContent();
    }
}