<?php

namespace App\Exports;

use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Degree;
use App\Models\User;
use Carbon\Carbon;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class AttendanceWeeklySummaryExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize, WithStyles
{
    protected int $degreeId;
    protected string $from;
    protected string $to;
    protected ?Degree $degree = null;

    public function __construct(int $degreeId, string $from, string $to)
    {
        $this->degreeId = $degreeId;
        $this->from = $from;
        $this->to = $to;
    }

    public function collection()
    {
        $this->degree = Degree::query()
            ->select(['id', 'name'])
            ->findOrFail($this->degreeId);

        $from = Carbon::parse($this->from)->toDateString();
        $to   = Carbon::parse($this->to)->toDateString();

        $students = User::query()
            ->where('role', 'student')
            ->where('degree_id', $this->degreeId)
            ->select(['id', 'firstname', 'lastname', 'degree_id'])
            ->orderBy('lastname')
            ->orderBy('firstname')
            ->get();

        $sessions = AttendanceSession::query()
            ->where('degree_id', $this->degreeId)
            ->whereBetween('session_date', [$from, $to])
            ->get(['id', 'session_date']);

        $sessionIds = $sessions->pluck('id')->all();

        $records = AttendanceRecord::query()
            ->whereIn('attendance_session_id', $sessionIds)
            ->get(['student_id', 'status']);

        $countsByStudent = [];

        foreach ($records as $record) {
            $studentId = $record->student_id;

            if (!isset($countsByStudent[$studentId])) {
                $countsByStudent[$studentId] = [
                    'presence' => 0,
                    'absence' => 0,
                    'absence_justifiee' => 0,
                    'not_marked' => 0,
                ];
            }

            if (isset($countsByStudent[$studentId][$record->status])) {
                $countsByStudent[$studentId][$record->status]++;
            }
        }

        return $students->map(function ($student) use ($countsByStudent) {
            $counts = $countsByStudent[$student->id] ?? [
                'presence' => 0,
                'absence' => 0,
                'absence_justifiee' => 0,
                'not_marked' => 0,
            ];

            $presence = (int) $counts['presence'];
            $absence = (int) $counts['absence'];
            $justified = (int) $counts['absence_justifiee'];
            $totalMarked = $presence + $absence + $justified;

            $rate = $totalMarked > 0
                ? round(($presence / $totalMarked) * 100, 1) . '%'
                : '0%';

            return (object) [
                'full_name' => trim(($student->firstname ?? '') . ' ' . ($student->lastname ?? '')),
                'degree_name' => $this->degree?->name ?? '',
                'presence' => $presence,
                'absence' => $absence,
                'absence_justifiee' => $justified,
                'total_marked' => $totalMarked,
                'attendance_rate' => $rate,
            ];
        });
    }

    public function headings(): array
    {
        return [
            'Élève',
            'Classe',
            'Présences',
            'Absences',
            'Absences justifiées',
            'Total marqué',
            'Taux de présence',
        ];
    }

    public function map($row): array
    {
        return [
            $row->full_name,
            $row->degree_name,
            $row->presence,
            $row->absence,
            $row->absence_justifiee,
            $row->total_marked,
            $row->attendance_rate,
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => [
                'font' => ['bold' => true],
            ],
        ];
    }
}
