<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Support\ProjectStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectTypeAwareApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_create_without_type_defaults_to_side_job(): void
    {
        $response = $this->postJson('/api/projects', [
            'name' => '種別未指定案件',
            'status' => '気になる',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.type', 'side_job');

        $this->assertDatabaseHas('projects', ['name' => '種別未指定案件', 'type' => 'side_job']);
    }

    public function test_can_create_career_project(): void
    {
        $response = $this->postJson('/api/projects', [
            'type' => 'career',
            'name' => 'エンジニア転職案件',
            'status' => '書類選考',
            'job_type' => 'バックエンドエンジニア',
            'location' => '東京都',
            'remote_type' => 'フルリモート',
            'employment_type' => '正社員',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.type', 'career')
            ->assertJsonPath('data.status', '書類選考')
            ->assertJsonPath('data.job_type', 'バックエンドエンジニア')
            ->assertJsonPath('data.location', '東京都')
            ->assertJsonPath('data.remote_type', 'フルリモート')
            ->assertJsonPath('data.employment_type', '正社員');
    }

    public function test_invalid_type_on_create_returns_422(): void
    {
        $response = $this->postJson('/api/projects', [
            'type' => 'invalid_type',
            'name' => '不正種別案件',
            'status' => '気になる',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['type']);
    }

    public function test_career_status_accepts_all_defined_values(): void
    {
        foreach (ProjectStatus::CAREER_STATUSES as $status) {
            $response = $this->postJson('/api/projects', [
                'type' => 'career',
                'name' => "転職案件({$status})",
                'status' => $status,
            ]);

            $response->assertStatus(201)->assertJsonPath('data.status', $status);
        }
    }

    public function test_side_job_status_accepts_all_defined_values(): void
    {
        foreach (ProjectStatus::SIDE_JOB_STATUSES as $status) {
            $response = $this->postJson('/api/projects', [
                'name' => "副業案件({$status})",
                'status' => $status,
            ]);

            $response->assertStatus(201)->assertJsonPath('data.status', $status);
        }
    }

    public function test_status_not_defined_for_type_returns_422(): void
    {
        // '返信待ち'はside_job専用でcareerには存在しない
        $response = $this->postJson('/api/projects', [
            'type' => 'career',
            'name' => '不整合案件A',
            'status' => '返信待ち',
        ]);
        $response->assertStatus(422)->assertJsonValidationErrors(['status']);

        // '書類選考'はcareer専用でside_jobには存在しない
        $response = $this->postJson('/api/projects', [
            'type' => 'side_job',
            'name' => '不整合案件B',
            'status' => '書類選考',
        ]);
        $response->assertStatus(422)->assertJsonValidationErrors(['status']);
    }

    public function test_legacy_side_job_status_labels_are_normalized_on_create(): void
    {
        $map = [
            '未応募' => '気になる',
            '面談予定' => '面談',
            '契約済み' => '契約',
            '納品済み' => '納品',
            '不採用' => '見送り',
            '辞退' => '見送り',
        ];

        foreach ($map as $legacy => $expected) {
            $response = $this->postJson('/api/projects', [
                'name' => "旧ラベル案件({$legacy})",
                'status' => $legacy,
            ]);

            $response->assertStatus(201)->assertJsonPath('data.status', $expected);
            $this->assertDatabaseHas('projects', ['name' => "旧ラベル案件({$legacy})", 'status' => $expected]);
        }
    }

    public function test_legacy_side_job_labels_are_not_normalized_for_career(): void
    {
        // '未応募'はcareerのステータス一覧にも存在しない不正値であり、
        // side_job用の正規化(未応募→気になる)もcareerには適用されないため422になる。
        $response = $this->postJson('/api/projects', [
            'type' => 'career',
            'name' => '転職の旧ラベル送信',
            'status' => '未応募',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['status']);
    }

    public function test_update_without_type_keeps_existing_type_and_validates_status_accordingly(): void
    {
        $project = Project::create([
            'type' => 'career',
            'name' => '転職案件',
            'status' => '気になる',
        ]);

        $response = $this->patchJson("/api/projects/{$project->id}", [
            'status' => '書類選考',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.type', 'career')
            ->assertJsonPath('data.status', '書類選考');

        $this->assertDatabaseHas('projects', ['id' => $project->id, 'type' => 'career', 'status' => '書類選考']);
    }

    public function test_update_without_type_rejects_status_invalid_for_existing_type(): void
    {
        $project = Project::create([
            'type' => 'career',
            'name' => '転職案件2',
            'status' => '気になる',
        ]);

        // '返信待ち'はside_job専用。typeを送らないため既存type=careerで検証され422になる。
        $response = $this->patchJson("/api/projects/{$project->id}", [
            'status' => '返信待ち',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['status']);

        $this->assertDatabaseHas('projects', ['id' => $project->id, 'type' => 'career', 'status' => '気になる']);
    }

    public function test_update_does_not_overwrite_omitted_fields(): void
    {
        $project = Project::create([
            'name' => '既存項目維持確認案件',
            'status' => '気になる',
            'memo' => '重要なメモ',
            'reward' => 50000,
            'job_type' => 'エンジニア',
        ]);

        $response = $this->patchJson("/api/projects/{$project->id}", [
            'name' => '名称のみ更新',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.name', '名称のみ更新')
            ->assertJsonPath('data.memo', '重要なメモ')
            ->assertJsonPath('data.reward', 50000)
            ->assertJsonPath('data.job_type', 'エンジニア');
    }

    public function test_new_common_and_career_columns_are_persisted_and_returned(): void
    {
        $response = $this->postJson('/api/projects', [
            'type' => 'career',
            'name' => '新項目確認(転職)',
            'status' => '気になる',
            'description' => '概要テキスト',
            'deadline' => '2026-09-01',
            'fetched_at' => '2026-08-22 10:00:00',
            'job_type' => 'エンジニア',
            'location' => '東京都',
            'remote_type' => 'フルリモート',
            'employment_type' => '正社員',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.description', '概要テキスト')
            ->assertJsonPath('data.job_type', 'エンジニア')
            ->assertJsonPath('data.location', '東京都')
            ->assertJsonPath('data.remote_type', 'フルリモート')
            ->assertJsonPath('data.employment_type', '正社員');

        $this->assertNotNull($response->json('data.deadline'));
        $this->assertNotNull($response->json('data.fetched_at'));
    }

    public function test_new_side_job_specific_columns_are_persisted_and_returned(): void
    {
        $response = $this->postJson('/api/projects', [
            'name' => '新項目確認(副業)',
            'status' => '気になる',
            'contract_type' => '業務委託',
            'delivery_date' => '2026-09-15',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.type', 'side_job')
            ->assertJsonPath('data.contract_type', '業務委託');

        $this->assertNotNull($response->json('data.delivery_date'));
    }

    public function test_can_filter_by_type(): void
    {
        Project::create(['type' => 'career', 'name' => '転職案件A', 'status' => '気になる']);
        Project::create(['type' => 'side_job', 'name' => '副業案件A', 'status' => '気になる']);

        $response = $this->getJson('/api/projects?type=career');
        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', '転職案件A');

        $response = $this->getJson('/api/projects?type=side_job');
        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', '副業案件A');
    }

    public function test_invalid_type_filter_returns_422(): void
    {
        $response = $this->getJson('/api/projects?type=invalid_type');

        $response->assertStatus(422)->assertJsonValidationErrors(['type']);
    }

    public function test_can_search_by_description_and_client_name(): void
    {
        Project::create(['name' => '案件A', 'status' => '気になる', 'client_name' => 'サンプル株式会社']);
        Project::create(['name' => '案件B', 'status' => '気になる', 'description' => 'Reactを使った開発']);
        Project::create(['name' => '案件C', 'status' => '気になる']);

        $response = $this->getJson('/api/projects?keyword=' . urlencode('サンプル株式会社'));
        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', '案件A');

        $response = $this->getJson('/api/projects?keyword=React');
        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', '案件B');
    }

    public function test_soft_deleted_project_is_excluded_from_index(): void
    {
        $deleted = Project::create(['name' => '削除済み案件', 'status' => '気になる']);
        $deleted->delete();

        Project::create(['name' => '通常案件', 'status' => '気になる']);

        $response = $this->getJson('/api/projects');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', '通常案件');
    }
}
