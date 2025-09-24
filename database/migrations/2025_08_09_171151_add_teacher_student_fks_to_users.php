<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'subject_id')) {
                $table->foreignId('subject_id')->nullable()->constrained()->nullOnDelete();
            }
            if (!Schema::hasColumn('users', 'student_parent_id')) {
                $table->foreignId('student_parent_id')->nullable()->constrained('users')->nullOnDelete();
            }
        });
    }
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'student_parent_id')) {
                $table->dropConstrainedForeignId('student_parent_id');
            }
            if (Schema::hasColumn('users', 'subject_id')) {
                $table->dropConstrainedForeignId('subject_id');
            }
        });
    }
};