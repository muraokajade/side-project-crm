<?php

namespace App\Services\UrlImport;

use DOMXPath;
use Throwable;

/**
 * URL安全性検証 → HTTP取得 → HTML解析(サイト固有→JSON-LD→OGP→一般HTML)を束ね、
 * projectsテーブルには保存せず、確認用のプレビューデータを組み立てる。
 */
class UrlImportPreviewService
{
    public function __construct(
        private readonly SafeHtmlFetcher $fetcher,
        private readonly GenericHtmlExtractor $genericExtractor,
        private readonly CrowdWorksExtractor $crowdWorksExtractor,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function preview(string $url, string $type): array
    {
        $fetched = $this->fetcher->fetch($url);

        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        $path = (string) (parse_url($url, PHP_URL_PATH) ?? '/');

        [$merged, $warnings] = $this->extractFields($fetched['html'], $host, $path);

        $name = $merged['name'] ?? null;
        $description = $merged['description'] ?? null;

        if (! empty($merged['reward_note'])) {
            $description = trim(($description !== null ? $description . "\n\n" : '') . $merged['reward_note']);
            $warnings[] = '報酬をレンジ表記等のため自動入力できませんでした。概要をご確認のうえ入力してください。';
        }

        if ($name === null) {
            $warnings[] = 'ページからタイトルを取得できなかったため、手入力が必要です。';
        }

        $media = $this->crowdWorksExtractor->supports($host, $path)
            ? 'CrowdWorks'
            : ($merged['media'] ?? $host);

        return [
            'project_url' => $url,
            'type' => $type,
            'name' => $name,
            'description' => $description,
            'client_name' => $merged['client_name'] ?? null,
            'media' => $media,
            'category' => $merged['category'] ?? null,
            'reward' => $merged['reward'] ?? null,
            'working_hours' => $merged['working_hours'] ?? null,
            'applicant_count' => $merged['applicant_count'] ?? null,
            'recruitment_count' => $merged['recruitment_count'] ?? null,
            'deadline' => $merged['deadline'] ?? null,
            'job_type' => $merged['job_type'] ?? null,
            'location' => $merged['location'] ?? null,
            'remote_type' => $merged['remote_type'] ?? null,
            'employment_type' => $merged['employment_type'] ?? null,
            'contract_type' => $merged['contract_type'] ?? null,
            'delivery_date' => $merged['delivery_date'] ?? null,
            'fetched_at' => now()->toIso8601String(),
            'fetch_status' => $name !== null ? 'success' : 'partial',
            'warnings' => $warnings,
        ];
    }

    /**
     * @return array{0: array<string, mixed>, 1: list<string>}
     */
    private function extractFields(string $html, string $host, string $path): array
    {
        $warnings = [];

        try {
            $dom = SafeHtmlParser::parse($html);
            $xpath = new DOMXPath($dom);

            $generic = $this->genericExtractor->extract($xpath);

            $siteSpecificFields = [];

            if ($this->crowdWorksExtractor->supports($host, $path)) {
                $siteSpecific = $this->crowdWorksExtractor->extract($xpath);
                $siteSpecificFields = $siteSpecific['fields'];
                $warnings = array_merge($warnings, $siteSpecific['warnings']);
            } elseif ($this->crowdWorksExtractor->isCrowdWorksHost($host)) {
                $warnings[] = 'CrowdWorksの公開案件詳細ページの形式(/public/jobs/{id})と一致しないため、共通のOGP/JSON-LD情報のみを使用しました。';
            }

            $merged = $this->mergeFields($siteSpecificFields, $generic);
        } catch (Throwable) {
            // 解析中に想定外の例外が起きても、取得自体は成功しているためpartialとして返す(500にしない)。
            $merged = [];
            $warnings[] = 'ページの解析中に問題が発生したため、取得できた情報のみを返しています。';
        }

        return [$merged, $warnings];
    }

    /**
     * $primary(サイト固有抽出結果)の非null値を優先し、$secondary(汎用抽出結果)で補う。
     *
     * @param array<string, mixed> $primary
     * @param array<string, mixed> $secondary
     * @return array<string, mixed>
     */
    private function mergeFields(array $primary, array $secondary): array
    {
        $merged = $secondary;

        foreach ($primary as $key => $value) {
            if ($value !== null) {
                $merged[$key] = $value;
            }
        }

        return $merged;
    }
}
