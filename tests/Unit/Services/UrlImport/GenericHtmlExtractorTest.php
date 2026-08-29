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

    public function test_extracts_name_and_media_from_ogp_but_not_description(): void
    {
        // og:descriptionはサイト全体共通の宣伝文である可能性があるため、
        // 「募集内容」の情報源としては採用しない(name/site_nameは引き続き使用する)。
        $html = <<<'HTML'
            <html><head>
                <meta property="og:title" content="OGPタイトル">
                <meta property="og:description" content="OGPの説明文です(採用されないはず)。">
                <meta property="og:site_name" content="サンプルサイト">
            </head><body></body></html>
            HTML;

        $result = $this->extract($html);

        $this->assertSame('OGPタイトル', $result['name']);
        $this->assertNull($result['description']);
        $this->assertSame('サンプルサイト', $result['media']);
    }

    public function test_falls_back_to_title_for_name_only(): void
    {
        // meta[name=description]もdescriptionの情報源として採用しない(titleはnameのみに使う)。
        $html = <<<'HTML'
            <html><head>
                <title>ページタイトル</title>
                <meta name="description" content="metaディスクリプションです(採用されないはず)。">
            </head><body></body></html>
            HTML;

        $result = $this->extract($html);

        $this->assertSame('ページタイトル', $result['name']);
        $this->assertNull($result['description']);
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
        $this->assertNotNull($result['reward_text']);
        $this->assertStringContainsString('50000', $result['reward_text']);
        $this->assertStringContainsString('100000', $result['reward_text']);
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
        $this->assertSame('300000', $result['reward_text']);
    }

    public function test_hourly_salary_is_not_stored_as_reward_but_kept_with_its_unit(): void
    {
        // unitTextがHOUR等の期間単位の場合、その額は一括の報酬額ではないためrewardへ入れない。
        $html = <<<'HTML'
            <html><head>
                <script type="application/ld+json">
                {
                    "@type": "JobPosting",
                    "title": "案件",
                    "baseSalary": {"@type": "MonetaryAmount", "currency": "JPY",
                        "value": {"@type": "QuantitativeValue", "value": 2000, "unitText": "HOUR"}}
                }
                </script>
            </head><body></body></html>
            HTML;

        $result = $this->extract($html);

        $this->assertNull($result['reward']);
        $this->assertStringContainsString('2000', $result['reward_text']);
        $this->assertStringContainsString('HOUR', $result['reward_text']);
    }

    public function test_single_salary_reward_text_keeps_currency_and_unit_information(): void
    {
        // rewardへ採用する場合でも、reward_textからは通貨・単位の情報を落とさない。
        $html = <<<'HTML'
            <html><head>
                <script type="application/ld+json">
                {
                    "@type": "JobPosting",
                    "title": "案件",
                    "baseSalary": {"@type": "MonetaryAmount", "currency": "JPY",
                        "value": {"@type": "QuantitativeValue", "value": 300000}}
                }
                </script>
            </head><body></body></html>
            HTML;

        $result = $this->extract($html);

        $this->assertSame(300000, $result['reward']);
        $this->assertSame('300000 JPY', $result['reward_text']);
    }

    public function test_zero_base_salary_is_not_treated_as_reward(): void
    {
        // baseSalaryが単純な数値0の場合(「未設定」のプレースホルダである可能性が高い)。
        $html = <<<'HTML'
            <html><head>
                <script type="application/ld+json">
                {"@type": "JobPosting", "title": "案件", "baseSalary": 0}
                </script>
            </head><body></body></html>
            HTML;

        $result = $this->extract($html);

        $this->assertNull($result['reward']);
        $this->assertNull($result['reward_text']);
    }

    public function test_zero_nested_salary_value_is_not_treated_as_reward(): void
    {
        $html = <<<'HTML'
            <html><head>
                <script type="application/ld+json">
                {"@type": "JobPosting", "title": "案件", "baseSalary": {"value": {"value": 0}}}
                </script>
            </head><body></body></html>
            HTML;

        $result = $this->extract($html);

        $this->assertNull($result['reward']);
        $this->assertNull($result['reward_text']);
    }

    public function test_malformed_html_does_not_throw(): void
    {
        $html = '<html><head><title>壊れたHTML<body><div><p>閉じタグ不足';

        $result = $this->extract($html);

        $this->assertSame('壊れたHTML', $result['name']);
    }

    public function test_description_is_null_when_only_meta_or_script_exist_without_json_ld(): void
    {
        // JSON-LDが無い場合、meta descriptionやscriptの内容がdescriptionへ混入しないこと
        // (descriptionの情報源はJSON-LD description/サイト固有DOM抽出のみ)。
        $html = <<<'HTML'
            <html><head>
                <script>document.write('<meta name="description" content="スクリプトから注入");');</script>
                <meta name="description" content="meta descriptionは採用されないはず">
            </head><body></body></html>
            HTML;

        $result = $this->extract($html);

        $this->assertNull($result['description']);
    }

    public function test_json_ld_description_strips_embedded_html_tags_without_truncating(): void
    {
        // JSON-LDのdescriptionにHTMLタグが埋め込まれていても、タグ自体は除去される。
        // 長さの打ち切り(抜粋)はこの層では行わない(UrlImportPreviewServiceの責務)。
        $longText = str_repeat('あ', 300);
        $descriptionJson = json_encode('<b>' . $longText . '</b>');
        $html = <<<HTML
            <html><head>
                <script type="application/ld+json">
                {"@type": "JobPosting", "title": "案件", "description": {$descriptionJson}}
                </script>
            </head><body></body></html>
            HTML;

        $result = $this->extract($html);

        $this->assertStringNotContainsString('<b>', $result['description']);
        $this->assertStringNotContainsString('</b>', $result['description']);
        // 打ち切られず、300文字分の本文がそのまま残っていること。
        $this->assertSame(300, mb_strlen($result['description']));
    }
}
