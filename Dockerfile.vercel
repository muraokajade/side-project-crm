FROM node:24-bookworm-slim AS frontend

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY resources ./resources
COPY vite.config.ts tsconfig.json ./
RUN npm run build

FROM composer:2 AS vendor

WORKDIR /app
COPY composer.json composer.lock artisan ./
COPY app ./app
COPY bootstrap ./bootstrap
COPY config ./config
COPY database ./database
COPY routes ./routes
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --prefer-dist \
    --optimize-autoloader

FROM dunglas/frankenphp:1-php8.4-bookworm

WORKDIR /app

RUN install-php-extensions pdo_pgsql
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

COPY . .
COPY --from=vendor /app/vendor ./vendor
COPY --from=frontend /app/public/build ./public/build

RUN rm -f bootstrap/cache/*.php
RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# Bladeは書き込み不可なFSでも動くよう、ビルド時にコンパイル済みにしておく。
RUN php artisan view:cache

# 【重要】ここで config:cache を実行してはいけない。
# ビルド時は環境変数が無いため、config値が空のまま固定され、実行時に環境変数を注入しても
# 反映されない。特に APP_ACCESS_PASSWORD が空で固定されると、Basic認証が無言で無効化され
# 誰でも到達できる状態になる(実測で確認済み)。
# キャッシュする場合は、環境変数が揃った実行時(起動コマンド内)に限ること。

# セッションはNeon(Postgres)のsessionsテーブルへ保存する。
# サーバーレスではインスタンス間でファイルを共有できずfileドライバは使えない。
# cookieドライバでも維持自体はできるが、サーバー側からの失効ができないためdatabaseを採用する
# (sessionsテーブルはLaravel標準の0001_01_01_000000_create_users_tableで作成済み)。
ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr \
    CACHE_STORE=array \
    SESSION_DRIVER=database \
    QUEUE_CONNECTION=sync

EXPOSE 80

CMD ["sh", "-c", "export SERVER_NAME=\":${PORT:-80}\"; exec frankenphp run --config /etc/frankenphp/Caddyfile"]
