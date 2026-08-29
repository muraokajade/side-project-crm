<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * projectsに所有者(user_id)を持たせ、モニター間でデータを分離する。
     *
     * nullableとするのは、既存の開発データを自動移行・自動修復しない方針のため
     * (既存行はuser_id=NULLのまま残る)。全APIはログインユーザーのuser_idで絞り込むため、
     * user_id=NULLの既存行はどのユーザーからも参照・操作できない。
     */
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');
        });
    }
};
