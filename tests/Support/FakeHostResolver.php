<?php

namespace Tests\Support;

use App\Services\UrlImport\HostResolver;

/**
 * テストで実際のDNSへ問い合わせないためのHostResolver差し替え実装。
 */
class FakeHostResolver implements HostResolver
{
    /**
     * @param array<string, list<string>> $map ホスト名 => 解決結果のIP一覧
     */
    public function __construct(private readonly array $map = [])
    {
    }

    public function resolve(string $hostname): array
    {
        return $this->map[$hostname] ?? [];
    }
}
