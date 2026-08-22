<?php

namespace Tests\Unit\Services\UrlImport;

use App\Services\UrlImport\GenericHtmlExtractor;
use App\Services\UrlImport\SafeHtmlParser;
use DOMXPath;
use PHPUnit\Framework\TestCase;

class GenericHtmlExtractorTest extends TestCase
{
    private function extract(string $html): array
    {
        $dom = SafeHtmlParser::parse($html);

        return (new GenericHtmlExtractor())->extract(new DOMXPath($dom));
    }

    public function test_extracts_ogp_when_no_json_ld_present(): void
    {
        $html = <<<'HTML'
            <html><head>
                <meta property="og:title" content="OGPタイトル">
                <meta property="og:description" content="OGPの説明文です。">
                <meta property="og:site_name" content="サンプルサイト">
            </head><body></body></html>
            HTML;

        $result = $this->extract($html);

        $this->assertSame('OGPタイトル', $result['name']);
        $this->assertSame('OGPの説明文です。', $result['description']);
        $this->assertSame('サンプルサイト', $result['media']);
    }

    public function test_falls_back_to_title_and_meta_description(): void
    {
        $html = <<<'HTML'
            <html><head>
                <title>ページタイトル</title>
                <meta name="description" content="metaディスクリプションです。">
            </head><body></body></html>
            HTML;

        $result = $this->extract($html);

        $this->assertSame('ページタイトル', $result['name']);
        $this->assertSame('metaディスクリプションです。', $result['description']);
    }

    public function test_json_ld_job_posting_takes_priority_over_ogp(): void
    {
        $html = <<<'HTML'
            <html><head>
                <script type="application/ld+json">
                {
                    "@context": "https://schema.org",
                    "@type": "JobPosting",
                    "title": "JSON-LDのタイトル",
                    "description": "JSON-LDの説明文です。",
                    "hiringOrganization": {"@type": "Organization", "name": "サンプル株式会社"},
                    "jobLocation": {"address": {"addressRegion": "東京都", "addressLocality": "渋谷区"}},
                    "employmentType": "CONTRACTOR",
                    "validThrough": "2026-09-01"
                }
                </script>
                <meta property="og:title" content="OGPタイトル(使われないはず)">
            </head><body></body></html>
            HTML;

        $result = $this->extract($html);

        $this->assertSame('JSON-LDのタイトル', $result['name']);
        $this->assertSame('JSON-LDの説明文です。', $result['description']);
        $this->assertSame('サンプル株式会社', $result['client_name']);
        $this->assertSame('東京都 渋谷区', $result['location']);
        $this->assertSame('CONTRACTOR', $result['employment_type']);
        $this->assertSame('2026-09-01', $result['deadline']);
    }

    public function test_json_ld_as_top_level_array_is_supported(): void
    {
        $html = <<<'HTML'
            <html><head>
                <script type="application/ld+json">
                [
                    {"@type": "BreadcrumbList"},
                    {"@type": "JobPosting", "title": "配列内のJobPosting", "description": "説明"}
                ]
                </script>
            </head><body></body></html>
            HTML;

        $result = $this->extract($html);

        $this->assertSame('配列内のJobPosting', $result['name']);
    }

    public function test_json_ld_graph_wrapper_is_supported(): void
    {
        $html = <<<'HTML'
            <html><head>
                <script type="application/ld+json">
                {
                    "@context": "https://schema.org",
                    "@graph": [
                        {"@type": "WebPage"},
                        {"@type": "JobPosting", "title": "@graph内のJobPosting", "description": "説明"}
                    ]
                }
                </script>
            </head><body></body></html>
            HTML;

        $result = $this->extract($html);

        $this->assertSame('@graph内のJobPosting', $result['name']);
    }

    public function test_invalid_json_ld_does_not_throw_and_falls_back(): void
    {
        $html = <<<'HTML'
            <html><head>
                <script type="application/ld+json">{not valid json,,,</script>
                <meta property="og:title" content="OGPタイトル">
            </head><body></body></html>
            HTML;

        $result = $this->extract($html);

        $this->assertSame('OGPタイトル', $result['name']);
    }

    public function test_salary_range_is_not_guessed_into_reward(): void
    {
        $html = <<<'HTML'
            <html><head>
                <script type="application/ld+json">
                {
                    "@type": "JobPosting",
                    "title": "案件",
                    "baseSalary": {"@type": "MonetaryAmount", "currency": "JPY",
                        "value": {"@type": "QuantitativeValue", "minValue": 50000, "maxValue": 100000, "unitText": "MONTH"}}
                }
                </script>
            </head><body></body></html>
            HTML;

        $result = $this->extract($html);

        $this->assertNull($result['reward']);
        $this->assertNotNull($result['reward_note']);
        $this->assertStringContainsString('50000', $result['reward_note']);
        $this->assertStringContainsString('100000', $result['reward_note']);
    }

    public function test_single_salary_value_is_extracted_as_reward(): void
    {
        $html = <<<'HTML'
            <html><head>
                <script type="application/ld+json">
                {"@type": "JobPosting", "title": "案件", "baseSalary": {"value": {"value": 300000}}}
                </script>
            </head><body></body></html>
            HTML;

        $result = $this->extract($html);

        $this->assertSame(300000, $result['reward']);
        $this->assertNull($result['reward_note']);
    }

    public function test_malformed_html_does_not_throw(): void
    {
        $html = '<html><head><title>壊れたHTML<body><div><p>閉じタグ不足';

        $result = $this->extract($html);

        $this->assertSame('壊れたHTML', $result['name']);
    }

    public function test_script_body_is_never_used_as_description(): void
    {
        $html = <<<'HTML'
            <html><head>
                <script>document.write('<meta name="description" content="スクリプトから注入");');</script>
                <meta name="description" content="正しいmeta description">
            </head><body></body></html>
            HTML;

        $result = $this->extract($html);

        $this->assertSame('正しいmeta description', $result['description']);
        $this->assertStringNotContainsString('document.write', $result['description'] ?? '');
    }

    public function test_description_html_tags_are_stripped_and_length_capped(): void
    {
        $longText = str_repeat('あ', 2500);
        $html = '<html><head><meta property="og:description" content="' . htmlspecialchars('<b>' . $longText . '</b>', ENT_QUOTES) . '"></head><body></body></html>';

        $result = $this->extract($html);

        $this->assertStringNotContainsString('<b>', $result['description']);
        $this->assertLessThanOrEqual(2001, mb_strlen($result['description']));
    }
}
