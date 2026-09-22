<?php

namespace App\Services\UrlImport;

use App\Support\SideJobAllowed;
use DOMNode;
use DOMXPath;

/**
 * 求人ページのHTMLから「副業可否」の明示記載だけを読み取る。
 *
 * 判定の原則:
 *  - 「副業」という語と、その直後の可否表現が揃っているときだけ判定する。
 *  - 求人内容から「たぶん副業できそう」と推測しない。
 *  - 案件の種別(career/side_job)は一切参照しない。
 *  - 記載なし・曖昧・OKとNGが混在して判断できない場合はすべて unknown。
 *
 * 探す順:
 *  1. 表・定義リストの「副業」を含むラベル行の値(求人ページで最も確実)
 *  2. 本文テキスト中の明示記載(サイドバー等のノイズを避けるためnav/header/footer/asideは除外)
 */
class SideJobAllowedExtractor
{
    /** 「副業」およびその直後に続きうる語(「副業・兼業可」等の表記ゆれのみ許す)。 */
    private const SUBJECT = '副業(?:[・\/]兼業)?';

    /** 不可を表す語。「不可」は「可」を含むため、可より先に判定する。 */
    private const NEGATIVE = '(?:不可|禁止|NG|×)';

    /**
     * 可を表す語。「可否」というラベルだけの箇所を可と誤判定しないよう、
     * 直後に「否」が続く場合は除外する。
     */
    private const POSITIVE = '(?:可能|可|OK|○|〇)(?!否)';

    public function extract(DOMXPath $xpath): string
    {
        $verdicts = $this->fromLabelledRows($xpath);

        if ($verdicts === []) {
            $verdicts = $this->fromMainText($xpath);
        }

        // OKとNGが同時に見つかった場合は「判断できない」としてunknownにする。
        return count($verdicts) === 1 ? (string) array_key_first($verdicts) : SideJobAllowed::UNKNOWN;
    }

    /**
     * 表(th/td)・定義リスト(dt/dd)で「副業」を含むラベル行を探し、
     * ラベルと値をつなげた文字列から可否を読む。
     * (「副業可否」+「可」、ラベル「副業」+値「不可」のどちらの書き方にも対応する)
     *
     * @return array<string, true>
     */
    private function fromLabelledRows(DOMXPath $xpath): array
    {
        $verdicts = [];
        $labels = $xpath->query('//th|//dt');

        if ($labels === false) {
            return $verdicts;
        }

        foreach ($labels as $label) {
            $labelText = $this->textOf($label);

            if (preg_match('/副業/u', $labelText) !== 1) {
                continue;
            }

            $value = $this->nextValueNode($label);
            $verdict = $this->verdictFromAnswer($labelText . ' ' . ($value !== null ? $this->textOf($value) : ''));

            if ($verdict !== null) {
                $verdicts[$verdict] = true;
            }
        }

        return $verdicts;
    }

    /**
     * 本文テキストから明示記載を探す。
     * ナビゲーション・ヘッダー・フッター・サイドバーは、この求人の条件ではなく
     * 「副業OKの求人を探す」のような導線である可能性が高いため除外する。
     *
     * @return array<string, true>
     */
    private function fromMainText(DOMXPath $xpath): array
    {
        $nodes = $xpath->query(
            '//body//text()[not(ancestor::nav) and not(ancestor::header) and not(ancestor::footer)'
            . ' and not(ancestor::aside) and not(ancestor::script) and not(ancestor::style)]'
        );

        if ($nodes === false) {
            return [];
        }

        $parts = [];

        foreach ($nodes as $node) {
            $parts[] = $node->textContent;
        }

        $text = $this->normalize(implode(' ', $parts));
        $verdicts = [];

        if (preg_match('/' . self::SUBJECT . '(?:は|も)?\s*' . self::NEGATIVE . '/ui', $text) === 1) {
            $verdicts[SideJobAllowed::NG] = true;
        }

        if (preg_match('/' . self::SUBJECT . '(?:は|も)?\s*' . self::POSITIVE . '/ui', $text) === 1) {
            $verdicts[SideJobAllowed::OK] = true;
        }

        return $verdicts;
    }

    /**
     * ラベル行の値から可否を読む。判断できない値(「要相談」等)はnullを返す。
     */
    private function verdictFromAnswer(string $text): ?string
    {
        $normalized = $this->normalize($text);

        if (preg_match('/' . self::NEGATIVE . '/ui', $normalized) === 1) {
            return SideJobAllowed::NG;
        }

        if (preg_match('/' . self::POSITIVE . '/ui', $normalized) === 1) {
            return SideJobAllowed::OK;
        }

        return null;
    }

    /**
     * ラベル要素の値側(th -> 同じ行のtd、dt -> 直後のdd)を返す。
     */
    private function nextValueNode(DOMNode $label): ?DOMNode
    {
        for ($sibling = $label->nextSibling; $sibling !== null; $sibling = $sibling->nextSibling) {
            if ($sibling->nodeType === XML_ELEMENT_NODE) {
                return $sibling;
            }
        }

        return null;
    }

    /**
     * 全角英数字・記号を半角へ寄せ、空白をまとめる。
     * 「副業ＯＫ」「副業可否：可」のような全角表記も同じ規則で判定できるようにする。
     */
    private function normalize(string $text): string
    {
        $converted = mb_convert_kana($text, 'as');

        return trim((string) preg_replace('/\s+/u', ' ', $converted));
    }

    private function textOf(DOMNode $node): string
    {
        return $this->normalize($node->textContent);
    }
}
