<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
{
    if (Schema::hasTable('scholarship_disbursements')) {
        return;
    }

    Schema::create('scholarship_disbursements', function (Blueprint $t) {
        $t->id();
        $t->foreignId('boursier_profile_id')->constrained()->cascadeOnDelete();
        $t->date('period_start');
        $t->date('period_end');
        $t->unsignedInteger('amount')->default(3000);
        $t->date('paid_at')->nullable();
        $t->string('payment_method')->nullable();
        $t->text('note')->nullable();
        $t->timestamps();
    });
}
    public function down(): void { Schema::dropIfExists('scholarship_disbursements'); }
};

