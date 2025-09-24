<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("
            UPDATE users SET role =
            CASE
              WHEN LOWER(role) IN ('élève','eleve','etudiant','étudiant','student') THEN 'student'
              WHEN LOWER(role) IN ('enseignant','prof','professeur','teacher') THEN 'teacher'
              WHEN LOWER(role) IN ('parent') THEN 'parent'
              WHEN LOWER(role) IN ('administrateur','administrator','admin') THEN 'admin'
              ELSE LOWER(role)
            END
        ");
    }
    public function down(): void { /* no-op */ }
};