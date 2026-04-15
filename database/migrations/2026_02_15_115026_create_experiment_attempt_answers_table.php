<?php
// database/migrations/2026_02_15_000004_create_experiment_attempt_answers_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void {
    Schema::create('experiment_attempt_answers', function (Blueprint $table) {
      $table->id();
      $table->foreignId('attempt_id')->constrained('experiment_attempts')->cascadeOnDelete();
      $table->foreignId('question_id')->constrained('experiment_questions')->cascadeOnDelete();

      $table->json('user_answer')->nullable();
      $table->boolean('is_correct')->nullable();
      $table->text('feedback')->nullable(); // FR
      $table->unsignedInteger('tries')->default(1);

      $table->timestamps();

      $table->unique(['attempt_id', 'question_id']);
    });
  }

  public function down(): void {
    Schema::dropIfExists('experiment_attempt_answers');
  }
};
