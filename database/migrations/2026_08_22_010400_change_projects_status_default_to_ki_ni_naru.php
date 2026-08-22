<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * statusカラムのデフォルト値を「未応募」から「気になる」へ変更する。
     * 既存行のstatus値は変更しない(デフォルト値は今後の新規INSERTにのみ影響する)。
     */
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->string('status')->default('気になる')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->string('status')->default('未応募')->change();
        });
    }
};
