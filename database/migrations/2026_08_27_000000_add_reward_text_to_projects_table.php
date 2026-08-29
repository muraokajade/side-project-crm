<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * 既存のreward(integer)は互換のため残す。reward_textは、URL取込時にページ上の
     * 表記(固定報酬・時給・月額・応相談・未掲載等)をそのまま保持するための文字列カラム。
     * Web UIの報酬表示はreward_textを優先する(reward_textが空の場合のみrewardを表示)。
     */
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->string('reward_text')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn('reward_text');
        });
    }
};
