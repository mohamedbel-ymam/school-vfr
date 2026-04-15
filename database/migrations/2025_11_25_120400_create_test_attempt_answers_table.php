<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('test_attempt_answers', function (Blueprint $table) {
            $table->id();

            $table->foreignId('attempt_id')
                ->constrained('test_attempts')
                ->cascadeOnDelete();

            $table->foreignId('question_id')
                ->constrained('test_questions')
                ->cascadeOnDelete();

            $table->string('student_answer');  // "A", "B", "C"…
            $table->boolean('is_correct');     // computed when correcting

            $table->timestamps();

            $table->unique(['attempt_id', 'question_id']); // one answer per question/attempt
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('test_attempt_answers');
    }
};

