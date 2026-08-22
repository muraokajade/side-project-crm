<?php

namespace Tests\Feature;

use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ProjectTrashApiTest extends TestCase
{
    use RefreshDatabase;

    // ---- 通常削除 -------------------------------------------------------

    public function test_destroy_sets_deleted_at(): void
    {
        $project = Project::create(['name' => '削除対象案件', 'status' => '気になる']);

        $response = $this->deleteJson("/api/projects/{$project->id}");

        $response->assertStatus(204);
        $this->assertSoftDeleted('projects', ['id' => $project->id]);
    }

    public function test_deleted_project_excluded_from_index(): void
    {
        $project = Project::create(['name' => '削除対象案件', 'status' => '気になる']);
        $project->delete();

        $response = $this->getJson('/api/projects');

        $response->assertStatus(200)->assertJsonCount(0, 'data');
    }

    // ---- ゴミ箱一覧 -------------------------------------------------------

    public function test_trash_index_returns_only_trashed(): void
    {
        $trashed = Project::create(['name' => '削除済み案件', 'status' => '気になる']);
        $trashed->delete();
        Project::create(['name' => '通常案件', 'status' => '気になる']);

        $response = $this->getJson('/api/projects/trash');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $trashed->id);
    }

    public function test_trash_index_ordered_by_deleted_at_desc(): void
    {
        Carbon::setTestNow('2026-08-01 10:00:00');
        $older = Project::create(['name' => '古い削除案件', 'status' => '気になる']);
        $older->delete();

        Carbon::setTestNow('2026-08-02 10:00:00');
        $newer = Project::create(['name' => '新しい削除案件', 'status' => '気になる']);
        $newer->delete();

        Carbon::setTestNow();

        $response = $this->getJson('/api/projects/trash');

        $response->assertStatus(200)
            ->assertJsonPath('data.0.id', $newer->id)
            ->assertJsonPath('data.1.id', $older->id);
    }

    public function test_trash_index_filters_by_type(): void
    {
        $career = Project::create(['name' => 'キャリア案件', 'type' => 'career', 'status' => '内定']);
        $career->delete();
        $sideJob = Project::create(['name' => '副業案件', 'type' => 'side_job', 'status' => '気になる']);
        $sideJob->delete();

        $response = $this->getJson('/api/projects/trash?type=career');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $career->id);
    }

    public function test_trash_index_filters_by_status(): void
    {
        $completed = Project::create(['name' => '完了案件', 'status' => '完了']);
        $completed->delete();
        $rejected = Project::create(['name' => '見送り案件', 'status' => '見送り']);
        $rejected->delete();

        $response = $this->getJson('/api/projects/trash?status=' . urlencode('完了'));

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $completed->id);
    }

    public function test_trash_index_searches_by_name(): void
    {
        $match = Project::create(['name' => 'Laravel開発案件', 'status' => '気になる']);
        $match->delete();
        $other = Project::create(['name' => 'デザイン案件', 'status' => '気になる']);
        $other->delete();

        $response = $this->getJson('/api/projects/trash?search=Laravel');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $match->id);
    }

    public function test_trash_index_searches_by_client_name(): void
    {
        $match = Project::create(['name' => '案件A', 'client_name' => '株式会社サンプル', 'status' => '気になる']);
        $match->delete();
        $other = Project::create(['name' => '案件B', 'client_name' => '別会社', 'status' => '気になる']);
        $other->delete();

        $response = $this->getJson('/api/projects/trash?search=' . urlencode('サンプル'));

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $match->id);
    }

    public function test_trash_index_searches_by_description(): void
    {
        $match = Project::create(['name' => '案件A', 'description' => 'Reactを使用した開発', 'status' => '気になる']);
        $match->delete();
        $other = Project::create(['name' => '案件B', 'description' => 'ライティング業務', 'status' => '気になる']);
        $other->delete();

        $response = $this->getJson('/api/projects/trash?search=React');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $match->id);
    }

    public function test_trash_index_searches_by_memo(): void
    {
        $match = Project::create(['name' => '案件A', 'memo' => '要注意メモ', 'status' => '気になる']);
        $match->delete();
        $other = Project::create(['name' => '案件B', 'memo' => '', 'status' => '気になる']);
        $other->delete();

        $response = $this->getJson('/api/projects/trash?search=' . urlencode('要注意'));

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $match->id);
    }

    public function test_trash_index_invalid_type_returns_422(): void
    {
        $response = $this->getJson('/api/projects/trash?type=not_a_type');

        $response->assertStatus(422)->assertJsonValidationErrors(['type']);
    }

    // ---- 復元 -----------------------------------------------------------

    public function test_restore_succeeds(): void
    {
        $project = Project::create(['name' => '復元対象案件', 'status' => '気になる']);
        $project->delete();

        $response = $this->postJson("/api/projects/{$project->id}/restore");

        $response->assertStatus(200)->assertJsonPath('data.id', $project->id);
        $this->assertDatabaseHas('projects', ['id' => $project->id, 'deleted_at' => null]);
    }

    public function test_restored_project_appears_in_index_again(): void
    {
        $project = Project::create(['name' => '復元対象案件', 'status' => '気になる']);
        $project->delete();

        $this->postJson("/api/projects/{$project->id}/restore")->assertStatus(200);

        $response = $this->getJson('/api/projects');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $project->id);
    }

    public function test_restored_project_removed_from_trash(): void
    {
        $project = Project::create(['name' => '復元対象案件', 'status' => '気になる']);
        $project->delete();

        $this->postJson("/api/projects/{$project->id}/restore")->assertStatus(200);

        $response = $this->getJson('/api/projects/trash');

        $response->assertStatus(200)->assertJsonCount(0, 'data');
    }

    public function test_restore_rejects_non_trashed_project(): void
    {
        $project = Project::create(['name' => '未削除案件', 'status' => '気になる']);

        $response = $this->postJson("/api/projects/{$project->id}/restore");

        $response->assertStatus(409)->assertJsonPath('error_code', 'not_trashed');
    }

    public function test_restore_nonexistent_returns_404(): void
    {
        $response = $this->postJson('/api/projects/9999/restore');

        $response->assertStatus(404);
    }

    // ---- 完全削除 ---------------------------------------------------------

    public function test_force_delete_succeeds(): void
    {
        $project = Project::create(['name' => '完全削除対象案件', 'status' => '気になる']);
        $project->delete();

        $response = $this->deleteJson("/api/projects/{$project->id}/force");

        $response->assertStatus(204);
    }

    public function test_force_deleted_project_not_found_even_with_trashed(): void
    {
        $project = Project::create(['name' => '完全削除対象案件', 'status' => '気になる']);
        $project->delete();

        $this->deleteJson("/api/projects/{$project->id}/force")->assertStatus(204);

        $this->assertNull(Project::withTrashed()->find($project->id));
    }

    public function test_force_delete_rejects_non_trashed_project(): void
    {
        $project = Project::create(['name' => '未削除案件', 'status' => '気になる']);

        $response = $this->deleteJson("/api/projects/{$project->id}/force");

        $response->assertStatus(409)->assertJsonPath('error_code', 'not_trashed');
        $this->assertNotNull(Project::withTrashed()->find($project->id));
    }

    public function test_force_delete_nonexistent_returns_404(): void
    {
        $response = $this->deleteJson('/api/projects/9999/force');

        $response->assertStatus(404);
    }

    // ---- career/side_job両方での動作 ----------------------------------------

    public function test_trash_and_restore_work_for_both_types(): void
    {
        $career = Project::create(['name' => 'キャリア案件', 'type' => 'career', 'status' => '内定']);
        $career->delete();
        $sideJob = Project::create(['name' => '副業案件', 'type' => 'side_job', 'status' => '気になる']);
        $sideJob->delete();

        $trashResponse = $this->getJson('/api/projects/trash');
        $trashResponse->assertStatus(200)->assertJsonCount(2, 'data');

        $this->postJson("/api/projects/{$career->id}/restore")->assertStatus(200)->assertJsonPath('data.type', 'career');
        $this->postJson("/api/projects/{$sideJob->id}/restore")->assertStatus(200)->assertJsonPath('data.type', 'side_job');

        $indexResponse = $this->getJson('/api/projects');
        $indexResponse->assertStatus(200)->assertJsonCount(2, 'data');
    }
}
