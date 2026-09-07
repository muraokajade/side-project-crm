<?php

namespace Tests\Unit\Services\UrlImport;

use App\Services\UrlImport\RewardTextExtractor;
use App\Services\UrlImport\SafeHtmlParser;
use DOMXPath;
use PHPUnit\Framework\TestCase;

/**
 * 求人ページ本文からの報酬抽出。
 * 数値へは変換せず原文を返し、0円や推測値を作らないことを重視して検証する。
 */
class RewardTextExtractorTest extends TestCase
{
    private function extract(string $html, ?string $title = null): ?string
    {
        $xpath = new DOMXPath(SafeHtmlParser::parse($html));

        return (new RewardTextExtractor())->extract($xpath, $title);
    }

    // ---- 表・定義リストから ------------------------------------------------

    public function test_extracts_from_table_row(): void
    {
        $html = '<html><body><table><tr><th>給与</th><td>月給35万円〜75万円</td></tr></table></body></html>';

        $this->assertSame('月給35万円〜75万円', $this->extract($html));
    }

    public function test_extracts_from_definition_list(): void
    {
        $html = '<html><body><dl><dt>報酬</dt><dd>月給 350,000円 ～ 500,000円</dd></dl></body></html>';

        $this->assertSame('月給 350,000円 ～ 500,000円', $this->extract($html));
    }

    public function test_extracts_expected_annual_salary_row(): void
    {
        $html = '<html><body><table><tr><th>想定年収</th><td>年収500万円〜1,000万円</td></tr></table></body></html>';

        $this->assertSame('年収500万円〜1,000万円', $this->extract($html));
    }

    public function test_value_without_label_in_the_cell_is_still_used(): void
    {
        // ラベルは見出し側にあり、値側は金額だけのことがある。
        $html = '<html><body><table><tr><th>給与</th><td>350,000円〜500,000円</td></tr></table></body></html>';

        $this->assertSame('350,000円〜500,000円', $this->extract($html));
    }

    // ---- 見出し・本文・タイトルから ----------------------------------------

    public function test_extracts_from_heading_followed_by_value(): void
    {
        $html = '<html><body><h2>給与</h2><p>年収500万円〜700万円</p></body></html>';

        $this->assertSame('年収500万円〜700万円', $this->extract($html));
    }

    public function test_extracts_from_body_text(): void
    {
        $html = '<html><body><p>当社では月給35万円〜75万円でエンジニアを募集しています。</p></body></html>';

        $this->assertSame('月給35万円〜75万円', $this->extract($html));
    }

    public function test_extracts_from_page_title(): void
    {
        $html = '<html><body><p>詳細は下記をご覧ください。</p></body></html>';

        $this->assertSame('月給35万円〜', $this->extract($html, '【Webエンジニア】月給35万円〜 リモート可'));
    }

    public function test_table_takes_priority_over_body_text(): void
    {
        // 表に明示がある場合は、本文の別の金額より表を優先する。
        $html = '<html><body>'
            . '<table><tr><th>給与</th><td>月給40万円</td></tr></table>'
            . '<p>参考: 月給20万円の求人もあります。</p>'
            . '</body></html>';

        $this->assertSame('月給40万円', $this->extract($html));
    }

    // ---- 誤検出しないこと --------------------------------------------------

    public function test_returns_null_when_no_salary_is_present(): void
    {
        $html = '<html><body><p>リモート可。年間休日145日。従業員数120名。</p></body></html>';

        $this->assertNull($this->extract($html));
    }

    public function test_negotiable_text_without_amount_is_not_invented(): void
    {
        // 「応相談」だけの場合、金額を作らない。
        $html = '<html><body><table><tr><th>給与</th><td>応相談</td></tr></table></body></html>';

        $this->assertNull($this->extract($html));
    }

    public function test_unrelated_numbers_are_not_picked_up(): void
    {
        // 金額でない数値(休日数・従業員数)を報酬にしない。
        $html = '<html><body><table><tr><th>休日</th><td>年間休日145日</td></tr></table></body></html>';

        $this->assertNull($this->extract($html));
    }

    public function test_long_sentences_are_not_adopted(): void
    {
        // 説明文が混ざった長い文字列は採用しない。
        $long = '給与 ' . str_repeat('たっぷりの説明文が続きます。', 10) . '35万円';
        $html = '<html><body><p>' . $long . '</p></body></html>';

        $result = $this->extract($html);

        $this->assertTrue($result === null || mb_strlen($result) <= 60);
    }

    public function test_hourly_wage_is_returned_as_is(): void
    {
        // 時給も原文のまま返す(月給・年収へ換算しない)。
        $html = '<html><body><table><tr><th>給与</th><td>時給2,000円〜</td></tr></table></body></html>';

        $this->assertSame('時給2,000円〜', $this->extract($html));
    }

    public function test_never_returns_zero_yen(): void
    {
        $html = '<html><body><p>初期費用0円で始められます。</p></body></html>';

        $result = $this->extract($html);

        // ラベルが無い「0円」は報酬として拾わない。
        $this->assertNull($result);
    }
}
