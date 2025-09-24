<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('timetables', function (Blueprint $table) {
            if (!Schema::hasColumn('timetables', 'room_id')) {
                $table->foreignId('room_id')->nullable()->constrained('rooms')->nullOnDelete();
            }
        });
    }
    public function down(): void {
        Schema::table('timetables', function (Blueprint $table) {
            if (Schema::hasColumn('timetables', 'room_id')) {
                $table->dropConstrainedForeignId('room_id');
            }
        });
    }
};