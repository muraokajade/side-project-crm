<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\ProjectStatusHistory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * ProjectObserverによるstatus遷移履歴の記録を検証する。
 *
 * 既存45件のバックフィルは行わない方針のため、「本migration適用後の変更のみが
 * 記録される」ことと、「status以外の変更では記録されない」ことを固定する。
 */
class ProjectStatusHistoryTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $email = 'history-owner@example.com'): User
    {
        return User::create([
            'name' => '履歴テストユーザー',
            'email' => $email,
            'password' => 'password123',
        ]);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Collection<int, ProjectStatusHistory>
     */
    private function historiesOf(Project $project)
    {
        return ProjectStatusHistory::where('project_id', $project->id)
            ->orderBy('id')
            ->get();
    }

    // ---- 1. 新規作成 -----------------------------------------------------

    public function test_creating_a_project_records_the_initial_status(): void
    {
        $user = $this->user();

        $project = $user->projects()->create([
            'name' => '新規案件',
            'status' => '気になる',
            'type' => 'side_job',
        ]);

        $histories = $this->historiesOf($project);

        $this->assertCount(1, $histories);
        $this->assertNull($histories[0]->from_status, '新規作成時のfrom_statusはNULLであること');
        $this->assertSame('気になる', $histories[0]->to_status);
        $this->assertSame('side_job', $histories[0]->project_type);
        $this->assertSame(ProjectStatusHistory::SOURCE_WEB, $histories[0]->source);
        $this->assertNotNull($histories[0]->changed_at);
    }

    public function test_creating_a_project_without_explicit_status_records_the_database_default(): void
    {
        $user = $this->user();

        // status/typeを渡さない場合、保存直後のインメモリモデルはDB既定値を持たない。
        // Observerがそれを解決できているかを固定する(to_status/project_typeはNOT NULL)。
        $project = $user->projects()->create(['name' => '既定値の案件']);

        $histories = $this->historiesOf($project);

        $this->assertCount(1, $histories);
        $this->assertNull($histories[0]->from_status);
        $this->assertSame('気になる', $histories[0]->to_status);
        $this->assertSame('side_job', $histories[0]->project_type);
    }

    // ---- 2. status変更 ---------------------------------------------------

    public function test_changing_status_appends_a_history_row(): void
    {
        $user = $this->user();
        $project = $user->projects()->create(['name' => '遷移する案件', 'status' => '気になる', 'type' => 'side_job']);

        $project->update(['status' => '応募済み']);
        $project->update(['status' => '面談']);

        $histories = $this->historiesOf($project);

        $this->assertCount(3, $histories);

        $this->assertNull($histories[0]->from_status);
        $this->assertSame('気になる', $histories[0]->to_status);

        $this->assertSame('気になる', $histories[1]->from_status);
        $this->assertSame('応募済み', $histories[1]->to_status);

        $this->assertSame('応募済み', $histories[2]->from_status);
        $this->assertSame('面談', $histories[2]->to_status);
    }

    public function test_saving_the_same_status_does_not_append_a_history_row(): void
    {
        $user = $this->user();
        $project = $user->projects()->create(['name' => '同値保存の案件', 'status' => '気になる', 'type' => 'side_job']);

        $project->update(['status' => '気になる']);

        $this->assertCount(1, $this->historiesOf($project), '値が変わっていない保存では履歴を増やさないこと');
    }

    // ---- 3. status以外の変更 ---------------------------------------------

    public function test_updating_non_status_fields_does_not_append_a_history_row(): void
    {
        $user = $this->user();
        $project = $user->projects()->create(['name' => '元の名前', 'status' => '気になる', 'type' => 'side_job']);

        $project->update([
            'name' => '変更後の名前',
            'memo' => 'メモを追加',
            'reward' => 500000,
            'client_name' => '株式会社サンプル',
        ]);

        $histories = $this->historiesOf($project);

        $this->assertCount(1, $histories, 'status以外の更新では履歴を増やさないこと');
        $this->assertSame('変更後の名前', $project->fresh()->name, '更新自体は成功していること');
    }

    // ---- 4. project_type は変更時点の値 ----------------------------------

    public function test_project_type_is_recorded_as_of_the_change(): void
    {
        $user = $this->user();

        $career = $user->projects()->create(['name' => '転職案件', 'status' => '気になる', 'type' => 'career']);
        $career->update(['status' => '書類選考']);

        $histories = $this->historiesOf($career);

        $this->assertCount(2, $histories);
        $this->assertSame('career', $histories[0]->project_type);
        $this->assertSame('career', $histories[1]->project_type);
    }

    public function test_changing_type_and_status_together_records_the_new_type(): void
    {
        $user = $this->user();
        $project = $user->projects()->create(['name' => '種別が変わる案件', 'status' => '気になる', 'type' => 'side_job']);

        // 変更後のstatusは変更後のtypeの体系に属するため、新しい値を記録する。
        $project->update(['type' => 'career', 'status' => '書類選考']);

        $histories = $this->historiesOf($project);

        $this->assertCount(2, $histories);
        $this->assertSame('side_job', $histories[0]->project_type, '作成時点の履歴は当時のtypeのまま');
        $this->assertSame('career', $histories[1]->project_type, '変更時点のtypeが記録されること');
        $this->assertSame('気になる', $histories[1]->from_status);
        $this->assertSame('書類選考', $histories[1]->to_status);
    }

    // ---- 5. ユーザー間で混ざらない ---------------------------------------

    public function test_histories_of_different_users_do_not_mix(): void
    {
        $userA = $this->user('history-a@example.com');
        $userB = $this->user('history-b@example.com');

        $this->actingAs($userA);
        $projectA = $userA->projects()->create(['name' => 'Aの案件', 'status' => '気になる', 'type' => 'side_job']);
        $projectA->update(['status' => '応募済み']);

        $this->actingAs($userB);
        $projectB = $userB->projects()->create(['name' => 'Bの案件', 'status' => '気になる', 'type' => 'career']);

        $historiesA = $this->historiesOf($projectA);
        $historiesB = $this->historiesOf($projectB);

        $this->assertCount(2, $historiesA);
        $this->assertCount(1, $historiesB);

        foreach ($historiesA as $history) {
            $this->assertSame($userA->id, $history->user_id);
            $this->assertSame($projectA->id, $history->project_id);
        }

        foreach ($historiesB as $history) {
            $this->assertSame($userB->id, $history->user_id);
            $this->assertSame($projectB->id, $history->project_id);
        }

        // 所有者経由でたどっても混ざらないこと。
        $this->assertSame(2, ProjectStatusHistory::where('user_id', $userA->id)->count());
        $this->assertSame(1, ProjectStatusHistory::where('user_id', $userB->id)->count());
    }

    public function test_history_records_the_acting_user_not_only_the_owner(): void
    {
        $owner = $this->user('history-actor-owner@example.com');

        $this->actingAs($owner);
        $project = $owner->projects()->create(['name' => '操作者記録の案件', 'status' => '気になる', 'type' => 'side_job']);

        $this->assertSame($owner->id, $this->historiesOf($project)[0]->user_id);
    }

    public function test_history_falls_back_to_the_owner_when_unauthenticated(): void
    {
        $owner = $this->user('history-cli@example.com');

        // ログインしていない(CLI・シーダー相当)状態での作成。
        $project = $owner->projects()->create(['name' => 'CLI作成の案件', 'status' => '気になる', 'type' => 'side_job']);

        $this->assertSame($owner->id, $this->historiesOf($project)[0]->user_id);
    }

    // ---- 6. 削除時の扱い -------------------------------------------------

    public function test_soft_deleting_a_project_keeps_its_histories_and_adds_none(): void
    {
        $user = $this->user();
        $project = $user->projects()->create(['name' => 'ゴミ箱行きの案件', 'status' => '気になる', 'type' => 'side_job']);

        $project->delete();

        // 論理削除はクエリビルダ経由でdeleted_atを更新するためupdatedイベントを発火しない。
        $this->assertCount(1, $this->historiesOf($project), '論理削除で履歴を増やさないこと');
        $this->assertDatabaseCount('project_status_histories', 1);
    }

    public function test_restoring_a_project_does_not_append_a_history_row(): void
    {
        $user = $this->user();
        $project = $user->projects()->create(['name' => '復元する案件', 'status' => '気になる', 'type' => 'side_job']);

        $project->delete();
        $project->restore();

        // restore()はupdatedを発火するが、statusは変化しないため記録されない。
        $this->assertCount(1, $this->historiesOf($project));
    }

    public function test_force_deleting_a_project_removes_its_histories(): void
    {
        $user = $this->user();
        $kept = $user->projects()->create(['name' => '残る案件', 'status' => '気になる', 'type' => 'side_job']);
        $removed = $user->projects()->create(['name' => '完全削除する案件', 'status' => '気になる', 'type' => 'side_job']);
        $removed->update(['status' => '応募済み']);

        $this->assertDatabaseCount('project_status_histories', 3);

        $removed->forceDelete();

        // 外部キーのcascadeOnDeleteにより、対象Projectの履歴だけが消える。
        $this->assertSame(0, ProjectStatusHistory::where('project_id', $removed->id)->count());
        $this->assertCount(1, $this->historiesOf($kept), '他のProjectの履歴は残ること');
        $this->assertDatabaseCount('project_status_histories', 1);
    }

    // ---- 7. 既知の制約: Eloquentを経由しない更新 --------------------------

    public function test_direct_query_builder_update_does_not_trigger_the_observer(): void
    {
        $user = $this->user();
        $project = $user->projects()->create(['name' => '直接更新の案件', 'status' => '気になる', 'type' => 'side_job']);

        $this->assertCount(1, $this->historiesOf($project));

        // 【既知の制約】DB::table()経由の更新はモデルイベントを発火しないため履歴に残らない。
        // 既存の 2026_08_22_010500_migrate_legacy_side_job_status_labels もこの方式を使っている。
        // 仕様として明示的に固定し、将来この挙動が変わったら気づけるようにする。
        DB::table('projects')->where('id', $project->id)->update(['status' => '応募済み']);

        $this->assertSame('応募済み', $project->fresh()->status, '更新自体は反映されていること');
        $this->assertCount(1, $this->historiesOf($project), 'Observerを通らないため履歴は増えないこと');
    }

    // ---- API経由での記録（実際の利用経路） --------------------------------

    public function test_status_change_through_the_api_is_recorded(): void
    {
        $user = $this->user('history-api@example.com');
        $this->actingAs($user);

        $created = $this->postJson('/api/projects', [
            'name' => 'API経由の案件',
            'status' => '気になる',
            'type' => 'side_job',
        ])->assertStatus(201);

        $projectId = $created->json('data.id');

        $this->patchJson("/api/projects/{$projectId}", ['status' => '応募済み'])->assertStatus(200);

        $histories = ProjectStatusHistory::where('project_id', $projectId)->orderBy('id')->get();

        $this->assertCount(2, $histories);
        $this->assertNull($histories[0]->from_status);
        $this->assertSame('気になる', $histories[0]->to_status);
        $this->assertSame('気になる', $histories[1]->from_status);
        $this->assertSame('応募済み', $histories[1]->to_status);
        $this->assertSame($user->id, $histories[1]->user_id);
    }

    public function test_status_histories_relation_returns_rows_in_chronological_order(): void
    {
        $user = $this->user();
        $project = $user->projects()->create(['name' => 'リレーション確認', 'status' => '気になる', 'type' => 'side_job']);
        $project->update(['status' => '応募済み']);
        $project->update(['status' => '返信待ち']);

        $statuses = $project->statusHistories()->pluck('to_status')->all();

        $this->assertSame(['気になる', '応募済み', '返信待ち'], $statuses);
    }

    // ---- バックフィルしないこと -------------------------------------------

    public function test_existing_projects_are_not_backfilled_by_the_migration(): void
    {
        $user = $this->user();

        // migration適用前から存在する行を模して、Observerを通さずに投入する。
        DB::table('projects')->insert([
            'user_id' => $user->id,
            'name' => 'migration前からある案件',
            'type' => 'side_job',
            'status' => '返信待ち',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->assertDatabaseCount('project_status_histories', 0);
    }
}
