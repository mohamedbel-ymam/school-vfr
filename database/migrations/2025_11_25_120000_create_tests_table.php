<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('tests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->string('title');               // header / name
            $table->text('description')->nullable();

            $table->integer('global_time_minutes');   // global duration of quiz
            $table->integer('question_time_minutes')->nullable(); // per question (optional)

            $table->unsignedInteger('total_questions'); // for info / control
            $table->unsignedInteger('grade_value');     // e.g. 20, 10…

            $table->boolean('is_active')->default(false); // teacher activates it

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tests');
    }
};

