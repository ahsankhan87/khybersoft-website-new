<?php
declare(strict_types=1);

/**
 * Database Backup - Cron Job
 * Creates daily database backups
 * 
 * Setup in cPanel:
 * 0 2 * * * php /home/username/cron/backup.php
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

// Create backup directory
$backupDir = __DIR__ . '/../storage/backups/' . date('Y-m-d');
if (!is_dir($backupDir)) {
    mkdir($backupDir, 0755, true);
}

// Database backup
$dbConfig = require __DIR__ . '/../app/config/database.php';
$dbFile = $backupDir . '/database_' . date('Y-m-d_H-i-s') . '.sql';

$command = sprintf(
    'mysqldump -h%s -u%s -p%s %s > %s 2>&1',
    escapeshellarg($dbConfig['host']),
    escapeshellarg($dbConfig['username']),
    escapeshellarg($dbConfig['password']),
    escapeshellarg($dbConfig['database']),
    escapeshellarg($dbFile)
);

exec($command, $output, $returnCode);

if ($returnCode === 0) {
    echo "Database backup completed: $dbFile\n";
    
    // Compress
    $zipFile = $dbFile . '.zip';
    $zip = new ZipArchive();
    if ($zip->open($zipFile, ZipArchive::CREATE) === true) {
        $zip->addFile($dbFile, basename($dbFile));
        $zip->close();
        unlink($dbFile);
        echo "Compressed to: $zipFile\n";
    }
} else {
    echo "Database backup failed: " . implode("\n", $output) . "\n";
}

// File backup (uploads)
$uploadsDir = __DIR__ . '/../public_html/uploads';
if (is_dir($uploadsDir)) {
    $filesZip = $backupDir . '/uploads_' . date('Y-m-d_H-i-s') . '.zip';
    $zip = new ZipArchive();
    if ($zip->open($filesZip, ZipArchive::CREATE) === true) {
        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($uploadsDir),
            RecursiveIteratorIterator::LEAVES_ONLY
        );
        
        foreach ($files as $file) {
            if (!$file->isDir()) {
                $filePath = $file->getRealPath();
                $relativePath = substr($filePath, strlen($uploadsDir) + 1);
                $zip->addFile($filePath, $relativePath);
            }
        }
        
        $zip->close();
        echo "Uploads backup completed: $filesZip\n";
    }
}

// Cleanup old backups (keep last 30 days)
$oldBackups = glob(__DIR__ . '/../storage/backups/*');
foreach ($oldBackups as $dir) {
    if (is_dir($dir)) {
        $dirName = basename($dir);
        if (strtotime($dirName) < strtotime('-30 days')) {
            array_map('unlink', glob($dir . '/*'));
            rmdir($dir);
            echo "Cleaned up old backup: $dirName\n";
        }
    }
}

echo "Backup process completed at " . date('Y-m-d H:i:s') . "\n";
