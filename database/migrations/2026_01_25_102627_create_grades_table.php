<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('grades', function (Blueprint $table) {
    $table->id();

    $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
    $table->foreignId('subject_id')->constrained()->cascadeOnDelete();

    $table->foreignId('entered_by')->constrained('users')->cascadeOnDelete();
    $table->foreignId('teacher_id')->nullable()->constrained('users')->nullOnDelete();

    $table->string('term', 10)->default('S1');        // <= limit length
    $table->string('exam_type', 20)->default('Exam'); // <= limit length
    $table->string('title', 80)->nullable();          // still ok, not indexed directly

    $table->decimal('score', 6, 2);
    $table->decimal('max_score', 6, 2)->default(20);

    $table->date('graded_at')->nullable();
    $table->text('comment')->nullable();

    // unique key stored as hash-friendly string
    $table->string('exam_key', 64);

    $table->timestamps();

    $table->unique(['exam_key'], 'grades_exam_key_unique');
});
    }

    public function down(): void
    {
        Schema::dropIfExists('grades');
    }
};
