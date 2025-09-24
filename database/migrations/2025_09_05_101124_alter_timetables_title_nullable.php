<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasColumn('timetables','title')) {
            Schema::table('timetables', function (Blueprint $table) {
                // needs doctrine/dbal for change()
                $table->string('title')->nullable()->default(null)->change();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('timetables','title')) {
            Schema::table('timetables', function (Blueprint $table) {
                $table->string('title')->nullable(false)->default(null)->change();
            });
        }
    }
};