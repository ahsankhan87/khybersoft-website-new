<?php
declare(strict_types=1);

/**
 * Email Queue Processor - Cron Job
 * Processes pending emails in the queue
 * 
 * Setup in cPanel:
 * */5 * * * * php /home/username/cron/email_queue.php
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

// Process queue
$mailer = \App\Core\Mailer::getInstance();
$results = $mailer->processQueue(100);

// Log results
$logFile = __DIR__ . '/../storage/logs/email_queue_' . date('Y-m-d') . '.log';
$logEntry = date('Y-m-d H:i:s') . " - Sent: {$results['sent']}, Failed: {$results['failed']}\n";
file_put_contents($logFile, $logEntry, FILE_APPEND);

echo "Email queue processed: {$results['sent']} sent, {$results['failed']} failed\n";
