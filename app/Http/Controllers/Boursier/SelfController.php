<?php

namespace App\Http\Controllers\Boursier;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class SelfController extends Controller
{
    public function me(Request $request)
    {
        $user = $request->user()->load('boursierProfile.disbursements');
        $profile = $user->boursierProfile;

        return response()->json([
            'user' => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
            ],
            'profile' => $profile ? [
                'university'     => $profile->university,
                'field_of_study' => $profile->field_of_study,
                'start_year'     => $profile->start_year,
                'year_number'    => $profile->year_number,        // accessor
                'status'         => $profile->status,
                'progress'       => $profile->progress_summary,   // accessor
            ] : null,
            'disbursements' => $profile
                ? $profile->disbursements()->orderBy('period_start', 'desc')->get()
                : [],
        ]);
    }
}

