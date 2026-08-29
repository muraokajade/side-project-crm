<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * メールアドレス＋パスワードによる登録・ログイン・ログアウト・ログイン状態確認。
 */
class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    private function registerPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'モニターA',
            'email' => 'monitor-a@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ], $overrides);
    }

    // ---- 登録 -------------------------------------------------------------

    public function test_can_register_with_email_and_password(): void
    {
        $response = $this->postJson('/api/auth/register', $this->registerPayload());

        $response->assertStatus(201)
            ->assertJsonPath('data.email', 'monitor-a@example.com')
            ->assertJsonPath('data.name', 'モニターA');

        $this->assertDatabaseHas('users', ['email' => 'monitor-a@example.com']);
        $this->assertAuthenticated();
    }

    public function test_registered_password_is_hashed_and_not_returned(): void
    {
        $response = $this->postJson('/api/auth/register', $this->registerPayload());

        $user = User::where('email', 'monitor-a@example.com')->firstOrFail();

        $this->assertNotSame('password123', $user->password);
        $this->assertTrue(Hash::check('password123', $user->password));
        $this->assertArrayNotHasKey('password', $response->json('data'));
    }

    public function test_register_rejects_duplicate_email(): void
    {
        $this->postJson('/api/auth/register', $this->registerPayload())->assertStatus(201);

        $this->post('/api/auth/logout');

        $this->postJson('/api/auth/register', $this->registerPayload())
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_register_rejects_short_password(): void
    {
        $this->postJson('/api/auth/register', $this->registerPayload([
            'password' => 'short',
            'password_confirmation' => 'short',
        ]))->assertStatus(422)->assertJsonValidationErrors('password');
    }

    public function test_register_rejects_unconfirmed_password(): void
    {
        $this->postJson('/api/auth/register', $this->registerPayload([
            'password_confirmation' => 'different123',
        ]))->assertStatus(422)->assertJsonValidationErrors('password');
    }

    public function test_register_rejects_invalid_email(): void
    {
        $this->postJson('/api/auth/register', $this->registerPayload([
            'email' => 'not-an-email',
        ]))->assertStatus(422)->assertJsonValidationErrors('email');
    }

    // ---- ログイン ---------------------------------------------------------

    public function test_can_login_with_correct_credentials(): void
    {
        User::create(['name' => 'モニターA', 'email' => 'a@example.com', 'password' => 'password123']);

        $this->postJson('/api/auth/login', ['email' => 'a@example.com', 'password' => 'password123'])
            ->assertStatus(200)
            ->assertJsonPath('data.email', 'a@example.com');

        $this->assertAuthenticated();
    }

    public function test_login_rejects_wrong_password(): void
    {
        User::create(['name' => 'モニターA', 'email' => 'a@example.com', 'password' => 'password123']);

        $this->postJson('/api/auth/login', ['email' => 'a@example.com', 'password' => 'wrong-password'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');

        $this->assertGuest();
    }

    public function test_login_for_unknown_email_does_not_reveal_that_the_account_is_missing(): void
    {
        User::create(['name' => 'モニターA', 'email' => 'a@example.com', 'password' => 'password123']);

        $unknown = $this->postJson('/api/auth/login', ['email' => 'nobody@example.com', 'password' => 'password123']);
        $wrongPassword = $this->postJson('/api/auth/login', ['email' => 'a@example.com', 'password' => 'wrong-password']);

        // 未登録メールとパスワード誤りで同じ応答になり、アカウントの存在を推測できない。
        $this->assertSame($unknown->status(), $wrongPassword->status());
        $this->assertSame(
            $unknown->json('errors.email'),
            $wrongPassword->json('errors.email')
        );
        $this->assertGuest();
    }

    // ---- ログイン状態確認・ログアウト -------------------------------------

    public function test_me_returns_the_logged_in_user(): void
    {
        $user = User::create(['name' => 'モニターA', 'email' => 'a@example.com', 'password' => 'password123']);

        $this->actingAs($user)->getJson('/api/auth/me')
            ->assertStatus(200)
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.email', 'a@example.com');
    }

    public function test_me_requires_login(): void
    {
        $this->getJson('/api/auth/me')->assertStatus(401);
    }

    public function test_can_logout_and_session_is_no_longer_authenticated(): void
    {
        $user = User::create(['name' => 'モニターA', 'email' => 'a@example.com', 'password' => 'password123']);

        $this->actingAs($user)->postJson('/api/auth/logout')->assertStatus(200);

        $this->assertGuest();
    }

    public function test_logout_requires_login(): void
    {
        $this->postJson('/api/auth/logout')->assertStatus(401);
    }

    public function test_after_logout_project_api_is_no_longer_accessible(): void
    {
        $user = User::create(['name' => 'モニターA', 'email' => 'a@example.com', 'password' => 'password123']);
        $user->projects()->create(['name' => '案件', 'status' => '気になる']);

        $this->actingAs($user)->getJson('/api/projects')->assertStatus(200);

        $this->post('/api/auth/logout');

        $this->getJson('/api/projects')->assertStatus(401);
    }
}
