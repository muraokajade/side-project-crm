# 副業案件管理（side-project-crm）

CrowdWorks・MENTA・Lancers等のフリーランス案件を一元管理するための個人向けWebアプリケーション（Phase 1）。

詳細な要件・設計は [`.kiro/specs/side-project-manager/`](.kiro/specs/side-project-manager/)（`requirements.md` / `design.md` / `tasks.md`）を参照してください。本READMEはセットアップ・実行・検証手順のみを扱います。

## アプリの概要

副業として受けているフリーランス案件（応募状況・報酬・次アクション等）を、案件ごとに登録・一覧・検索・絞り込みできるツールです。単一ユーザーが自分のPC上で使うことを前提としています。

## 想定ユーザー

- 複数のクラウドソーシングサービス（CrowdWorks・MENTA・Lancers等）で副業案件を並行して探している/受けているフリーランサー本人。
- 認証機能を持たないため、**本人がローカル環境で単独利用する**ことを前提とします（詳細は「外部公開しないことに関する注意」を参照）。

## 主な機能

- 案件の登録・編集・削除（モーダルフォーム、全17項目）
- 案件一覧のテーブル表示（登録日時降順）
- 案件名・メモによるキーワード検索
- ステータス・媒体による絞り込み（AND条件）
- サマリーカード（案件総数／面談予定／返信待ち／契約済み／完了の件数）
- 次に対応すべき案件の一覧（次アクション予定日の昇順、期限切れは強調表示）
- ステータスの色分けバッジ表示
- APIバリデーションエラー（422）のフィールド別表示、通信エラー時の汎用エラー表示
- 送信中の多重送信防止・ローディング表示

## 技術スタック

`composer.json` / `composer.lock` / `package.json` / `package-lock.json` および実行環境から確認した実際のバージョンです（`^`等の許容範囲を含む要求バージョンは `composer.json` / `package.json` の記載どおり）。

### バックエンド

| 項目 | 要求バージョン（`composer.json`） | 実際にインストール済みのバージョン |
|---|---|---|
| PHP | `^8.3` | 8.4.21 |
| Laravel Framework | `^13.8` | v13.24.0 |
| PHPUnit | `^12.5.12` | 12.5.33 |
| データベース | — | SQLite |

### フロントエンド

| 項目 | 要求バージョン（`package.json`） | 実際にインストール済みのバージョン |
|---|---|---|
| Node.js | 未指定（`package.json`に`engines`記載なし） | v24.14.1（本ドキュメント作成時の動作確認環境） |
| React / React DOM | `^19.2.8` | 19.2.8 |
| TypeScript | `^7.0.2` | 7.0.2 |
| Vite | `^8.0.0` | 8.2.1 |
| @vitejs/plugin-react | `^6.0.5` | 6.0.5 |
| laravel-vite-plugin | `^3.1` | 3.2.0 |
| Tailwind CSS | `^4.0.0` | 4.3.3 |
| Vitest | `^4.1.11` | 4.1.11（Node要件: `^20.0.0 \|\| ^22.0.0 \|\| >=24.0.0`） |
| @testing-library/react | `^16.3.2` | 16.3.2 |
| @testing-library/jest-dom | `^7.0.1` | 7.0.1 |
| jsdom | `^29.1.1`（npmが解決したバージョン） | 29.1.1 |

## 必要環境

- PHP 8.3以上（実績: 8.4.21）
- Composer
- Node.js（Vitestの要件: `^20.0.0 || ^22.0.0 || >=24.0.0`。本ドキュメントはv24.14.1で動作確認）
- npm（実績: 11.11.0）
- 追加のデータベースサーバーは不要（SQLite）

## 初回セットアップ

```bash
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
npm ci
npm run build
```

通常の環境構築（新しくcloneした直後、または他の変更を加えていない状態からの構築）では、package-lock.jsonの内容をそのまま再現するnpm ciを使用してください。依存パッケージを追加・更新する場合のみnpm installを使用し、更新後のpackage-lock.jsonをコミットしてください。

`.env`の`DB_CONNECTION=sqlite`はそのままで動作します（`DB_DATABASE`は未設定でよく、Laravelが`database/database.sqlite`をデフォルトとして使用します。`config/database.php`のsqlite接続設定で確認済み）。

`composer.json`にはこれらをまとめた `composer run setup` スクリプトも定義されていますが、`npm install --ignore-scripts` を実行するため、npm部分は上記手順（npm ci）と内容が異なります。

## 起動方法

### 開発モード（フロントエンドのホットリロードあり）

```bash
composer run dev
```

`php artisan serve`・キューワーカー・ログ表示（`pail`）・`npm run dev`（Vite開発サーバー）を`concurrently`で同時起動します（`composer.json`の`dev`スクリプトに定義済み）。個別に起動する場合は以下の2つを別ターミナルで実行してください。

```bash
php artisan serve
npm run dev
```

### ビルド済みアセットを配信するモード

```bash
npm run build
php artisan serve
```

`http://127.0.0.1:8000/` でアクセスできます。**本ドキュメントの動作確認は、このビルド済みアセット配信モードで実施しています**（`composer run dev` / `npm run dev` によるホットリロードモード自体は本ドキュメント作成時に個別実行での確認は行っていません）。

## フロントエンドテスト

```bash
npm run test
```

`vitest run` を実行します（`resources/js/**/*.test.{ts,tsx}`）。本ドキュメント作成時点で **2ファイル・15件が全件PASS** することを確認済みです。

## バックエンドテスト

```bash
php artisan test
```

本ドキュメント作成時点で **11 tests / 40 assertions が全件PASS** することを確認済みです。テストは`phpunit.xml`で`DB_DATABASE=:memory:`に固定されており、`database/database.sqlite`（実データ）には影響しません。

## 型チェック

```bash
npx tsc --noEmit
```

`package.json`にスクリプトとしては定義していないため`npx`経由で直接実行します。本ドキュメント作成時点でエラー0件を確認済みです。

## ビルド

```bash
npm run build
```

`vite build`を実行し、`public/build/`にアセットを出力します（`.gitignore`で`/public/build`は除外済み）。

## データベース設定

- 接続: SQLite（`.env`の`DB_CONNECTION=sqlite`）
- ファイル: `database/database.sqlite`（`.gitignore`により`database/.gitignore`の`*.sqlite*`パターンでGit管理対象外）
- マイグレーション: `database/migrations/`配下の4ファイル（`users`・`password_reset_tokens`・`sessions`・`cache`・`cache_locks`・`jobs`・`job_batches`・`failed_jobs`はLaravel標準の初期マイグレーション3ファイルに含まれます。案件データ用の`projects`テーブルは`2026_08_10_234223_create_projects_table.php`で作成）
- `SESSION_DRIVER` / `CACHE_STORE` / `QUEUE_CONNECTION` はいずれも`.env.example`で`database`に設定されており、上記マイグレーションで作成されるテーブルのみで動作します（Redis・外部キューサーバー等は不要）

## 既知の制約

- Phase 1のスコープ外（詳細は「現在のPhase 1スコープ」および[`.kiro/specs/side-project-manager/requirements.md`](.kiro/specs/side-project-manager/requirements.md)を参照）。
- APIエンドポイントにレート制限は設定されていません。
- フロントエンドの一覧テーブルはモバイル幅では横スクロール表示になります（カード型レイアウトへの変更は未実施）。
- `.env.example`にはLaravel標準スキャフォールドのRedis／AWS／メール送信関連の項目が残っていますが、本アプリでは未使用です（`SESSION_DRIVER`等はいずれも`database`）。

## 外部公開しないことに関する注意

**本アプリケーションは認証機能を持たないため、インターネットや共有ネットワークへの公開を前提としていません。** 起動すると誰でも案件データの閲覧・登録・編集・削除ができる状態になります。`localhost`（自分のPC内）でのみ利用してください。将来的に外部公開・複数ユーザー対応を行う場合は、認証機能の追加を別フェーズとして検討する必要があります（現時点では未着手・未計画です）。

## 現在のPhase 1スコープ

要件定義書（[`requirements.md`](.kiro/specs/side-project-manager/requirements.md)）が定めるPhase 1の対象外機能（認証・通知・メール連携・CSV/Excelエクスポート・複雑な権限管理・マルチユーザー対応等）は未実装です。Phase 1の実装状況の詳細な内訳は[`tasks.md`](.kiro/specs/side-project-manager/tasks.md)を参照してください。
