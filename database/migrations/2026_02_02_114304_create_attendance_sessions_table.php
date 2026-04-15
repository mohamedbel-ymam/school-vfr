<?php
// database/migrations/xxxx_xx_xx_create_attendance_sessions_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('attendance_sessions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('degree_id')->constrained()->cascadeOnDelete();
	    $table->foreignId('teacher_id')->nullable()->constrained('users')->nullOnDelete();

            $table->date('session_date'); // the day of attendance
            $table->timestamps();

            // only one session per degree per date (optionally per teacher too)
            $table->unique(['degree_id', 'session_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_sessions');
    }
};
