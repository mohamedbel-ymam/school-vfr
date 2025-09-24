<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('monthly_subject_plans', function (Blueprint $t) {
            if (!Schema::hasColumn('monthly_subject_plans', 'sequence')) {
                $t->unsignedSmallInteger('sequence')->default(1)->after('teacher_id');
            }

            // Drop the old unique if it exists, then create the new one with sequence
            try {
                $t->dropUnique('msp_uniq'); // name must match your current index name
            } catch (\Throwable $e) {
                // ignore if it doesn't exist
            }

            $t->unique(
                ['plan_date','degree_id','subject_id','teacher_id','sequence'],
                'msp_uniq'
            );
        });
    }

    public function down(): void
    {
        Schema::table('monthly_subject_plans', function (Blueprint $t) {
            // Revert to the old unique (without sequence)
            try {
                $t->dropUnique('msp_uniq');
            } catch (\Throwable $e) {}

            $t->unique(
                ['plan_date','degree_id','subject_id','teacher_id'],
                'msp_uniq'
            );

            if (Schema::hasColumn('monthly_subject_plans', 'sequence')) {
                $t->dropColumn('sequence');
            }
        });
    }
};
