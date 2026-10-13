<?php
declare(strict_types=1);

/**
 * Scheduled Posts Publisher - Cron Job
 * Publishes blog posts that are scheduled for future publication
 * 
 * Setup in cPanel:
 * */5 * * * * php /home/username/cron/scheduled_posts.php
 */

// Bootstrap application
require_once __DIR__ . '/../app/config/config.php';
require_once __DIR__ . '/../app/config/database.php';

// Autoload classes
spl_autoload_register(function ($class) {
    $paths = [
        __DIR__ . '/../app/core/',
        __DIR__ . '/../app/models/',
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

// Initialize database
$db = \App\Core\Database::getInstance();

// Find posts scheduled for publication
$now = date('Y-m-d H:i:s');
$posts = $db->fetchAll(
    "SELECT id, title FROM blog_posts 
     WHERE status = 'scheduled' 
     AND published_at <= ? 
     AND deleted_at IS NULL",
    [$now]
);

$published = 0;
foreach ($posts as $post) {
    $db->update('blog_posts', [
        'status' => 'published',
        'updated_at' => $now,
    ], 'id = ?', [$post['id']]);
    
    $published++;
    echo "Published: {$post['title']}\n";
}

// Log results
$logFile = __DIR__ . '/../storage/logs/scheduled_posts_' . date('Y-m-d') . '.log';
$logEntry = date('Y-m-d H:i:s') . " - Published: $published posts\n";
file_put_contents($logFile, $logEntry, FILE_APPEND);

echo "Scheduled posts processed: $published published\n";
