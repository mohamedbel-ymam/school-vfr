<?php

namespace App\Imports;

use App\Models\WaitingListEntry;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class WaitingListImport implements ToModel, WithHeadingRow
{
    private $order = 1;

    public function model(array $row)
    {
        $firstName = $row['first_name'] ?? $row['firstname'] ?? $row['prenom'] ?? $row['prénom'] ?? null;
        $lastName  = $row['last_name'] ?? $row['lastname'] ?? $row['nom'] ?? null;
        $degree    = $row['degree'] ?? $row['niveau'] ?? $row['classe'] ?? null;

        if (!$firstName && !$lastName) {
            return null; // Skip empty rows
        }

        return new WaitingListEntry([
            'first_name'  => (string) ($firstName ?? ''),
            'last_name'   => (string) ($lastName ?? ''),
            'degree'      => (string) ($degree ?? ''),
            'order_index' => $this->order++,
        ]);
    }
}
