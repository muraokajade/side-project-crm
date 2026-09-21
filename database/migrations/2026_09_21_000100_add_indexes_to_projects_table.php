<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * projectsへ追加する複合索引。既存のカラム・データ・他の索引には一切触れない。
     *
     * 索引名はLaravelの自動命名規則(table_col1_col2_index)と同じ文字列を明示している。
     * down()でdropIndex()へ名前をそのまま渡せるようにし、自動生成名への依存をなくすため。
     *
     * 列順の根拠:
     * - user_id を必ず先頭に置く。全クエリがProject::scopeOwnedBy()を通り、
     *   user_idの等価条件が常に付くため(app/Models/Project.php)。
     * - 1本目は ProjectController::index() / ProjectTrashController::index() の
     *   「user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC」に対応する。
     *   created_atの降順指定は行わない。Laravel Schema Builderは方向指定に対応せず、
     *   PostgreSQLのB-treeは逆順スキャンが可能なためORDER BY ... DESCにも使われる。
     *   方向を書かないことでSQLiteとの互換も保てる。
     * - 2本目・3本目は同2メソッドのtype/statusによる絞り込みに対応する。
     *
     * @var array<string, list<string>>
     */
    private const INDEXES = [
        'projects_user_id_deleted_at_created_at_index' => ['user_id', 'deleted_at', 'created_at'],
        'projects_user_id_type_index' => ['user_id', 'type'],
        'projects_user_id_status_index' => ['user_id', 'status'],
    ];

    /**
     * Run the migrations.
     *
     * 索引の追加のみ。カラム定義・既存行は変更しない。
     */
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            foreach (self::INDEXES as $name => $columns) {
                $table->index($columns, $name);
            }
        });
    }

    /**
     * Reverse the migrations.
     *
     * up()で追加した3索引だけを名前指定で削除する。
     * dropIndex()は索引のみを対象とするため、行データは1件も削除・変更されない。
     * 主キー(projects_pkey)や他の索引にも触れない。
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            foreach (array_keys(self::INDEXES) as $name) {
                $table->dropIndex($name);
            }
        });
    }
};
