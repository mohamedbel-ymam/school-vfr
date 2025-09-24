<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Enums\UserRole;
use App\Models\Degree;


/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
public function definition(): array
{
    return [
        'firstname' => fake()->firstName(),
        'lastname' => fake()->lastName(),
        'date_of_birth' => fake()->date(),
        'gender' => fake()->randomElement(['m', 'f']),
        'blood_type' => fake()->randomElement(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
        'address' => fake()->address(),
        'phone' => fake()->phoneNumber(),
        'email' => fake()->unique()->safeEmail(),
        'password' => static::$password ??= Hash::make('password'),
        'role' => UserRole::élève->value,
        'degree_id' => Niveau::inRandomOrder()->value('id'),        'email_verified_at' => now(),
        'remember_token' => Str::random(10),
    ];
}

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }
}
