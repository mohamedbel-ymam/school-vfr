<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ScholarshipDisbursement extends Model
{
    use HasFactory;

    protected $fillable = [
        'boursier_profile_id',
        'period_start',
        'period_end',
        'amount',
        'paid_at',
        'payment_method',
        'note',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end'   => 'date',
        'paid_at'      => 'date',
    ];

    public function profile()
    {
        return $this->belongsTo(BoursierProfile::class, 'boursier_profile_id');
    }
}

