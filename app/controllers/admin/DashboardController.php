<?php
declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Controller;
use App\Core\Auth;

class DashboardController extends Controller
{
    protected string $layout = 'admin';

    public function index(): void
    {
        if (Auth::guest()) {
            $this->redirect(url('/admin/login'));
            return;
        }

        $this->view('admin.dashboard', [
            'page_title' => 'Dashboard - Admin',
            'user' => Auth::user(),
        ]);
    }
}
