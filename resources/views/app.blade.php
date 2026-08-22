<!DOCTYPE html>
@php
    $appSetting = \Illuminate\Support\Facades\Schema::hasTable('settings')
        ? \App\Domain\Settings\Models\AppSetting::whereIn('key', ['application.favicon_path', 'application.logo_path', 'profile.app_name'])->pluck('value', 'key')
        : collect();
    $faviconPath = $appSetting->get('application.favicon_path');
    $appName = $appSetting->get('profile.app_name') ?? config('app.name', 'Tahfidz App');
    $faviconUrl = $faviconPath ? asset('storage/' . $faviconPath) : null;
@endphp
<html lang="en">
<head>
    <meta charset="UTF-8" />
    @if ($faviconUrl)
        <link rel="icon" href="{{ $faviconUrl }}" />
    @else
        <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    @endif
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{ $appName }}</title>
    @fonts
    @vite(['resources/css/app.css', 'resources/js/app.ts'])
</head>
<body>
    <div id="app"></div>
</body>
</html>
