<?php
// database/migrations/xxxx_xx_xx_create_attendance_records_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('attendance_records', function (Blueprint $table) {
            $table->id();

            $table->foreignId('attendance_session_id')
                ->constrained('attendance_sessions')
                ->cascadeOnDelete();

            $table->foreignId('student_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->string('status', 32); // presence | absence | absence_justifiee
            $table->foreignId('marked_by')->nullable()->constrained('users')->nullOnDelete(); // who last changed it
            $table->timestamp('marked_at')->nullable();

            $table->timestamps();

            // one attendance per student per session
            $table->unique(['attendance_session_id', 'student_id']);
            $table->index(['student_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_records');
    }
};
