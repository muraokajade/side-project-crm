<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * up()で新ラベルへ変更する既存ラベルの対応表。
     * 「その他の既存値」(応募済み・返信待ち・選考中・作業中・検収待ち・完了)は
     * このマイグレーションの対象外であり、値を変更しない。
     *
     * @var array<string, string>
     */
    private const LEGACY_TO_NEW = [
        '未応募' => '気になる',
        '面談予定' => '面談',
        '契約済み' => '契約',
        '納品済み' => '納品',
        '不採用' => '見送り',
        '辞退' => '見送り',
    ];

    /**
     * down()で復元できる対応のみ。
     * 「不採用」「辞退」はいずれも「見送り」へ変換されるため、
     * 「見送り」からどちらが元だったかを一意に復元できない。
     * そのため「見送り」は復元対象に含めない(データを変更しない)。
     *
     * @var array<string, string>
     */
    private const REVERSIBLE_NEW_TO_LEGACY = [
        '気になる' => '未応募',
        '面談' => '面談予定',
        '契約' => '契約済み',
        '納品' => '納品済み',
    ];

    /**
     * Run the migrations.
     *
     * スキーマ変更は行わず、既存行のstatus値のみを更新するデータ移行。
     */
    public function up(): void
    {
        foreach (self::LEGACY_TO_NEW as $legacy => $new) {
            DB::table('projects')->where('status', $legacy)->update(['status' => $new]);
        }
    }

    /**
     * Reverse the migrations.
     *
     * 「見送り」は復元しない(上記REVERSIBLE_NEW_TO_LEGACYのコメント参照)。
     * また、down()実行前に新ラベル(例: 「気になる」)で新規作成された行が存在する場合、
     * それらも元ラベルへ書き換えられてしまう点に注意が必要(up()以降に作成された行と、
     * up()によって変換された行を区別する情報は保持していないため)。
     * このmigrationのdown()は「up()直後に取り消す」用途を想定した安全側の簡易復元であり、
     * 本番相当データへの完全な逆変換を保証するものではない。
     */
    public function down(): void
    {
        foreach (self::REVERSIBLE_NEW_TO_LEGACY as $new => $legacy) {
            DB::table('projects')->where('status', $new)->update(['status' => $legacy]);
        }
    }
};
