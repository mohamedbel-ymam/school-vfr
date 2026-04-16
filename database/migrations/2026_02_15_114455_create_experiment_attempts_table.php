<?php
// database/migrations/2026_02_15_000003_create_experiment_attempts_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void {
    Schema::create('experiment_attempts', function (Blueprint $table) {
      $table->id();
      $table->foreignId('experiment_id')->constrained()->cascadeOnDelete();

      // public = user_id NULL (anonyme), sinon user connecté
      $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

      // public | assignment (plus tard)
      $table->enum('mode', ['public', 'assignment'])->default('public');

      // état de la manipulation: paramètres, tableau de mesures, progression
      $table->json('state')->nullable();

      $table->timestamp('started_at')->nullable();
      $table->timestamp('ended_at')->nullable();

      $table->timestamps();

      $table->index(['experiment_id', 'user_id', 'mode']);
    });
  }

  public function down(): void {
    Schema::dropIfExists('experiment_attempts');
  }
};
