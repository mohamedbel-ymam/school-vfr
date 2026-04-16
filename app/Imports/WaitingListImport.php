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
        return new WaitingListEntry([
            'first_name'  => $row['first_name'],
            'last_name'   => $row['last_name'],
            'degree'      => $row['degree'],
            'order_index' => $this->order++,
        ]);
    }
}
