<?php
declare(strict_types=1);

namespace App\Controllers\Front;

use App\Core\Controller;
use App\Core\Database;

class BlogController extends Controller
{
    protected string $layout = 'front';

    public function index(): void
    {
        $db = Database::getInstance();
        $posts = $db->fetchAll(
            "SELECT * FROM blog_posts WHERE status = 'published' AND deleted_at IS NULL ORDER BY created_at DESC"
        );

        $this->view('front.blog.index', [
            'page_title' => 'Blog - Khybersoft',
            'posts' => $posts,
        ]);
    }

    public function show(string $slug): void
    {
        $db = Database::getInstance();
        $post = $db->fetch(
            "SELECT * FROM blog_posts WHERE slug = ? AND status = 'published' AND deleted_at IS NULL",
            [$slug]
        );

        if (!$post) {
            $this->abort(404, 'Blog post not found');
            return;
        }

        $this->view('front.blog.show', [
            'page_title' => $post['title'] . ' - Blog',
            'post' => $post,
        ]);
    }
}
