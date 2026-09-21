<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\UrlImport\HostResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\Support\FakeHostResolver;

/**
 * URL取込プレビューが返す重複候補(duplicate_candidates)の検証。
 *
 * 重複していてもpreviewは成功(200)し、登録も禁止しない。
 * 警告として見せるだけで、判断は利用者に委ねる方針を固定する。
 */
class ImportPreviewDuplicateTest extends AuthenticatedApiTestCase
{
    use RefreshDatabase;

    private const URL = 'https://example.com/jobs/123';

    private function fakeFetch(): void
    {
        $this->app->bind(HostResolver::class, fn () => new FakeHostResolver(['example.com' => ['8.8.8.8']]));

        Http::fake(['*' => Http::response(
            '<html><head><meta property="og:title" content="取込した案件"></head></html>',
            200,
            ['Content-Type' => 'text/html; charset=UTF-8']
        )]);
    }

    private function preview(string $url = self::URL)
    {
        return $this->postJson('/api/import/preview', ['url' => $url, 'type' => 'side_job']);
    }

    // ---- 重複なし --------------------------------------------------------

    public function test_duplicate_candidates_is_empty_when_no_project_has_the_url(): void
    {
        $this->fakeFetch();

        $this->preview()
            ->assertStatus(200)
            ->assertJsonPath('data.duplicate_candidates', []);
    }

    // ---- 重複あり --------------------------------------------------------

    public function test_duplicate_candidates_contains_own_project_with_the_same_url(): void
    {
        $this->fakeFetch();

        $existing = $this->createProject([
            'name' => '登録済みの案件',
            'status' => '応募済み',
            'type' => 'side_job',
            'project_url' => self::URL,
        ]);

        $response = $this->preview()->assertStatus(200);

        $response->assertJsonCount(1, 'data.duplicate_candidates')
            ->assertJsonPath('data.duplicate_candidates.0.id', $existing->id)
            ->assertJsonPath('data.duplicate_candidates.0.name', '登録済みの案件')
            ->assertJsonPath('data.duplicate_candidates.0.status', '応募済み');
    }

    public function test_multiple_duplicates_are_all_returned(): void
    {
        $this->fakeFetch();

        $this->createProject(['name' => '1件目', 'status' => '気になる', 'project_url' => self::URL]);
        $this->createProject(['name' => '2件目', 'status' => '応募済み', 'project_url' => self::URL]);

        $this->preview()
            ->assertStatus(200)
            ->assertJsonCount(2, 'data.duplicate_candidates');
    }

    // ---- 完全一致のみ ----------------------------------------------------

    public function test_url_matching_is_exact_and_not_normalized(): void
    {
        $this->fakeFetch();

        // 末尾スラッシュ・クエリ付きは「別のURL」として扱う(正規化は今回行わない)。
        $this->createProject(['name' => '末尾スラッシュ違い', 'status' => '気になる', 'project_url' => self::URL . '/']);
        $this->createProject(['name' => 'クエリ付き', 'status' => '気になる', 'project_url' => self::URL . '?utm_source=x']);

        $this->preview()
            ->assertStatus(200)
            ->assertJsonPath('data.duplicate_candidates', []);
    }

    public function test_project_with_a_different_url_is_not_reported(): void
    {
        $this->fakeFetch();

        $this->createProject(['name' => '別案件', 'status' => '気になる', 'project_url' => 'https://example.com/jobs/999']);

        $this->preview()
            ->assertStatus(200)
            ->assertJsonPath('data.duplicate_candidates', []);
    }

    public function test_project_without_url_is_not_reported(): void
    {
        $this->fakeFetch();

        $this->createProject(['name' => 'URLなし案件', 'status' => '気になる']);

        $this->preview()
            ->assertStatus(200)
            ->assertJsonPath('data.duplicate_candidates', []);
    }

    // ---- 論理削除済みは対象外 --------------------------------------------

    public function test_soft_deleted_project_is_not_reported_as_duplicate(): void
    {
        $this->fakeFetch();

        $trashed = $this->createProject([
            'name' => 'ゴミ箱の案件',
            'status' => '気になる',
            'project_url' => self::URL,
        ]);
        $trashed->delete();

        $this->preview()
            ->assertStatus(200)
            ->assertJsonPath('data.duplicate_candidates', []);
    }

    public function test_only_active_projects_are_reported_when_both_exist(): void
    {
        $this->fakeFetch();

        $active = $this->createProject(['name' => '有効な案件', 'status' => '気になる', 'project_url' => self::URL]);
        $trashed = $this->createProject(['name' => 'ゴミ箱の案件', 'status' => '気になる', 'project_url' => self::URL]);
        $trashed->delete();

        $this->preview()
            ->assertStatus(200)
            ->assertJsonCount(1, 'data.duplicate_candidates')
            ->assertJsonPath('data.duplicate_candidates.0.id', $active->id);
    }

    // ---- 他ユーザーの案件は絶対に出さない --------------------------------

    public function test_another_users_project_is_never_reported(): void
    {
        $this->fakeFetch();

        $other = User::create([
            'name' => '別のユーザー',
            'email' => 'other-owner@example.com',
            'password' => 'password123',
        ]);
        $other->projects()->create([
            'name' => '他人の案件',
            'status' => '応募済み',
            'type' => 'side_job',
            'project_url' => self::URL,
        ]);

        $response = $this->preview()->assertStatus(200);

        $response->assertJsonPath('data.duplicate_candidates', [])
            ->assertDontSee('他人の案件');
    }

    // ---- previewはDBを書き換えない ---------------------------------------

    public function test_preview_does_not_write_to_the_projects_table(): void
    {
        $this->fakeFetch();

        $this->createProject(['name' => '既存案件', 'status' => '気になる', 'project_url' => self::URL]);

        $this->assertDatabaseCount('projects', 1);

        $this->preview()->assertStatus(200);

        // 重複検知はSELECTのみ。既存の「previewは保存しない」方針を変えていないこと。
        $this->assertDatabaseCount('projects', 1);
        $this->assertDatabaseHas('projects', ['name' => '既存案件', 'status' => '気になる']);
    }

    // ---- 重複があっても登録できる ----------------------------------------

    public function test_duplicate_does_not_block_creating_another_project(): void
    {
        $this->fakeFetch();

        $this->createProject(['name' => '既存案件', 'status' => '気になる', 'project_url' => self::URL]);

        $this->preview()->assertStatus(200);

        $this->postJson('/api/projects', [
            'name' => '同じURLで再登録',
            'status' => '気になる',
            'type' => 'side_job',
            'project_url' => self::URL,
        ])->assertStatus(201);

        $this->assertDatabaseCount('projects', 2);
    }
}
