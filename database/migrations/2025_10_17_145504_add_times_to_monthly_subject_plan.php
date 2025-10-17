<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('monthly_subject_plans', function (Blueprint $table) {
            // TIME fits well; stays TZ-free. If you ever use SQLite in tests, it's stored as string.
            if (!Schema::hasColumn('monthly_subject_plans', 'start_time')) {
                $table->time('start_time')->nullable()->after('title');
            }
            if (!Schema::hasColumn('monthly_subject_plans', 'end_time')) {
                $table->time('end_time')->nullable()->after('start_time');
            }
        });
    }

    public function down(): void
    {
        Schema::table('monthly_subject_plans', function (Blueprint $table) {
            if (Schema::hasColumn('monthly_subject_plans', 'end_time'))   $table->dropColumn('end_time');
            if (Schema::hasColumn('monthly_subject_plans', 'start_time')) $table->dropColumn('start_time');
        });
    }
};
