<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

/**
 * メールアドレス＋パスワードによる登録・ログイン・ログアウト・ログイン状態確認。
 *
 * セッション(webガード)を用いる。Basic認証(EnsureCrmAccess)は環境全体の公開制限であり、
 * 利用者個人を識別しないため、アプリ内ログインの代替にはしない。
 */
class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
        ]);

        // 登録後はそのままログイン状態にする(モニターの初回導線を短くするため)。
        Auth::login($user);
        $request->session()->regenerate();

        return response()->json(['data' => $this->userPayload($user)], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();

        if (! Auth::attempt(['email' => $credentials['email'], 'password' => $credentials['password']])) {
            // メール未登録とパスワード誤りを区別せず、アカウントの存在を推測させない。
            throw ValidationException::withMessages([
                'email' => ['メールアドレスまたはパスワードが正しくありません。'],
            ]);
        }

        // セッション固定攻撃を防ぐため、認証成功時にセッションIDを再生成する。
        $request->session()->regenerate();

        return response()->json(['data' => $this->userPayload($request->user())]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['data' => null]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->userPayload($request->user())]);
    }

    /**
     * @return array<string, mixed>
     */
    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
        ];
    }
}
