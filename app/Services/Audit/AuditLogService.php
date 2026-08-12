<?php

namespace App\Services\Audit;

use App\Domain\People\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AuditLogService
{
    public function record(?User $user, string $action, string $model, ?int $modelId, Request $request): void
    {
        DB::table('audit_logs')->insert([
            'user_id' => $user?->id,
            'action' => $action,
            'model' => $model,
            'model_id' => $modelId,
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 255),
            'created_at' => now(),
        ]);
    }
}
