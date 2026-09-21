<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Projectのstatus遷移を1件1行で記録する監査用モデル。
 *
 * 監査記録のため、SoftDeletesは意図的に使わない(履歴を「消したように見せる」状態を作らない)。
 * 書き込みはApp\Observers\ProjectObserverからのみ行う想定で、画面・APIからの更新経路は持たない。
 */
class ProjectStatusHistory extends Model
{
    /** 画面・APIからの通常の変更。現時点ではこれのみが使われる。 */
    public const SOURCE_WEB = 'web';

    /** URL取込に由来する変更(将来の拡張用)。 */
    public const SOURCE_IMPORT = 'import';

    /** バッチ・migration等、利用者操作以外に由来する変更(将来の拡張用)。 */
    public const SOURCE_SYSTEM = 'system';

    protected $fillable = [
        'project_id',
        'user_id',
        'from_status',
        'to_status',
        'project_type',
        'source',
        'changed_at',
    ];

    protected $casts = [
        'changed_at' => 'datetime',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * 変更を行ったユーザー。Projectの所有者とは限らない(将来共有機能を入れた場合)。
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
