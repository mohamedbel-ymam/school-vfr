<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('test_attempts', function (Blueprint $table) {
            $table->id();

            $table->foreignId('test_id')
                ->constrained('tests')
                ->cascadeOnDelete();

            $table->foreignId('student_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->unsignedInteger('attempt_number')->default(1); // 1,2,3…
            $table->decimal('score', 5, 2)->nullable();             // e.g. 17.50/20
            $table->boolean('is_valid')->default(true);             // teacher can invalidate
            $table->timestamp('completed_at')->nullable();

            $table->timestamps();

            $table->index(['test_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('test_attempts');
    }
};

