<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Memastikan pengguna yang ditandai must_change_password tidak bisa
 * mengakses endpoint lain sebelum mengganti password-nya.
 */
class EnsurePasswordChanged
{
    private const ALLOWED_PATHS = [
        'api/auth/change-password',
        'api/auth/logout',
        'api/me',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->must_change_password && ! in_array($request->path(), self::ALLOWED_PATHS, true)) {
            return response()->json([
                'message' => 'Anda harus mengganti password terlebih dahulu.',
                'must_change_password' => true,
            ], 403);
        }

        return $next($request);
    }
}
