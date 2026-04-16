<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('student_ratings', function (Blueprint $table) {
            $table->id();

            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();

            $table->foreignId('rater_id')->constrained('users')->cascadeOnDelete();
            $table->string('rater_role', 20); // teacher | admin

            $table->string('term', 10)->default('S1');
            $table->date('rated_at')->nullable();

            $table->unsignedTinyInteger('stars'); // 1..5
            $table->text('comment')->nullable();

            $table->timestamps();

            $table->unique(['student_id', 'rater_id', 'rater_role', 'term'], 'uniq_student_rater_term');
            $table->index(['student_id', 'term']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_ratings');
    }
};
