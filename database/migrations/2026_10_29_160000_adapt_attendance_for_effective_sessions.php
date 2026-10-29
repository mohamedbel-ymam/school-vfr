<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // 1. Adapt attendance_sessions for effective/dated course sessions
        Schema::table('attendance_sessions', function (Blueprint $table) {
            // First ensure an explicit index on degree_id exists so MySQL doesn't block dropping the compound unique
            $table->index('degree_id', 'att_sess_degree_fk_idx');
        });

        Schema::table('attendance_sessions', function (Blueprint $table) {
            // Now drop unique constraint so multiple sessions can occur on the same day for a class
            try {
                $table->dropUnique('attendance_sessions_degree_id_session_date_unique');
            } catch (\Throwable $e) {
                // If named differently or already dropped
            }

            if (!Schema::hasColumn('attendance_sessions', 'timetable_id')) {
                $table->foreignId('timetable_id')->nullable()->after('teacher_id')->constrained('timetables')->nullOnDelete();
            }
            if (!Schema::hasColumn('attendance_sessions', 'group_id')) {
                $table->foreignId('group_id')->nullable()->after('degree_id')->constrained('groups')->nullOnDelete();
            }
            if (!Schema::hasColumn('attendance_sessions', 'subject_id')) {
                $table->foreignId('subject_id')->nullable()->after('timetable_id')->constrained('subjects')->nullOnDelete();
            }
            if (!Schema::hasColumn('attendance_sessions', 'start_time')) {
                $table->string('start_time', 10)->nullable()->after('session_date');
            }
            if (!Schema::hasColumn('attendance_sessions', 'end_time')) {
                $table->string('end_time', 10)->nullable()->after('start_time');
            }
            if (!Schema::hasColumn('attendance_sessions', 'session_type')) {
                $table->string('session_type', 32)->default('regular')->after('end_time'); // regular | rattrapage | changement
            }
            if (!Schema::hasColumn('attendance_sessions', 'week_number')) {
                $table->unsignedSmallInteger('week_number')->nullable()->after('session_type');
            }
            if (!Schema::hasColumn('attendance_sessions', 'year')) {
                $table->unsignedSmallInteger('year')->nullable()->after('week_number');
            }
            if (!Schema::hasColumn('attendance_sessions', 'title')) {
                $table->string('title', 255)->nullable()->after('year');
            }
            if (!Schema::hasColumn('attendance_sessions', 'room')) {
                $table->string('room', 100)->nullable()->after('title');
            }
            if (!Schema::hasColumn('attendance_sessions', 'status')) {
                $table->string('status', 32)->default('completed')->after('room'); // scheduled | completed | cancelled
            }

            // Index for fast lookup by degree, week, year and date
            $table->index(['degree_id', 'session_date'], 'att_sess_degree_date_idx');
            $table->index(['degree_id', 'year', 'week_number'], 'att_sess_degree_week_idx');
        });

        // 2. Adapt attendance_records to store exact dated session reference and direct date
        Schema::table('attendance_records', function (Blueprint $table) {
            if (!Schema::hasColumn('attendance_records', 'date')) {
                $table->date('date')->nullable()->after('status');
                $table->index(['student_id', 'date'], 'att_rec_student_date_idx');
            }
        });

        // 3. Backfill year, week_number on attendance_sessions and date on attendance_records
        try {
            DB::statement("UPDATE attendance_sessions SET year = YEAR(session_date), week_number = WEEK(session_date, 3) WHERE year IS NULL AND session_date IS NOT NULL");
            DB::statement("UPDATE attendance_records ar INNER JOIN attendance_sessions s ON ar.attendance_session_id = s.id SET ar.date = s.session_date WHERE ar.date IS NULL");
        } catch (\Throwable $e) {
            // Ignore if driver differences
        }
    }

    public function down(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            if (Schema::hasColumn('attendance_records', 'date')) {
                $table->dropIndex('att_rec_student_date_idx');
                $table->dropColumn('date');
            }
        });

        Schema::table('attendance_sessions', function (Blueprint $table) {
            $table->dropIndex('att_sess_degree_date_idx');
            $table->dropIndex('att_sess_degree_week_idx');

            $colsToDrop = ['timetable_id', 'group_id', 'subject_id', 'start_time', 'end_time', 'session_type', 'week_number', 'year', 'title', 'room', 'status'];
            foreach ($colsToDrop as $col) {
                if (Schema::hasColumn('attendance_sessions', $col)) {
                    $table->dropColumn($col);
                }
            }
            $table->unique(['degree_id', 'session_date']);
        });
    }
};
