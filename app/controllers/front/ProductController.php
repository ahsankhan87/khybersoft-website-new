<?php
declare(strict_types=1);

namespace App\Controllers\Front;

use App\Core\Controller;
use App\Core\Database;

class ProductController extends Controller
{
    protected string $layout = 'front';

    public function index(): void
    {
        $db = Database::getInstance();
        $products = $db->fetchAll(
            "SELECT * FROM products WHERE status = 'published' AND deleted_at IS NULL ORDER BY created_at DESC"
        );

        $this->view('front.products.index', [
            'page_title' => 'Our Products - Khybersoft',
            'products' => $products,
        ]);
    }

    public function show(string $slug): void
    {
        $db = Database::getInstance();
        $product = $db->fetch(
            "SELECT * FROM products WHERE slug = ? AND status = 'published' AND deleted_at IS NULL",
            [$slug]
        );

        if (!$product) {
            $this->abort(404, 'Product not found');
            return;
        }

        $this->view('front.products.show', [
            'page_title' => $product['name'] . ' - Khybersoft',
            'product' => $product,
        ]);
    }
}
