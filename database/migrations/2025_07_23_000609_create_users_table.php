<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('firstname');
            $table->string('lastname');
            $table->date('date_of_birth')->nullable();
            $table->enum('gender', ['m', 'f'])->nullable();
            $table->string('blood_type')->nullable();
            $table->string('address')->nullable();
            $table->string('phone', 50)->nullable();
            $table->string('email')->unique();
            $table->string('password');
            $table->string('role')->default('élève'); // student/parent/teacher/admin
            $table->foreignId('degree_id')->nullable()->constrained('degrees')->nullOnDelete();
            $table->timestamp('email_verified_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
