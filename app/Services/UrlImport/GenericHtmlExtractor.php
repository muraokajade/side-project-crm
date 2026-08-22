<?php

namespace App\Services\UrlImport;

use DOMNode;
use DOMXPath;

/**
 * サイト固有パーサーを持たない全サイト共通の抽出処理(抽出優先順位2〜4)。
 *
 * 優先順位: JSON-LD(JobPosting) > OGP > title/meta description。
 * <script>タグの本文をdescription等へ混入させない(JSON-LDはJSONとしてparseした
 * フィールド値のみを使い、OGP/meta descriptionは<meta>のcontent属性のみを使う)。
 */
class GenericHtmlExtractor
{
    private const MAX_DESCRIPTION_LENGTH = 2000;

    /**
     * @return array<string, mixed>
     */
    public function extract(DOMXPath $xpath): array
    {
        $jsonLd = $this->extractJsonLdJobPosting($xpath);
        $ogp = $this->extractOgp($xpath);
        $fallback = $this->extractFallback($xpath);

        return [
            'name' => $jsonLd['name'] ?? $ogp['name'] ?? $fallback['name'] ?? null,
            'description' => $this->sanitizeDescription(
                $jsonLd['description'] ?? $ogp['description'] ?? $fallback['description'] ?? null
            ),
            'client_name' => $jsonLd['client_name'] ?? null,
            'category' => $jsonLd['category'] ?? null,
            'job_type' => $jsonLd['job_type'] ?? null,
            'location' => $jsonLd['location'] ?? null,
            'employment_type' => $jsonLd['employment_type'] ?? null,
            'deadline' => $jsonLd['deadline'] ?? null,
            'reward' => $jsonLd['reward'] ?? null,
            'reward_note' => $jsonLd['reward_note'] ?? null,
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
            $result['reward_note'] = $salary['note'];
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
     * @return array{reward: int|null, note: string|null}|null
     */
    private function extractBaseSalary(mixed $baseSalary): ?array
    {
        if ($baseSalary === null) {
            return null;
        }

        if (is_numeric($baseSalary)) {
            return ['reward' => (int) $baseSalary, 'note' => null];
        }

        if (! is_array($baseSalary)) {
            return null;
        }

        $value = $baseSalary['value'] ?? $baseSalary;

        if (is_numeric($value)) {
            return ['reward' => (int) $value, 'note' => null];
        }

        if (! is_array($value)) {
            return null;
        }

        if (
            isset($value['value']) && is_numeric($value['value'])
            && ! isset($value['minValue']) && ! isset($value['maxValue'])
        ) {
            return ['reward' => (int) $value['value'], 'note' => null];
        }

        $min = $value['minValue'] ?? null;
        $max = $value['maxValue'] ?? null;

        if ($min === null && $max === null) {
            return null;
        }

        $unit = $value['unitText'] ?? null;
        $range = $min !== null && $max !== null ? "{$min}〜{$max}" : (string) ($min ?? $max);

        // レンジ表記など単一額として確定できない場合は推測して埋めず、参考情報として残す。
        return [
            'reward' => null,
            'note' => "報酬情報(参考): {$range}" . ($unit !== null ? " ({$unit})" : ''),
        ];
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
        return [
            'name' => $this->metaContent($xpath, '//meta[@property="og:title"]'),
            'description' => $this->metaContent($xpath, '//meta[@property="og:description"]'),
            'site_name' => $this->metaContent($xpath, '//meta[@property="og:site_name"]'),
        ];
    }

    /**
     * @return array<string, string|null>
     */
    private function extractFallback(DOMXPath $xpath): array
    {
        $titleNodes = $xpath->query('//title');
        $title = null;

        if ($titleNodes !== false && $titleNodes->length > 0) {
            $text = trim(preg_replace('/\s+/u', ' ', $titleNodes->item(0)->textContent));
            $title = $text !== '' ? $text : null;
        }

        return [
            'name' => $title,
            'description' => $this->metaContent($xpath, '//meta[@name="description"]'),
        ];
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

    private function sanitizeDescription(?string $description): ?string
    {
        if ($description === null) {
            return null;
        }

        $text = strip_tags($description);
        $text = preg_replace('/\s+/u', ' ', $text);
        $text = trim($text);

        if ($text === '') {
            return null;
        }

        if (mb_strlen($text) > self::MAX_DESCRIPTION_LENGTH) {
            $text = mb_substr($text, 0, self::MAX_DESCRIPTION_LENGTH) . '…';
        }

        return $text;
    }
}
