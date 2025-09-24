<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;
use App\Models\Degree;

class DegreeSeeder extends Seeder
{
    public function run(): void
    {
        Schema::disableForeignKeyConstraints();
        Degree::truncate();
        Schema::enableForeignKeyConstraints();

        $now = now();
        $rows = [
            ['name' => 'First Year',  'description' => '1st year'],
            ['name' => 'Second Year', 'description' => '2nd year'],
            ['name' => 'Third Year',  'description' => '3rd year'],
            ['name' => 'Fourth Year', 'description' => '4th year'],
            ['name' => 'Final Year',  'description' => 'Final year'],
        ];

        // add timestamps if your table has them
        $rows = array_map(fn($r) => $r + ['created_at' => $now, 'updated_at' => $now], $rows);

        Degree::insert($rows);
    }
}
