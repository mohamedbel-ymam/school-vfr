<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void
  {
    Schema::create('timetables', function (Blueprint $table) {
      $table->id();
      $table->foreignId('degree_id')->constrained()->cascadeOnDelete(); // timetable per degree
      $table->string('title');                // e.g. "S1 2025/26 - Week 34"
      $table->date('week_start')->nullable(); // optional anchor (Monday of week)
      $table->timestamps();
    });

    Schema::create('lessons', function (Blueprint $table) {
      $table->id();
      $table->foreignId('timetable_id')->constrained()->cascadeOnDelete();
      $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
      $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
      $table->string('room')->nullable();

      $table->unsignedTinyInteger('day_of_week'); // 1=Mon … 7=Sun
      $table->time('start_time');
      $table->time('end_time');

      $table->text('notes')->nullable();
      $table->timestamps();

      $table->index(['timetable_id','day_of_week']);
    });
  }

  public function down(): void
  {
    Schema::dropIfExists('lessons');
    Schema::dropIfExists('timetables');
  }
};