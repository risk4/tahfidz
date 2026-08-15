<?php

namespace App\Domain\Settings\Policies;

use App\Domain\People\Models\User;
use App\Domain\Settings\Models\AppSetting;

/**
 * Pengaturan aplikasi adalah area sensitif — hanya super admin yang boleh
 * membaca maupun mengubahnya. Guru/siswa tidak memiliki akses sama sekali.
 *
 * Nama kelas mengikuti konvensi discovery default Laravel ({Model}Policy),
 * sama seperti policy lain di aplikasi ini (AuthServiceProvider tidak
 * terdaftar di bootstrap/app.php, jadi discovery yang mencarinya).
 */
class AppSettingPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isSuperAdmin();
    }

    public function view(User $user, AppSetting $setting): bool
    {
        return $user->isSuperAdmin();
    }

    public function update(User $user, AppSetting $setting = null): bool
    {
        return $user->isSuperAdmin();
    }
}
