<?php

namespace App\Support;

use Carbon\CarbonImmutable;

class AttendancePeriod
{
    /**
     * Map UI period -> (scope, key, meta-range)
     * Returns: [scope, key, meta|null]
     */
    public static function resolve(string $period): array
    {
        $now = CarbonImmutable::now();

        switch ($period) {
            case 'week': {
                $start = $now->startOfWeek(CarbonImmutable::MONDAY);
                $end   = $now->endOfWeek(CarbonImmutable::SUNDAY);
                $year  = $now->isoWeekYear();
                $week  = str_pad((string) $now->isoWeek(), 2, '0', STR_PAD_LEFT);
                return ['week', "{$year}-W{$week}", [
                    'from' => $start->toDateString(),
                    'to'   => $end->toDateString(),
                ]];
            }
            case 'month': {
                $start = $now->startOfMonth();
                $end   = $now->endOfMonth();
                return ['month', $now->format('Y-m'), [
                    'from' => $start->toDateString(),
                    'to'   => $end->toDateString(),
                ]];
            }
            case 'overall':
            default:
                return ['overall', 'overall', null];
        }
    }
}
