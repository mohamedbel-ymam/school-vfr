<?php

namespace Tests\Feature;

use App\Models\Degree;
use App\Models\Subject;
use App\Models\User;
use App\Models\Grade;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ErrorHandlingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::findOrCreate('admin');
        Role::findOrCreate('teacher');
        Role::findOrCreate('student');
        Role::findOrCreate('parent');
    }

    public function test_unauthenticated_request_does_not_throw_500(): void
    {
        $response = $this->get('/api/me');
        $this->assertEquals(401, $response->status());
        $response->assertJson(['message' => 'Non authentifié.']);
    }

    public function test_homework_endpoints_do_not_throw_bad_method_call_500(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $admin->assignRole('admin');
        $response = $this->actingAs($admin)->get('/api/admin/devoirs');
        $this->assertEquals(200, $response->status());
    }

    public function test_parent_children_endpoint_does_not_fail_on_name_column(): void
    {
        $parent = User::factory()->create(['role' => 'parent']);
        $parent->assignRole('parent');
        $child = User::factory()->create([
            'role' => 'student',
            'student_parent_id' => $parent->id,
            'firstname' => 'TestChild',
            'lastname' => 'Student'
        ]);
        $child->assignRole('student');

        $response = $this->actingAs($parent)->get('/api/parent/children');
        $this->assertEquals(200, $response->status());
        $response->assertJsonFragment(['firstname' => 'TestChild', 'lastname' => 'Student']);
    }

    public function test_duplicate_user_phone_returns_422_instead_of_500(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $admin->assignRole('admin');
        $existing = User::factory()->create(['phone' => '+212600000000']);
        $degree = Degree::create(['name' => 'Test Degree', 'slug' => 'test-deg']);

        $response = $this->actingAs($admin)->postJson('/api/admin/users', [
            'firstname' => 'Duplicate',
            'lastname' => 'Phone',
            'email' => 'unique_email@test.com',
            'password' => 'secret1234',
            'role' => 'student',
            'phone' => '+212600000000',
            'degree_id' => $degree->id,
        ]);

        $this->assertEquals(422, $response->status());
        $response->assertJsonValidationErrors(['phone']);
    }

    public function test_duplicate_grade_returns_422_instead_of_500(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $teacher->assignRole('teacher');
        $student = User::factory()->create(['role' => 'student']);
        $student->assignRole('student');
        $subject = Subject::create(['name' => 'Math']);

        $payload = [
            'student_id' => $student->id,
            'subject_id' => $subject->id,
            'teacher_id' => $teacher->id,
            'term'       => 'S1',
            'exam_type'  => 'Controle',
            'title'      => 'Devoir 1',
            'score'      => 15,
            'max_score'  => 20,
            'graded_at'  => '2026-03-01',
        ];

        // First creation succeeds
        $res1 = $this->actingAs($teacher)->postJson('/api/enseignant/grades', $payload);
        $this->assertEquals(201, $res1->status());

        // Duplicate creation returns 422, not 500
        $res2 = $this->actingAs($teacher)->postJson('/api/enseignant/grades', $payload);
        $this->assertEquals(422, $res2->status());
    }

    public function test_event_image_url_sanitizes_ssl_mismatch_domain(): void
    {
        $event = new \App\Models\Event();
        $event->title = 'Test Event';
        $event->template = 'GENERAL';
        $event->starts_at = now();
        $event->image_path = 'https://api.school-vfr.onrender.com/storage/events/IPbXybmCM8ycuBsetxXlQ18Ta8tsRYndsae2URno.jpg';

        $this->assertStringNotContainsString('api.school-vfr.onrender.com', $event->image_url);
        $this->assertEquals('https://school-vfr.onrender.com/storage/events/IPbXybmCM8ycuBsetxXlQ18Ta8tsRYndsae2URno.jpg', $event->image_url);

        $event2 = new \App\Models\Event();
        $event2->image_path = 'events/photo.jpg';
        $this->assertStringNotContainsString('api.school-vfr.onrender.com', $event2->image_url);
    }
}
