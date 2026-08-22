<?php

namespace App\Services\UrlImport;

/**
 * 実際のDNSへ問い合わせるHostResolverの標準実装。
 */
class DnsHostResolver implements HostResolver
{
    public function resolve(string $hostname): array
    {
        $records = @dns_get_record($hostname, DNS_A + DNS_AAAA);

        if ($records === false) {
            return [];
        }

        $ips = [];
        foreach ($records as $record) {
            if (isset($record['ip'])) {
                $ips[] = $record['ip'];
            } elseif (isset($record['ipv6'])) {
                $ips[] = $record['ipv6'];
            }
        }

        return array_values(array_unique($ips));
    }
}
