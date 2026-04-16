<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('timetables', function (Blueprint $table) {
            // for the weekly/plan features we’ve wired
            if (!Schema::hasColumn('timetables', 'period')) {
                $table->unsignedSmallInteger('period')->nullable()->after('day_of_week');
            }
            if (!Schema::hasColumn('timetables', 'start_time')) {
                $table->time('start_time')->nullable()->after('period');
            }
            if (!Schema::hasColumn('timetables', 'end_time')) {
                $table->time('end_time')->nullable()->after('start_time');
            }
            if (!Schema::hasColumn('timetables', 'week_start')) {
                $table->date('week_start')->nullable()->after('end_time');
            }
            if (!Schema::hasColumn('timetables', 'title')) {
                $table->string('title', 255)->nullable()->after('week_start');
            }
        });
    }

    public function down(): void
    {
        Schema::table('timetables', function (Blueprint $table) {
            if (Schema::hasColumn('timetables', 'title')) {
                $table->dropColumn('title');
            }
            if (Schema::hasColumn('timetables', 'week_start')) {
                $table->dropColumn('week_start');
            }
            if (Schema::hasColumn('timetables', 'end_time')) {
                $table->dropColumn('end_time');
            }
            if (Schema::hasColumn('timetables', 'start_time')) {
                $table->dropColumn('start_time');
            }
            if (Schema::hasColumn('timetables', 'period')) {
                $table->dropColumn('period');
            }
        });
    }
};
