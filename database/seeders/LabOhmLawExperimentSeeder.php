<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Experiment;
use App\Models\ExperimentQuestion;

class LabOhmLawExperimentSeeder extends Seeder
{
    public function run(): void
    {
        $exp = Experiment::updateOrCreate(
            ['slug' => 'pc-loi-ohm'],
            [
                'title' => "Loi d’Ohm : U = R × I (Simulation)",
                'subject' => 'pc',
                'is_public' => true,
                'level_tags' => ['college', 'tronc_commun', 'bac1_sm', 'bac1_se'],

                'briefing' => [
                    'objectifs' => [
                        "Vérifier la loi d’Ohm sur un conducteur ohmique.",
                        "Tracer la caractéristique U = f(I).",
                        "Interpréter la pente comme une résistance.",
                    ],
                    'prerequis' => [
                        "Unités : volt (V), ampère (A), ohm (Ω).",
                        "Proportionnalité et lecture de graphe.",
                    ],
                    'consignes' => [
                        "Choisir une résistance R.",
                        "Faire varier la tension U et relever l’intensité I.",
                        "Compléter le tableau de mesures.",
                        "Répondre aux questions (correction instantanée).",
                    ],
                ],

                'synthese' => [
                    'a_retenir' => [
                        "Pour un conducteur ohmique : U = R × I.",
                        "U et I sont proportionnels : la courbe U=f(I) est une droite passant par l’origine.",
                        "La pente de la droite (ΔU/ΔI) correspond à la résistance R (en Ω).",
                    ],
                    'erreurs_frequentes' => [
                        "Confondre U et I.",
                        "Oublier les unités.",
                        "Ne pas préciser quelle fonction est tracée (U=f(I) ou I=f(U)).",
                        "Arrondis excessifs qui faussent la pente.",
                    ],
                ],

                // IMPORTANT: simulation interactive (manipulable)
                'simulation' => [
                    'type' => 'native',
                    'engine' => 'ohm_law',
                    'parameters' => [
                        'R' => ['min' => 1, 'max' => 100, 'step' => 1, 'default' => 10, 'unit' => 'Ω'],
                        'U' => ['min' => 0, 'max' => 12, 'step' => 0.5, 'default' => 6, 'unit' => 'V'],
                    ],
                    'outputs' => ['I', 'graph_UI', 'table'],
                    'tasks' => [
                        "Fixer R=10Ω et relever I pour U=2V, 4V, 6V.",
                        "Changer R=20Ω et comparer l’intensité obtenue pour U=6V.",
                        "Tracer U=f(I) et vérifier l’alignement des points.",
                    ],
                    'limits' => [
                        'maxMeasurements' => 40
                    ]
                ],

                'runner_config' => [
                    'sections' => ['briefing', 'simulation', 'synthese', 'quiz'],
                    'quiz' => [
                        'mode' => 'instant',
                        'maxTries' => 3
                    ]
                ],
            ]
        );

        // Helper: upsert questions by order
        $upsert = function (int $order, array $data) use ($exp) {
            ExperimentQuestion::updateOrCreate(
                ['experiment_id' => $exp->id, 'order' => $order],
                array_merge($data, ['experiment_id' => $exp->id, 'order' => $order])
            );
        };

        // Q1 MCQ
        $upsert(1, [
            'type' => 'mcq',
            'prompt' => "Quelle relation correspond à la loi d’Ohm ?",
            'options' => ["I = U × R", "U = R × I", "R = U × I", "U = I / R"],
            'answer' => ['correctIndex' => 1],
            'explanation' => "La loi d’Ohm s’écrit U = R × I (U en V, R en Ω, I en A).",
            'is_instant_feedback' => true,
        ]);

        // Q2 Numeric
        $upsert(2, [
            'type' => 'numeric',
            'prompt' => "Si R = 10 Ω et U = 6 V, calcule l’intensité I (en A).",
            'answer' => ['value' => 0.6],
            'tolerance' => 0.05,
            'explanation' => "I = U/R = 6/10 = 0,6 A.",
            'is_instant_feedback' => true,
        ]);

        // Q3 MCQ
        $upsert(3, [
            'type' => 'mcq',
            'prompt' => "La courbe U=f(I) d’un conducteur ohmique est :",
            'options' => ["Une parabole", "Une droite passant par l’origine", "Un cercle", "Une droite qui ne passe pas par l’origine"],
            'answer' => ['correctIndex' => 1],
            'explanation' => "U est proportionnel à I pour un conducteur ohmique.",
            'is_instant_feedback' => true,
        ]);

        // Q4 Short
        $upsert(4, [
            'type' => 'short',
            'prompt' => "Que représente la pente de la droite sur le graphe U=f(I) ?",
            'answer' => ['keywords' => ['résistance', 'r'], 'min_hits' => 1],
            'explanation' => "La pente ΔU/ΔI correspond à la résistance R (en ohms).",
            'is_instant_feedback' => true,
        ]);

        // Q5 Numeric
        $upsert(5, [
            'type' => 'numeric',
            'prompt' => "Si U = 4 V et I = 0,2 A, calcule R (en Ω).",
            'answer' => ['value' => 20],
            'tolerance' => 1.0,
            'explanation' => "R = U/I = 4/0,2 = 20 Ω.",
            'is_instant_feedback' => true,
        ]);

        // Q6 MCQ
        $upsert(6, [
            'type' => 'mcq',
            'prompt' => "Si la résistance augmente (U constant), l’intensité I :",
            'options' => ["Augmente", "Diminue", "Reste constante", "Devient négative"],
            'answer' => ['correctIndex' => 1],
            'explanation' => "I = U/R : si R augmente, I diminue (U constant).",
            'is_instant_feedback' => true,
        ]);
    }
}
