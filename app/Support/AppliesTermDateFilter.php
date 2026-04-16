<?php

namespace App\Support;

use Illuminate\Support\Carbon;

trait AppliesTermDateFilter
{
    protected function applyTermDateFilter($q, string $term, ?int $schoolYearStart = null)
    {
        $term = strtoupper(trim($term));
        $now = now();

        // Année scolaire: commence en septembre
        // schoolYearStart = année de début (ex: 2025 pour 2025-2026)
        $schoolYearStart = $schoolYearStart ?? ($now->month >= 9 ? $now->year : $now->year - 1);

        if ($term === 'S1') {
            $from = Carbon::create($schoolYearStart, 9, 1)->startOfDay();
            $to   = Carbon::create($schoolYearStart + 1, 1, 31)->endOfDay();
            return $q->whereBetween('graded_at', [$from, $to]);
        }

        if ($term === 'S2') {
            $from = Carbon::create($schoolYearStart + 1, 2, 1)->startOfDay();
            $to   = Carbon::create($schoolYearStart + 1, 6, 30)->endOfDay();
            return $q->whereBetween('graded_at', [$from, $to]);
        }

        return $q;
    }
protected function termDateRange(string $term, ?int $schoolYearStart = null): ?array
{
    $term = strtoupper(trim($term));
    $now = now();
    $schoolYearStart = $schoolYearStart ?? ($now->month >= 9 ? $now->year : $now->year - 1);

    if ($term === 'S1') {
        return [
            now()->setDate($schoolYearStart, 9, 1)->startOfDay(),
            now()->setDate($schoolYearStart + 1, 1, 31)->endOfDay(),
        ];
    }

    if ($term === 'S2') {
        return [
            now()->setDate($schoolYearStart + 1, 2, 1)->startOfDay(),
            now()->setDate($schoolYearStart + 1, 6, 30)->endOfDay(),
        ];
    }

    return null;
}
}
