<?php

namespace App\Http\Controllers;

use App\Exceptions\UrlImport\UrlFetchException;
use App\Exceptions\UrlImport\UrlSafetyException;
use App\Http\Requests\ImportPreviewRequest;
use App\Services\UrlImport\UrlImportPreviewService;
use Illuminate\Http\JsonResponse;
use Throwable;

/**
 * URL(1件)を安全に取得し、projectsテーブルへ保存せず確認用データのみを返す。
 * 実際の安全性検証・取得・解析はApp\Services\UrlImportへ委譲する。
 */
class ImportPreviewController extends Controller
{
    public function __construct(private readonly UrlImportPreviewService $service)
    {
    }

    public function __invoke(ImportPreviewRequest $request): JsonResponse
    {
        $url = $request->input('url');
        $type = $request->resolvedType();

        try {
            $data = $this->service->preview($url, $type);
        } catch (UrlSafetyException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'error_code' => $e->errorCode(),
            ], 422);
        } catch (UrlFetchException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'error_code' => $e->errorCode(),
            ], 502);
        } catch (Throwable) {
            // 内部の詳細(スタックトレース・内部IP等)を利用者へ露出しない。
            return response()->json([
                'message' => '予期しないエラーが発生しました。',
                'error_code' => 'internal_error',
            ], 500);
        }

        return response()->json(['data' => $data]);
    }
}
