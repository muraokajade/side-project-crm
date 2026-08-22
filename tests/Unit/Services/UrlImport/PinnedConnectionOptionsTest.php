<?php

namespace Tests\Unit\Services\UrlImport;

use App\Exceptions\UrlImport\UrlSafetyException;
use App\Services\UrlImport\PinnedConnectionOptions;
use PHPUnit\Framework\TestCase;

class PinnedConnectionOptionsTest extends TestCase
{
    public function test_builds_curl_resolve_entry_for_single_ipv4(): void
    {
        $options = PinnedConnectionOptions::build('example.com', 443, ['93.184.216.34']);

        $this->assertSame(
            ['example.com:443:93.184.216.34'],
            $options['curl'][CURLOPT_RESOLVE]
        );
    }

    public function test_builds_curl_resolve_entry_for_ipv6(): void
    {
        $options = PinnedConnectionOptions::build('example.com', 443, ['2606:4700:4700::1111']);

        $this->assertSame(
            ['example.com:443:2606:4700:4700::1111'],
            $options['curl'][CURLOPT_RESOLVE]
        );
    }

    public function test_builds_curl_resolve_entries_for_multiple_mixed_ips(): void
    {
        $options = PinnedConnectionOptions::build('example.com', 80, ['93.184.216.34', '2606:4700:4700::1111']);

        $this->assertSame(
            ['example.com:80:93.184.216.34', 'example.com:80:2606:4700:4700::1111'],
            $options['curl'][CURLOPT_RESOLVE]
        );
    }

    public function test_rejects_when_all_candidate_ips_are_private(): void
    {
        $this->expectException(UrlSafetyException::class);

        PinnedConnectionOptions::build('internal.example.com', 443, ['10.0.0.5']);
    }

    public function test_filters_out_private_ip_when_mixed_with_public(): void
    {
        // 呼び出し側の実装ミスに備えた多層防御:
        // 万が一プライベートIPが混入していても、それは接続候補にならない。
        $options = PinnedConnectionOptions::build('example.com', 443, ['93.184.216.34', '127.0.0.1']);

        $this->assertSame(
            ['example.com:443:93.184.216.34'],
            $options['curl'][CURLOPT_RESOLVE]
        );
    }

    public function test_rejects_empty_ip_list(): void
    {
        $this->expectException(UrlSafetyException::class);

        PinnedConnectionOptions::build('example.com', 443, []);
    }
}
