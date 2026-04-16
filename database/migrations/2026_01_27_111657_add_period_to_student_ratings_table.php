<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('student_ratings', function (Blueprint $table) {
            // YYYY-MM
            $table->string('period', 7)->nullable()->after('term');
        });

        // Backfill period for existing rows
        // If rated_at exists => use it, else use created_at month
        DB::statement("
            UPDATE student_ratings
            SET period = DATE_FORMAT(COALESCE(rated_at, created_at), '%Y-%m')
            WHERE period IS NULL
        ");

        Schema::table('student_ratings', function (Blueprint $table) {
            // drop old unique
            $table->dropUnique('uniq_student_rater_term');

            // new unique includes month
            $table->unique(['student_id', 'rater_id', 'rater_role', 'term', 'period'], 'uniq_student_rater_term_period');

            $table->index(['student_id', 'term', 'period']);
        });

        // make it not null after backfill
        Schema::table('student_ratings', function (Blueprint $table) {
            $table->string('period', 7)->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('student_ratings', function (Blueprint $table) {
            $table->dropIndex(['student_id', 'term', 'period']);
            $table->dropUnique('uniq_student_rater_term_period');

            // restore old unique
            $table->unique(['student_id', 'rater_id', 'rater_role', 'term'], 'uniq_student_rater_term');

            $table->dropColumn('period');
        });
    }
};
