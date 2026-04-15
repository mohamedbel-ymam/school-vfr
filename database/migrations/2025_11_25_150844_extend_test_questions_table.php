<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('test_questions', function (Blueprint $table) {
    	$table->longText('statement')->change();
    	$table->json('images')->nullable();
    	$table->json('categories')->nullable();
    	$table->unsignedTinyInteger('difficulty')->default(1);
	});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
