<?php

// app/Exports/AttendanceRecordsExport.php
namespace App\Exports;

use App\Models\AttendanceRecord;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class AttendanceRecordsExport implements FromCollection, WithHeadings
{
    public function __construct(
        private int $degreeId,
        private string $from,
        private string $to
    ) {}

    public function headings(): array
    {
        return [
            'Date',
            'ID_Etudiants',
            'Prénom',
            'Nom',
            'status',
            'marker_par',
            'Marker_à',
        ];
    }

    public function collection(): Collection
    {
        return AttendanceRecord::query()
            ->whereHas('session', fn($q) =>
                $q->where('degree_id', $this->degreeId)
                  ->whereBetween('session_date', [$this->from, $this->to])
            )
            ->with(['student:id,firstname,lastname', 'session:id,session_date'])
            ->get()
            ->map(function ($r) {
                return [
                    'Date'      => $r->session->session_date,
                    'ID_Etudiants'=> $r->student_id,
		    'Prénom'    => $r->student->firstname ?? '',
                    'Nom'  => $r->student->lastname ?? '',
                    'status'    => $r->status,
                    'marker_par' => $r->marked_by,
                    'Marker_à' => optional($r->marked_at)->toDateTimeString(),
                ];
            });
    }
}
