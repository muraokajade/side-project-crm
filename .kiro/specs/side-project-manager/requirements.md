# Requirements Document

## Introduction

副業案件管理Webアプリケーション（Phase 1）の要件定義書。CrowdWorks、MENTA、Lancers等のフリーランス案件を一元管理するためのWebアプリを新規作成する。既存のJobHunt Lite（転職活動CRM）の画面構成・デザインを参考にしつつ、完全新規アプリとして構築する。

技術スタック: Laravel 11 + PHP 8.2 + SQLite（バックエンド）、React 19 + TypeScript + Vite + Tailwind CSS（フロントエンド）。認証機能はPhase 1対象外。

## Glossary

- **App**: 副業案件管理Webアプリケーション全体を指す
- **Project**: 副業案件（CrowdWorks、MENTA、Lancers等の個別案件）
- **Project_List**: 案件一覧テーブルを表示するUIコンポーネント
- **Project_Form**: 案件登録フォームUIコンポーネント（モーダルまたはフォーム形式）
- **Edit_Modal**: 案件編集モーダルUIコンポーネント
- **Summary_Card**: サマリー情報を表示するカード型UIコンポーネント
- **Search_Filter**: 検索・絞り込みUIコンポーネント
- **Next_Action_Section**: 次に対応する案件を表示するUIセクション
- **Status_Badge**: ステータスを色付きバッジとして表示するUIコンポーネント
- **Confirmation_Dialog**: 削除等の操作前に確認を求めるダイアログUIコンポーネント
- **API**: Laravel バックエンドのREST APIエンドポイント群
- **Database**: SQLiteデータベース

## Requirements

### Requirement 1: 案件登録

**User Story:** As a フリーランサー, I want 案件情報をモーダルフォームから登録できること, so that 副業案件を一元管理できる。

#### Acceptance Criteria

1. THE App SHALL 「案件を登録」ボタンを画面上に配置する
2. WHEN 「案件を登録」ボタンが押された場合, THE Project_Form SHALL モーダルとして表示される
3. THE Project_Form SHALL 以下の入力フィールドを提供する: 案件名（必須）、案件URL（任意）、クライアント名（任意）、媒体（任意）、カテゴリ（任意）、応募日（任意）、ステータス（必須、デフォルト「未応募」）、報酬（任意、円単位）、稼働時間（任意、自由入力）、応募人数（任意）、募集人数（任意）、応募文（任意）、次アクション（任意）、次アクション予定日（任意）、メモ（任意）、優先度（任意）、お気に入り（デフォルトfalse）
4. WHEN 案件名が未入力の状態で保存ボタンが押された場合, THE Project_Form SHALL バリデーションエラーを表示する
5. WHEN 有効なフォームデータで保存ボタンが押された場合, THE API SHALL POSTリクエストを受け付けてDatabaseに案件を保存する
6. WHEN 案件登録が成功した場合, THE App SHALL モーダルを閉じ、Project_List、Summary_Card、Next_Action_Sectionを更新表示する
7. IF モーダルベースの登録が実装複雑度を大幅に増加させる場合, THEN THE App SHALL ページ下部に常時表示するフォーム形式を代替として採用してもよい

### Requirement 2: 案件一覧表示

**User Story:** As a フリーランサー, I want 登録した案件を一覧テーブルで確認できること, so that 全案件の状況を俯瞰できる。

#### Acceptance Criteria

1. WHEN ページが読み込まれた場合, THE Project_List SHALL 全案件をテーブル形式で表示する
2. THE Project_List SHALL 各案件について以下のカラムを表示する: 案件名、媒体、カテゴリ、ステータス、報酬、次アクション、次アクション予定日、優先度、操作
3. THE Project_List SHALL 操作列に編集ボタンと削除ボタンを表示する
4. THE Project_List SHALL 案件を登録日時の降順（新しい順）で表示する
5. THE Project_List SHALL 案件URL、応募文、メモ等の詳細情報はテーブルに表示しない（Edit_Modalでのみ閲覧・編集可能とする）

### Requirement 3: 案件検索

**User Story:** As a フリーランサー, I want 案件名やメモで案件を検索できること, so that 特定の案件をすぐに見つけられる。

#### Acceptance Criteria

1. THE Search_Filter SHALL テキスト入力フィールドを提供する
2. WHEN 検索テキストが入力された場合, THE Project_List SHALL 案件名またはメモに検索テキストを含む案件のみを表示する
3. WHEN 検索テキストが空の場合, THE Project_List SHALL 全案件を表示する

### Requirement 4: 絞り込み

**User Story:** As a フリーランサー, I want ステータスや媒体で案件を絞り込めること, so that 特定条件の案件だけを確認できる。

#### Acceptance Criteria

1. THE Search_Filter SHALL ステータス絞り込みセレクトボックスを提供する（選択肢: 未応募、応募済み、返信待ち、面談予定、選考中、契約済み、作業中、納品済み、検収待ち、完了、不採用、辞退）
2. THE Search_Filter SHALL 媒体絞り込みセレクトボックスを提供する（選択肢: CrowdWorks、MENTA、Lancers、その他）
3. WHEN ステータスが選択された場合, THE Project_List SHALL 該当ステータスの案件のみを表示する
4. WHEN 媒体が選択された場合, THE Project_List SHALL 該当媒体の案件のみを表示する
5. WHEN 検索テキストと絞り込み条件が同時に指定された場合, THE Project_List SHALL 全条件をAND条件で適用した案件のみを表示する

### Requirement 5: 案件編集

**User Story:** As a フリーランサー, I want 案件の全情報を編集モーダルで更新できること, so that 案件の進捗や詳細を管理できる。

#### Acceptance Criteria

1. WHEN Project_Listの編集ボタンが押された場合, THE Edit_Modal SHALL 該当案件の全フィールドを編集可能なフォームで表示する
2. THE Edit_Modal SHALL 以下のフィールドを編集可能に提供する: 案件名、案件URL、クライアント名、媒体、カテゴリ、応募日、ステータス、報酬、稼働時間、応募人数、募集人数、応募文、次アクション、次アクション予定日、メモ、優先度、お気に入り
3. WHEN 編集内容が保存された場合, THE API SHALL PATCH /api/projects/{id} リクエストを受け付けてDatabaseを更新する
4. WHEN 更新が成功した場合, THE App SHALL Edit_Modalを閉じ、Project_List、Summary_Card、Next_Action_Sectionを更新表示する

### Requirement 6: 案件削除

**User Story:** As a フリーランサー, I want 不要な案件を削除できること, so that 案件一覧を整理できる。

#### Acceptance Criteria

1. WHEN Project_Listの削除ボタンが押された場合, THE Confirmation_Dialog SHALL 削除確認メッセージを表示する
2. WHEN Confirmation_Dialogで削除が確定された場合, THE API SHALL DELETE /api/projects/{id} リクエストを受け付けてDatabaseから案件を削除する
3. WHEN 削除が成功した場合, THE App SHALL Project_List、Summary_Card、Next_Action_Sectionを更新表示する
4. WHEN Confirmation_Dialogでキャンセルが選択された場合, THE App SHALL 削除を実行せずダイアログを閉じる

### Requirement 7: 次アクション管理

**User Story:** As a フリーランサー, I want 次に対応すべき案件を把握できること, so that 対応漏れを防げる。

#### Acceptance Criteria

1. THE Next_Action_Section SHALL 次アクション予定日が設定されている案件を予定日の昇順で表示する
2. THE Next_Action_Section SHALL 各案件の案件名、次アクション内容、次アクション予定日、ステータスを表示する
3. THE Next_Action_Section SHALL 予定日が今日以前の案件のみを薄い赤色の背景またはアクセントで強調表示する
4. THE Next_Action_Section SHALL 予定日が未来の案件を白色背景で通常表示する

### Requirement 8: 報酬表示

**User Story:** As a フリーランサー, I want 案件一覧で報酬を確認できること, so that 収入の見通しを把握できる。

#### Acceptance Criteria

1. THE Project_List SHALL 報酬カラムに金額を円単位で表示する
2. WHEN 報酬が未設定の場合, THE Project_List SHALL 報酬カラムを「-」で表示する

### Requirement 9: サマリーカード

**User Story:** As a フリーランサー, I want 案件の集計情報をサマリーで確認できること, so that 全体状況を一目で把握できる。

#### Acceptance Criteria

1. THE Summary_Card SHALL 案件総数をslateアクセントカラーで表示する
2. THE Summary_Card SHALL ステータスが「面談予定」の案件数をblueアクセントカラーで表示する
3. THE Summary_Card SHALL ステータスが「返信待ち」の案件数をamberアクセントカラーで表示する
4. THE Summary_Card SHALL ステータスが「契約済み」の案件数をvioletまたはemeraldアクセントカラーで表示する
5. THE Summary_Card SHALL ステータスが「完了」の案件数をgreenアクセントカラーで表示する
6. THE Summary_Card SHALL カード全体を暗色にせず、アクセントカラーをアイコン、数値、上部ボーダー、左ボーダー、または小さな背景領域に限定して使用する
7. WHEN 案件が登録、更新、または削除された場合, THE Summary_Card SHALL 集計値を即座に再計算して表示する

### Requirement 10: ステータスバッジ

**User Story:** As a フリーランサー, I want ステータスを色付きバッジで視認できること, so that 案件の状態を一目で判別できる。

#### Acceptance Criteria

1. THE Status_Badge SHALL ステータスをプレーンテキストではなく小さな色付きバッジとして表示する
2. THE Status_Badge SHALL 以下のカラーマッピングを使用する: 未応募=gray、応募済み=slate、返信待ち=amber、面談予定=blue、選考中=indigo、契約済み=violet、作業中=cyan/teal、納品済み=sky、検収待ち=orange、完了=green、不採用=red、辞退=gray
3. THE Status_Badge SHALL Tailwind CSSの既存カラーパレットのみを使用する

### Requirement 11: 画面構成とデザインポリシー

**User Story:** As a フリーランサー, I want 使いやすく洗練された画面レイアウトで案件を管理できること, so that 効率的に案件情報にアクセスできる。

#### Acceptance Criteria

1. THE App SHALL ページ上部にヘッダー（アプリ名表示）を配置する
2. THE App SHALL ヘッダー下部にSummary_Cardセクションを配置する
3. THE App SHALL Summary_Card下部にSearch_Filterセクションを配置する
4. THE App SHALL Search_Filter下部にNext_Action_Sectionを配置する
5. THE App SHALL Next_Action_Section下部にProject_Listを配置する
6. THE App SHALL 白/slate/grayを基調としたビジネス向けデザインを採用する
7. THE App SHALL カードに角丸とライトシャドウを適用する
8. THE App SHALL ステータス、サマリー、重要なアクションに控えめなアクセントカラーを使用する
9. THE App SHALL 過度なアニメーションやグラデーションを使用しない
10. THE App SHALL 十分なホワイトスペースを確保する
11. THE App SHALL JobHunt Liteと同等のシンプルさを維持する

### Requirement 12: データモデル

**User Story:** As a 開発者, I want 案件データが適切なスキーマで管理されること, so that データの整合性が保たれる。

#### Acceptance Criteria

1. THE Database SHALL projectsテーブルに以下のカラムを持つ: id（主キー）、name（string, 必須）、project_url（string, 任意）、client_name（string, 任意）、media（string, 任意）、category（string, 任意）、applied_date（date, 任意）、status（string, 必須, デフォルト「未応募」）、reward（integer, 任意）、working_hours（string, 任意）、applicant_count（integer, 任意）、recruitment_count（integer, 任意）、application_text（text, 任意）、next_action（string, 任意）、next_action_date（date, 任意）、memo（text, 任意）、priority（string, 任意）、is_favorite（boolean, デフォルトfalse）、timestamps
2. THE API SHALL 案件一覧取得エンドポイント（GET /api/projects）を提供する
3. THE API SHALL 案件登録エンドポイント（POST /api/projects）を提供する
4. THE API SHALL 案件更新エンドポイント（PATCH /api/projects/{id}）を提供する
5. THE API SHALL 案件削除エンドポイント（DELETE /api/projects/{id}）を提供する
6. IF 必須フィールドが未入力でAPIリクエストが送信された場合, THEN THE API SHALL 422ステータスコードとバリデーションエラーメッセージを返す

## Phase 1 制約事項・対象外

以下の機能はPhase 1の対象外とする:

- 独立したダッシュボードページ
- 月別収益グラフ
- CSV/Excelエクスポート
- 認証機能
- 通知機能
- メール連携
- CrowdWorks API連携
- 自動スクレイピング
- 複雑な権限管理
- マルチユーザー対応
- 詳細ページ（モーダルで代替）
- 複雑なステータス遷移制御
- 新規UIライブラリの追加

## 実装方針

- JobHunt Liteは画面デザインの参考のみ（変更対象ではない）
- 最終成果物は「副業案件管理Web」（転職管理ではない）
- 技術スタック: Laravel + React + TypeScript + Tailwind CSS
- Phase 1では認証不要
- 新規ライブラリ追加なし
- 複雑なアーキテクチャは避ける
- 不必要な抽象化やリファクタリングを行わない
- 人間が読みやすく保守しやすいコードを優先
- Phase 1は「使える最小限」を目指す

## 現在の実装環境（2026-08-21追記）

**本節は追記であり、上記「技術スタック: Laravel + React + TypeScript + Tailwind CSS」（実装方針）および冒頭の「技術スタック: Laravel 11 + PHP 8.2（バックエンド）、React 19 + TypeScript + Vite + Tailwind CSS（フロントエンド）」（Introduction）という当初要件の記載を削除・上書きするものではありません。** 実際に`composer.install`・`npm install`で導入されたバージョンは当初想定（Laravel 11 / PHP 8.2）と異なるため、`composer.json`・`composer.lock`・`package.json`・`package-lock.json`および実行環境（`php -v`・`composer show`・`node -v`・`node_modules`配下の`package.json`）から確認できた実際の値を以下に記録します。

### バックエンド

| 項目 | `composer.json`の要求バージョン | 実際にインストール済みのバージョン |
|---|---|---|
| PHP | `^8.3` | 8.4.21 |
| laravel/framework | `^13.8` | v13.24.0 |
| phpunit/phpunit | `^12.5.12` | 12.5.33 |

### フロントエンド

| 項目 | `package.json`の要求バージョン | 実際にインストール済みのバージョン |
|---|---|---|
| Node.js | 未指定 | v24.14.1（動作確認環境） |
| react / react-dom | `^19.2.8` | 19.2.8 |
| typescript | `^7.0.2` | 7.0.2 |
| vite | `^8.0.0` | 8.2.1 |
| vitest | `^4.1.11` | 4.1.11 |
| @testing-library/react | `^16.3.2` | 16.3.2 |

### 運用上の前提（現状の実装に基づく事実）

- **認証機能は実装されていません。** Phase 1の実装方針どおり、単一ユーザーが自分の端末で利用することを前提としています。
- **マルチユーザー対応は実装されていません。** データはユーザー単位で分離されず、起動している端末上の全データに誰でもアクセスできます。
- **ローカル環境での利用専用です。** SQLiteをローカルファイルとして使用し、外部データベースサーバーへの接続は行いません。
- **インターネットや共有ネットワークへの公開は推奨しません。** 認証・レート制限が存在しないため、公開すると誰でも案件データを閲覧・変更・削除できる状態になります。外部公開・複数ユーザー対応は、本要件定義書の対象外機能（認証機能・マルチユーザー対応）を含む別フェーズとして改めて要件定義・設計を行う必要があります。
