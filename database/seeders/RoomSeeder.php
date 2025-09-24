<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Room;

class RoomSeeder extends Seeder
{
    public function run(): void
    {
        $names = [
            'Room 01','Room 02','Room 03','Room 04',
            'Room 05','Room 06','Room 07','Room 07',
            'Informatique','Room 08','Librairie',"Salle de preparation",
        ];
        foreach ($names as $n) {
            Room::firstOrCreate(['name' => $n], ['capacity' => null]);
        }
    }
}