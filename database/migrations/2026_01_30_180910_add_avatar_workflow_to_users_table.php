<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('avatar_url')->nullable()->after('remember_token');          // photo validée
            $table->string('avatar_pending_url')->nullable()->after('avatar_url');     // photo en attente
            $table->string('avatar_status', 20)->default('none')->after('avatar_pending_url'); // none|pending|approved|rejected

            $table->timestamp('avatar_reviewed_at')->nullable()->after('avatar_status');
            $table->foreignId('avatar_reviewed_by')->nullable()
                  ->constrained('users')->nullOnDelete()
                  ->after('avatar_reviewed_at');

            $table->index(['avatar_status']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['avatar_status']);
            $table->dropConstrainedForeignId('avatar_reviewed_by');

            $table->dropColumn([
                'avatar_url',
                'avatar_pending_url',
                'avatar_status',
                'avatar_reviewed_at',
            ]);
        });
    }
};

