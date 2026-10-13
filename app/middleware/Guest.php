<?php
declare(strict_types=1);

namespace App\Middleware;

use App\Core\Auth;

class Guest
{
    public function handle(): bool
    {
        if (Auth::check()) {
            header('Location: ' . SITE_URL . '/admin');
            exit;
        }

        return true;
    }
}
