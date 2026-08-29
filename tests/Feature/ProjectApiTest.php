<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;

class ProjectApiTest extends AuthenticatedApiTestCase
{
    use RefreshDatabase;

    public function test_can_create_project(): void
    {
        $data = [
            'name' => 'テスト案件',
            'status' => '未応募',
            'media' => 'CrowdWorks',
            'category' => 'Web開発',
            'reward' => 50000,
            'priority' => '3.0',
            'memo' => 'テストメモ',
        ];

        $response = $this->postJson('/api/projects', $data);

        // '未応募'はside_job用の旧ラベルのため、'気になる'へ正規化されて保存・返却される。
        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'テスト案件')
            ->assertJsonPath('data.status', '気になる')
            ->assertJsonPath('data.media', 'CrowdWorks')
            ->assertJsonPath('data.category', 'Web開発')
            ->assertJsonPath('data.reward', 50000)
            ->assertJsonPath('data.priority', '3.0')
            ->assertJsonPath('data.memo', 'テストメモ');

        $this->assertDatabaseHas('projects', ['name' => 'テスト案件']);
    }

    public function test_create_project_requires_name(): void
    {
        $data = [
            'status' => '未応募',
            'media' => 'CrowdWorks',
        ];

        $response = $this->postJson('/api/projects', $data);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_can_list_projects(): void
    {
        $this->createProject(['name' => '案件A', 'status' => '未応募']);
        $this->createProject(['name' => '案件B', 'status' => '応募済み']);
        $this->createProject(['name' => '案件C', 'status' => '完了']);

        $response = $this->getJson('/api/projects');

        $response->assertStatus(200)
            ->assertJsonCount(3, 'data');
    }

    public function test_can_search_by_keyword(): void
    {
        $this->createProject(['name' => 'Laravel開発案件', 'status' => '未応募', 'memo' => '']);
        $this->createProject(['name' => 'デザイン案件', 'status' => '未応募', 'memo' => 'Reactを使用']);
        $this->createProject(['name' => 'ライティング', 'status' => '未応募', 'memo' => '']);

        $response = $this->getJson('/api/projects?keyword=Laravel');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Laravel開発案件');

        // memo検索
        $response = $this->getJson('/api/projects?keyword=React');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'デザイン案件');
    }

    public function test_can_filter_by_status(): void
    {
        $this->createProject(['name' => '案件A', 'status' => '未応募']);
        $this->createProject(['name' => '案件B', 'status' => '応募済み']);
        $this->createProject(['name' => '案件C', 'status' => '未応募']);

        $response = $this->getJson('/api/projects?status=' . urlencode('未応募'));

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data');

        $response = $this->getJson('/api/projects?status=' . urlencode('応募済み'));

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', '案件B');
    }

    public function test_can_filter_by_media(): void
    {
        $this->createProject(['name' => '案件A', 'status' => '未応募', 'media' => 'CrowdWorks']);
        $this->createProject(['name' => '案件B', 'status' => '未応募', 'media' => 'MENTA']);
        $this->createProject(['name' => '案件C', 'status' => '未応募', 'media' => 'CrowdWorks']);

        $response = $this->getJson('/api/projects?media=CrowdWorks');

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data');

        $response = $this->getJson('/api/projects?media=MENTA');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', '案件B');
    }

    public function test_can_update_project(): void
    {
        $project = $this->createProject([
            'name' => '元の案件名',
            'status' => '未応募',
        ]);

        $response = $this->patchJson("/api/projects/{$project->id}", [
            'name' => '更新後の案件名',
            'status' => '応募済み',
            'reward' => 100000,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.name', '更新後の案件名')
            ->assertJsonPath('data.status', '応募済み')
            ->assertJsonPath('data.reward', 100000);

        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'name' => '更新後の案件名',
            'status' => '応募済み',
        ]);
    }

    public function test_can_delete_project(): void
    {
        $project = $this->createProject([
            'name' => '削除対象案件',
            'status' => '未応募',
        ]);

        $response = $this->deleteJson("/api/projects/{$project->id}");

        $response->assertStatus(204);

        // SoftDeletes導入により、レコードは物理削除されずdeleted_atが設定される。
        $this->assertSoftDeleted('projects', ['id' => $project->id]);
    }

    public function test_delete_nonexistent_project_returns_404(): void
    {
        $response = $this->deleteJson('/api/projects/9999');

        $response->assertStatus(404);
    }

    public function test_legacy_project_without_reward_text_is_returned_with_null_reward_text(): void
    {
        // reward_text導入前に作られた案件(rewardのみ)が、APIで壊れずに返ること。
        $project = $this->createProject(['name' => '既存案件', 'reward' => 50000]);

        $response = $this->getJson('/api/projects');

        $response->assertStatus(200)
            ->assertJsonPath('data.0.id', $project->id)
            ->assertJsonPath('data.0.reward', 50000)
            ->assertJsonPath('data.0.reward_text', null);
    }

    public function test_reward_text_can_be_stored_without_a_numeric_reward(): void
    {
        $response = $this->postJson('/api/projects', [
            'name' => '応相談案件',
            'status' => '気になる',
            'reward_text' => '応相談',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.reward_text', '応相談')
            ->assertJsonPath('data.reward', null);

        $this->assertDatabaseHas('projects', ['name' => '応相談案件', 'reward' => null, 'reward_text' => '応相談']);
    }

    public function test_updating_reward_text_does_not_clear_existing_numeric_reward(): void
    {
        $project = $this->createProject(['name' => '既存案件', 'reward' => 50000]);

        $response = $this->patchJson("/api/projects/{$project->id}", [
            'reward_text' => '固定報酬制 50,000円',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.reward', 50000)
            ->assertJsonPath('data.reward_text', '固定報酬制 50,000円');
    }

    public function test_reward_text_longer_than_255_characters_is_rejected(): void
    {
        $response = $this->postJson('/api/projects', [
            'name' => '長すぎる報酬表記の案件',
            'status' => '気になる',
            'reward_text' => str_repeat('あ', 256),
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('reward_text');
    }
}
