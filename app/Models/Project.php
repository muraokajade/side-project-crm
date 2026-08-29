<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use SoftDeletes;

    /**
     * user_idは意図的に$fillableへ含めない。
     * リクエストのuser_idで所有者を偽装できないよう、所有者はUser::projects()経由の
     * 作成(リレーションがFKを直接設定する)でのみ設定する。
     */
    protected $fillable = [
        'name',
        'project_url',
        'client_name',
        'media',
        'category',
        'applied_date',
        'status',
        'reward',
        'reward_text',
        'working_hours',
        'applicant_count',
        'recruitment_count',
        'application_text',
        'next_action',
        'next_action_date',
        'memo',
        'priority',
        'is_favorite',
        'type',
        'description',
        'deadline',
        'fetched_at',
        'job_type',
        'location',
        'remote_type',
        'employment_type',
        'contract_type',
        'delivery_date',
    ];

    protected $casts = [
        'applied_date' => 'date',
        'next_action_date' => 'date',
        'is_favorite' => 'boolean',
        'reward' => 'integer',
        'applicant_count' => 'integer',
        'recruitment_count' => 'integer',
        'deadline' => 'date',
        'fetched_at' => 'datetime',
        'delivery_date' => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * 所有者が$userIdのProjectだけへ絞り込む。全APIはこのスコープを通してのみ
     * Projectを取得し、他ユーザーのデータが混ざらないようにする。
     * user_id=NULLの既存開発データは、どのユーザーからも対象にならない。
     */
    public function scopeOwnedBy(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }

    /**
     * name/client_name/description/memoのいずれかに$termを含むレコードへ絞り込む。
     * ProjectController::index()の`keyword`、ProjectTrashController::index()の`search`の両方から使う。
     */
    public function scopeSearchText(Builder $query, string $term): Builder
    {
        return $query->where(function ($q) use ($term) {
            $q->where('name', 'like', "%{$term}%")
              ->orWhere('client_name', 'like', "%{$term}%")
              ->orWhere('description', 'like', "%{$term}%")
              ->orWhere('memo', 'like', "%{$term}%");
        });
    }
}
