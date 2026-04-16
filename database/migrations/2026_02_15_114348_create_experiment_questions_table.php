<?php
// database/migrations/2026_02_15_000002_create_experiment_questions_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void {
    Schema::create('experiment_questions', function (Blueprint $table) {
      $table->id();
      $table->foreignId('experiment_id')->constrained()->cascadeOnDelete();

      $table->unsignedInteger('order')->default(1);

      // mcq | numeric | short
      $table->enum('type', ['mcq', 'numeric', 'short']);

      $table->text('prompt'); // FR
      $table->json('options')->nullable();     // MCQ
      $table->json('answer')->nullable();      // correction attendue
      $table->decimal('tolerance', 10, 4)->nullable(); // numeric

      $table->text('explanation')->nullable(); // FR
      $table->boolean('is_instant_feedback')->default(true);

      $table->timestamps();
      $table->index(['experiment_id', 'order']);
    });
  }

  public function down(): void {
    Schema::dropIfExists('experiment_questions');
  }
};
