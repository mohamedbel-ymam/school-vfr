<?php
// database/migrations/2026_02_15_000001_create_experiments_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void {
    Schema::create('experiments', function (Blueprint $table) {
      $table->id();
      $table->string('slug')->unique();
      $table->string('title'); // FR
      $table->enum('subject', ['math', 'bio_geo', 'pc']); // pc = Physique & Chimie
      $table->boolean('is_public')->default(true);

      // niveaux: ["college", "tronc_commun", "bac1_sm", ...]
      $table->json('level_tags')->nullable();

      // contenu en FR
      $table->json('briefing')->nullable();  // objectifs, prerequis, consignes...
      $table->json('synthese')->nullable();  // à retenir, erreurs fréquentes...

      /**
       * simulation (interactive):
       * type: native|embed|video|none
       * engine: ohm_law|dilution|titration|...
       * parameters: sliders/inputs
       * outputs: valeurs/graph/table
       * tasks: missions
       */
      $table->json('simulation')->nullable();

      // config de l’interface (ordre des sections, quiz...)
      $table->json('runner_config')->nullable();

      $table->timestamps();
    });
  }

  public function down(): void {
    Schema::dropIfExists('experiments');
  }
};
