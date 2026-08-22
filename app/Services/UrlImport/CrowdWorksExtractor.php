<?php

namespace App\Services\UrlImport;

use DOMNode;
use DOMXPath;

/**
 * CrowdWorksの公開案件詳細ページ(https://crowdworks.jp/public/jobs/{id})専用の抽出処理(抽出優先順位1)。
 *
 * 注意(抽出根拠): 本タスクでは実際の外部サイトへ通信できないため、CrowdWorksの本番ページの
 * 現在のHTML構造を直接確認したうえで実装したものではない。一般的な案件詳細ページによくみられる
 * 構造――見出し・報酬・カテゴリ・応募状況・稼働時間・本文を単一の「案件詳細コンテナ」内に配置し、
 * 関連案件・おすすめ案件は別セクション(コンテナ外)に置く――を想定し、それに基づくクラス名の
 * XPathで固定のfixture HTMLに対して抽出できることをテストで固定している。
 * 実際の構造がこの想定と一致しない場合は、想定した要素が見つからないため何も抽出できず、
 * 呼び出し側(UrlImportPreviewService)が共通のJSON-LD/OGP抽出結果へフォールグレードする。
 */
class CrowdWorksExtractor
{
    /**
     * @var list<string>
     */
    private const ALLOWED_HOSTS = ['crowdworks.jp', 'www.crowdworks.jp'];

    private const JOB_DETAIL_PATH_PATTERN = '#^/public/jobs/\d+/?$#';

    public function isCrowdWorksHost(string $host): bool
    {
        return in_array($host, self::ALLOWED_HOSTS, true);
    }

    public function supports(string $host, string $path): bool
    {
        return $this->isCrowdWorksHost($host)
            && preg_match(self::JOB_DETAIL_PATH_PATTERN, $path) === 1;
    }

    /**
     * @return array{fields: array<string, mixed>, warnings: list<string>}
     */
    public function extract(DOMXPath $xpath): array
    {
        $root = $this->findDetailRoot($xpath);

        if ($root === null) {
            return [
                'fields' => [],
                'warnings' => [
                    'CrowdWorks固有の案件詳細コンテナを検出できなかったため、共通のOGP/JSON-LD情報のみを使用しました。',
                ],
            ];
        }

        $fields = [
            'name' => $this->firstText($xpath, './/*[contains(concat(" ", normalize-space(@class), " "), " job-detail__title ")]', $root),
            'description' => $this->firstText($xpath, './/*[contains(concat(" ", normalize-space(@class), " "), " job-detail__body ")]', $root),
            'category' => $this->firstText($xpath, './/*[contains(concat(" ", normalize-space(@class), " "), " job-detail__category ")]', $root),
            'working_hours' => $this->firstText($xpath, './/*[contains(concat(" ", normalize-space(@class), " "), " job-detail__working-hours ")]', $root),
        ];

        [$fields['reward'], $fields['reward_note']] = $this->parseReward(
            $this->firstText($xpath, './/*[contains(concat(" ", normalize-space(@class), " "), " job-detail__reward ")]', $root)
        );

        $fields['applicant_count'] = $this->extractFirstInteger(
            $this->firstText($xpath, './/*[contains(concat(" ", normalize-space(@class), " "), " job-detail__applicants ")]', $root)
        );

        $fields['recruitment_count'] = $this->extractFirstInteger(
            $this->firstText($xpath, './/*[contains(concat(" ", normalize-space(@class), " "), " job-detail__recruits ")]', $root)
        );

        $fields = array_filter($fields, static fn ($value) => $value !== null);

        $warnings = [];
        if (! isset($fields['name'])) {
            $warnings[] = 'CrowdWorks固有のタイトル要素を検出できなかったため、共通のOGP/JSON-LD情報のタイトルを使用します。';
        }

        return ['fields' => $fields, 'warnings' => $warnings];
    }

    private function findDetailRoot(DOMXPath $xpath): ?DOMNode
    {
        $nodes = $xpath->query('//*[contains(concat(" ", normalize-space(@class), " "), " job-detail ")]');

        if ($nodes === false || $nodes->length === 0) {
            return null;
        }

        return $nodes->item(0);
    }

    private function firstText(DOMXPath $xpath, string $query, DOMNode $context): ?string
    {
        $nodes = $xpath->query($query, $context);

        if ($nodes === false || $nodes->length === 0) {
            return null;
        }

        $text = trim(preg_replace('/\s+/u', ' ', $nodes->item(0)->textContent));

        return $text !== '' ? $text : null;
    }

    private function extractFirstInteger(?string $text): ?int
    {
        if ($text === null) {
            return null;
        }

        return preg_match('/(\d+)/u', $text, $m) === 1 ? (int) $m[1] : null;
    }

    /**
     * @return array{0: int|null, 1: string|null}
     */
    private function parseReward(?string $text): array
    {
        if ($text === null) {
            return [null, null];
        }

        // レンジ表記(〜・-・から等)を含む場合は単一額として確定できないため推測しない。
        if (preg_match('/[〜～\-−]|から/u', $text) === 1) {
            return [null, "報酬情報(参考): {$text}"];
        }

        if (preg_match('/([\d,]+)\s*円/u', $text, $m) === 1) {
            return [(int) str_replace(',', '', $m[1]), null];
        }

        return [null, "報酬情報(参考): {$text}"];
    }
}
