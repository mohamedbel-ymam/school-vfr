<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('test_questions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('test_id')
                ->constrained('tests')
                ->cascadeOnDelete();

            $table->text('statement');         // text of question
            $table->json('options');           // ["A","B","C","D"]
            $table->string('correct_answer');  // e.g. "A"

            $table->unsignedInteger('order')->default(0); // position inside test

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('test_questions');
    }
};

