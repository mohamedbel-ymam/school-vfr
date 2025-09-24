<?php
// php artisan make:migration add_teacher_id_to_monthly_subject_plans_table --table=monthly_subject_plans

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('monthly_subject_plans', function (Blueprint $table) {
            if (!Schema::hasColumn('monthly_subject_plans', 'teacher_id')) {
                $table->foreignId('teacher_id')->nullable()
                      ->constrained('users')->nullOnDelete();
            }
        });
    }
    public function down(): void {
        Schema::table('monthly_subject_plans', function (Blueprint $table) {
            if (Schema::hasColumn('monthly_subject_plans', 'teacher_id')) {
                $table->dropConstrainedForeignId('teacher_id');
            }
        });
    }
};
