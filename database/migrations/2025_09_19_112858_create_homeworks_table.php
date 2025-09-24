<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('homeworks', function (Blueprint $table) {
            $table->id();

            $table->string('title');
            $table->text('description')->nullable();

            // Optional due date/time
            $table->timestamp('due_at')->nullable();

            // Stored file info
            $table->string('file_path');
            $table->string('original_name');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size')->default(0);

            // Who uploaded (teacher)
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->string('teacher_name');

            // Subject (optional)
            $table->foreignId('subject_id')->nullable()->constrained('subjects')->nullOnDelete();
            $table->string('subject_name')->nullable();

            // Degree audience
            $table->foreignId('degree_id')->constrained('degrees')->cascadeOnDelete();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('homeworks');
    }
};
