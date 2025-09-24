<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void {
    Schema::create('monthly_subject_plans', function (Blueprint $table) {
      $table->id();
      $table->date('plan_date');
      $table->foreignId('degree_id')->constrained()->cascadeOnDelete();
      $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
      $table->foreignId('teacher_id')->nullable()->constrained('users')->nullOnDelete();
      $table->string('title')->nullable();
      $table->text('notes')->nullable();
      $table->timestamps();

      // 👇 Give short, explicit names to avoid the 64-char limit
      $table->unique(['plan_date','degree_id','subject_id','teacher_id'], 'msp_uniq');
      $table->index(['plan_date','degree_id'], 'msp_plan_deg_idx');
    });
  }

  public function down(): void {
    Schema::dropIfExists('monthly_subject_plans');
  }
};