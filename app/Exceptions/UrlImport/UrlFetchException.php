<?php

namespace App\Exceptions\UrlImport;

use Exception;

/**
 * URL自体は安全と判定された後、実際の取得・応答処理で失敗した場合の例外。
 * errorCode()はAPIレスポンスの機械判定可能なエラーコードとして使う。
 */
class UrlFetchException extends Exception
{
    public function __construct(private readonly string $errorCode, string $message)
    {
        parent::__construct($message);
    }

    public function errorCode(): string
    {
        return $this->errorCode;
    }
}
