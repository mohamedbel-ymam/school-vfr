<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;


return new class extends Migration {
public function up(): void
{
Schema::create('événements', function (Blueprint $table) {
$table->id();
$table->string('title');
$table->enum('template', [
'GENERAL','EXAM','MEETING','HOLIDAY','WORKSHOP','ANNOUNCEMENT','EMERGENCY'
])->default('GENERAL');
$table->timestamp('starts_at');
$table->timestamp('ends_at')->nullable();
$table->string('location')->nullable();
$table->text('description')->nullable();
$table->json('data')->nullable(); // template-specific payload
$table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
$table->timestamps();


$table->index('starts_at');
$table->index(['template','starts_at']);
});
}


public function down(): void
{
Schema::dropIfExists('événements');
}
};