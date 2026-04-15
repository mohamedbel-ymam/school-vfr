<?php

namespace App\Http\Controllers\Boursier;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreContributionRequest;
use App\Models\Contribution;
use Illuminate\Http\Request;

class ContributionController extends Controller
{
    /**
     * GET /api/boursier/contributions
     * Liste des contributions du boursier connecté.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $contributions = Contribution::where('user_id', $user->id)
            ->latest()
            ->get();

        return response()->json($contributions);
    }

    /**
     * POST /api/boursier/contributions
     * Crée une nouvelle contribution pour le boursier connecté.
     */
    public function store(StoreContributionRequest $request)
    {
        $data = $request->validated();

        $contribution = Contribution::create([
            'user_id'      => $request->user()->id,
            'type'         => $data['type'],
            'title'        => $data['title'],
            'details'      => $data['details'] ?? null,
            'status'       => 'proposed',
            'proposed_at'  => now(),
            'scheduled_at' => $data['scheduled_at'] ?? null,
        ]);

        return response()->json($contribution, 201);
    }
}

