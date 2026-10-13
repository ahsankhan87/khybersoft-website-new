<?php
declare(strict_types=1);

namespace App\Middleware;

use App\Core\Auth;

class AdminAuth
{
    public function handle(): bool
    {
        if (Auth::guest()) {
            $_SESSION['intended_url'] = $_SERVER['REQUEST_URI'];
            header('Location: ' . SITE_URL . '/admin/login');
            exit;
        }

        if (!Auth::isAdmin()) {
            http_response_code(403);
            echo 'Access denied';
            exit;
        }

        return true;
    }
}
