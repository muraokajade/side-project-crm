<?php

namespace App\Support;

/**
 * 求人ページに明示されていた「副業可否」。
 *
 * 値は3状態のみ。判定は求人ページの明示記載だけを根拠とし、
 * 求人内容からの推測や、案件の種別(career/side_job)からの導出は行わない。
 */
final class SideJobAllowed
{
    /** ページに「副業OK」「副業可」等の明示があった。 */
    public const OK = 'ok';

    /** ページに「副業禁止」「副業不可」等の明示があった。 */
    public const NG = 'ng';

    /** 記載なし・曖昧・判断できない・取得失敗。既定値。 */
    public const UNKNOWN = 'unknown';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return [self::OK, self::NG, self::UNKNOWN];
    }
}
