<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('project_url')->nullable();
            $table->string('client_name')->nullable();
            $table->string('media')->nullable();
            $table->string('category')->nullable();
            $table->date('applied_date')->nullable();
            $table->string('status')->default('未応募');
            $table->integer('reward')->nullable();
            $table->string('working_hours')->nullable();
            $table->integer('applicant_count')->nullable();
            $table->integer('recruitment_count')->nullable();
            $table->text('application_text')->nullable();
            $table->string('next_action')->nullable();
            $table->date('next_action_date')->nullable();
            $table->text('memo')->nullable();
            $table->string('priority')->nullable();
            $table->boolean('is_favorite')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
