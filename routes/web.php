<?php
declare(strict_types=1);

/**
 * Khybersoft - Route Definitions
 */

/** @var \App\Core\Router $router */

// Frontend routes
$router->get('/', ['Front\HomeController', 'index']);
$router->get('/about', ['Front\HomeController', 'about']);
$router->get('/contact', ['Front\HomeController', 'contact']);
$router->post('/contact', ['Front\HomeController', 'submitContact']);

// Products
$router->get('/products', ['Front\ProductController', 'index']);
$router->get('/products/{slug}', ['Front\ProductController', 'show']);

// Blog
$router->get('/blog', ['Front\BlogController', 'index']);
$router->get('/blog/{slug}', ['Front\BlogController', 'show']);

// Admin routes
$router->get('/admin', ['Admin\DashboardController', 'index'], ['AdminAuth']);
$router->get('/admin/login', ['Admin\AuthController', 'showLogin'], ['Guest']);
$router->post('/admin/login', ['Admin\AuthController', 'login'], ['Guest']);
$router->get('/admin/logout', ['Admin\AuthController', 'logout']);
