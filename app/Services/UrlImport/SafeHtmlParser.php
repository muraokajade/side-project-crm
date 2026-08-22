<?php

namespace App\Services\UrlImport;

use DOMDocument;

/**
 * malformed HTMLでも例外・警告を出さずに解析し、文字コードを考慮してUTF-8のDOMDocumentを返す。
 */
class SafeHtmlParser
{
    public static function parse(string $html): DOMDocument
    {
        $html = self::toUtf8($html);

        $dom = new DOMDocument();
        $previous = libxml_use_internal_errors(true);

        // DOMDocument(libxmlのHTMLパーサー)がUTF-8を誤検出することがあるため、
        // 明示的なUTF-8宣言を先頭に付けて読み込む(よく知られた回避策)。
        $dom->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_NOERROR | LIBXML_NOWARNING);

        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        return $dom;
    }

    private static function toUtf8(string $html): string
    {
        $charset = self::detectCharset($html);

        if ($charset === null || strtoupper($charset) === 'UTF-8') {
            return $html;
        }

        $normalized = strtoupper(str_replace('_', '-', $charset));

        if (! in_array($normalized, array_map(fn ($e) => strtoupper($e), mb_list_encodings()), true)) {
            return $html;
        }

        $converted = @mb_convert_encoding($html, 'UTF-8', $charset);

        return $converted !== false ? $converted : $html;
    }

    private static function detectCharset(string $html): ?string
    {
        if (preg_match('/<meta[^>]+charset\s*=\s*["\']?([a-zA-Z0-9_\-]+)/i', $html, $m) === 1) {
            return $m[1];
        }

        return null;
    }
}
