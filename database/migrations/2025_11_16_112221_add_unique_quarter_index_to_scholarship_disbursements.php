<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void {
        // Skip if the unique index already exists (we added it via SQL).
        if (Schema::hasIndex('scholarship_disbursements', 'sd_uq')) {
            return;
        }

        Schema::table('scholarship_disbursements', function (Blueprint $t) {
            $t->unique(['boursier_profile_id','period_start','period_end'], 'sd_uq');
        });
    }

    public function down(): void {
        Schema::table('scholarship_disbursements', function (Blueprint $t) {
            try { $t->dropUnique('sd_uq'); } catch (\Throwable $e) {}
        });
    }
};
