<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Degree;

class DegreeSeeder extends Seeder
{
    public function run(): void
    {
        $degrees = [
            ['slug' => 'college-3eme', 'name' => '3ème Année Collège', 'description' => 'Cycle Collégial'],
            ['slug' => 'tronc-commun', 'name' => 'Tronc Commun', 'description' => 'Cycle Secondaire'],
            ['slug' => 'bac1-se',      'name' => '1ère Année Bac (Sciences Éxperimentales)', 'description' => 'Bac 1 SE'],
            ['slug' => 'bac1-sm',      'name' => '1ère Année Bac (Sciences Mathématiques)', 'description' => 'Bac 1 SM'],
            ['slug' => 'bac2-gr1',     'name' => '2ème Année Bac (Groupe 1)', 'description' => 'Bac 2 Groupe 1'],
            ['slug' => 'bac2-gr2',     'name' => '2ème Année Bac (Groupe 2)', 'description' => 'Bac 2 Groupe 2'],
        ];

        foreach ($degrees as $deg) {
            Degree::updateOrCreate(
                ['slug' => $deg['slug']],
                [
                    'name' => $deg['name'],
                    'description' => $deg['description'] ?? null,
                ]
            );
        }
    }
}
