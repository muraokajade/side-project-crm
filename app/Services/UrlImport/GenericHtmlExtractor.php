<?php

namespace App\Services\UrlImport;

use DOMNode;
use DOMXPath;

/**
 * サイト固有パーサーを持たない全サイト共通の抽出処理(抽出優先順位2〜4)。
 *
 * 優先順位: JSON-LD(JobPosting) > OGP > title/meta description。
 * ただし「募集内容(description)」は案件固有本文のみを採用する方針のため、
 * JSON-LDのdescriptionフィールド(サイト固有パーサーがあればそちらが優先)のみを情報源とし、
 * OGP(og:description)やmeta[name=description]は採用しない
 * (サイト全体共通の宣伝文である可能性があるため。name/mediaはOGPを引き続き使う)。
 * <script>タグの本文をdescription等へ混入させない(JSON-LDはJSONとしてparseした
 * フィールド値のみを使い、OGPは<meta>のcontent属性のみを使う)。
 */
class GenericHtmlExtractor
{
    /**
     * @return array<string, mixed>
     */
    public function extract(DOMXPath $xpath): array
    {
        $jsonLd = $this->extractJsonLdJobPosting($xpath);
        $ogp = $this->extractOgp($xpath);
        $fallbackName = $this->extractFallbackName($xpath);

        return [
            'name' => $jsonLd['name'] ?? $ogp['name'] ?? $fallbackName,
            'description' => $this->sanitizeDescription($jsonLd['description'] ?? null),
            'client_name' => $jsonLd['client_name'] ?? null,
            'category' => $jsonLd['category'] ?? null,
            'job_type' => $jsonLd['job_type'] ?? null,
            'location' => $jsonLd['location'] ?? null,
            'employment_type' => $jsonLd['employment_type'] ?? null,
            'deadline' => $jsonLd['deadline'] ?? null,
            'reward' => $jsonLd['reward'] ?? null,
            'reward_text' => $jsonLd['reward_text'] ?? null,
            'media' => $ogp['site_name'] ?? null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function extractJsonLdJobPosting(DOMXPath $xpath): array
    {
        $nodes = $xpath->query('//script[@type="application/ld+json"]');

        if ($nodes === false) {
            return [];
        }

        foreach ($nodes as $node) {
            $decoded = json_decode($node->textContent, true);

            if (! is_array($decoded)) {
                continue;
            }

            $jobPosting = $this->findJobPosting($decoded);

            if ($jobPosting !== null) {
                return $this->mapJobPosting($jobPosting);
            }
        }

        return [];
    }

    /**
     * JSON-LDは単一オブジェクト・配列・@graphのいずれの形でも渡される可能性があるため、
     * 再帰的にJobPostingを探索する。
     *
     * @param array<mixed> $node
     * @return array<string, mixed>|null
     */
    private function findJobPosting(array $node): ?array
    {
        $type = $node['@type'] ?? null;
        $types = is_array($type) ? $type : [$type];

        if (in_array('JobPosting', $types, true)) {
            return $node;
        }

        if (isset($node['@graph']) && is_array($node['@graph'])) {
            foreach ($node['@graph'] as $item) {
                if (is_array($item)) {
                    $found = $this->findJobPosting($item);
                    if ($found !== null) {
                        return $found;
                    }
                }
            }
        }

        foreach ($node as $value) {
            if (is_array($value) && isset($value['@type'])) {
                $found = $this->findJobPosting($value);
                if ($found !== null) {
                    return $found;
                }
            }
        }

        return null;
    }

    /**
     * @param array<string, mixed> $job
     * @return array<string, mixed>
     */
    private function mapJobPosting(array $job): array
    {
        $result = [
            'name' => $this->toScalarString($job['title'] ?? null),
            'description' => $this->toScalarString($job['description'] ?? null),
        ];

        if (isset($job['hiringOrganization']) && is_array($job['hiringOrganization'])) {
            $result['client_name'] = $this->toScalarString($job['hiringOrganization']['name'] ?? null);
        }

        if (isset($job['occupationalCategory'])) {
            $result['job_type'] = $this->toScalarString($job['occupationalCategory']);
        }

        $location = $this->extractJobLocation($job['jobLocation'] ?? null);
        if ($location !== null) {
            $result['location'] = $location;
        }

        if (isset($job['employmentType'])) {
            $employmentType = $job['employmentType'];
            $result['employment_type'] = is_array($employmentType)
                ? implode('/', array_map('strval', $employmentType))
                : (string) $employmentType;
        }

        if (isset($job['validThrough'])) {
            $deadline = $this->toDateStringOrNull($job['validThrough']);
            if ($deadline !== null) {
                $result['deadline'] = $deadline;
            }
        }

        $salary = $this->extractBaseSalary($job['baseSalary'] ?? null);
        if ($salary !== null) {
            $result['reward'] = $salary['reward'];
            $result['reward_text'] = $salary['text'];
        }

        return $result;
    }

    private function extractJobLocation(mixed $jobLocation): ?string
    {
        if ($jobLocation === null) {
            return null;
        }

        if (is_string($jobLocation)) {
            return $jobLocation;
        }

        if (! is_array($jobLocation)) {
            return null;
        }

        // 複数勤務地の配列の場合、推測で結合せず先頭のみを採用する。
        if (isset($jobLocation[0]) && is_array($jobLocation[0])) {
            $jobLocation = $jobLocation[0];
        }

        $address = $jobLocation['address'] ?? $jobLocation;

        if (! is_array($address)) {
            return null;
        }

        $parts = array_filter([
            $address['addressRegion'] ?? null,
            $address['addressLocality'] ?? null,
        ], static fn ($v) => is_string($v) && $v !== '');

        if ($parts !== []) {
            return implode(' ', $parts);
        }

        return $this->toScalarString($address['addressCountry'] ?? null);
    }

    /**
     * @return array{reward: int|null, text: string|null}|null
     */
    private function extractBaseSalary(mixed $baseSalary): ?array
    {
        if ($baseSalary === null) {
            return null;
        }

        if (is_numeric($baseSalary)) {
            return $this->numericSalaryResult((int) $baseSalary, (string) $baseSalary, null, null);
        }

        if (! is_array($baseSalary)) {
            return null;
        }

        $currency = $this->toScalarString($baseSalary['currency'] ?? null);
        $value = $baseSalary['value'] ?? $baseSalary;

        if (is_numeric($value)) {
            return $this->numericSalaryResult((int) $value, (string) $value, $currency, null);
        }

        if (! is_array($value)) {
            return null;
        }

        $unit = $this->toScalarString($value['unitText'] ?? null);

        if (
            isset($value['value']) && is_numeric($value['value'])
            && ! isset($value['minValue']) && ! isset($value['maxValue'])
        ) {
            return $this->numericSalaryResult((int) $value['value'], (string) $value['value'], $currency, $unit);
        }

        $min = $value['minValue'] ?? null;
        $max = $value['maxValue'] ?? null;

        if ($min === null && $max === null) {
            return null;
        }

        $range = $min !== null && $max !== null ? "{$min}〜{$max}" : (string) ($min ?? $max);

        // レンジ表記など単一額として確定できない場合は推測して埋めず、ページの表記(構造化データの値)をそのまま残す。
        return [
            'reward' => null,
            'text' => $this->formatSalaryText($range, $currency, $unit),
        ];
    }

    /**
     * 期間あたりの単価を表すunitText。rewardは単位を持たない整数カラムのため、
     * これらの単位が付いた額を報酬額として保存すると実態とずれる。
     *
     * @var list<string>
     */
    private const PERIODIC_SALARY_UNITS = ['HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR'];

    /**
     * @return array{reward: int|null, text: string|null}
     */
    private function numericSalaryResult(int $amount, string $rawValue, ?string $currency, ?string $unit): array
    {
        if ($amount === 0) {
            // 0は「未設定」のプレースホルダである可能性が高く、実額としても文字列としても採用しない。
            return ['reward' => null, 'text' => null];
        }

        $text = $this->formatSalaryText($rawValue, $currency, $unit);

        // 時給・月額等の単価は、単位を持たないrewardへ入れず、単位付きのreward_textとしてのみ残す。
        if ($unit !== null && in_array(strtoupper($unit), self::PERIODIC_SALARY_UNITS, true)) {
            return ['reward' => null, 'text' => $text];
        }

        return ['reward' => $amount, 'text' => $text];
    }

    /**
     * 構造化データ由来の金額を、通貨・単位の情報を落とさずに表示用文字列へ組み立てる。
     */
    private function formatSalaryText(string $amount, ?string $currency, ?string $unit): string
    {
        $text = $currency !== null ? "{$amount} {$currency}" : $amount;

        return $unit !== null ? "{$text} ({$unit})" : $text;
    }

    private function toDateStringOrNull(mixed $value): ?string
    {
        if (! is_string($value) || $value === '') {
            return null;
        }

        $timestamp = strtotime($value);

        return $timestamp !== false ? date('Y-m-d', $timestamp) : null;
    }

    private function toScalarString(mixed $value): ?string
    {
        return is_string($value) && $value !== '' ? $value : null;
    }

    /**
     * @return array<string, string|null>
     */
    private function extractOgp(DOMXPath $xpath): array
    {
        // og:description は採用しない(サイト全体共通の宣伝文である可能性があるため。
        // name/site_nameは案件固有性のリスクが低いため引き続き使用する)。
        return [
            'name' => $this->metaContent($xpath, '//meta[@property="og:title"]'),
            'site_name' => $this->metaContent($xpath, '//meta[@property="og:site_name"]'),
        ];
    }

    /**
     * <title>要素のみを対象とする(meta descriptionはdescriptionの情報源として採用しない)。
     */
    private function extractFallbackName(DOMXPath $xpath): ?string
    {
        $titleNodes = $xpath->query('//title');

        if ($titleNodes === false || $titleNodes->length === 0) {
            return null;
        }

        $text = trim(preg_replace('/\s+/u', ' ', $titleNodes->item(0)->textContent));

        return $text !== '' ? $text : null;
    }

    private function metaContent(DOMXPath $xpath, string $query): ?string
    {
        $nodes = $xpath->query($query);

        if ($nodes === false || $nodes->length === 0) {
            return null;
        }

        /** @var DOMNode $node */
        $node = $nodes->item(0);
        $content = $node->attributes?->getNamedItem('content')?->nodeValue;

        return is_string($content) && $content !== '' ? $content : null;
    }

    /**
     * タグ除去・空白正規化のみを行う。長さの打ち切り(抜粋)はUrlImportPreviewServiceが
     * 全ての情報源(サイト固有DOM抽出を含む)に対して一箇所でまとめて行う。
     */
    private function sanitizeDescription(?string $description): ?string
    {
        if ($description === null) {
            return null;
        }

        $text = strip_tags($description);
        $text = preg_replace('/\s+/u', ' ', $text);
        $text = trim($text);

        return $text !== '' ? $text : null;
    }
}
