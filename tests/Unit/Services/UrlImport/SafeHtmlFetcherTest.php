<?php

namespace Tests\Unit\Services\UrlImport;

use App\Exceptions\UrlImport\UrlSafetyException;
use App\Services\UrlImport\SafeHtmlFetcher;
use App\Services\UrlImport\UrlSafetyValidator;
use PHPUnit\Framework\TestCase;
use Tests\Support\FakeHostResolver;

class SafeHtmlFetcherTest extends TestCase
{
    private function fetcher(): SafeHtmlFetcher
    {
        return new SafeHtmlFetcher(new UrlSafetyValidator(new FakeHostResolver()));
    }

    public function test_connection_options_pin_to_the_verified_ip(): void
    {
        $options = $this->fetcher()->buildConnectionOptions([
            'scheme' => 'https',
            'host' => 'example.com',
            'port' => 443,
            'ips' => ['93.184.216.34'],
        ]);

        $this->assertSame(['example.com:443:93.184.216.34'], $options['curl'][CURLOPT_RESOLVE]);
    }

    public function test_connection_options_pin_to_verified_ipv6_address(): void
    {
        $options = $this->fetcher()->buildConnectionOptions([
            'scheme' => 'https',
            'host' => 'example.com',
            'port' => 443,
            'ips' => ['2606:4700:4700::1111'],
        ]);

        $this->assertSame(['example.com:443:2606:4700:4700::1111'], $options['curl'][CURLOPT_RESOLVE]);
    }

    public function test_connection_options_disable_client_side_redirects(): void
    {
        $options = $this->fetcher()->buildConnectionOptions([
            'scheme' => 'https',
            'host' => 'example.com',
            'port' => 443,
            'ips' => ['93.184.216.34'],
        ]);

        $this->assertFalse($options['allow_redirects']);
    }

    public function test_empty_ip_list_does_not_produce_connection_options(): void
    {
        $this->expectException(UrlSafetyException::class);

        $this->fetcher()->buildConnectionOptions([
            'scheme' => 'https',
            'host' => 'example.com',
            'port' => 443,
            'ips' => [],
        ]);
    }
}
