<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Services\UrlImport\HostResolver;
use App\Support\SideJobAllowed;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\Support\FakeHostResolver;

/**
 * 副業可否のAPI経由の挙動。保存値は ok / ng / unknown の3状態のみ。
 */
class SideJobAllowedApiTest extends AuthenticatedApiTestCase
{
    use RefreshDatabase;

    private function fakeFetch(string $bodyHtml): void
    {
        $this->app->bind(HostResolver::class, fn () => new FakeHostResolver(['example.com' => ['8.8.8.8']]));

        Http::fake(['*' => Http::response(
            '<html><head><meta property="og:title" content="求人タイトル"></head><body>' . $bodyHtml . '</body></html>',
            200,
            ['Content-Type' => 'text/html; charset=UTF-8']
        )]);
    }

    private function preview()
    {
        return $this->postJson('/api/import/preview', ['url' => 'https://example.com/jobs/1', 'type' => 'career']);
    }

    // ---- URL取込 -------------------------------------------------------

    public function test_preview_reads_explicit_ok_from_the_page(): void
    {
        $this->fakeFetch('<table><tr><th>副業可否</th><td>可</td></tr></table>');

        $this->preview()->assertStatus(200)->assertJsonPath('data.side_job_allowed', SideJobAllowed::OK);
    }

    public function test_preview_reads_explicit_ng_from_the_page(): void
    {
        $this->fakeFetch('<p>副業禁止</p>');

        $this->preview()->assertStatus(200)->assertJsonPath('data.side_job_allowed', SideJobAllowed::NG);
    }

    public function test_preview_returns_unknown_when_the_page_does_not_state_it(): void
    {
        $this->fakeFetch('<p>年収500万円〜 フルリモート</p>');

        $this->preview()->assertStatus(200)->assertJsonPath('data.side_job_allowed', SideJobAllowed::UNKNOWN);
    }

    public function test_preview_for_side_job_type_is_not_treated_as_ok(): void
    {
        // 案件の種別がside_jobであることは副業可否の根拠にしない。
        $this->fakeFetch('<p>年収500万円〜</p>');

        $this->postJson('/api/import/preview', ['url' => 'https://example.com/jobs/1', 'type' => 'side_job'])
            ->assertStatus(200)
            ->assertJsonPath('data.side_job_allowed', SideJobAllowed::UNKNOWN);
    }

    // ---- 保存・更新 ----------------------------------------------------

    public function test_project_defaults_to_unknown_when_not_provided(): void
    {
        $response = $this->postJson('/api/projects', ['name' => '副業可否なし', 'status' => '気になる', 'type' => 'career'])
            ->assertStatus(201);

        $response->assertJsonPath('data.side_job_allowed', SideJobAllowed::UNKNOWN);
    }

    public function test_project_can_be_created_with_an_explicit_value(): void
    {
        $this->postJson('/api/projects', [
            'name' => '副業OKの求人',
            'status' => '気になる',
            'type' => 'career',
            'side_job_allowed' => SideJobAllowed::OK,
        ])->assertStatus(201)->assertJsonPath('data.side_job_allowed', SideJobAllowed::OK);
    }

    public function test_project_can_be_updated(): void
    {
        $project = $this->createProject(['name' => '案件', 'status' => '気になる', 'type' => 'career']);

        $this->patchJson("/api/projects/{$project->id}", ['side_job_allowed' => SideJobAllowed::NG])
            ->assertStatus(200)
            ->assertJsonPath('data.side_job_allowed', SideJobAllowed::NG);
    }

    public function test_unsupported_value_is_rejected(): void
    {
        $this->postJson('/api/projects', [
            'name' => '不正値',
            'status' => '気になる',
            'type' => 'career',
            'side_job_allowed' => 'maybe',
        ])->assertStatus(422)->assertJsonValidationErrors(['side_job_allowed']);
    }

    public function test_existing_projects_are_unknown_after_the_migration(): void
    {
        // migration適用前から存在する行を模し、既定値が入ることを確認する。
        $project = Project::create(['name' => 'migration前からある案件']);

        $this->assertSame(SideJobAllowed::UNKNOWN, $project->refresh()->side_job_allowed);
    }
}
