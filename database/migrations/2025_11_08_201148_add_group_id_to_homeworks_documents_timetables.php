<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        foreach (['homeworks', 'documents', 'timetables'] as $table) {
            if (Schema::hasTable($table) && !Schema::hasColumn($table, 'group_id')) {
                Schema::table($table, function (Blueprint $table) {
                    $table->foreignId('group_id')
                          ->nullable()
                          ->after('degree_id')
                          ->constrained('groups')
                          ->nullOnDelete();
                });
            }
        }
    }

    public function down(): void
    {
        foreach (['homeworks', 'documents', 'timetables'] as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'group_id')) {
                Schema::table($table, function (Blueprint $table) {
                    $table->dropConstrainedForeignId('group_id');
                });
            }
        }
    }
};

