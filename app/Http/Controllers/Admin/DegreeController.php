<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Degree;
use Illuminate\Http\Request;

class DegreeController extends Controller
{
    /**
     * Display a listing of degrees.
     */
    public function index()
    {
        return response()->json([
            'data' => Degree::query()
                ->whereNotNull('slug')          // 👈 hide legacy rows
                ->orderBy('position')
                ->get(['id','name','slug','position']),
        ]);
    }


    /**
     * Store a newly created degree in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
        ]);

        $degree = Degree::create($validated);

        return response()->json([
            'data'    => $degree,
            'message' => 'Niveau created successfully',
        ], 201);
    }

    /**
     * Display the specified degree.
     */
    public function show(Degree $degree)
    {
        return response()->json([
            'data' => $degree,
        ]);
    }

    /**
     * Update the specified degree in storage.
     */
    public function update(Request $request, Degree $degree)
    {
        $validated = $request->validate([
            'name'        => ['sometimes', 'required', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
        ]);

        $degree->update($validated);

        return response()->json([
            'data'    => $degree,
            'message' => 'Niveau updated successfully',
        ]);
    }

    /**
     * Remove the specified degree from storage.
     */
    public function destroy(Degree $degree)
    {
        $degree->delete();

        return response()->json([
            'data'    => $degree,
            'message' => 'Niveau deleted successfully',
        ]);
    }
}
