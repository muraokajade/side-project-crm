<?php

namespace App\Exceptions\UrlImport;

use Exception;

/**
 * URLがSSRF対策上の理由で拒否された場合の例外。
 * errorCode()はAPIレスポンスの機械判定可能なエラーコードとして使う。
 */
class UrlSafetyException extends Exception
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
