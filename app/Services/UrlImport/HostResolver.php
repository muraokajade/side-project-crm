<?php

namespace App\Services\UrlImport;

/**
 * ホスト名からIPアドレス一覧を得るための抽象。
 * テストでは実際のDNSへ問い合わせない偽実装に差し替える。
 */
interface HostResolver
{
    /**
     * @return list<string> 解決できたIPv4/IPv6アドレスの一覧(解決できない場合は空配列)
     */
    public function resolve(string $hostname): array;
}
