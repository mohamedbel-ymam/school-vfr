<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('contributions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->enum('type',['teaching','mentoring','meetup','donation','other']);
            $t->string('title')->nullable();
            $t->text('details')->nullable(); // “I can give a workshop on …”
            $t->enum('status',['proposed','approved','rejected','done'])->default('proposed');
            $t->timestamp('proposed_at')->nullable();
            $t->timestamp('scheduled_at')->nullable();
            $t->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('contributions'); }
};

