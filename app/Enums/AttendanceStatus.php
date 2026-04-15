<?php

namespace App\Enums;

enum AttendanceStatus: string
{
    case Presence = 'presence';
    case Absence = 'absence';
    case AbsenceJustifiee = 'absence_justifiee';
    case NotMarked = 'not_marked';

}
