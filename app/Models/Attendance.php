<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    public static function incrementPeriod($studentId, $period, $delta)
{
    if ($delta == 0) return;

    $att = self::firstOrCreate([
        'student_id' => $studentId,
        'period' => $period,
    ]);

    $att->presences += $delta;
    $att->save();
}
}
