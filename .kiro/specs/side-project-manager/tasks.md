# Implementation Plan: Side Project Manager

## Overview

副業案件管理Webアプリケーション（Phase 1）の実装計画。Laravel 11 + React 19 + TypeScript + Tailwind CSS構成で、フリーランス案件のCRUD管理を実現する。ワークスペースは空の状態から開始し、Laravel scaffold → バックエンドAPI → フロントエンドUIの順で段階的に構築する。

**実装制約:**

- Repository / Service / DTO レイヤーは追加しない
- React Routerは追加しない
- fast-check等の新規テストライブラリは追加しない
- JobHunt Lite関連ファイルは変更しない
- 要件にない機能は追加しない
- Controller + FormRequest + Resource + Model パターンのみ使用
- window.confirm()で削除確認
- サマリーはフロントエンドでフェッチ済みデータから計算（追加API不要）
- 最小コンポーネント分割: App.tsx + ProjectModal.tsx

## Tasks

- [x] 1. Backend setup (Laravel scaffold + DB)
    - [x] 1.1 Create Laravel 11 project
        - `composer create-project laravel/laravel .` でプロジェクト作成
        - `.env` の `DB_CONNECTION=sqlite` に設定、`DB_DATABASE` をデフォルトの `database/database.sqlite` に設定
        - `touch database/database.sqlite` でSQLiteファイル作成
        - `php artisan migrate` で初期マイグレーション実行
        - _Requirements: 12.1_

    - [x] 1.2 Create Project model and migration
        - `php artisan make:model Project -m` でModel + Migration作成
        - マイグレーションに全カラム定義: name(string,NOT NULL), project_url(string,nullable), client_name(string,nullable), media(string,nullable), category(string,nullable), applied_date(date,nullable), status(string,NOT NULL,default '未応募'), reward(integer,nullable), working_hours(string,nullable), applicant_count(integer,nullable), recruitment_count(integer,nullable), application_text(text,nullable), next_action(string,nullable), next_action_date(date,nullable), memo(text,nullable), priority(string,nullable), is_favorite(boolean,default false), timestamps
        - Project Modelに `$fillable` 配列を設定
        - `$casts` で `applied_date` → `date`、`next_action_date` → `date`、`is_favorite` → `boolean`、`reward` → `integer` 等を設定
        - `php artisan migrate` でテーブル作成確認
        - _Requirements: 12.1_

- [x] 2. Backend API implementation
    - [x] 2.1 Create StoreProjectRequest
        - `php artisan make:request StoreProjectRequest`
        - `authorize()` は `true` を返す（Phase 1は認証なし）
        - `rules()`: name → required|string|max:255, status → required|string|in:未応募,応募済み,返信待ち,面談予定,選考中,契約済み,作業中,納品済み,検収待ち,完了,不採用,辞退, project_url → nullable|url|max:2048, reward → nullable|integer|min:0, applied_date → nullable|date, next_action_date → nullable|date, applicant_count → nullable|integer|min:0, recruitment_count → nullable|integer|min:0, is_favorite → nullable|boolean, その他文字列フィールド → nullable|string|max:255 (text型はmax省略)
        - _Requirements: 1.4, 12.6_

    - [x] 2.2 Create UpdateProjectRequest
        - `php artisan make:request UpdateProjectRequest`
        - StoreProjectRequestと同一ルールだが、全フィールドを `sometimes` で囲む（PATCH対応）
        - _Requirements: 5.3, 12.6_

    - [x] 2.3 Create ProjectResource
        - `php artisan make:resource ProjectResource`
        - `toArray()` で全フィールド（id, name, project_url, client_name, media, category, applied_date, status, reward, working_hours, applicant_count, recruitment_count, application_text, next_action, next_action_date, memo, priority, is_favorite, created_at, updated_at）を返す
        - _Requirements: 2.2, 12.2_

    - [x] 2.4 Create ProjectController
        - `php artisan make:controller ProjectController`
        - `index(Request $request)`: keyword, status, media クエリパラメータでフィルタリング。keywordはnameとmemoで部分一致（LIKE）。登録日時降順。ProjectResource::collection()で返却
        - `store(StoreProjectRequest $request)`: Project::create()で登録、ProjectResourceで201返却
        - `update(UpdateProjectRequest $request, Project $project)`: $project->update()で更新、ProjectResourceで返却
        - `destroy(Project $project)`: $project->delete()で削除、204 No Content返却
        - _Requirements: 1.5, 2.1, 2.4, 3.2, 4.3, 4.4, 4.5, 5.3, 6.2, 12.2, 12.3, 12.4, 12.5_

    - [x] 2.5 Register API routes
        - `routes/api.php` に `Route::apiResource('projects', ProjectController::class)->only(['index', 'store', 'update', 'destroy'])` を追加
        - _Requirements: 12.2, 12.3, 12.4, 12.5_

- [x] 3. Backend API verification
    - [x] 3.1 Write Feature Tests for Project API
        - `tests/Feature/ProjectApiTest.php` を作成
        - テストケース: POST正常登録(201)、POST必須フィールド未入力(422)、GET全件取得、GETキーワード検索、GETステータスフィルタ、GET媒体フィルタ、PATCH更新成功、DELETE削除成功(204)、DELETE存在しないID(404)
        - RefreshDatabaseトレイト使用
        - _Requirements: 1.4, 1.5, 3.2, 4.3, 4.4, 5.3, 6.2, 12.6_

    - [x] 3.2 Run backend tests and verify
        - `php artisan test` で全テストがパスすることを確認
        - エラーがあれば修正
        - _Requirements: 12.2, 12.3, 12.4, 12.5, 12.6_

- [x] 4. Checkpoint - Backend API complete
    - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Frontend setup (Vite + React + TypeScript + Tailwind)
    - [ ] 5.1 Install frontend dependencies and configure Vite
        - `npm install react react-dom @vitejs/plugin-react typescript @types/react @types/react-dom`
        - `npm install -D tailwindcss @tailwindcss/vite`
        - `vite.config.ts` にReactプラグイン + Tailwind CSSプラグイン + Laravel Vite設定を追加
        - `tsconfig.json` 作成（jsx: react-jsx, strict: true, module: ESNext, moduleResolution: bundler）
        - `resources/css/app.css` に `@import "tailwindcss"` を追加
        - _Requirements: 11.6_

    - [ ] 5.2 Create entry point and verify build
        - `resources/js/app.tsx` をエントリーポイントとして作成（ReactDOM.createRoot + App コンポーネントの基本レンダリング）
        - `resources/js/App.tsx` に最小限のコンポーネント（"Side Project Manager" タイトル表示のみ）を作成
        - `resources/views/welcome.blade.php` を編集してVite React アセットを読み込むHTMLに変更
        - `npm run build` でビルド成功を確認
        - _Requirements: 11.1_

- [ ] 6. Frontend core implementation
    - [ ] 6.1 Create TypeScript types
        - `resources/js/types/project.ts` に `Project` インターフェースと `ProjectFormData` インターフェースを定義
        - 設計書の型定義に従い、全フィールドの型を正確に記述
        - _Requirements: 12.1_

    - [ ] 6.2 Create constants
        - `resources/js/constants/projectOptions.ts` に STATUS_OPTIONS, MEDIA_OPTIONS, STATUS_COLORS を定義
        - ステータス12種: 未応募, 応募済み, 返信待ち, 面談予定, 選考中, 契約済み, 作業中, 納品済み, 検収待ち, 完了, 不採用, 辞退
        - 媒体4種: CrowdWorks, MENTA, Lancers, その他
        - カラーマッピング: 設計書のSTATUS_COLORSに従う
        - _Requirements: 4.1, 4.2, 10.2_

    - [ ] 6.3 Implement API call functions in App.tsx
        - `App.tsx` に fetchProjects, handleCreate, handleUpdate, handleDelete 関数を実装
        - fetchProjects: GET /api/projects にkeyword, status, media パラメータ付きでリクエスト
        - handleCreate: POST /api/projects
        - handleUpdate: PATCH /api/projects/{id}
        - handleDelete: window.confirm()で確認後 DELETE /api/projects/{id}
        - useEffect で初回マウント時に fetchProjects 呼び出し
        - state管理: projects, keyword, statusFilter, mediaFilter, modalOpen, editingProject
        - _Requirements: 1.5, 2.1, 5.3, 6.1, 6.2_

- [ ] 7. Frontend UI implementation
    - [ ] 7.1 Implement Summary Cards section
        - `App.tsx` 内にサマリーカードセクションを実装
        - useMemo で computeSummary を計算（total, 面談予定, 返信待ち, 契約済み, 完了）
        - カード: 白背景 + ライトシャドウ + 角丸、アクセントカラーはアイコン/数値/上部ボーダーに限定
        - カラー: total=slate, 面談予定=blue, 返信待ち=amber, 契約済み=violet, 完了=green
        - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 11.7, 11.8_

    - [ ] 7.2 Implement Search & Filter section
        - `App.tsx` 内に検索テキスト入力 + ステータスセレクトボックス + 媒体セレクトボックスを実装
        - 入力変更時に fetchProjects を再呼び出し（検索はAPI側で処理）
        - ステータスセレクト: 全ステータス + 空（全件）選択肢
        - 媒体セレクト: 全媒体 + 空（全件）選択肢
        - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5_

    - [ ] 7.3 Implement Next Action section
        - `App.tsx` 内に次アクションセクションを実装
        - useMemo で computeNextActions を計算（next_action_date非nullのみ、日付昇順ソート）
        - 各行: 案件名、次アクション内容、次アクション予定日、ステータスバッジ表示
        - 予定日が今日以前: 薄い赤色背景（bg-red-50）で強調
        - 予定日が未来: 白色背景で通常表示
        - _Requirements: 7.1, 7.2, 7.3, 7.4_

    - [ ] 7.4 Implement Project List table
        - `App.tsx` 内に案件一覧テーブルを実装
        - カラム: 案件名、媒体、カテゴリ、ステータス（Status_Badge）、報酬、次アクション、次アクション予定日、優先度、操作（編集・削除ボタン）
        - ステータスはカラー付きバッジ（STATUS_COLORSに基づくTailwind CSSクラス）
        - 報酬: 金額表示（円単位）、未設定時は「-」
        - 操作列: 編集ボタン（editingProjectとmodalOpenをセット）、削除ボタン（handleDelete呼び出し）
        - テーブルは白背景 + ライトシャドウ + 角丸
        - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.1, 8.1, 8.2, 10.1, 10.2, 10.3, 11.7_

    - [ ] 7.5 Implement ProjectModal component
        - `resources/js/ProjectModal.tsx` を作成
        - Props: open, mode('create'|'edit'), project, onClose, onSubmit
        - 全フィールドの入力フォーム: 案件名（必須）、案件URL、クライアント名、媒体（セレクト）、カテゴリ、応募日、ステータス（セレクト、デフォルト「未応募」）、報酬、稼働時間、応募人数、募集人数、応募文（textarea）、次アクション、次アクション予定日、メモ（textarea）、優先度、お気に入り（チェックボックス）
        - mode='create': 空/デフォルト初期値
        - mode='edit': project propsの値を初期値に設定
        - 案件名未入力時のフロントバリデーション表示
        - モーダルオーバーレイ + 白背景 + 角丸 + シャドウ
        - _Requirements: 1.2, 1.3, 1.4, 1.6, 5.1, 5.2, 11.7_

    - [ ] 7.6 Wire header and layout
        - `App.tsx` のレイアウトを完成: ヘッダー（アプリ名「副業案件管理」）→ Summary Cards → Search/Filter → Next Action → Project List → 「案件を登録」ボタン
        - 「案件を登録」ボタンクリックで modalOpen=true, editingProject=null に設定
        - モーダルのonSubmit成功後にfetchProjectsを再呼び出しして全セクション更新
        - 白/slate/gray基調のビジネスデザイン、十分なホワイトスペース
        - _Requirements: 1.1, 1.6, 5.4, 6.3, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.9, 11.10, 11.11_

- [ ] 8. Checkpoint - Frontend implementation complete
    - Ensure `npm run build` succeeds with no TypeScript errors, ask the user if questions arise.

- [ ] 9. Integration verification
    - [ ] 9.1 Final build and test verification
        - `php artisan test` で全バックエンドテストがパス
        - `npm run build` でフロントエンドビルド成功
        - CORS設定確認（Laravel側で `/api/*` へのリクエストを許可）
        - _Requirements: 全要件_

    - [ ] 9.2 Manual verification checklist
        - 以下の動作を確認するためのチェックリスト:
            - 案件登録: モーダルから正常に登録でき、一覧・サマリー・次アクションが更新される
            - 案件一覧: テーブル表示、登録日時降順
            - 検索: テキスト入力でフィルタリング
            - 絞り込み: ステータス・媒体セレクトでフィルタリング
            - 編集: モーダルで全フィールド編集・保存
            - 削除: window.confirm後に削除、一覧更新
            - サマリー: 各ステータスのカウント正常
            - 次アクション: 日付順表示、期限切れ赤背景
        - _Requirements: 1〜12全要件_

- [ ] 10. Final checkpoint - All verification complete
    - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks follow the order: Backend setup → Backend API → Backend tests → Frontend setup → Frontend core → Frontend UI → Integration
- Each task touches 1-3 files maximum for manageable incremental progress
- No property-based testing (fast-check) — design explicitly states Phase 1 does not introduce new test libraries
- Unit tests for pure functions (computeSummary, computeNextActions) are permitted but not required
- window.confirm() is used for delete confirmation (no custom dialog component)
- Summary is calculated client-side from fetched data (no additional API endpoint)
- All filtering is done server-side via API query parameters
- SQLite database requires no external setup

## Task Dependency Graph

```json
{
    "waves": [
        { "id": 0, "tasks": ["1.1"] },
        { "id": 1, "tasks": ["1.2"] },
        { "id": 2, "tasks": ["2.1", "2.2", "2.3"] },
        { "id": 3, "tasks": ["2.4"] },
        { "id": 4, "tasks": ["2.5"] },
        { "id": 5, "tasks": ["3.1"] },
        { "id": 6, "tasks": ["3.2"] },
        { "id": 7, "tasks": ["5.1"] },
        { "id": 8, "tasks": ["5.2"] },
        { "id": 9, "tasks": ["6.1", "6.2"] },
        { "id": 10, "tasks": ["6.3"] },
        { "id": 11, "tasks": ["7.1", "7.2", "7.3", "7.4"] },
        { "id": 12, "tasks": ["7.5"] },
        { "id": 13, "tasks": ["7.6"] },
        { "id": 14, "tasks": ["9.1"] },
        { "id": 15, "tasks": ["9.2"] }
    ]
}
```
