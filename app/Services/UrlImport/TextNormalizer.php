<?php

namespace App\Services\UrlImport;

/**
 * 取り込んだ案件名・募集内容から、求人ページの「見た目のための装飾」と抽出ノイズを取り除く。
 *
 * 例: type.jpの募集内容は「----------------■仕事内容----------------」のように
 * 罫線と記号で見出しを作っている。これをそのまま保存すると一覧・詳細が読みにくい。
 *
 * 本文(URL・金額・会社名・求人条件・日付など)は削らないことを最優先にする。
 * そのため記号の「連続」だけを装飾とみなし、単独の記号は残す
 * (例: 2026-09-01 の -、?page=2 の =、ミドルウェア・サービス の ・ は残る)。
 * 記号は削除ではなく空白へ置き換え、前後の語が連結しないようにする。
 */
class TextNormalizer
{
    /**
     * 3個以上連続したときだけ装飾とみなす記号。
     * 単独では日付・URL・範囲表記などに使われるため除去しない。
     */
    private const RULE_CHARS = '=\-＝─━_＿*＊~〜～‾・･';

    /**
     * 単独でも装飾にしか使われない見出し記号。前後の本文は残して記号だけ空白にする。
     * 「※」は注記として意味を持つため対象にしない。
     */
    private const DECORATION_CHARS = '■□◆◇▼▲△▽●○◎★☆♦♢◼◻▪▫';

    /**
     * 抽出の末尾に残る終端マーカー。単独トークンとして末尾にある場合のみ落とす
     * (本文中の "END" や "BACKEND" のような語は残す)。
     */
    private const TRAILING_NOISE_PATTERN = '/(?:\s|\A)(?:END|ここまで|以上)\s*\z/u';

    public static function normalize(?string $text): ?string
    {
        if ($text === null) {
            return null;
        }

        // 3個以上続く罫線・記号は装飾とみなし、空白へ置き換える(語の連結を防ぐ)。
        $text = preg_replace('/[' . self::RULE_CHARS . ']{3,}/u', ' ', $text);

        // 見出し記号(■等)も削除ではなく空白へ置き換える。
        $text = preg_replace('/[' . self::DECORATION_CHARS . ']+/u', ' ', $text);

        // 全角スペース・改行・タブを含む空白の連続を1つへまとめる。
        $text = preg_replace('/[\s\x{3000}]+/u', ' ', $text);
        $text = trim($text);

        // 末尾の終端マーカーを落とす(装飾除去で独立トークンになった後に判定する)。
        $text = preg_replace(self::TRAILING_NOISE_PATTERN, '', $text);
        $text = trim($text);

        return $text !== '' ? $text : null;
    }
}
