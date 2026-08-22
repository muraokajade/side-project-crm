<?php

namespace App\Support;

/**
 * typeごとのstatus許可値と、既存Web版が送信する旧側業ステータス名の正規化を
 * StoreProjectRequest/UpdateProjectRequestの両方から共通で使うための単一の定義元。
 */
final class ProjectStatus
{
    public const CAREER = 'career';

    public const SIDE_JOB = 'side_job';

    public const CAREER_STATUSES = [
        '気になる',
        '応募準備',
        '応募済み',
        '書類選考',
        '面接',
        '最終面接',
        '内定',
        '見送り',
    ];

    public const SIDE_JOB_STATUSES = [
        '気になる',
        '応募準備',
        '応募済み',
        '返信待ち',
        '面談',
        '選考中',
        '契約',
        '作業中',
        '納品',
        '検収待ち',
        '完了',
        '見送り',
    ];

    /**
     * 既存Web版(旧side_job専用アプリ)が送信する可能性のある旧ステータス名 → 新ステータス名。
     * side_job以外のtypeには適用しない。
     *
     * @var array<string, string>
     */
    private const LEGACY_SIDE_JOB_LABELS = [
        '未応募' => '気になる',
        '面談予定' => '面談',
        '契約済み' => '契約',
        '納品済み' => '納品',
        '不採用' => '見送り',
        '辞退' => '見送り',
    ];

    /**
     * @return list<string>
     */
    public static function optionsForType(string $type): array
    {
        return $type === self::CAREER ? self::CAREER_STATUSES : self::SIDE_JOB_STATUSES;
    }

    /**
     * side_jobの場合のみ、旧ステータス名を新ステータス名へ変換する。
     * career、または旧ラベルに該当しない値は変更せずそのまま返す。
     */
    public static function normalize(string $type, ?string $status): ?string
    {
        if ($status === null || $type !== self::SIDE_JOB) {
            return $status;
        }

        return self::LEGACY_SIDE_JOB_LABELS[$status] ?? $status;
    }
}
