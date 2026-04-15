<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BoursierProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'university',
        'field_of_study',
        'start_year',
        'duration_years',
        'status',
    ];

    protected $casts = [
        'start_year'     => 'integer',
        'duration_years' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function disbursements()
    {
        return $this->hasMany(ScholarshipDisbursement::class);
    }

    public function getYearNumberAttribute(): ?int
    {
        if (!$this->start_year) {
            return null;
        }

        $nowYear = (int) now()->format('Y');
        return max(1, ($nowYear - (int) $this->start_year) + 1);
    }

    public function getProgressSummaryAttribute(): array
    {
        $total = $this->disbursements()->count();
        $paid  = $this->disbursements()->whereNotNull('paid_at')->count();

        return [
            'quarters_total'  => $total,
            'quarters_paid'   => $paid,
            'quarters_unpaid' => $total - $paid,
            'amount_paid'     => $this->disbursements()->whereNotNull('paid_at')->sum('amount'),
            'amount_unpaid'   => $this->disbursements()->whereNull('paid_at')->sum('amount'),
        ];
    }
}

