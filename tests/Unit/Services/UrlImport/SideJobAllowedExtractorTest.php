<?php

namespace Tests\Unit\Services\UrlImport;

use App\Services\UrlImport\SafeHtmlParser;
use App\Services\UrlImport\SideJobAllowedExtractor;
use App\Support\SideJobAllowed;
use DOMXPath;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * 副業可否の抽出。明示記載だけを根拠にし、推測しないことを固定する。
 */
class SideJobAllowedExtractorTest extends TestCase
{
    private function extract(string $bodyHtml): string
    {
        $dom = SafeHtmlParser::parse('<html><body>' . $bodyHtml . '</body></html>');

        return (new SideJobAllowedExtractor())->extract(new DOMXPath($dom));
    }

    // ---- OK と判定する明示記載 ----------------------------------------

    /**
     * @return list<array{0: string}>
     */
    public static function okStatements(): array
    {
        return [
            ['<p>副業OK</p>'],
            ['<p>副業可</p>'],
            ['<p>副業可能</p>'],
            ['<p>副業は可能です</p>'],
            ['<p>副業ＯＫ</p>'],
            ['<p>副業・兼業可</p>'],
            ['<table><tr><th>副業可否</th><td>可</td></tr></table>'],
            ['<table><tr><th>副業</th><td>可能</td></tr></table>'],
            ['<dl><dt>副業可否</dt><dd>OK</dd></dl>'],
            ['<dl><dt>副業可否</dt><dd>：可</dd></dl>'],
        ];
    }

    #[DataProvider('okStatements')]
    public function test_explicit_positive_statement_is_read_as_ok(string $html): void
    {
        $this->assertSame(SideJobAllowed::OK, $this->extract($html));
    }

    // ---- NG と判定する明示記載 ----------------------------------------

    /**
     * @return list<array{0: string}>
     */
    public static function ngStatements(): array
    {
        return [
            ['<p>副業禁止</p>'],
            ['<p>副業不可</p>'],
            ['<p>副業NG</p>'],
            ['<p>副業は禁止</p>'],
            ['<p>副業ＮＧ</p>'],
            ['<table><tr><th>副業可否</th><td>不可</td></tr></table>'],
            ['<table><tr><th>副業</th><td>禁止</td></tr></table>'],
            ['<dl><dt>副業可否</dt><dd>：不可</dd></dl>'],
        ];
    }

    #[DataProvider('ngStatements')]
    public function test_explicit_negative_statement_is_read_as_ng(string $html): void
    {
        $this->assertSame(SideJobAllowed::NG, $this->extract($html));
    }

    // ---- unknown（推測しない） -----------------------------------------

    /**
     * @return list<array{0: string, 1: string}>
     */
    public static function unknownStatements(): array
    {
        return [
            '記載なし' => ['<p>年収500万円〜 フルリモート可</p>', '副業に触れていない'],
            '副業の語が無い「可」' => ['<p>リモート可</p>', '副業の語が無い'],
            'ラベルだけで回答が無い' => ['<table><tr><th>副業可否</th><td></td></tr></table>', '回答が空'],
            '本文のラベルだけ' => ['<p>副業可否</p>', '回答が無い'],
            '曖昧な回答' => ['<table><tr><th>副業可否</th><td>要相談</td></tr></table>', '判断できない'],
            '面談時に相談' => ['<p>副業可否については面談時にご相談ください</p>', '判断できない'],
            '離れた位置の可' => ['<p>副業については当社規定に従います。転勤は可。</p>', '隣接していない'],
            'OKとNGが混在' => ['<p>副業可</p><p>副業禁止</p>', '判断できない'],
            '空のページ' => ['', '本文が無い'],
        ];
    }

    #[DataProvider('unknownStatements')]
    public function test_ambiguous_or_absent_statement_is_unknown(string $html, string $reason): void
    {
        $this->assertSame(SideJobAllowed::UNKNOWN, $this->extract($html), $reason);
    }

    // ---- 推測しないことの明示的な固定 ----------------------------------

    public function test_job_content_is_never_used_to_guess(): void
    {
        // 「業務委託」「フリーランス」等は副業可否の明示ではない。
        $html = '<p>業務委託 フリーランス歓迎 週2日から 在宅OK</p>';

        $this->assertSame(SideJobAllowed::UNKNOWN, $this->extract($html));
    }

    public function test_navigation_and_footer_links_are_ignored(): void
    {
        // サイドバー等の「副業OKの求人を探す」はこの求人の条件ではない。
        $html = '<nav><a>副業OKの求人を探す</a></nav>'
            . '<main><p>年収600万円〜</p></main>'
            . '<footer><a>副業可の求人一覧</a></footer>';

        $this->assertSame(SideJobAllowed::UNKNOWN, $this->extract($html));
    }

    public function test_labelled_row_takes_precedence_over_body_noise(): void
    {
        $html = '<table><tr><th>副業可否</th><td>不可</td></tr></table>'
            . '<p>当社の別部署では副業可の制度があります</p>';

        $this->assertSame(SideJobAllowed::NG, $this->extract($html));
    }

    public function test_kahi_label_alone_is_not_read_as_ok(): void
    {
        // 「可否」の「可」を可と読んでしまわないこと。
        $this->assertSame(SideJobAllowed::UNKNOWN, $this->extract('<p>副業可否について</p>'));
    }
}
