<?php
declare(strict_types=1);

namespace App\Controllers\Front;

use App\Core\Controller;

class HomeController extends Controller
{
    protected string $layout = 'front';

    public function index(): void
    {
        $this->view('front.home.index', [
            'page_title' => 'Khybersoft - Innovative Software Solutions',
        ]);
    }

    public function about(): void
    {
        $this->view('front.home.about', [
            'page_title' => 'About Us - Khybersoft',
        ]);
    }

    public function contact(): void
    {
        $this->view('front.home.contact', [
            'page_title' => 'Contact Us - Khybersoft',
        ]);
    }

    public function submitContact(): void
    {
        if (!$this->validateCsrf()) return;

        // Process contact form
        flash('success', 'Thank you for your message! We will get back to you soon.');
        $this->redirect(url('/contact'));
    }
}
