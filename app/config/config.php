<?php
declare(strict_types=1);

/**
 * Khybersoft - Application Configuration
 */

// Error reporting (disable in production)
if (getenv('APP_ENV') === 'production') {
    error_reporting(0);
    ini_set('display_errors', '0');
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
}

// Application Constants
define('APP_NAME', 'Khybersoft');
define('APP_VERSION', '1.0.0');
define('APP_ENV', getenv('APP_ENV') ?: 'development');
define('APP_DEBUG', APP_ENV !== 'production');

// Site URL (no trailing slash)
define('SITE_URL', getenv('SITE_URL') ?: 'https://khybersoft.com');
define('SITE_NAME', getenv('SITE_NAME') ?: 'Khybersoft');

// Paths
define('UPLOAD_PATH', PUBLIC_PATH . '/uploads');
define('UPLOAD_URL', SITE_URL . '/uploads');
define('ASSET_PATH', PUBLIC_PATH . '/assets');
define('ASSET_URL', SITE_URL . '/assets');
define('STORAGE_PATH', ROOT_PATH . '/storage');
define('LOG_PATH', STORAGE_PATH . '/logs');
define('CACHE_PATH', STORAGE_PATH . '/cache');

// Pagination
define('PER_PAGE', 20);
define('ADMIN_PER_PAGE', 15);

// Session
define('SESSION_LIFETIME', 7200); // 2 hours
define('REMEMBER_ME_LIFETIME', 2592000); // 30 days

// Upload
define('MAX_UPLOAD_SIZE', 10 * 1024 * 1024); // 10MB
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']);
define('ALLOWED_DOC_TYPES', ['application/pdf', 'application/zip']);

// Timezone
date_default_timezone_set('UTC');

// Create required directories
$dirs = [STORAGE_PATH, LOG_PATH, CACHE_PATH, UPLOAD_PATH];
foreach ($dirs as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}

// Load .env file if exists
$envFile = ROOT_PATH . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value, " \t\n\r\0\x0B\"'");
        if (!array_key_exists($key, $_ENV)) {
            $_ENV[$key] = $value;
            putenv("$key=$value");
        }
    }
}
