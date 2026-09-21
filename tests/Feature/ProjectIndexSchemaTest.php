<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * projectsへ追加した複合索引(2026_09_21_000100_add_indexes_to_projects_table)の検証。
 *
 * migrationのup()/down()を直接呼び出す方式は、既存のProjectSchemaMigrationTestと同じ。
 * Schema::getIndexes()/hasIndex()はSQLite・PostgreSQLで同じ形へ正規化されるため、
 * 本テストはローカル(SQLite)と本番相当(PostgreSQL)の双方で同じ判定になる。
 */
class ProjectIndexSchemaTest extends TestCase
{
    use RefreshDatabase;

    /**
     * migrationが追加するはずの索引名と列構成。migration側の定義と一対一で対応させる。
     *
     * @var array<string, list<string>>
     */
    private const EXPECTED_INDEXES = [
        'projects_user_id_deleted_at_created_at_index' => ['user_id', 'deleted_at', 'created_at'],
        'projects_user_id_type_index' => ['user_id', 'type'],
        'projects_user_id_status_index' => ['user_id', 'status'],
    ];

    private function migration(): object
    {
        return require database_path('migrations/2026_09_21_000100_add_indexes_to_projects_table.php');
    }

    /**
     * @return list<string>
     */
    private function indexNames(): array
    {
        $names = Schema::getIndexListing('projects');
        sort($names);

        return $names;
    }

    // ---- 完了条件1: migrate後に3索引が存在する ----------------------------

    public function test_three_indexes_exist_after_migrate(): void
    {
        // RefreshDatabaseにより全migrationが適用済みの状態から検証する。
        foreach (self::EXPECTED_INDEXES as $name => $columns) {
            $this->assertTrue(
                Schema::hasIndex('projects', $name),
                "索引 {$name} が存在しません。"
            );
            $this->assertTrue(
                Schema::hasIndex('projects', $columns),
                '列構成 ' . implode(', ', $columns) . ' の索引が存在しません。'
            );
        }
    }

    public function test_index_column_order_matches_the_design(): void
    {
        $byName = [];

        foreach (Schema::getIndexes('projects') as $index) {
            $byName[$index['name']] = $index['columns'];
        }

        foreach (self::EXPECTED_INDEXES as $name => $columns) {
            $this->assertArrayHasKey($name, $byName, "索引 {$name} が存在しません。");
            $this->assertSame(
                $columns,
                $byName[$name],
                "索引 {$name} の列順が設計と異なります(user_idが先頭である必要があります)。"
            );
        }
    }

    public function test_added_indexes_are_not_unique(): void
    {
        // 本番には重複URL等が実在するため、この3索引は一意制約であってはならない。
        foreach (Schema::getIndexes('projects') as $index) {
            if (! array_key_exists($index['name'], self::EXPECTED_INDEXES)) {
                continue;
            }

            $this->assertFalse($index['unique'], "索引 {$index['name']} が一意制約になっています。");
            $this->assertFalse($index['primary'], "索引 {$index['name']} が主キー扱いになっています。");
        }
    }

    // ---- 完了条件2: rollback後に3索引が消える ----------------------------

    public function test_three_indexes_are_removed_after_rollback(): void
    {
        $migration = $this->migration();

        $migration->down();

        foreach (array_keys(self::EXPECTED_INDEXES) as $name) {
            $this->assertFalse(
                Schema::hasIndex('projects', $name),
                "rollback後も索引 {$name} が残っています。"
            );
        }

        // 再適用して元の状態へ戻せること(up→down→upの往復)も同時に固定する。
        $migration->up();

        foreach (array_keys(self::EXPECTED_INDEXES) as $name) {
            $this->assertTrue(
                Schema::hasIndex('projects', $name),
                "再適用後に索引 {$name} が復元されていません。"
            );
        }
    }

    public function test_rollback_removes_only_the_three_added_indexes(): void
    {
        $before = $this->indexNames();

        $migration = $this->migration();
        $migration->down();

        $after = $this->indexNames();

        $removed = array_values(array_diff($before, $after));
        sort($removed);

        $expected = array_keys(self::EXPECTED_INDEXES);
        sort($expected);

        $this->assertSame($expected, $removed, 'down()が想定外の索引まで削除しています。');

        $migration->up();

        $this->assertSame($before, $this->indexNames(), '往復後の索引一覧が元と一致しません。');
    }

    // ---- 完了条件3: projectsの既存データが変更されない --------------------

    public function test_existing_project_rows_are_untouched_by_up_and_down(): void
    {
        $user = User::create([
            'name' => '索引テストユーザー',
            'email' => 'index-owner@example.com',
            'password' => 'password123',
        ]);

        // 本番projectsの特徴を再現する:
        // (1)所有者あり (2)user_id=NULLの旧データ (3)論理削除済み
        $user->projects()->create(['name' => '所有者ありの案件', 'status' => '気になる']);

        DB::table('projects')->insert([
            'name' => '所有者不明の旧データ',
            'type' => 'side_job',
            'status' => '返信待ち',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $trashed = $user->projects()->create(['name' => 'ゴミ箱の案件', 'status' => '気になる']);
        $trashed->delete();

        // SoftDeletesのグローバルスコープを迂回し、論理削除済みも含めた全行を記録する。
        $before = DB::table('projects')->orderBy('id')->get()->toArray();
        $this->assertCount(3, $before);

        $migration = $this->migration();
        $migration->down();
        $migration->up();

        $after = DB::table('projects')->orderBy('id')->get()->toArray();

        $this->assertEquals($before, $after, '索引の追加・削除で既存行が変化しました。');
        $this->assertCount(3, $after);

        // 個別にも固定する(件数だけ一致して中身が入れ替わるのを防ぐ)。
        $this->assertDatabaseHas('projects', ['name' => '所有者ありの案件', 'user_id' => $user->id]);
        $this->assertDatabaseHas('projects', ['name' => '所有者不明の旧データ', 'user_id' => null]);
        $this->assertSame(1, DB::table('projects')->whereNull('user_id')->count());
        $this->assertSame(1, DB::table('projects')->whereNotNull('deleted_at')->count());
    }

    public function test_project_queries_still_work_after_indexes_are_added(): void
    {
        $user = User::create([
            'name' => '索引クエリ確認ユーザー',
            'email' => 'index-query@example.com',
            'password' => 'password123',
        ]);

        $user->projects()->create(['name' => '転職の案件', 'type' => 'career', 'status' => '気になる']);
        $user->projects()->create(['name' => '副業の案件', 'type' => 'side_job', 'status' => '返信待ち']);

        $this->actingAs($user);

        $this->getJson('/api/projects')->assertStatus(200)->assertJsonCount(2, 'data');
        $this->getJson('/api/projects?type=career')->assertStatus(200)->assertJsonCount(1, 'data');
        $this->getJson('/api/projects?status=' . urlencode('返信待ち'))->assertStatus(200)->assertJsonCount(1, 'data');
    }
}
