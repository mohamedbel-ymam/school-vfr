<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDisbursementRequest;
use App\Models\BoursierProfile;
use App\Models\ScholarshipDisbursement;
use Illuminate\Http\Request;

class DisbursementController extends Controller
{
    public function __construct()
    {
        $this->middleware(['auth:sanctum', 'role:admin']);
    }

    public function pay(Request $r, BoursierProfile $boursier, ScholarshipDisbursement $disb)
    {
        abort_unless($disb->boursier_profile_id === $boursier->id, 404);
        $disb->update([
            'paid_at'        => now(),
            'payment_method' => $r->get('payment_method', 'cash'),
            'note'           => $r->get('note'),
        ]);
        return response()->json($disb);
    }

    public function createOne(StoreDisbursementRequest $r, BoursierProfile $boursier)
    {
        $disb = $boursier->disbursements()->create($r->validated() + ['amount' => 3000]);
        return response()->json($disb, 201);
    }
}
