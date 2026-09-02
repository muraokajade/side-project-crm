<?php

namespace App\Services\UrlImport;

/**
 * 取り込んだURLから、画面の媒体プルダウン(MEDIA_OPTIONS)で選択済みになる値を決める。
 *
 * 媒体プルダウンは閉じた選択肢のため、一致しない値を入れると「選択なし」に見えてしまう。
 * og:site_nameは「転職type - マッチする求人情報が分かる、探せる、転職サイト」のように
 * 選択肢と一致しない長い文言になりうるので、既知のホストは選択肢内の値へ寄せる。
 *
 * 選択肢そのものは増やさない方針のため、専用の選択肢がない媒体は「その他」にする。
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
        // 専用の選択肢を持たない媒体は「その他」へ寄せる(選択肢は増やさない)。
        'type.jp' => 'その他',
    ];

    /**
     * @param string $host 取得先のホスト
     * @param string|null $fallback 既知ホストでない場合に使う値(og:site_name等)
     */
    public function resolve(string $host, ?string $fallback = null): ?string
    {
        $normalizedHost = preg_replace('/^www\./', '', strtolower($host));

        return self::HOST_TO_MEDIA[$normalizedHost] ?? $fallback;
    }
}
