<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('waiting_list_entries', function (Blueprint $table) {
    		$table->id();
    		$table->string('first_name');
    		$table->string('last_name');
    		$table->foreignId('degree_id')->nullable()->constrained('degrees');
    		$table->unsignedInteger('order_index')->index();
    		$table->timestamps();
	});
    }
    public function down(): void {
	Schema::dropIfExists('waiting_list_entries');
    }
};
