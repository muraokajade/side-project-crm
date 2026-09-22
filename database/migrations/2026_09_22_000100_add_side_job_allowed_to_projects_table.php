<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * 求人ページに明示されていた副業可否を保持する列を追加する。
     *
     * 値は 'ok' / 'ng' / 'unknown' の3状態のみ(App\Support\SideJobAllowed)。
     * 既定値を'unknown'にすることで、既存行・取得失敗・記載なしがすべて同じ意味になり、
     * NULLと'unknown'の2種類の「不明」が生まれないようにする。
     */
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->string('side_job_allowed')->default('unknown');
        });
    }

    /**
     * Reverse the migrations.
     *
     * 本migrationで追加した列だけを落とす。既存の列・行には触れない。
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn('side_job_allowed');
        });
    }
};
