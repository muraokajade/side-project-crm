<?php

namespace Tests\Feature;

use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ProjectSchemaMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_project_defaults_to_side_job_type(): void
    {
        $project = Project::create(['name' => '種別未指定案件']);

        // create()直後のインメモリなモデルは、明示的に渡していないカラムの
        // DB側デフォルト値を保持しないため、refresh()してDBの実値を確認する。
        $this->assertSame('side_job', $project->refresh()->type);
    }

    public function test_new_project_defaults_to_ki_ni_naru_status(): void
    {
        $project = Project::create(['name' => 'ステータス未指定案件']);

        $this->assertSame('気になる', $project->refresh()->status);
    }

    public function test_legacy_status_labels_are_migrated_to_new_vocabulary(): void
    {
        $migration = require database_path('migrations/2026_08_22_010500_migrate_legacy_side_job_status_labels.php');

        DB::table('projects')->insert([
            ['name' => '案件(未応募)', 'status' => '未応募', 'created_at' => now(), 'updated_at' => now()],
            ['name' => '案件(面談予定)', 'status' => '面談予定', 'created_at' => now(), 'updated_at' => now()],
            ['name' => '案件(契約済み)', 'status' => '契約済み', 'created_at' => now(), 'updated_at' => now()],
            ['name' => '案件(納品済み)', 'status' => '納品済み', 'created_at' => now(), 'updated_at' => now()],
            ['name' => '案件(不採用)', 'status' => '不採用', 'created_at' => now(), 'updated_at' => now()],
            ['name' => '案件(辞退)', 'status' => '辞退', 'created_at' => now(), 'updated_at' => now()],
            // 対照群: 移行対象外の既存値が変更されないことを確認する
            ['name' => '案件(応募済み)', 'status' => '応募済み', 'created_at' => now(), 'updated_at' => now()],
        ]);

        $migration->up();

        $this->assertDatabaseHas('projects', ['name' => '案件(未応募)', 'status' => '気になる']);
        $this->assertDatabaseHas('projects', ['name' => '案件(面談予定)', 'status' => '面談']);
        $this->assertDatabaseHas('projects', ['name' => '案件(契約済み)', 'status' => '契約']);
        $this->assertDatabaseHas('projects', ['name' => '案件(納品済み)', 'status' => '納品']);
        $this->assertDatabaseHas('projects', ['name' => '案件(不採用)', 'status' => '見送り']);
        $this->assertDatabaseHas('projects', ['name' => '案件(辞退)', 'status' => '見送り']);
        $this->assertDatabaseHas('projects', ['name' => '案件(応募済み)', 'status' => '応募済み']);
    }

    public function test_legacy_status_migration_down_reverses_only_deterministic_labels(): void
    {
        $migration = require database_path('migrations/2026_08_22_010500_migrate_legacy_side_job_status_labels.php');

        DB::table('projects')->insert([
            ['name' => '気になる案件', 'status' => '気になる', 'created_at' => now(), 'updated_at' => now()],
            ['name' => '面談案件', 'status' => '面談', 'created_at' => now(), 'updated_at' => now()],
            ['name' => '契約案件', 'status' => '契約', 'created_at' => now(), 'updated_at' => now()],
            ['name' => '納品案件', 'status' => '納品', 'created_at' => now(), 'updated_at' => now()],
            ['name' => '見送り案件', 'status' => '見送り', 'created_at' => now(), 'updated_at' => now()],
        ]);

        $migration->down();

        $this->assertDatabaseHas('projects', ['name' => '気になる案件', 'status' => '未応募']);
        $this->assertDatabaseHas('projects', ['name' => '面談案件', 'status' => '面談予定']);
        $this->assertDatabaseHas('projects', ['name' => '契約案件', 'status' => '契約済み']);
        $this->assertDatabaseHas('projects', ['name' => '納品案件', 'status' => '納品済み']);

        // 「見送り」は不採用/辞退のどちらが元か一意に復元できないため、変更されないままである。
        $this->assertDatabaseHas('projects', ['name' => '見送り案件', 'status' => '見送り']);
    }

    public function test_soft_delete_excludes_project_from_default_queries_but_keeps_row(): void
    {
        $project = Project::create(['name' => '削除対象']);

        $project->delete();

        $this->assertSame(0, Project::count());
        $this->assertSame(1, Project::withTrashed()->count());
        $this->assertSoftDeleted('projects', ['id' => $project->id]);
    }

    public function test_soft_deleted_project_can_be_retrieved_with_with_trashed_and_restored(): void
    {
        $project = Project::create(['name' => '復元対象']);
        $project->delete();

        $trashed = Project::withTrashed()->find($project->id);
        $this->assertNotNull($trashed);
        $this->assertNotNull($trashed->deleted_at);

        $trashed->restore();

        $this->assertNotNull(Project::find($project->id));
    }

    public function test_new_date_and_datetime_columns_are_cast_correctly(): void
    {
        $project = Project::create([
            'name' => '日付項目確認案件',
            'deadline' => '2026-09-01',
            'fetched_at' => '2026-08-22 10:00:00',
            'delivery_date' => '2026-09-15',
        ]);

        $this->assertInstanceOf(Carbon::class, $project->deadline);
        $this->assertInstanceOf(Carbon::class, $project->fetched_at);
        $this->assertInstanceOf(Carbon::class, $project->delivery_date);
        $this->assertSame('2026-09-01', $project->deadline->format('Y-m-d'));
        $this->assertSame('2026-08-22 10:00:00', $project->fetched_at->format('Y-m-d H:i:s'));
        $this->assertSame('2026-09-15', $project->delivery_date->format('Y-m-d'));
    }
}
