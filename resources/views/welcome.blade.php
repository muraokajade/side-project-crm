<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    {{-- APIはセッション認証(webミドルウェア)を通るため、更新系リクエストにCSRFトークンが必要。 --}}
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>転職＋副業 管理</title>
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.tsx'])
</head>
<body>
    <div id="app"></div>
</body>
</html>
