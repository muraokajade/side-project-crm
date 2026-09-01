<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * 環境全体をBasic認証で保護する(ベータ公開中の到達制限)。
 *
 * 設定値はconfig('access.*')から読む。ミドルウェアから直接env()を読むと、
 * config:cache 実行後にenv()がnullを返し、Basic認証が無言で無効化されるため。
 */
class EnsureCrmAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $expectedPassword = (string) config('access.password', '');

        // パスワード未設定の環境(ローカル開発等)ではBasic認証を課さない。
        if ($expectedPassword === '') {
            return $next($request);
        }

        $expectedUser = (string) config('access.user', 'admin');
        $userMatches = hash_equals($expectedUser, (string) $request->getUser());
        $passwordMatches = hash_equals($expectedPassword, (string) $request->getPassword());

        if (! $userMatches || ! $passwordMatches) {
            return response('Authentication required.', 401, [
                'WWW-Authenticate' => 'Basic realm="Side Project CRM", charset="UTF-8"',
            ]);
        }

        return $next($request);
    }
}
