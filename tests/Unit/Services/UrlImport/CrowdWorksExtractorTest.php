<?php

namespace Tests\Unit\Services\UrlImport;

use App\Services\UrlImport\CrowdWorksExtractor;
use App\Services\UrlImport\SafeHtmlParser;
use DOMXPath;
use PHPUnit\Framework\TestCase;

class CrowdWorksExtractorTest extends TestCase
{
    /**
     * 抽出根拠(CrowdWorksExtractor::class docblock参照)に基づく想定fixture。
     * job-detailコンテナ外に、意図的に異なる案件名・報酬を持つ「関連案件」ブロックを置き、
     * それらが本案件として混入しないことをテストする。
     */
    private const FIXTURE_HTML = <<<'HTML'
        <html>
        <head><title>案件詳細 | CrowdWorks</title></head>
        <body>
            <main>
                <article class="job-detail" data-job-id="123">
                    <h1 class="job-detail__title">ECサイトのフロントエンド改修</h1>
                    <div class="job-detail__reward">固定報酬制 80,000円</div>
                    <div class="job-detail__category">Web開発</div>
                    <div class="job-detail__applicants">応募した人 12人</div>
                    <div class="job-detail__recruits">募集人数 1人</div>
                    <div class="job-detail__working-hours">週10時間程度</div>
                    <div class="job-detail__body">React/TypeScriptでの改修作業を担当していただきます。</div>
                </article>
                <aside class="related-jobs">
                    <div class="job-card">
                        <h2 class="job-card__title">(関連案件)全く別のライティング案件</h2>
                        <div class="job-card__reward">固定報酬制 999,999円</div>
                    </div>
                </aside>
            </main>
        </body>
        </html>
        HTML;

    private function extractor(): CrowdWorksExtractor
    {
        return new CrowdWorksExtractor();
    }

    private function xpathFor(string $html): DOMXPath
    {
        return new DOMXPath(SafeHtmlParser::parse($html));
    }

    public function test_supports_public_job_detail_path(): void
    {
        $extractor = $this->extractor();

        $this->assertTrue($extractor->supports('crowdworks.jp', '/public/jobs/123'));
        $this->assertTrue($extractor->supports('www.crowdworks.jp', '/public/jobs/123/'));
    }

    public function test_does_not_support_non_job_detail_paths(): void
    {
        $extractor = $this->extractor();

        $this->assertFalse($extractor->supports('crowdworks.jp', '/public/jobs/'));
        $this->assertFalse($extractor->supports('crowdworks.jp', '/categories/web'));
        $this->assertFalse($extractor->supports('crowdworks.jp', '/users/12345'));
    }

    public function test_does_not_support_lookalike_host(): void
    {
        $extractor = $this->extractor();

        // "crowdworks.jp"を含むが異なるホストへ誤って一致させない(ドメイン詐称対策)。
        $this->assertFalse($extractor->supports('crowdworks.jp.evil.example.com', '/public/jobs/1'));
        $this->assertFalse($extractor->supports('evil-crowdworks.jp', '/public/jobs/1'));
    }

    public function test_extracts_fields_from_job_detail_container(): void
    {
        $xpath = $this->xpathFor(self::FIXTURE_HTML);

        $result = $this->extractor()->extract($xpath);

        $this->assertSame('ECサイトのフロントエンド改修', $result['fields']['name']);
        $this->assertSame('Web開発', $result['fields']['category']);
        $this->assertSame('週10時間程度', $result['fields']['working_hours']);
        $this->assertSame(80000, $result['fields']['reward']);
        $this->assertSame('固定報酬制 80,000円', $result['fields']['reward_text']);
        $this->assertSame(12, $result['fields']['applicant_count']);
        $this->assertSame(1, $result['fields']['recruitment_count']);
        $this->assertStringContainsString('React/TypeScript', $result['fields']['description']);
        $this->assertSame([], $result['warnings']);
    }

    public function test_related_jobs_are_not_mixed_into_the_main_job(): void
    {
        $xpath = $this->xpathFor(self::FIXTURE_HTML);

        $result = $this->extractor()->extract($xpath);

        $this->assertStringNotContainsString('関連案件', $result['fields']['name']);
        $this->assertNotSame(999999, $result['fields']['reward']);
        $this->assertSame(80000, $result['fields']['reward']);
    }

    public function test_reward_range_is_not_guessed(): void
    {
        $html = str_replace(
            '固定報酬制 80,000円',
            '固定報酬制 50,000円〜100,000円',
            self::FIXTURE_HTML
        );

        $result = $this->extractor()->extract($this->xpathFor($html));

        $this->assertArrayNotHasKey('reward', $result['fields']);
        $this->assertArrayHasKey('reward_text', $result['fields']);
        $this->assertStringContainsString('50,000円〜100,000円', $result['fields']['reward_text']);
    }

    public function test_zero_yen_reward_is_not_treated_as_valid(): void
    {
        // 「0円」は「未設定」のプレースホルダである可能性が高く、実額・reward_textのどちらとしても採用しない。
        $html = str_replace('固定報酬制 80,000円', '0円', self::FIXTURE_HTML);

        $result = $this->extractor()->extract($this->xpathFor($html));

        $this->assertArrayNotHasKey('reward', $result['fields']);
        $this->assertArrayNotHasKey('reward_text', $result['fields']);
    }

    public function test_negotiable_reward_text_is_preserved_as_is(): void
    {
        // 「応相談」はページ上の表記のまま reward_text として保存し、rewardは設定しない。
        $html = str_replace('固定報酬制 80,000円', '応相談', self::FIXTURE_HTML);

        $result = $this->extractor()->extract($this->xpathFor($html));

        $this->assertArrayNotHasKey('reward', $result['fields']);
        $this->assertSame('応相談', $result['fields']['reward_text']);
    }

    public function test_negotiable_reward_with_an_amount_does_not_set_numeric_reward(): void
    {
        // 「応相談」に金額が併記されていても、確定額ではないためrewardへは入れず原文のみ残す。
        $html = str_replace('固定報酬制 80,000円', '応相談（経験により 300,000円）', self::FIXTURE_HTML);

        $result = $this->extractor()->extract($this->xpathFor($html));

        $this->assertArrayNotHasKey('reward', $result['fields']);
        $this->assertSame('応相談（経験により 300,000円）', $result['fields']['reward_text']);
    }

    public function test_unit_priced_reward_is_not_stored_as_a_lump_sum_reward(): void
    {
        // 「時給2,000円」は一括報酬2,000円ではないため、単位を持たないrewardへは入れない。
        $html = str_replace('固定報酬制 80,000円', '時給 2,000円', self::FIXTURE_HTML);

        $result = $this->extractor()->extract($this->xpathFor($html));

        $this->assertArrayNotHasKey('reward', $result['fields']);
        $this->assertSame('時給 2,000円', $result['fields']['reward_text']);
    }

    public function test_monthly_reward_is_not_stored_as_a_lump_sum_reward(): void
    {
        $html = str_replace('固定報酬制 80,000円', '月額 500,000円', self::FIXTURE_HTML);

        $result = $this->extractor()->extract($this->xpathFor($html));

        $this->assertArrayNotHasKey('reward', $result['fields']);
        $this->assertSame('月額 500,000円', $result['fields']['reward_text']);
    }

    public function test_undisclosed_reward_is_preserved_as_text_without_becoming_zero(): void
    {
        foreach (['未掲載', '要相談', '非公開'] as $label) {
            $html = str_replace('固定報酬制 80,000円', $label, self::FIXTURE_HTML);

            $result = $this->extractor()->extract($this->xpathFor($html));

            $this->assertArrayNotHasKey('reward', $result['fields'], "{$label}でrewardが設定された");
            $this->assertSame($label, $result['fields']['reward_text']);
        }
    }

    public function test_missing_detail_container_returns_no_fields_with_warning(): void
    {
        $html = '<html><body><p>構造が変わったページ</p></body></html>';

        $result = $this->extractor()->extract($this->xpathFor($html));

        $this->assertSame([], $result['fields']);
        $this->assertNotEmpty($result['warnings']);
    }

    public function test_missing_title_element_warns_but_returns_other_fields(): void
    {
        $html = <<<'HTML'
            <html><body>
                <article class="job-detail">
                    <div class="job-detail__category">Web開発</div>
                </article>
            </body></html>
            HTML;

        $result = $this->extractor()->extract($this->xpathFor($html));

        $this->assertArrayNotHasKey('name', $result['fields']);
        $this->assertSame('Web開発', $result['fields']['category']);
        $this->assertNotEmpty($result['warnings']);
    }
}
