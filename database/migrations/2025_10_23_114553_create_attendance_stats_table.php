<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('attendance_stats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            // Scope of aggregation
            $table->string('scope', 16);        // overall | month | week | custom (reserved)
            $table->string('period_key', 32);   // e.g. "overall", "2025-10", "2025-W43"
            $table->unsignedInteger('absences')->default(0);
            $table->unsignedInteger('presences')->default(0);
            $table->json('meta')->nullable();   // e.g. {"from":"2025-10-01","to":"2025-10-31"}
            $table->timestamps();

            $table->unique(['student_id', 'scope', 'period_key']);
            $table->index(['scope', 'period_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_stats');
    }
};
