<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
// If you keep role creation here, you'll need this:
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 0) Ensure roles exist (safe to run even if UserSeeder also creates them)
        foreach (['admin', 'teacher', 'student', 'parent'] as $r) {
            Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
        }

        // 1) Core reference data (order matters a bit for relations)
        $this->call([
            // DegreeSeeder::class, // only if you have one; otherwise UserSeeder will create a default degree if needed
            SubjectSeeder::class,
            RoomSeeder::class,
        ]);

        // 2) Users (creates/updates admin@school.com, enseignant@school.com, etc.,
        //    assigns Spatie roles, links parent -> élève)
        $this->call([
            UserSeeder::class,
        ]);

        // 3) (Optional) demo emploi du temps rows
        // $this->call(TimetableSeeder::class);

        // Do NOT hardcode role assignments to emails that don't exist.
        // UserSeeder already syncs the correct roles:
        //  - admin@school.com  -> admin
        //  - teacher@school.com -> teacher
        //  - parent@school.com  -> parent
        //  - mohamed@belymam.com -> student
    }
}
