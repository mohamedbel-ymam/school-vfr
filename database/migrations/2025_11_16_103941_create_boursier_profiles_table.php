<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('boursier_profiles', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('university')->nullable();
            $t->string('field_of_study')->nullable();
            $t->year('start_year')->nullable();   // e.g., 2024
            $t->unsignedTinyInteger('duration_years')->default(3); // typical 3 years
            $t->enum('status',['active','paused','ended'])->default('active');
            $t->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('boursier_profiles'); }
};
