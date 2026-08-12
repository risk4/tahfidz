<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class AuthenticateApi extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     */
    protected function redirectTo(Request $request): ?string
    {
        // For API requests, we don't redirect - return null
        // The unauthenticated exception will be handled by the exception handler
        if ($request->is('api/*')) {
            return null;
        }

        // For web requests, redirect to login route
        return route('login');
    }
}
