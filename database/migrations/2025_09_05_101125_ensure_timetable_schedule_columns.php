<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('timetables', function (Blueprint $table) {
            if (!Schema::hasColumn('timetables','period')) {
                $table->string('period', 50)->nullable()->after('day_of_week');
            }
            if (!Schema::hasColumn('timetables','start_time')) {
                $table->time('start_time')->nullable()->after('period');
            }
            if (!Schema::hasColumn('timetables','end_time')) {
                $table->time('end_time')->nullable()->after('start_time');
            }
        });

        // Try to ensure FKs exist, but don't crash if legacy data blocks them.
        try { DB::statement("ALTER TABLE `timetables`
            ADD CONSTRAINT `tt_degree_fk`  FOREIGN KEY (`degree_id`)  REFERENCES `degrees`(`id`)  ON DELETE CASCADE"); } catch (\Throwable $e) {}
        try { DB::statement("ALTER TABLE `timetables`
            ADD CONSTRAINT `tt_subject_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE"); } catch (\Throwable $e) {}
        try { DB::statement("ALTER TABLE `timetables`
            ADD CONSTRAINT `tt_teacher_fk` FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`)    ON DELETE CASCADE"); } catch (\Throwable $e) {}
        // room_id should be nullable; if you want FK:
        try { DB::statement("ALTER TABLE `timetables`
            ADD CONSTRAINT `tt_room_fk`    FOREIGN KEY (`room_id`)   REFERENCES `rooms`(`id`)    ON DELETE SET NULL"); } catch (\Throwable $e) {}
    }

    public function down(): void
    {
        // Best-effort drops (ignore if not present)
        foreach (['tt_degree_fk','tt_subject_fk','tt_teacher_fk','tt_room_fk'] as $fk) {
            try { DB::statement("ALTER TABLE `timetables` DROP FOREIGN KEY `$fk`"); } catch (\Throwable $e) {}
        }
        Schema::table('timetables', function (Blueprint $table) {
            // keep columns; down is no-op to avoid data loss
        });
    }
};