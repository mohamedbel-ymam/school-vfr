<?php



use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // If table doesn't exist (e.g., previous create failed mid-way), create it cleanly.
        if (!Schema::hasTable('monthly_subject_plans')) {
            Schema::create('monthly_subject_plans', function (Blueprint $table) {
                $table->id();
                $table->date('plan_date');
                $table->foreignId('degree_id')->constrained()->cascadeOnDelete();
                $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
                $table->foreignId('teacher_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('title')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();

                // Short names to avoid MySQL 64-char limit
                $table->unique(['plan_date','degree_id','subject_id','teacher_id'], 'msp_uniq');
                $table->index(['plan_date','degree_id'], 'msp_plan_deg_idx');
            });
            return;
        }

        // Table exists (your case). Safely add indexes with short names if missing.
        try {
            DB::statement("ALTER TABLE `monthly_subject_plans`
                ADD UNIQUE KEY `msp_uniq` (`plan_date`,`degree_id`,`subject_id`,`teacher_id`)");
        } catch (\Throwable $e) { /* ignore if exists */ }

        try {
            DB::statement("ALTER TABLE `monthly_subject_plans`
                ADD INDEX `msp_plan_deg_idx` (`plan_date`,`degree_id`)");
        } catch (\Throwable $e) { /* ignore if exists */ }
    }

    public function down(): void
    {
        // Keep it safe: only drop the short indexes
        try { DB::statement("ALTER TABLE `monthly_subject_plans` DROP INDEX `msp_uniq`"); } catch (\Throwable $e) {}
        try { DB::statement("ALTER TABLE `monthly_subject_plans` DROP INDEX `msp_plan_deg_idx`"); } catch (\Throwable $e) {}
    }
};