<?php
declare(strict_types=1);

/**
 * Sitemap Generator - Cron Job
 * Regenerates sitemap.xml daily
 * 
 * Setup in cPanel:
 * 0 3 * * * php /home/username/cron/sitemap.php
 */

// Bootstrap application
require_once __DIR__ . '/../app/config/config.php';
require_once __DIR__ . '/../app/config/database.php';

// Autoload classes
spl_autoload_register(function ($class) {
    $paths = [
        __DIR__ . '/../app/core/',
        __DIR__ . '/../app/helpers/',
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
require_once __DIR__ . '/../app/helpers/functions.php';

// Generate sitemap
$sitemap = \App\Core\Seo::generateSitemap();

// Save to public directory
$sitemapPath = __DIR__ . '/../public_html/sitemap.xml';
if (file_put_contents($sitemapPath, $sitemap)) {
    echo "Sitemap generated successfully: $sitemapPath\n";
    echo "Total URLs: " . substr_count($sitemap, '<url>') . "\n";
} else {
    echo "Failed to generate sitemap\n";
}

// Log results
$logFile = __DIR__ . '/../storage/logs/sitemap_' . date('Y-m-d') . '.log';
$logEntry = date('Y-m-d H:i:s') . " - Sitemap regenerated\n";
file_put_contents($logFile, $logEntry, FILE_APPEND);
