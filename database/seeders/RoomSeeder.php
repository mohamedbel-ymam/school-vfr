<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Room;

class RoomSeeder extends Seeder
{
    public function run(): void
    {
        $names = [
            'Salle 01','Salle 02','Salle 03','Salle 04',
            'Salle 05','Salle 06','Salle 07','Salle 08',
            'Salle Informatique','Salle 09','Librairie',"Salle de preparation",
        ];
        foreach ($names as $n) {
            Room::firstOrCreate(['name' => $n], ['capacity' => null]);
        }
    }
}