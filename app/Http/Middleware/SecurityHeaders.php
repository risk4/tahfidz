<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Header keamanan respons untuk seluruh endpoint (API + SPA).
 *
 * Aplikasi menyimpan token Bearer di localStorage (rentan XSS), sehingga
 * header berikut memperkecil dampak bila terjadi injeksi skrip:
 *   - CSP membatasi sumber skrip/gaya/koneksi yang sah,
 *   - frame-ancestors & X-Frame-Options mencegah clickjacking,
 *   - nosniff mencegah MIME-sniffing.
 *
 * CSP penuh hanya diaktifkan saat produksi: Vite dev server menyuntik
 * skrip inline/websocket yang akan diblokir oleh policy ketat.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Web Speech API (pengecekan bacaan) butuh mikrofon — tidak dimatikan.
        $response->headers->set('Permissions-Policy', 'camera=(), geolocation=(), payment=()');

        if (config('app.env') === 'production') {
            // media-src https: diperlukan untuk <audio> rekaman eksternal
            // (audio_path); style 'unsafe-inline' untuk gaya inline React.
            $response->headers->set(
                'Content-Security-Policy',
                "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
                ."img-src 'self' data: blob: https:; media-src 'self' https: blob:; "
                ."font-src 'self' data:; connect-src 'self'; object-src 'none'; "
                ."base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
            );
        }

        return $response;
    }
}
