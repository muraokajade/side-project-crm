<?php

namespace App\Services\UrlImport;

use App\Exceptions\UrlImport\UrlSafetyException;

/**
 * UrlSafetyValidatorが検証済みのIPへ実際の接続先を固定するための、
 * Guzzle(cURL)リクエストオプションを組み立てる。
 *
 * CURLOPT_RESOLVEで「ホスト名:ポート:検証済みIP」を指定することで、
 * cURLはこのホスト名に対して自前でDNS再解決を行わず、指定したIPへ直接接続する。
 * リクエストURL自体・Hostヘッダー・HTTPS時のTLS SNI/証明書検証は元のホスト名のまま
 * 変更されない(CURLOPT_RESOLVEは名前解決だけを差し替える機能のため)。
 * これにより、安全性検証時(DNS解決)と実際の接続時のDNS解決が分離してしまう
 * DNS rebinding/TOCTOUを防ぐ。
 *
 * 検証済みIPが複数ある場合は全てをCURLOPT_RESOLVEへ渡す。cURLはこれらを接続候補として
 * 順に試行し、先頭が接続失敗すれば次を試す(uv/cURL標準のフォールバック動作)。
 * 全候補への接続に失敗した場合は、呼び出し側(SafeHtmlFetcher)が
 * ConnectionExceptionを捕捉して安全なエラー(error_code: connection_failed/timeout)へ変換する。
 */
final class PinnedConnectionOptions
{
    /**
     * @param list<string> $verifiedPublicIps UrlSafetyValidator::assertSafe()が返した検証済みIP一覧
     * @return array{curl: array<int, list<string>>}
     */
    public static function build(string $host, int $port, array $verifiedPublicIps): array
    {
        // 呼び出し側の実装ミスに備えた多層防御: ここでも再度、非公開IPが
        // 接続候補に混ざっていないことを確認する(検証済みIPと実接続先が分離しないための最終防衛線)。
        $safeIps = array_values(array_filter(
            $verifiedPublicIps,
            static fn (string $ip) => ! IpRangeGuard::isBlocked($ip)
        ));

        if ($safeIps === []) {
            throw new UrlSafetyException('blocked_host', 'アクセスが許可されていないIPアドレスへ到達するホストです。');
        }

        $entries = array_map(
            static fn (string $ip) => sprintf('%s:%d:%s', $host, $port, $ip),
            $safeIps
        );

        return [
            'curl' => [
                CURLOPT_RESOLVE => $entries,
            ],
        ];
    }
}
