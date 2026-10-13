<?php
declare(strict_types=1);

/**
 * Khybersoft - Front Controller
 * All requests are routed through this file
 */

// Define root paths
define('ROOT_PATH', dirname(__DIR__));
define('APP_PATH', ROOT_PATH . '/app');
define('PUBLIC_PATH', __DIR__);

// Load configuration
require_once APP_PATH . '/config/config.php';
require_once APP_PATH . '/config/database.php';

// Autoloader
spl_autoload_register(function (string $class): void {
    $paths = [
        APP_PATH . '/core/',
        APP_PATH . '/controllers/',
        APP_PATH . '/controllers/admin/',
        APP_PATH . '/controllers/front/',
        APP_PATH . '/models/',
        APP_PATH . '/middleware/',
        APP_PATH . '/helpers/',
    ];

    foreach ($paths as $path) {
        $file = $path . $class . '.php';
        if (file_exists($file)) {
            require_once $file;
            return;
        }
    }
});

// Load helpers
require_once APP_PATH . '/helpers/functions.php';

// Start session securely
session_start([
    'cookie_httponly' => true,
    'cookie_secure' => false, // Set to true in production with HTTPS
    'cookie_samesite' => 'Lax',
    'use_strict_mode' => true,
    'use_only_cookies' => true,
    'name' => 'KHYBERSOFT_SID',
]);

// Regenerate session ID periodically to prevent fixation
if (!isset($_SESSION['_created_at'])) {
    $_SESSION['_created_at'] = time();
} elseif (time() - $_SESSION['_created_at'] > 1800) {
    session_regenerate_id(true);
    $_SESSION['_created_at'] = time();
}

// Initialize CSRF
CSRF::init();

// Load routes
$router = new \App\Core\Router();
require_once ROOT_PATH . '/routes/web.php';

// Route the request
$router->dispatch();
