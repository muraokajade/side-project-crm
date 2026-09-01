<?php

namespace App\Services\UrlImport;

/**
 * 「サーバー側からは自動取得できず、手入力へ誘導すべきURL/取得失敗」の判定。
 *
 * 対象は、利用者がログイン済みのブラウザでしか見られないページ
 * (応募履歴・メッセージ一覧など)。JobHuntのサーバーは利用者のCookieを持たないため、
 * これらのページは原理的に取得できない。
 * 認証情報の取得・ログイン突破・ブラウザ自動操作は行わない。
 */
class ManualEntryUrlDetector
{
    /**
     * ホストごとの「ログイン必須」パス断片。
     * パスにいずれかを含む場合、取得を試みる前に手入力へ誘導する。
     *
     * @var array<string, list<string>>
     */
    private const LOGIN_REQUIRED_PATH_FRAGMENTS = [
        'type.jp' => ['entry_history', 'entry_message_list'],
    ];

    /**
     * 取得失敗のうち、ログイン必須が原因とみなすエラーコード。
     * (リモートの401/403、およびログインページへのリダイレクト)
     *
     * @var list<string>
     */
    private const LOGIN_REQUIRED_ERROR_CODES = [
        'requires_login',
        'forbidden',
        'redirected_to_login',
    ];

    /**
     * 取得を試みる前に、URLの形だけで手入力誘導と判定できるか。
     */
    public function requiresManualEntry(string $url): bool
    {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));

        if ($host === '') {
            return false;
        }

        // www. の有無を吸収する。
        $host = preg_replace('/^www\./', '', $host);

        $fragments = self::LOGIN_REQUIRED_PATH_FRAGMENTS[$host] ?? null;

        if ($fragments === null) {
            return false;
        }

        $path = (string) (parse_url($url, PHP_URL_PATH) ?? '');

        foreach ($fragments as $fragment) {
            if (str_contains($path, $fragment)) {
                return true;
            }
        }

        return false;
    }

    /**
     * 取得失敗のエラーコードが、ログイン必須によるものか。
     */
    public function isLoginRequiredErrorCode(string $errorCode): bool
    {
        return in_array($errorCode, self::LOGIN_REQUIRED_ERROR_CODES, true);
    }
}
