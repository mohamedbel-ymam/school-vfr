<?php
// database/migrations/2026_02_15_000005_add_public_token_to_experiment_attempts_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void {
    Schema::table('experiment_attempts', function (Blueprint $table) {
      $table->string('public_token', 64)->nullable()->index()->after('user_id');
    });
  }

  public function down(): void {
    Schema::table('experiment_attempts', function (Blueprint $table) {
      $table->dropColumn('public_token');
    });
  }
};
