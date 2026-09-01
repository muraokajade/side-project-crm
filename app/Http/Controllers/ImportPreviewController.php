<?php

namespace App\Http\Controllers;

use App\Exceptions\UrlImport\UrlFetchException;
use App\Exceptions\UrlImport\UrlSafetyException;
use App\Http\Requests\ImportPreviewRequest;
use App\Services\UrlImport\ManualEntryUrlDetector;
use App\Services\UrlImport\UrlImportPreviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * URL(1件)を安全に取得し、projectsテーブルへ保存せず確認用データのみを返す。
 * 実際の安全性検証・取得・解析はApp\Services\UrlImportへ委譲する。
 *
 * 利用者のログインが必要なページ(応募履歴等)は原理的に取得できないため、
 * エラーとして突き放さず、URLを保持したまま手入力へ誘導する応答を返す。
 */
class ImportPreviewController extends Controller
{
    /**
     * 手入力誘導時に利用者へ見せる案内文。取得失敗の詳細は含めない。
     */
    private const MANUAL_ENTRY_MESSAGE =
        'このURLはログインが必要なページのため、求人情報を自動取得できません。'
        . 'URLを保持したまま、会社名・求人名・年収などを手入力して登録できます。';

    public function __construct(
        private readonly UrlImportPreviewService $service,
        private readonly ManualEntryUrlDetector $manualEntryDetector,
    ) {
    }

    public function __invoke(ImportPreviewRequest $request): JsonResponse
    {
        $url = $request->input('url');
        $type = $request->resolvedType();

        // 取得を試みる前に、URLの形だけで手入力誘導と分かる場合(応募履歴等)。
        if ($this->manualEntryDetector->requiresManualEntry($url)) {
            return $this->manualEntryResponse($url, $type);
        }

        try {
            $data = $this->service->preview($url, $type);
        } catch (UrlSafetyException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'error_code' => $e->errorCode(),
            ], 422);
        } catch (UrlFetchException $e) {
            // ログインが必要で取得できなかった場合は、失敗ではなく手入力誘導として扱う。
            if ($this->manualEntryDetector->isLoginRequiredErrorCode($e->errorCode())) {
                // 詳細は画面へ出さず、開発用ログにのみ残す。
                Log::info('URL取込: ログイン必須のため手入力へ誘導', [
                    'error_code' => $e->errorCode(),
                    'url' => $url,
                ]);

                return $this->manualEntryResponse($url, $type);
            }

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

    /**
     * 手入力へ誘導する応答。入力済みのURLと種別を返し、画面側が引き継げるようにする。
     */
    private function manualEntryResponse(string $url, string $type): JsonResponse
    {
        return response()->json([
            'message' => self::MANUAL_ENTRY_MESSAGE,
            'error_code' => 'requires_manual_entry',
            'requires_manual_entry' => true,
            'project_url' => $url,
            'type' => $type,
        ], 422);
    }
}
