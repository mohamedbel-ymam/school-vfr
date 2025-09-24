<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();

            $table->string('title');
            $table->text('description')->nullable();

            // Stored file info (public disk)
            $table->string('file_path');     // e.g. "documents/3/2025/09/abc.pdf" (within "public" disk)
            $table->string('original_name'); // original filename
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size')->default(0);

            // Who uploaded (teacher)
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->string('teacher_name'); // denormalized for quick listing

            // Subject (optional but handy to show)
            $table->foreignId('subject_id')->nullable()->constrained('subjects')->nullOnDelete();
            $table->string('subject_name')->nullable();

            // Degree audience
            $table->foreignId('degree_id')->constrained('degrees')->cascadeOnDelete();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
