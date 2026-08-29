<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use App\Services\UrlImport\HostResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\FakeHostResolver;
use Tests\TestCase;

/**
 * モニター間のデータ分離。
 *
 * ユーザーA/Bの2人で、相互の案件が「見えない」だけでなく、
 * 案件IDを直接指定しても更新・削除・復元・完全削除できないことを確認する。
 * 他ユーザーの案件は403ではなく404を返す(そのIDの存在自体を秘匿するため)。
 */
class ProjectOwnershipApiTest extends TestCase
{
    use RefreshDatabase;

    private User $userA;

    private User $userB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->userA = User::create(['name' => 'モニターA', 'email' => 'a@example.com', 'password' => 'password123']);
        $this->userB = User::create(['name' => 'モニターB', 'email' => 'b@example.com', 'password' => 'password123']);
    }

    private function projectFor(User $user, array $attributes = []): Project
    {
        return $user->projects()->create(array_merge([
            'name' => "{$user->name}の案件",
            'status' => '気になる',
        ], $attributes));
    }

    // ---- 完了条件1: A/B相互に見えず操作もできない ------------------------

    public function test_index_returns_only_own_projects(): void
    {
        $this->projectFor($this->userA, ['name' => 'Aの案件']);
        $this->projectFor($this->userB, ['name' => 'Bの案件']);

        $response = $this->actingAs($this->userA)->getJson('/api/projects');

        $response->assertStatus(200)->assertJsonCount(1, 'data');
        $this->assertSame('Aの案件', $response->json('data.0.name'));
    }

    public function test_index_does_not_leak_other_users_projects_via_keyword_search(): void
    {
        $this->projectFor($this->userB, ['name' => '機密案件', 'memo' => '社外秘メモ']);

        $response = $this->actingAs($this->userA)->getJson('/api/projects?keyword=' . urlencode('機密'));

        $response->assertStatus(200)->assertJsonCount(0, 'data');
    }

    public function test_cannot_update_another_users_project_by_id(): void
    {
        $projectB = $this->projectFor($this->userB, ['name' => 'Bの案件']);

        $this->actingAs($this->userA)
            ->patchJson("/api/projects/{$projectB->id}", ['name' => '乗っ取り'])
            ->assertStatus(404);

        $this->assertSame('Bの案件', $projectB->fresh()->name);
    }

    public function test_cannot_delete_another_users_project_by_id(): void
    {
        $projectB = $this->projectFor($this->userB);

        $this->actingAs($this->userA)
            ->deleteJson("/api/projects/{$projectB->id}")
            ->assertStatus(404);

        $this->assertNull($projectB->fresh()->deleted_at);
    }

    public function test_trash_index_returns_only_own_trashed_projects(): void
    {
        $this->projectFor($this->userA, ['name' => 'Aの削除済み'])->delete();
        $this->projectFor($this->userB, ['name' => 'Bの削除済み'])->delete();

        $response = $this->actingAs($this->userA)->getJson('/api/projects/trash');

        $response->assertStatus(200)->assertJsonCount(1, 'data');
        $this->assertSame('Aの削除済み', $response->json('data.0.name'));
    }

    public function test_cannot_restore_another_users_trashed_project(): void
    {
        $projectB = $this->projectFor($this->userB);
        $projectB->delete();

        $this->actingAs($this->userA)
            ->postJson("/api/projects/{$projectB->id}/restore")
            ->assertStatus(404);

        // 復元されず、論理削除のままであること。
        $this->assertNotNull(Project::withTrashed()->find($projectB->id)->deleted_at);
    }

    public function test_cannot_force_delete_another_users_trashed_project(): void
    {
        $projectB = $this->projectFor($this->userB);
        $projectB->delete();

        $this->actingAs($this->userA)
            ->deleteJson("/api/projects/{$projectB->id}/force")
            ->assertStatus(404);

        $this->assertNotNull(Project::withTrashed()->find($projectB->id));
    }

    public function test_other_users_project_returns_404_not_403_to_hide_existence(): void
    {
        $projectB = $this->projectFor($this->userB);
        $missingId = $projectB->id + 999;

        $existingButOthers = $this->actingAs($this->userA)->deleteJson("/api/projects/{$projectB->id}");
        $trulyMissing = $this->actingAs($this->userA)->deleteJson("/api/projects/{$missingId}");

        // 他人の案件と、存在しない案件が同じ応答になること。
        $this->assertSame(404, $existingButOthers->status());
        $this->assertSame(404, $trulyMissing->status());
    }

    public function test_each_user_sees_their_own_project_after_both_create_one(): void
    {
        $this->actingAs($this->userA)
            ->postJson('/api/projects', ['name' => 'Aが作った案件', 'status' => '気になる'])
            ->assertStatus(201);

        $this->actingAs($this->userB)
            ->postJson('/api/projects', ['name' => 'Bが作った案件', 'status' => '気になる'])
            ->assertStatus(201);

        $listA = $this->actingAs($this->userA)->getJson('/api/projects');
        $listB = $this->actingAs($this->userB)->getJson('/api/projects');

        $listA->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Aが作った案件');
        $listB->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Bが作った案件');
    }

    public function test_user_id_in_request_body_cannot_forge_the_owner(): void
    {
        // user_idは$fillableに含めていないため、リクエストで他人を所有者にできない。
        $this->actingAs($this->userA)
            ->postJson('/api/projects', [
                'name' => '所有者偽装の試み',
                'status' => '気になる',
                'user_id' => $this->userB->id,
            ])->assertStatus(201);

        $project = Project::where('name', '所有者偽装の試み')->firstOrFail();

        $this->assertSame($this->userA->id, $project->user_id);
    }

    // ---- 完了条件2: 未ログインでは案件APIを操作できない -------------------

    /**
     * @return list<array{0: string, 1: string}>
     */
    public static function projectEndpointProvider(): array
    {
        return [
            'index' => ['getJson', '/api/projects'],
            'store' => ['postJson', '/api/projects'],
            'update' => ['patchJson', '/api/projects/1'],
            'destroy' => ['deleteJson', '/api/projects/1'],
            'trash index' => ['getJson', '/api/projects/trash'],
            'restore' => ['postJson', '/api/projects/1/restore'],
            'force delete' => ['deleteJson', '/api/projects/1/force'],
            'import preview' => ['postJson', '/api/import/preview'],
        ];
    }

    #[DataProvider('projectEndpointProvider')]
    public function test_project_endpoints_require_login(string $method, string $uri): void
    {
        $this->{$method}($uri)->assertStatus(401);
    }

    public function test_unauthenticated_request_cannot_read_existing_project_data(): void
    {
        $this->projectFor($this->userA, ['name' => '秘密の案件']);

        $response = $this->getJson('/api/projects');

        $response->assertStatus(401);
        $this->assertStringNotContainsString('秘密の案件', $response->getContent());
    }

    public function test_unauthenticated_store_does_not_create_a_project(): void
    {
        $this->postJson('/api/projects', ['name' => '未ログイン作成', 'status' => '気になる'])
            ->assertStatus(401);

        $this->assertDatabaseMissing('projects', ['name' => '未ログイン作成']);
    }

    // ---- 完了条件3: URL取込→保存した案件が本人だけに紐付く ---------------

    public function test_url_import_preview_then_store_associates_the_project_with_the_importer_only(): void
    {
        $this->app->instance(HostResolver::class, new FakeHostResolver(['example.com' => ['93.184.216.34']]));
        Http::fake(['*' => Http::response(
            '<html><head><script type="application/ld+json">'
                . '{"@type":"JobPosting","title":"取込した案件","description":"案件本文です。"}'
                . '</script></head></html>',
            200,
            ['Content-Type' => 'text/html']
        )]);

        // Aが取込プレビューを行い、その結果を保存する。
        $preview = $this->actingAs($this->userA)
            ->postJson('/api/import/preview', ['url' => 'https://example.com/job/1', 'type' => 'side_job']);

        $preview->assertStatus(200)->assertJsonPath('data.name', '取込した案件');

        $created = $this->actingAs($this->userA)->postJson('/api/projects', [
            'name' => $preview->json('data.name'),
            'description' => $preview->json('data.description'),
            'project_url' => $preview->json('data.project_url'),
            'status' => '気になる',
        ]);

        $created->assertStatus(201);
        $projectId = $created->json('data.id');

        // DB上の所有者がAであること。
        $this->assertSame($this->userA->id, Project::findOrFail($projectId)->user_id);

        // Aには見え、Bには見えないこと。
        $this->actingAs($this->userA)->getJson('/api/projects')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', '取込した案件');

        $this->actingAs($this->userB)->getJson('/api/projects')->assertJsonCount(0, 'data');

        // BはIDを直接指定しても操作できないこと。
        $this->actingAs($this->userB)->patchJson("/api/projects/{$projectId}", ['name' => '奪取'])->assertStatus(404);
        $this->actingAs($this->userB)->deleteJson("/api/projects/{$projectId}")->assertStatus(404);
    }

    // ---- 既存開発データ(user_id=NULL)の扱い -------------------------------

    public function test_legacy_projects_without_owner_are_invisible_to_every_user(): void
    {
        // 既存の開発データは自動移行しない方針のため、user_id=NULLのまま残る。
        DB::table('projects')->insert([
            'name' => '所有者なしの既存データ',
            'status' => '気になる',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($this->userA)->getJson('/api/projects')->assertJsonCount(0, 'data');
        $this->actingAs($this->userB)->getJson('/api/projects')->assertJsonCount(0, 'data');

        // 行自体は削除されず残っている(自動修復もしない)。
        $this->assertDatabaseHas('projects', ['name' => '所有者なしの既存データ', 'user_id' => null]);
    }
}
