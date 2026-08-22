<?php

namespace Tests\Unit\Services\UrlImport;

use App\Exceptions\UrlImport\UrlSafetyException;
use App\Services\UrlImport\UrlSafetyValidator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\FakeHostResolver;

class UrlSafetyValidatorTest extends TestCase
{
    private function validator(array $dnsMap = []): UrlSafetyValidator
    {
        return new UrlSafetyValidator(new FakeHostResolver($dnsMap));
    }

    public function test_valid_public_https_url_passes(): void
    {
        $validator = $this->validator(['example.com' => ['8.8.8.8']]);

        $result = $validator->assertSafe('https://example.com/public/jobs/1');

        $this->assertSame('https', $result['scheme']);
        $this->assertSame('example.com', $result['host']);
        $this->assertSame(['8.8.8.8'], $result['ips']);
    }

    public function test_http_scheme_is_allowed(): void
    {
        $validator = $this->validator(['example.com' => ['8.8.8.8']]);

        $result = $validator->assertSafe('http://example.com/');

        $this->assertSame('http', $result['scheme']);
    }

    #[DataProvider('unsupportedSchemeUrls')]
    public function test_unsupported_scheme_is_rejected(string $url): void
    {
        $validator = $this->validator();

        try {
            $validator->assertSafe($url);
            $this->fail('UrlSafetyExceptionが発生しませんでした。');
        } catch (UrlSafetyException $e) {
            $this->assertSame('unsupported_scheme', $e->errorCode());
        }
    }

    public static function unsupportedSchemeUrls(): array
    {
        return [
            'file scheme' => ['file:///etc/passwd'],
            'ftp scheme' => ['ftp://example.com/file'],
        ];
    }

    public function test_credentials_in_url_are_rejected(): void
    {
        $validator = $this->validator(['example.com' => ['8.8.8.8']]);

        $this->expectSafetyRejection($validator, 'https://user:pass@example.com/', 'credentials_in_url');
    }

    public function test_localhost_hostname_is_rejected(): void
    {
        $validator = $this->validator();

        $this->expectSafetyRejection($validator, 'http://localhost/', 'blocked_host');
    }

    public function test_dot_local_hostname_is_rejected(): void
    {
        $validator = $this->validator();

        $this->expectSafetyRejection($validator, 'http://myhost.local/', 'blocked_host');
    }

    public function test_ipv4_loopback_literal_is_rejected(): void
    {
        $validator = $this->validator();

        $this->expectSafetyRejection($validator, 'http://127.0.0.1/', 'blocked_host');
    }

    public function test_ipv6_loopback_literal_is_rejected(): void
    {
        $validator = $this->validator();

        $this->expectSafetyRejection($validator, 'http://[::1]/', 'blocked_host');
    }

    #[DataProvider('blockedIpv4Literals')]
    public function test_private_link_local_and_reserved_ipv4_literals_are_rejected(string $ip): void
    {
        $validator = $this->validator();

        $this->expectSafetyRejection($validator, "http://{$ip}/", 'blocked_host');
    }

    public static function blockedIpv4Literals(): array
    {
        return [
            'private 10/8' => ['10.1.2.3'],
            'private 172.16/12' => ['172.16.5.5'],
            'private 192.168/16' => ['192.168.1.1'],
            'link-local' => ['169.254.1.1'],
            'cgnat' => ['100.64.1.1'],
            'test-net-1' => ['192.0.2.1'],
            'test-net-2' => ['198.51.100.1'],
            'test-net-3' => ['203.0.113.1'],
            'benchmark' => ['198.18.0.1'],
            'multicast' => ['224.0.0.1'],
            'reserved' => ['240.0.0.1'],
            'this-network' => ['0.0.0.1'],
        ];
    }

    #[DataProvider('blockedIpv6Literals')]
    public function test_private_link_local_and_reserved_ipv6_literals_are_rejected(string $ip): void
    {
        $validator = $this->validator();

        $this->expectSafetyRejection($validator, "http://[{$ip}]/", 'blocked_host');
    }

    public static function blockedIpv6Literals(): array
    {
        return [
            'unique local' => ['fc00::1'],
            'link-local' => ['fe80::1'],
            'multicast' => ['ff02::1'],
            'ipv4-mapped loopback' => ['::ffff:127.0.0.1'],
            'ipv4-mapped private' => ['::ffff:10.0.0.1'],
        ];
    }

    public function test_invalid_port_is_rejected(): void
    {
        $validator = $this->validator(['example.com' => ['8.8.8.8']]);

        $this->expectSafetyRejection($validator, 'http://example.com:8080/', 'invalid_port');
    }

    public function test_explicit_default_port_is_allowed(): void
    {
        $validator = $this->validator(['example.com' => ['8.8.8.8']]);

        $result = $validator->assertSafe('https://example.com:443/');

        $this->assertSame(443, $result['port']);
    }

    public function test_unresolvable_hostname_is_rejected(): void
    {
        $validator = $this->validator([]); // 解決結果なし

        $this->expectSafetyRejection($validator, 'https://does-not-resolve.example/', 'dns_resolution_failed');
    }

    public function test_hostname_resolving_to_private_ip_is_rejected(): void
    {
        $validator = $this->validator(['internal.example.com' => ['10.0.0.5']]);

        $this->expectSafetyRejection($validator, 'https://internal.example.com/', 'blocked_host');
    }

    public function test_hostname_resolving_to_mixed_public_and_private_ip_is_rejected(): void
    {
        // 1件でも非公開IPを含む場合は全体を拒否する。
        $validator = $this->validator(['mixed.example.com' => ['8.8.8.8', '127.0.0.1']]);

        $this->expectSafetyRejection($validator, 'https://mixed.example.com/', 'blocked_host');
    }

    public function test_invalid_url_is_rejected(): void
    {
        $validator = $this->validator();

        $this->expectSafetyRejection($validator, 'not a url', 'invalid_url');
    }

    public function test_trailing_dot_fqdn_localhost_is_rejected_like_localhost(): void
    {
        $validator = $this->validator();

        // "localhost."(末尾ドット付きFQDN表記)で拒否リストのテキスト一致を回避できないことを確認する。
        $this->expectSafetyRejection($validator, 'http://localhost./', 'blocked_host');
    }

    public function test_trailing_dot_fqdn_dot_local_suffix_is_rejected(): void
    {
        $validator = $this->validator();

        $this->expectSafetyRejection($validator, 'http://myhost.local./', 'blocked_host');
    }

    public function test_punycode_internationalized_domain_name_is_resolved_normally(): void
    {
        // 実際のHTTPクライアント/ブラウザは国際化ドメイン名(IDN)をpunycode(ASCII)化して
        // 送信するため、"xn--wgv71a119e.example"("日本語.example"のpunycode表現)が
        // 通常のASCIIホスト名と同様にDNS解決・検証されることを確認する。
        $validator = $this->validator(['xn--wgv71a119e.example' => ['8.8.8.8']]);

        $result = $validator->assertSafe('https://xn--wgv71a119e.example/');

        $this->assertSame(['8.8.8.8'], $result['ips']);
    }

    public function test_raw_unicode_hostname_fails_closed(): void
    {
        // parse_url()はASCII(punycode)以外のホスト名を正しく分解できないため、
        // 生のUnicode文字を含むホスト名は(idn_to_asciiでの正規化を試みたうえで)
        // 解決不能として安全側に拒否される(素通りしてチェックをバイパスすることはない)。
        $validator = $this->validator(['xn--wgv71a119e.example' => ['8.8.8.8']]);

        $this->expectSafetyRejection($validator, 'https://日本語.example/', 'dns_resolution_failed');
    }

    private function expectSafetyRejection(UrlSafetyValidator $validator, string $url, string $expectedCode): void
    {
        try {
            $validator->assertSafe($url);
            $this->fail("UrlSafetyException({$expectedCode})が発生しませんでした。");
        } catch (UrlSafetyException $e) {
            $this->assertSame($expectedCode, $e->errorCode());
        }
    }
}
