<?php

namespace App\Services\UrlImport;

use DOMNode;
use DOMXPath;

/**
 * 求人ページのHTMLから、報酬の「原文」を取り出す。
 *
 * 構造化データ(JSON-LD)に報酬が無いページでも、本文には「月給35万円〜75万円」のように
 * 明示されていることが多い。OGPだけに頼らず、次の順で探す。
 *   1. 見出し(h1-h6/dt/th/strong等)が給与系のとき、その直後の値
 *   2. 表・定義リストの「給与」「報酬」行の値
 *   3. 本文中の「月給◯◯円」等の明確な表記
 *   4. ページタイトル中の表記
 *
 * 見つけた値は数値へ変換せず、原文のまま返す(0円や推測値を作らない)。
 * ラベルと金額が揃っているものだけを採用し、広告文や曖昧な記述は拾わない。
 */
class RewardTextExtractor
{
    /** 給与を表す見出し・ラベル。これが無い数値は報酬とみなさない。 */
    private const LABELS = ['給与', '報酬', '想定年収', '予定年収', '年収', '月給', '月額', '年俸', '日給', '時給', '単価'];

    /** 金額の書き方。「35万円」「350,000円」「500万」に対応する。 */
    private const AMOUNT = '[0-9０-９][0-9０-９,，.．]*\s*(?:万円|万|円)';

    /**
     * 金額の後ろに続く範囲表記。
     * 「35万円〜75万円」に加え、上限を書かない「35万円〜」も求人では一般的なので拾う。
     * 上限なしは波ダッシュ系だけを許す(ハイフンは他の用途と紛れるため)。
     */
    private const RANGE_SUFFIX = '(?:\s*[〜～~\-–—]\s*' . self::AMOUNT . '|\s*[〜～~])?';

    /** 採用する原文の最大長。長すぎるものは説明文が混ざっているとみなす。 */
    private const MAX_LENGTH = 60;

    public function extract(DOMXPath $xpath, ?string $title = null): ?string
    {
        foreach ([
            fn () => $this->fromDefinitionRows($xpath),
            fn () => $this->fromHeadings($xpath),
            fn () => $this->fromBodyText($xpath),
            fn () => $this->fromTitle($title),
        ] as $strategy) {
            $found = $strategy();

            if ($found !== null) {
                return $found;
            }
        }

        return null;
    }

    /**
     * 表(th/td)・定義リスト(dt/dd)の「給与」行から値を取る。
     * 求人ページで最も確実に報酬が入っている場所。
     */
    private function fromDefinitionRows(DOMXPath $xpath): ?string
    {
        $labelNodes = $xpath->query('//th|//dt');

        if ($labelNodes === false) {
            return null;
        }

        foreach ($labelNodes as $labelNode) {
            if (! $this->isSalaryLabel($this->textOf($labelNode))) {
                continue;
            }

            $valueNode = $this->nextValueNode($labelNode);

            if ($valueNode === null) {
                continue;
            }

            $candidate = $this->pickAmountPhrase($this->textOf($valueNode));

            if ($candidate !== null) {
                return $candidate;
            }
        }

        return null;
    }

    /**
     * 見出し(h1-h6/strong/b)が給与系のとき、その直後の要素から値を取る。
     */
    private function fromHeadings(DOMXPath $xpath): ?string
    {
        $headings = $xpath->query('//h1|//h2|//h3|//h4|//h5|//h6|//strong|//b');

        if ($headings === false) {
            return null;
        }

        foreach ($headings as $heading) {
            if (! $this->isSalaryLabel($this->textOf($heading))) {
                continue;
            }

            $valueNode = $this->nextValueNode($heading);

            if ($valueNode === null) {
                continue;
            }

            $candidate = $this->pickAmountPhrase($this->textOf($valueNode));

            if ($candidate !== null) {
                return $candidate;
            }
        }

        return null;
    }

    /** 本文中の「月給35万円〜75万円」のような、ラベルと金額が続く表記を拾う。 */
    private function fromBodyText(DOMXPath $xpath): ?string
    {
        $bodyNodes = $xpath->query('//body');

        if ($bodyNodes === false || $bodyNodes->length === 0) {
            return null;
        }

        return $this->pickLabelledPhrase($this->textOf($bodyNodes->item(0)));
    }

    private function fromTitle(?string $title): ?string
    {
        return $title !== null ? $this->pickLabelledPhrase($title) : null;
    }

    /**
     * ラベル要素の「値側」にあたるノード(td/dd/次の兄弟)を返す。
     */
    private function nextValueNode(DOMNode $labelNode): ?DOMNode
    {
        $name = strtolower($labelNode->nodeName);

        // th -> 同じ行のtd、dt -> 直後のdd。それ以外は直後の要素。
        for ($sibling = $labelNode->nextSibling; $sibling !== null; $sibling = $sibling->nextSibling) {
            if ($sibling->nodeType !== XML_ELEMENT_NODE) {
                continue;
            }

            $siblingName = strtolower($sibling->nodeName);

            if ($name === 'th' && $siblingName !== 'td') {
                continue;
            }

            if ($name === 'dt' && $siblingName !== 'dd') {
                continue;
            }

            return $sibling;
        }

        return null;
    }

    /** ラベル文字列が給与を表すか(短いラベルだけを対象にし、文章は除く)。 */
    private function isSalaryLabel(string $text): bool
    {
        if ($text === '' || mb_strlen($text) > 12) {
            return false;
        }

        foreach (self::LABELS as $label) {
            if (str_contains($text, $label)) {
                return true;
            }
        }

        return false;
    }

    /**
     * 値側テキストから金額表現を取り出す。ラベルが無くても、金額(+範囲)があれば採用する。
     */
    private function pickAmountPhrase(string $text): ?string
    {
        if ($text === '') {
            return null;
        }

        // 先にラベル付きの表記を探す(「月給35万円〜75万円」等)。
        $labelled = $this->pickLabelledPhrase($text);

        if ($labelled !== null) {
            return $labelled;
        }

        $pattern = '/' . self::AMOUNT . self::RANGE_SUFFIX . '/u';

        if (preg_match($pattern, $text, $m) !== 1) {
            return null;
        }

        return $this->normalize($m[0]);
    }

    /** 「月給35万円〜75万円」のように、ラベルと金額が連続する表記だけを拾う。 */
    private function pickLabelledPhrase(string $text): ?string
    {
        if ($text === '') {
            return null;
        }

        $labels = implode('|', array_map(fn ($l) => preg_quote($l, '/'), self::LABELS));
        $pattern = '/(?:' . $labels . ')\s*[:：]?\s*' . self::AMOUNT . self::RANGE_SUFFIX . '/u';

        if (preg_match($pattern, $text, $m) !== 1) {
            return null;
        }

        return $this->normalize($m[0]);
    }

    /** 空白を詰め、長すぎるものは採用しない。 */
    private function normalize(string $text): ?string
    {
        $normalized = trim(preg_replace('/[\s\x{3000}]+/u', ' ', $text));

        if ($normalized === '' || mb_strlen($normalized) > self::MAX_LENGTH) {
            return null;
        }

        return $normalized;
    }

    private function textOf(DOMNode $node): string
    {
        return trim(preg_replace('/[\s\x{3000}]+/u', ' ', $node->textContent));
    }
}
