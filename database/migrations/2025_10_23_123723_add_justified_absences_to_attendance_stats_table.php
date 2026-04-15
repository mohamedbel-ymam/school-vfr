<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('attendance_stats', function (Blueprint $table) {
            if (!Schema::hasColumn('attendance_stats', 'justified_absences')) {
                $table->unsignedInteger('justified_absences')->default(0)->after('absences');
            }
        });
    }

    public function down(): void
    {
        Schema::table('attendance_stats', function (Blueprint $table) {
            if (Schema::hasColumn('attendance_stats', 'justified_absences')) {
                $table->dropColumn('justified_absences');
            }
        });
    }
};

