<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Room; // Import the models for clarity
use App\Models\Timetable;

class ClearRoomDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Temporarily DISABLE foreign key checks using unprepared statement.
        // This is necessary to force the truncation of tables with FK references.
        DB::unprepared('SET FOREIGN_KEY_CHECKS=0;');

        // 2. TRUNCATE the dependent table first (Timetables)
        // We use the model's truncate() method here, or DB::table()->truncate()
        DB::table('timetables')->truncate();

        // 3. TRUNCATE the primary table (Rooms)
        DB::table('rooms')->truncate();

        // 4. Re-enable foreign key checks. This is CRITICAL for data integrity.
        DB::unprepared('SET FOREIGN_KEY_CHECKS=1;');

        $this->command->info('Timetables and Rooms tables truncated successfully without affecting other tables.');
    }
}
