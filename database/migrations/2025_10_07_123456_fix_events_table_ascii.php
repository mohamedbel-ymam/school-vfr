<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1) If accented table exists and ASCII doesn't, rename it
        if (Schema::hasTable('événements') && !Schema::hasTable('events')) {
            Schema::rename('événements', 'events');
        }

        // 2) If neither exists (fresh prod), create ASCII table
        if (!Schema::hasTable('events')) {
            Schema::create('events', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->enum('template', [
                    'GENERAL','EXAM','MEETING','HOLIDAY','WORKSHOP','ANNOUNCEMENT','EMERGENCY'
                ])->default('GENERAL');
                $table->timestamp('starts_at');          // required in your current migration
                $table->timestamp('ends_at')->nullable();
                $table->string('location')->nullable();
                $table->text('description')->nullable();
                $table->json('data')->nullable();
                $table->string('image_path')->nullable();
                $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
                $table->timestamps();

                $table->index('starts_at');
                $table->index(['template','starts_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
