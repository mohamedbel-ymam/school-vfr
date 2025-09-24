<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('timetables', function (Blueprint $table) {
            if (!Schema::hasColumn('timetables', 'degree_id')) {
                $table->foreignId('degree_id')->constrained('degrees')->cascadeOnDelete();
            }
            if (!Schema::hasColumn('timetables', 'subject_id')) {
                $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            }
            if (!Schema::hasColumn('timetables', 'teacher_id')) {
                $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            }
            if (!Schema::hasColumn('timetables', 'room_id')) {
                $table->foreignId('room_id')->nullable()->constrained('rooms')->nullOnDelete();
            }
            if (!Schema::hasColumn('timetables', 'day_of_week')) {
                $table->unsignedTinyInteger('day_of_week');
            }
            // allow either period OR time range
            if (!Schema::hasColumn('timetables', 'period')) {
                $table->unsignedTinyInteger('period')->nullable();
            }
            if (!Schema::hasColumn('timetables', 'start_time')) {
                $table->time('start_time')->nullable();
            }
            if (!Schema::hasColumn('timetables', 'end_time')) {
                $table->time('end_time')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('timetables', function (Blueprint $table) {
            if (Schema::hasColumn('timetables', 'degree_id'))  $table->dropConstrainedForeignId('degree_id');
            if (Schema::hasColumn('timetables', 'subject_id')) $table->dropConstrainedForeignId('subject_id');
            if (Schema::hasColumn('timetables', 'teacher_id')) $table->dropConstrainedForeignId('teacher_id');
            if (Schema::hasColumn('timetables', 'room_id'))    $table->dropConstrainedForeignId('room_id');

            foreach (['day_of_week','period','start_time','end_time'] as $c) {
                if (Schema::hasColumn('timetables', $c)) $table->dropColumn($c);
            }
        });
    }
};
