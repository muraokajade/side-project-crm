<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * projectsのstatus変更履歴を保持するテーブルを新規作成する。
     *
     * 既存テーブル(projects/users等)には一切触れないため、旧コードは影響を受けない。
     * 既存45件の過去履歴はバックフィルしない(変更前の値を復元する情報が存在しないため、
     * 推測でレコードを作ると監査記録としての信頼性が失われる)。本migration適用後の
     * 変更から記録を開始する。
     */
    public function up(): void
    {
        Schema::create('project_status_histories', function (Blueprint $table) {
            $table->id();

            // 対象Project。Projectが完全削除(forceDelete)されたら履歴も消す。
            // 孤児レコードを残さない方針(projects.user_id=NULLの既存1件で既に困っているため)。
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();

            // 変更を行ったユーザー。ユーザーが消えても「誰かが変更した」事実は残すためnullOnDelete。
            // 未認証・CLI実行時はProjectの所有者へフォールバックするため、nullableとする。
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

            // 新規作成時はfrom_statusがNULL(遷移元が存在しない)。
            $table->string('from_status')->nullable();
            $table->string('to_status');

            // 変更時点のtype。後からProjectのtypeが変わっても、
            // 当時どちらのステータス体系での遷移だったかを解釈できるようにする。
            $table->string('project_type');

            // 変更の出所。現時点では常に'web'。
            // URL取込やバッチ処理を区別したくなった場合の拡張点として列だけ用意する。
            $table->string('source')->default('web');

            // 変更が起きた時刻。created_atと分けておくことで、将来の移行・取込時に
            // 「実際に起きた時刻」を保持できる余地を残す。
            $table->timestamp('changed_at');

            $table->timestamps();

            $table->index(['project_id', 'changed_at']);
            $table->index(['user_id', 'changed_at']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * 新規テーブルを落とすだけで、projects・usersの既存行は1件も変更されない。
     * ただし本migration適用後に蓄積した履歴は失われる点に注意すること。
     */
    public function down(): void
    {
        Schema::dropIfExists('project_status_histories');
    }
};
