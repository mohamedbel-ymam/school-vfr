<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    private function indexExists(string $table, string $index): bool
    {
        $rows = DB::select("SHOW INDEX FROM `{$table}` WHERE Key_name = ?", [$index]);
        return !empty($rows);
    }

    public function up(): void
    {
        DB::transaction(function () {
            // 1) Columns
            if (!Schema::hasColumn('degrees', 'slug')) {
                Schema::table('degrees', function (Blueprint $table) {
                    $table->string('slug')->nullable()->after('name');
                });
            }
            if (!Schema::hasColumn('degrees', 'position')) {
                Schema::table('degrees', function (Blueprint $table) {
                    $table->unsignedTinyInteger('position')->default(0)->after('slug');
                });
            }

            // 2) Drop unique(name) if it exists to avoid collisions while normalizing
            if ($this->indexExists('degrees', 'degrees_name_unique')) {
                Schema::table('degrees', function (Blueprint $table) {
                    $table->dropUnique('degrees_name_unique');
                });
            }

            // 3) Ensure unique(slug)
            if (!$this->indexExists('degrees', 'degrees_slug_unique')) {
                Schema::table('degrees', function (Blueprint $table) {
                    $table->unique('slug', 'degrees_slug_unique');
                });
            }

            // 4) Canonical targets (exactly 5)
            $targets = [
                [
                    'label'   => '3ème année collège',
                    'slug'    => 'college-3eme',
                    'pos'     => 1,
                    'aliases' => [
                        'first','première année collège','1ère année collège','1er année collège',
                        '2ème année collège','2eme annee college','2eme année collège','2éme année college'
                    ],
                ],
                [
                    'label'   => 'Tronc Commun',
                    'slug'    => 'tronc-commun',
                    'pos'     => 2,
                    'aliases' => [
                        'second','deuxième année collège','2ème année collège',
                        '3ème année collège','3eme annee college','troisième année collège'
                    ],
                ],
                [
                    'label'   => '1er année Bac (SE)',
                    'slug'    => 'bac1-se',
                    'pos'     => 3,
                    'aliases' => ['third','tronc commun','tronc-commun'],
                ],
                [
                    'label'   => '1er année Bac (SM)',
                    'slug'    => 'bac1-sm',
                    'pos'     => 4,
                    'aliases' => ['fourth','1ère année bac','1er année bac','première année bac'],
                ],
                [
                    'label'   => '2ème année Bac',
                    'slug'    => 'bac2',
                    'pos'     => 5,
                    'aliases' => ['final','2ème année bac','2eme annee bac','bac 2'],
                ],
            ];

            // 5) Upsert the 5 canonical degree rows (by slug)
            foreach ($targets as $t) {
                DB::table('degrees')->updateOrInsert(
                    ['slug' => $t['slug']],
                    [
                        'name'       => $t['label'],
                        'position'   => $t['pos'],
                        'updated_at' => now(),
                        'created_at' => now(), // used if insert
                    ]
                );
            }

            // 6) Repoint users.degree_id to canonical rows based on aliases
            foreach ($targets as $t) {
                $slug   = $t['slug'];
                $label  = $t['label'];
                $pos    = $t['pos'];
                $canonId = DB::table('degrees')->where('slug', $slug)->value('id');

                if (!$canonId) continue;

                // Make sure canonical row has correct label/position
                DB::table('degrees')->where('id', $canonId)->update([
                    'name'       => $label,
                    'position'   => $pos,
                    'updated_at' => now(),
                ]);

                // Collect source degree IDs: any row whose LOWER(name) is in aliases OR equals label but has null/other slug
                $names = array_map(fn($s) => mb_strtolower($s), array_merge($t['aliases'], [$label]));
                $sourceIds = DB::table('degrees')
                    ->whereIn(DB::raw('LOWER(name)'), $names)
                    ->where(function ($q) use ($slug) {
                        $q->whereNull('slug')->orWhere('slug', '<>', $slug);
                    })
                    ->pluck('id');

                if ($sourceIds->count() > 0) {
                    // Move users to canonical degree
                    DB::table('users')->whereIn('degree_id', $sourceIds)->update(['degree_id' => $canonId]);
                }

                // Optionally, tag canonical label explicitly on those legacy rows to avoid confusion (no slug to keep them hidden)
                // DB::table('degrees')->whereIn('id', $sourceIds)->update(['name' => $label]);
            }

            // 7) Final pass: set slug+position on canonical only; leave legacy rows with slug = NULL
            // (API will only expose slug != NULL)
        });
    }

    public function down(): void
    {
        // No destructive rollback for data moves.
        // If you really need to restore unique(name):
        // Schema::table('degrees', function (Blueprint $table) {
        //     $table->unique('name', 'degrees_name_unique');
        // });
    }
};
