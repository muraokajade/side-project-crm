<?php

namespace App\Observers;

use App\Models\Project;
use App\Models\ProjectStatusHistory;
use Illuminate\Support\Facades\Auth;

/**
 * Projectのstatus遷移をproject_status_historiesへ記録する。
 *
 * 記録するタイミングは2つだけ:
 *  - created : 新規作成。from_status=NULL、to_status=初期status。
 *  - updated : statusが実際に変化したときのみ。
 *
 * status以外(name・memo・報酬等)の更新では履歴を増やさない。
 *
 * 【既知の制約】Eloquentを経由しない更新はこのObserverを通らない。
 * 具体的には DB::table('projects')->update(...) やクエリビルダ経由の一括更新、
 * および migration 内のデータ移行(例: 2026_08_22_010500_migrate_legacy_side_job_status_labels)。
 * これらは履歴に残らない。監査の網羅性をDBレベルで保証するものではなく、
 * 「アプリ経由の変更を記録する」ことを目的とした仕組みである。
 *
 * 【既知の制約】履歴の書き込みはProjectの保存とは別のINSERTであり、
 * 現時点では同一トランザクションで囲われていない。Projectの保存が成功した直後に
 * 履歴の書き込みが失敗すると、Projectだけが残る。履歴の欠落を黙って握り潰さない方を
 * 優先し、例外はそのまま送出する(呼び出し側をDB::transactionで囲うのは別途の課題)。
 */
class ProjectObserver
{
    /**
     * 新規作成時。遷移元が存在しないためfrom_statusはNULL。
     */
    public function created(Project $project): void
    {
        [$status, $type] = $this->resolveCurrentValues($project);

        $this->record($project, null, $status, $type);
    }

    /**
     * 更新時。statusが実際に変化した場合だけ記録する。
     *
     * wasChanged()は保存が完了した後に「実際に変わった属性」を返すため、
     * 同じ値でsave()しただけのケースでは履歴が増えない。
     *
     * SoftDeletesによる論理削除(delete)はクエリビルダ経由でdeleted_atを更新するため
     * updatedイベントを発火せず、ここには到達しない。
     * 復元(restore)はupdatedを発火するが、statusは変化しないため記録されない。
     */
    public function updated(Project $project): void
    {
        if (! $project->wasChanged('status')) {
            return;
        }

        [$status, $type] = $this->resolveCurrentValues($project);

        $original = $project->getOriginal('status');

        $this->record($project, $original === null ? null : (string) $original, $status, $type);
    }

    /**
     * 保存直後のモデルは、明示的に渡していないカラムのDB側デフォルト値
     * (status='気になる' / type='side_job')をインメモリに保持しない。
     * そのため値が欠けている場合に限りDBから読み直す(fresh()は新しいインスタンスを
     * 返すだけで、呼び出し元が保持しているモデルを書き換えない)。
     *
     * @return array{0: string, 1: string} [status, type]
     */
    private function resolveCurrentValues(Project $project): array
    {
        if ($project->status !== null && $project->type !== null) {
            return [(string) $project->status, (string) $project->type];
        }

        $fresh = $project->fresh();

        return [
            (string) ($project->status ?? $fresh?->status),
            (string) ($project->type ?? $fresh?->type),
        ];
    }

    private function record(Project $project, ?string $fromStatus, string $toStatus, string $projectType): void
    {
        ProjectStatusHistory::create([
            'project_id' => $project->getKey(),
            // 「誰が変更したか」を残す。未認証・CLI実行時は所有者へフォールバックする。
            'user_id' => Auth::id() ?? $project->user_id,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'project_type' => $projectType,
            'source' => ProjectStatusHistory::SOURCE_WEB,
            'changed_at' => now(),
        ]);
    }
}
