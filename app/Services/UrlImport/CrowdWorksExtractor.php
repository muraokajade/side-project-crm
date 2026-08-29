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

    /**
     * 金額が確定していないことを示す表記。併記された数値(「応相談(経験により300,000円)」等)を
     * 報酬額として確定してしまわないよう、rewardには入れずreward_textのみ残す。
     */
    private const UNDETERMINED_REWARD_PATTERN = '/応相談|要相談|ご相談|相談の上|未掲載|未定|非公開|記載なし/u';

    /**
     * 期間・工数あたりの単価であることを示す表記。rewardは単位を持たない整数カラムのため、
     * 「時給2,000円」を2,000という報酬額として保存すると実態とずれる。原文のみ残す。
     */
    private const UNIT_PRICED_REWARD_PATTERN = '/時給|日給|週給|月給|月額|年収|年俸|人月|単価/u';

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

        [$fields['reward'], $fields['reward_text']] = $this->parseReward(
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
     * ページ上の報酬表記(固定報酬・時給・月額・応相談等)を、原文の体裁を保ったまま
     * reward_textとして返す。数値として一意に確定できる場合のみrewardも設定する。
     * 「0円」等、数値としての0は「未設定」のプレースホルダである可能性が高いため、
     * 実額としてもreward_textとしても採用しない。
     *
     * @return array{0: int|null, 1: string|null}
     */
    private function parseReward(?string $text): array
    {
        if ($text === null) {
            return [null, null];
        }

        // 「応相談」「未掲載」等は金額が確定していないため、0円にも推測額にも変換せず原文のみ残す。
        if (preg_match(self::UNDETERMINED_REWARD_PATTERN, $text) === 1) {
            return [null, $text];
        }

        // 「時給」「月額」等の単価表記は、単位を持たないrewardへ入れると意味がずれるため原文のみ残す。
        if (preg_match(self::UNIT_PRICED_REWARD_PATTERN, $text) === 1) {
            return [null, $text];
        }

        // レンジ表記(〜・-・から等)を含む場合は単一額として確定できないため、
        // 原文をそのままreward_textとして残す(推測で単一額へ変換しない)。
        if (preg_match('/[〜～\-−]|から/u', $text) === 1) {
            return [null, $text];
        }

        if (preg_match('/([\d,]+)\s*円/u', $text, $m) === 1) {
            $amount = (int) str_replace(',', '', $m[1]);

            if ($amount === 0) {
                return [null, null];
            }

            return [$amount, $text];
        }

        // 数値を含まない場合(「応相談」等)は、原文をそのままreward_textとして残す。
        return [null, $text];
    }
}
