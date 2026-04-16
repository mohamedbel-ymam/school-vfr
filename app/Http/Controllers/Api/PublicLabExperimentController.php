<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Experiment;
use Illuminate\Http\Request;

class PublicLabExperimentController extends Controller
{
    public function index(Request $request)
    {
        $q = Experiment::query()->where('is_public', true);

        if ($request->filled('subject')) {
            $q->where('subject', $request->string('subject'));
        }

        if ($request->filled('level')) {
            $q->whereJsonContains('level_tags', $request->string('level'));
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            if ($search !== '') {
                $q->where(function ($qq) use ($search) {
                    $qq->where('title', 'like', "%{$search}%")
                       ->orWhere('slug', 'like', "%{$search}%");
                });
            }
        }

        // IMPORTANT: ne renvoie pas tout (questions) sur la liste
        return $q->select('id','slug','title','subject','level_tags','simulation')
                 ->orderByDesc('id')
                 ->paginate(12);
    }

    public function show(string $slug)
    {
        $exp = Experiment::query()
            ->where('slug', $slug)
            ->where('is_public', true)
            ->with(['questions:id,experiment_id,order,type,prompt,options,explanation,is_instant_feedback,tolerance'])
            ->firstOrFail();

        return response()->json($exp);
    }
}
