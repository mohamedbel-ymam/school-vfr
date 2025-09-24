<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Subject;

class SubjectSeeder extends Seeder
{
    public function run(): void
    {
        $subjects = [
            ['name' => 'Mathematique', 'code' => 'MATH'],
            ['name' => 'Physique & Chimie',     'code' => 'PC'],
            ['name' => 'Sciene de la vie & terre',   'code' => 'SVT'],
            ['name' => 'Anglais',     'code' => 'ANG'],
            ['name' => 'Histoire-Geographie',     'code' => 'HIS-GEO'],
            ['name' => 'Arabe',     'code' => 'ARAB'],
            ['name' => 'Education-Islamique',   'code' => 'Educ-Isl'],
            ['name' => 'Français','code' => 'FR'],
            ['name' => 'Informatique',         'code' => 'INFO'],
            
        ];
          foreach ($subjects as $s) {
            $code = strtoupper(trim($s['code']));
            Subject::updateOrCreate(
                ['code' => $code],                    // lookup by unique column
                ['name' => $s['name'], 'code' => $code] // update name if exists
            );
        }
    }
}