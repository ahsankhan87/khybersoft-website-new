<?php
declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Controller;
use App\Core\Auth;

class AuthController extends Controller
{
    protected string $layout = 'admin.auth';

    public function showLogin(): void
    {
        if (Auth::check()) {
            $this->redirect(url('/admin'));
            return;
        }

        $this->view('admin.auth.login', [
            'page_title' => 'Admin Login',
        ]);
    }

    public function login(): void
    {
        if (!$this->validateCsrf()) return;

        $email = $this->input('email');
        $password = $this->input('password');
        $remember = (bool) $this->input('remember');

        if (Auth::attempt($email, $password, $remember)) {
            $this->redirect(url('/admin'));
        } else {
            flash('error', 'Invalid credentials');
            $this->redirect(url('/admin/login'));
        }
    }

    public function logout(): void
    {
        Auth::logout();
        $this->redirect(url('/admin/login'));
    }
}
