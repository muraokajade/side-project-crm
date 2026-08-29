<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use Tests\TestCase;

/**
 * 案件APIはすべてログイン必須になったため、既存のAPIテストはログイン状態を前提にする。
 *
 * 併せて、Projectは所有者(user_id)を持つようになったので、テストデータも
 * ログインユーザー所有として作る必要がある(user_id=NULLのProjectはAPIから見えない)。
 * 未ログイン時の挙動と、ユーザー間の分離そのものはProjectOwnershipApiTestで検証する。
 */
abstract class AuthenticatedApiTestCase extends TestCase
{
    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::create([
            'name' => 'テストユーザー',
            'email' => 'owner@example.com',
            'password' => 'password123',
        ]);

        $this->actingAs($this->user);
    }

    /**
     * ログインユーザー所有のProjectを作る。
     *
     * @param array<string, mixed> $attributes
     */
    protected function createProject(array $attributes): Project
    {
        return $this->user->projects()->create($attributes);
    }
}
