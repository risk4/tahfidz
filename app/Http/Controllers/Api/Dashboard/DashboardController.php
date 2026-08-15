<?php

namespace App\Http\Controllers\Api\Dashboard;

use App\Domain\Dashboard\Services\DashboardService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(private readonly DashboardService $dashboardService)
    {
    }

    /**
     * Data terstruktur untuk halaman Dashboard (role-aware).
     *
     * range: 7d | 30d | 3m | 6m | 1y
     */
    public function overview(Request $request)
    {
        return response()->json(
            $this->dashboardService->overview($request->user(), (string) $request->query('range', '30d'))
        );
    }
}
