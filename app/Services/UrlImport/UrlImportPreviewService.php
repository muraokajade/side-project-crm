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
    /**
     * 「募集内容(抜粋)」の最大文字数。AIによる要約は行わず、案件固有本文の
     * 先頭からの機械的な文字数打ち切りのみを行う。
     */
    private const DESCRIPTION_EXCERPT_LENGTH = 160;

    public function __construct(
        private readonly SafeHtmlFetcher $fetcher,
        private readonly GenericHtmlExtractor $genericExtractor,
        private readonly CrowdWorksExtractor $crowdWorksExtractor,
        private readonly MediaResolver $mediaResolver,
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

        // 求人ページの装飾(罫線・■等)や抽出ノイズを落としてから、抜粋・保存する。
        $name = TextNormalizer::normalize($merged['name'] ?? null);
        $description = $this->excerptDescription(
            TextNormalizer::normalize($merged['description'] ?? null)
        );

        if ($description === null) {
            $warnings[] = '募集内容を取得できませんでした。確認して入力してください。';
        }

        if ($name === null) {
            $warnings[] = 'ページからタイトルを取得できなかったため、手入力が必要です。';
        }

        // 媒体プルダウンで選択済みになるよう、既知ホストは選択肢内の値へ寄せる。
        $media = $this->mediaResolver->resolve($host, $merged['media'] ?? $host);

        return [
            'project_url' => $url,
            'type' => $type,
            'name' => $name,
            'description' => $description,
            'client_name' => $merged['client_name'] ?? null,
            'media' => $media,
            'category' => $merged['category'] ?? null,
            'reward' => $merged['reward'] ?? null,
            'reward_text' => $merged['reward_text'] ?? null,
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
     * 案件固有本文(JSON-LD description、またはサイト固有DOM抽出)から得られた
     * descriptionを、要約せず先頭から機械的に指定文字数で打ち切る。
     */
    private function excerptDescription(?string $text): ?string
    {
        if ($text === null || $text === '') {
            return null;
        }

        if (mb_strlen($text) <= self::DESCRIPTION_EXCERPT_LENGTH) {
            return $text;
        }

        return mb_substr($text, 0, self::DESCRIPTION_EXCERPT_LENGTH) . '…';
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
