<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('attendance_stats', function (Blueprint $table) {
            // Avoid duplicate key creation
            $table->unique(['student_id', 'scope', 'period_key'], 'att_stats_student_scope_period_unique');
        });
    }

    public function down(): void
    {
        Schema::table('attendance_stats', function (Blueprint $table) {
            $table->dropUnique('att_stats_student_scope_period_unique');
        });
    }
};

