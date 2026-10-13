<?php
declare(strict_types=1);

/**
 * Newsletter Sender - Cron Job
 * Sends batched newsletter emails to subscribers
 * 
 * Setup in cPanel:
 * 0 */6 * * * php /home/username/cron/newsletter.php
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

// Get active subscribers
$subscribers = $db->fetchAll(
    "SELECT email, token FROM newsletter_subscribers 
     WHERE status = 'active' 
     AND verified = 1
     ORDER BY subscribed_at DESC"
);

// Get latest newsletter (if any)
$newsletter = $db->fetch(
    "SELECT * FROM newsletters 
     WHERE status = 'ready' 
     AND send_at <= NOW()
     ORDER BY created_at DESC 
     LIMIT 1"
);

if (!$newsletter) {
    echo "No newsletters ready to send\n";
    exit;
}

// Mark newsletter as sending
$db->update('newsletters', ['status' => 'sending'], 'id = ?', [$newsletter['id']]);

// Send to subscribers in batches
$mailer = \App\Core\Mailer::getInstance();
$batchSize = 50;
$sent = 0;
$failed = 0;

foreach (array_chunk($subscribers, $batchSize) as $batch) {
    foreach ($batch as $subscriber) {
        $variables = [
            'email' => $subscriber['email'],
            'unsubscribe_token' => $subscriber['token'],
        ];
        
        $success = $mailer->sendTemplate(
            $subscriber['email'],
            $newsletter['template_slug'],
            $variables,
            ['add_unsubscribe' => true]
        );
        
        if ($success) {
            $sent++;
        } else {
            $failed++;
        }
    }
    
    // Small delay to avoid overwhelming mail server
    sleep(1);
}

// Update newsletter status
$db->update('newsletters', [
    'status' => 'sent',
    'sent_count' => $sent,
    'failed_count' => $failed,
    'sent_at' => date('Y-m-d H:i:s'),
], 'id = ?', [$newsletter['id']]);

// Log results
$logFile = __DIR__ . '/../storage/logs/newsletter_' . date('Y-m-d') . '.log';
$logEntry = date('Y-m-d H:i:s') . " - Newsletter #{$newsletter['id']}: Sent: $sent, Failed: $failed\n";
file_put_contents($logFile, $logEntry, FILE_APPEND);

echo "Newsletter #{$newsletter['id']} sent: $sent successful, $failed failed\n";
