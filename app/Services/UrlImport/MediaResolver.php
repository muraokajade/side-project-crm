<?php

namespace App\Services\UrlImport;

/**
 * 取り込んだURLから、画面の媒体プルダウン(MEDIA_OPTIONS)で選択済みになる値を決める。
 *
 * 媒体プルダウンは閉じた選択肢のため、一致しない値を入れると「選択なし」に見えてしまう。
 * og:site_nameは「転職type - マッチする求人情報が分かる、探せる、転職サイト」のように
 * 選択肢と一致しない長い文言になりうるので、既知のホストは選択肢内の値へ寄せる。
 *
 * ここで返す値は MEDIA_OPTIONS に存在するものだけにすること
 * (存在しない値を返すとプルダウンが未選択に見えてしまう)。
 */
class MediaResolver
{
    /**
     * ホスト(www.を除く)と、媒体プルダウンの値の対応。
     * 値は resources/js/constants/projectOptions.ts の MEDIA_OPTIONS に必ず存在すること。
     *
     * @var array<string, string>
     */
    private const HOST_TO_MEDIA = [
        'crowdworks.jp' => 'CrowdWorks',
        'menta.work' => 'MENTA',
        'lancers.jp' => 'Lancers',
        'type.jp' => 'type',
        'freelance-hub.jp' => 'フリーランスハブ',
    ];

    /** 既知の媒体に当てはまらない場合に使う値。プルダウンの受け皿。 */
    public const FALLBACK_MEDIA = 'その他';

    /**
     * ホストから媒体を決める。既知の媒体でなければ「その他」を返す。
     *
     * og:site_nameのような長い文言をそのまま入れるとプルダウンが未選択に見えるため、
     * 必ずMEDIA_OPTIONSに存在する値だけを返す。実際の媒体名は、利用者が
     * 「その他」選択時の自由入力欄で補える。
     */
    public function resolve(string $host): string
    {
        $normalizedHost = preg_replace('/^www\./', '', strtolower($host));

        if (isset(self::HOST_TO_MEDIA[$normalizedHost])) {
            return self::HOST_TO_MEDIA[$normalizedHost];
        }

        // サブドメイン(例: pro.freelance-hub.jp)も同じ媒体として扱う。
        foreach (self::HOST_TO_MEDIA as $knownHost => $media) {
            if (str_ends_with($normalizedHost, '.' . $knownHost)) {
                return $media;
            }
        }

        return self::FALLBACK_MEDIA;
    }
}
