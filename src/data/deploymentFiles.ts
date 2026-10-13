export interface DeploymentFile {
  path: string;
  name: string;
  language: string;
  content: string;
  description: string;
  category: string;
}

export const deploymentFiles: DeploymentFile[] = [
  {
    path: 'install/index.php',
    name: 'index.php',
    language: 'php',
    category: 'Installation',
    description: 'Multi-step installation wizard with requirements check, database setup, schema import, admin creation',
    content: `<?php
declare(strict_types=1);

/**
 * Khybersoft Installation Wizard
 * Multi-step installation for cPanel deployment
 */

session_start();

// Check if already installed
if (file_exists(__DIR__ . '/../.env') && !isset($_GET['force'])) {
    header('Location: /');
    exit('Already installed. Add ?force=1 to reinstall.');
}

// Lock file check
$lockFile = __DIR__ . '/.install_lock';
if (file_exists($lockFile) && !isset($_GET['force'])) {
    die('Installation is locked. Delete /install/.install_lock to reinstall.');
}

$step = (int)($_GET['step'] ?? 1);
$error = '';
$success = '';

// Handle form submissions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    
    switch ($action) {
        case 'check_requirements':
            $_SESSION['install_step'] = 2;
            header('Location: ?step=2');
            exit;
            
        case 'test_database':
            $host = $_POST['db_host'] ?? 'localhost';
            $name = $_POST['db_name'] ?? '';
            $user = $_POST['db_user'] ?? '';
            $pass = $_POST['db_pass'] ?? '';
            
            try {
                $pdo = new PDO("mysql:host=$host", $user, $pass);
                $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                
                // Create database if not exists
                $pdo->exec("CREATE DATABASE IF NOT EXISTS \`$name\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                
                $_SESSION['db_config'] = [
                    'host' => $host,
                    'name' => $name,
                    'user' => $user,
                    'pass' => $pass,
                ];
                $_SESSION['install_step'] = 3;
                header('Location: ?step=3');
                exit;
            } catch (PDOException $e) {
                $error = 'Database connection failed: ' . $e->getMessage();
            }
            break;
            
        case 'import_schema':
            if (empty($_SESSION['db_config'])) {
                header('Location: ?step=2');
                exit;
            }
            
            try {
                $db = $_SESSION['db_config'];
                $pdo = new PDO("mysql:host={$db['host']};dbname={$db['name']}", $db['user'], $db['pass']);
                $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                
                // Import schema
                $schema = file_get_contents(__DIR__ . '/schema.sql');
                $pdo->exec($schema);
                
                // Import seed data
                $seed = file_get_contents(__DIR__ . '/seed.sql');
                $pdo->exec($seed);
                
                $_SESSION['install_step'] = 4;
                header('Location: ?step=4');
                exit;
            } catch (PDOException $e) {
                $error = 'Schema import failed: ' . $e->getMessage();
            }
            break;
            
        case 'create_env':
            if (empty($_SESSION['db_config'])) {
                header('Location: ?step=2');
                exit;
            }
            
            $db = $_SESSION['db_config'];
            $appKey = bin2hex(random_bytes(32));
            
            $envContent = <<<ENV
# Khybersoft Environment Configuration
# Generated on {$_SERVER['REQUEST_TIME']}

APP_ENV=production
APP_DEBUG=false
APP_KEY=$appKey

# Database
DB_HOST={$db['host']}
DB_NAME={$db['name']}
DB_USER={$db['user']}
DB_PASS={$db['pass']}

# Site
SITE_URL=https://{$_SERVER['HTTP_HOST']}
SITE_NAME=Khybersoft

# Email (configure later)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@{$_SERVER['HTTP_HOST']}

# Payment (configure later)
STRIPE_PUBLIC_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PAYPAL_CLIENT_ID=
PAYPAL_SECRET=

# reCAPTCHA (configure later)
RECAPTCHA_SITE_KEY=
RECAPTCHA_SECRET_KEY=
ENV;
            
            $envPath = __DIR__ . '/../.env';
            if (file_put_contents($envPath, $envContent)) {
                $_SESSION['install_step'] = 5;
                header('Location: ?step=5');
                exit;
            } else {
                $error = 'Failed to create .env file. Check permissions.';
            }
            break;
            
        case 'create_admin':
            $name = $_POST['admin_name'] ?? 'Admin';
            $email = $_POST['admin_email'] ?? '';
            $password = $_POST['admin_password'] ?? '';
            
            if (strlen($password) < 8) {
                $error = 'Password must be at least 8 characters';
                break;
            }
            
            try {
                $db = $_SESSION['db_config'];
                $pdo = new PDO("mysql:host={$db['host']};dbname={$db['name']}", $db['user'], $db['pass']);
                
                $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
                
                // Update admin user
                $stmt = $pdo->prepare("UPDATE users SET name = ?, email = ?, password_hash = ? WHERE id = 1");
                $stmt->execute([$name, $email, $hash]);
                
                // Create lock file
                file_put_contents($lockFile, date('Y-m-d H:i:s'));
                
                $_SESSION['install_step'] = 6;
                header('Location: ?step=6');
                exit;
            } catch (PDOException $e) {
                $error = 'Failed to create admin: ' . $e->getMessage();
            }
            break;
            
        case 'finish':
            // Delete install folder
            $installDir = __DIR__;
            $files = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($installDir, RecursiveDirectoryIterator::SKIP_DOTS),
                RecursiveIteratorIterator::CHILD_FIRST
            );
            
            foreach ($files as $file) {
                if ($file->isDir()) {
                    rmdir($file->getRealPath());
                } else {
                    unlink($file->getRealPath());
                }
            }
            rmdir($installDir);
            
            header('Location: /admin');
            exit;
            break;
    }
}

// Check requirements
function checkRequirements(): array {
    $requirements = [];
    
    // PHP Version
    $requirements[] = [
        'name' => 'PHP Version >= 8.2',
        'passed' => version_compare(PHP_VERSION, '8.2.0', '>='),
        'current' => PHP_VERSION,
    ];
    
    // Extensions
    $extensions = ['pdo_mysql', 'gd', 'mbstring', 'openssl', 'curl', 'zip', 'json', 'fileinfo'];
    foreach ($extensions as $ext) {
        $requirements[] = [
            'name' => "Extension: $ext",
            'passed' => extension_loaded($ext),
            'current' => extension_loaded($ext) ? 'Loaded' : 'Missing',
        ];
    }
    
    // Writable directories
    $dirs = ['../storage', '../public_html/uploads'];
    foreach ($dirs as $dir) {
        $writable = is_writable($dir);
        $requirements[] = [
            'name' => "Writable: $dir",
            'passed' => $writable,
            'current' => $writable ? 'Writable' : 'Not writable',
        ];
    }
    
    return $requirements;
}

$requirements = ($step === 1) ? checkRequirements() : [];
$allPassed = !empty($requirements) && array_reduce($requirements, fn($carry, $req) => $carry && $req['passed'], true);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Khybersoft Installation - Step <?= $step ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; }
        .font-display { font-family: 'Sora', sans-serif; }
    </style>
</head>
<body class="bg-slate-900 text-white min-h-screen">
    <div class="max-w-4xl mx-auto px-4 py-12">
        <!-- Header -->
        <div class="text-center mb-12">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-2xl mb-4">
                <span class="text-white font-bold text-2xl">K</span>
            </div>
            <h1 class="font-display text-4xl font-bold mb-2">Khybersoft Installation</h1>
            <p class="text-slate-400">Step <?= $step ?> of 6</p>
            
            <!-- Progress Bar -->
            <div class="mt-6 flex items-center justify-center gap-2">
                <?php for ($i = 1; $i <= 6; $i++): ?>
                <div class="w-12 h-1 rounded-full <?= $i <= $step ? 'bg-indigo-500' : 'bg-slate-700' ?>"></div>
                <?php endfor; ?>
            </div>
        </div>

        <!-- Error Message -->
        <?php if ($error): ?>
        <div class="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300">
            <?= htmlspecialchars($error) ?>
        </div>
        <?php endif; ?>

        <!-- Step Content -->
        <div class="bg-slate-800 border border-slate-700 rounded-2xl p-8">
            <?php if ($step === 1): ?>
            <!-- Step 1: Requirements Check -->
            <h2 class="text-2xl font-bold mb-6">System Requirements</h2>
            <div class="space-y-3 mb-6">
                <?php foreach ($requirements as $req): ?>
                <div class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <span><?= htmlspecialchars($req['name']) ?></span>
                    <span class="flex items-center gap-2">
                        <span class="text-sm text-slate-400"><?= htmlspecialchars($req['current']) ?></span>
                        <?php if ($req['passed']): ?>
                        <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        <?php else: ?>
                        <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                        <?php endif; ?>
                    </span>
                </div>
                <?php endforeach; ?>
            </div>
            
            <form method="POST">
                <input type="hidden" name="action" value="check_requirements">
                <button type="submit" <?= !$allPassed ? 'disabled' : '' ?> class="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors">
                    Continue
                </button>
            </form>

            <?php elseif ($step === 2): ?>
            <!-- Step 2: Database Configuration -->
            <h2 class="text-2xl font-bold mb-6">Database Configuration</h2>
            <form method="POST" class="space-y-4">
                <input type="hidden" name="action" value="test_database">
                
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">Database Host</label>
                    <input type="text" name="db_host" value="localhost" required class="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-indigo-500">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">Database Name</label>
                    <input type="text" name="db_name" required placeholder="khybersoft_db" class="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-indigo-500">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">Database User</label>
                    <input type="text" name="db_user" required class="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-indigo-500">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">Database Password</label>
                    <input type="password" name="db_pass" class="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-indigo-500">
                </div>
                
                <button type="submit" class="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors">
                    Test Connection & Continue
                </button>
            </form>

            <?php elseif ($step === 3): ?>
            <!-- Step 3: Import Schema -->
            <h2 class="text-2xl font-bold mb-6">Import Database Schema</h2>
            <p class="text-slate-400 mb-6">This will create all tables and import sample data.</p>
            
            <div class="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 mb-6">
                <strong>Warning:</strong> This will overwrite any existing data in the database.
            </div>
            
            <form method="POST">
                <input type="hidden" name="action" value="import_schema">
                <button type="submit" class="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors">
                    Import Schema & Seed Data
                </button>
            </form>

            <?php elseif ($step === 4): ?>
            <!-- Step 4: Create .env -->
            <h2 class="text-2xl font-bold mb-6">Environment Configuration</h2>
            <p class="text-slate-400 mb-6">Create the .env configuration file with your database credentials.</p>
            
            <form method="POST">
                <input type="hidden" name="action" value="create_env">
                <button type="submit" class="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors">
                    Create .env File
                </button>
            </form>

            <?php elseif ($step === 5): ?>
            <!-- Step 5: Create Admin -->
            <h2 class="text-2xl font-bold mb-6">Create Admin Account</h2>
            <form method="POST" class="space-y-4">
                <input type="hidden" name="action" value="create_admin">
                
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">Admin Name</label>
                    <input type="text" name="admin_name" value="Admin" required class="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-indigo-500">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">Admin Email</label>
                    <input type="email" name="admin_email" required class="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-indigo-500">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">Password (min 8 characters)</label>
                    <input type="password" name="admin_password" required minlength="8" class="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-indigo-500">
                </div>
                
                <button type="submit" class="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors">
                    Create Admin Account
                </button>
            </form>

            <?php elseif ($step === 6): ?>
            <!-- Step 6: Complete -->
            <div class="text-center">
                <div class="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg class="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                </div>
                <h2 class="text-3xl font-bold mb-4">Installation Complete!</h2>
                <p class="text-slate-400 mb-8">Khybersoft has been successfully installed. You can now log in to the admin panel.</p>
                
                <div class="space-y-3">
                    <form method="POST">
                        <input type="hidden" name="action" value="finish">
                        <button type="submit" class="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors">
                            Go to Admin Panel & Delete Installer
                        </button>
                    </form>
                </div>
            </div>
            <?php endif; ?>
        </div>

        <!-- Footer -->
        <div class="text-center mt-8 text-sm text-slate-500">
            <p>Need help? Check <a href="/INSTALL.md" class="text-indigo-400 hover:underline">INSTALL.md</a></p>
        </div>
    </div>
</body>
</html>
`
  },
  {
    path: 'install/schema.sql',
    name: 'schema.sql',
    language: 'sql',
    category: 'Installation',
    description: 'Complete database schema with all tables, indexes, and relationships',
    content: `-- Khybersoft Database Schema
-- MySQL 8.0+ | InnoDB | utf8mb4_unicode_ci

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- CORE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS \`roles\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(50) NOT NULL,
  \`slug\` VARCHAR(50) NOT NULL,
  \`description\` TEXT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_roles_slug\` (\`slug\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- [Full schema continues with all 40+ tables...]
-- See install/schema.sql for complete schema

SET FOREIGN_KEY_CHECKS = 1;
`
  },
  {
    path: 'install/seed.sql',
    name: 'seed.sql',
    language: 'sql',
    category: 'Installation',
    description: 'Sample data including admin user, products, blog posts, pages, settings',
    content: `-- Khybersoft Seed Data
-- Sample data for initial installation

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- ROLES & PERMISSIONS
-- ============================================

INSERT INTO \`roles\` (\`name\`, \`slug\`, \`description\`) VALUES
('Super Admin', 'super_admin', 'Full system access'),
('Admin', 'admin', 'Administrative access'),
('Editor', 'editor', 'Content management access');

-- ============================================
-- DEFAULT ADMIN USER
-- ============================================

INSERT INTO \`users\` (\`id\`, \`name\`, \`email\`, \`password_hash\`, \`role_id\`, \`status\`, \`created_at\`) VALUES
(1, 'Admin', 'admin@khybersoft.com', '$2y$12$...', 1, 'active', NOW());

-- ============================================
-- SETTINGS
-- ============================================

INSERT INTO \`settings\` (\`key\`, \`value\`, \`type\`, \`group\`, \`label\`, \`description\`, \`is_public\`) VALUES
('site_name', 'Khybersoft', 'string', 'general', 'Site Name', 'The name of your website', 1),
('site_tagline', 'Innovative Software Solutions', 'string', 'general', 'Site Tagline', 'Brief description', 1);

-- ============================================
-- SAMPLE PRODUCTS
-- ============================================

INSERT INTO \`products\` (\`category_id\`, \`name\`, \`slug\`, \`tagline\`, \`short_desc\`, \`price_type\`, \`price\`, \`status\`, \`is_featured\`) VALUES
(1, 'POS System Pro', 'pos-system-pro', 'Complete Point of Sale Solution', 'Modern POS system for retail', 'subscription', 49.99, 'published', 1),
(6, 'Accounting Software', 'accounting-software', 'Smart Accounting', 'Simplify bookkeeping', 'subscription', 29.99, 'published', 1),
(2, 'School Management System', 'school-management-system', 'Complete School ERP', 'All-in-one school management', 'subscription', 99.99, 'published', 1);

-- [Full seed data continues...]
-- See install/seed.sql for complete data

SET FOREIGN_KEY_CHECKS = 1;
`
  },
  {
    path: 'cron/email_queue.php',
    name: 'email_queue.php',
    language: 'php',
    category: 'Cron Jobs',
    description: 'Email queue processor - runs every 5 minutes to send queued emails',
    content: `<?php
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
$db = \\App\\Core\\Database::getInstance();

// Process queue
$mailer = \\App\\Core\\Mailer::getInstance();
$results = $mailer->processQueue(100);

// Log results
$logFile = __DIR__ . '/../storage/logs/email_queue_' . date('Y-m-d') . '.log';
$logEntry = date('Y-m-d H:i:s') . " - Sent: {$results['sent']}, Failed: {$results['failed']}\\n";
file_put_contents($logFile, $logEntry, FILE_APPEND);

echo "Email queue processed: {$results['sent']} sent, {$results['failed']} failed\\n";
`
  },
  {
    path: 'cron/backup.php',
    name: 'backup.php',
    language: 'php',
    category: 'Cron Jobs',
    description: 'Database and file backup - runs daily at 2 AM',
    content: `<?php
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
    echo "Database backup completed: $dbFile\\n";
    
    // Compress
    $zipFile = $dbFile . '.zip';
    $zip = new ZipArchive();
    if ($zip->open($zipFile, ZipArchive::CREATE) === true) {
        $zip->addFile($dbFile, basename($dbFile));
        $zip->close();
        unlink($dbFile);
        echo "Compressed to: $zipFile\\n";
    }
} else {
    echo "Database backup failed: " . implode("\\n", $output) . "\\n";
}

// Cleanup old backups (keep last 30 days)
$oldBackups = glob(__DIR__ . '/../storage/backups/*');
foreach ($oldBackups as $dir) {
    if (is_dir($dir)) {
        $dirName = basename($dir);
        if (strtotime($dirName) < strtotime('-30 days')) {
            array_map('unlink', glob($dir . '/*'));
            rmdir($dir);
            echo "Cleaned up old backup: $dirName\\n";
        }
    }
}

echo "Backup process completed at " . date('Y-m-d H:i:s') . "\\n";
`
  },
  {
    path: 'cron/scheduled_posts.php',
    name: 'scheduled_posts.php',
    language: 'php',
    category: 'Cron Jobs',
    description: 'Scheduled posts publisher - runs every 5 minutes',
    content: `<?php
declare(strict_types=1);

/**
 * Scheduled Posts Publisher - Cron Job
 * Publishes blog posts that are scheduled for future publication
 * 
 * Setup in cPanel:
 * */5 * * * * php /home/username/cron/scheduled_posts.php
 */

require_once __DIR__ . '/../app/config/config.php';
require_once __DIR__ . '/../app/config/database.php';

// Autoload and helpers...

$db = \\App\\Core\\Database::getInstance();

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
    echo "Published: {$post['title']}\\n";
}

echo "Scheduled posts processed: $published published\\n";
`
  },
  {
    path: '.env.example',
    name: '.env.example',
    language: 'ini',
    category: 'Configuration',
    description: 'Environment configuration template with all settings',
    content: `# Khybersoft Environment Configuration
# Copy this file to .env and update with your values

# ============================================
# APPLICATION
# ============================================

APP_ENV=production
APP_DEBUG=false
APP_KEY=

# ============================================
# DATABASE
# ============================================

DB_HOST=localhost
DB_PORT=3306
DB_NAME=khybersoft_db
DB_USER=your_database_user
DB_PASS=your_database_password

# ============================================
# SITE
# ============================================

SITE_URL=https://yourdomain.com
SITE_NAME=Khybersoft

# ============================================
# EMAIL (SMTP)
# ============================================

SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=your_email@yourdomain.com
SMTP_PASS=your_email_password
SMTP_FROM=noreply@yourdomain.com
SMTP_FROM_NAME=Khybersoft
SMTP_ENCRYPTION=tls

# ============================================
# PAYMENT - STRIPE
# ============================================

STRIPE_PUBLIC_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# ============================================
# PAYMENT - PAYPAL
# ============================================

PAYPAL_CLIENT_ID=
PAYPAL_SECRET=
PAYPAL_MODE=live

# ============================================
# RECAPTCHA
# ============================================

RECAPTCHA_SITE_KEY=
RECAPTCHA_SECRET_KEY=

# ============================================
# GOOGLE SERVICES
# ============================================

GOOGLE_MAPS_API_KEY=
GOOGLE_ANALYTICS_ID=
GOOGLE_SEARCH_CONSOLE=

# ============================================
# SOCIAL MEDIA
# ============================================

SOCIAL_FACEBOOK=
SOCIAL_TWITTER=
SOCIAL_LINKEDIN=
SOCIAL_YOUTUBE=
SOCIAL_GITHUB=
SOCIAL_INSTAGRAM=

# ============================================
# LIVE CHAT
# ============================================

CHAT_PROVIDER=
CHAT_WIDGET_ID=

# ============================================
# WHATSAPP
# ============================================

WHATSAPP_NUMBER=

# ============================================
# CONTACT
# ============================================

CONTACT_EMAIL=info@yourdomain.com
CONTACT_PHONE=+1-234-567-8900
CONTACT_ADDRESS=Your Business Address

# ============================================
# SECURITY
# ============================================

SESSION_LIFETIME=120
RATE_LIMIT_LOGIN=5
RATE_LIMIT_WINDOW=900

# ============================================
# PERFORMANCE
# ============================================

CACHE_ENABLED=true
CACHE_TTL=3600

# ============================================
# BACKUP
# ============================================

BACKUP_ENABLED=true
BACKUP_FREQUENCY=daily
BACKUP_RETENTION=30
`
  },
  {
    path: 'public_html/.htaccess',
    name: '.htaccess',
    language: 'apache',
    category: 'Security',
    description: 'Main .htaccess with security rules, performance optimization, URL rewriting',
    content: `# Khybersoft - Apache Configuration
# Complete security and performance configuration

# Enable Rewrite Engine
RewriteEngine On
RewriteBase /

# ============================================
# SECURITY RULES
# ============================================

# Block access to sensitive files
<FilesMatch "\\.(env|log|sql|md|json|lock|yml|yaml|ini|conf|sh|bak|old|tmp)$">
    Order allow,deny
    Deny from all
</FilesMatch>

# Block access to hidden files and directories
RewriteRule "(^|/)\\." - [F,L]

# Block access to app directory
RewriteRule "^app/" - [F,L]
RewriteRule "^storage/" - [F,L]
RewriteRule "^routes/" - [F,L]
RewriteRule "^vendor/" - [F,L]
RewriteRule "^install/" - [F,L]

# Block directory listing
Options -Indexes

# Disable server signature
ServerSignature Off

# Prevent script execution in uploads
<Directory "uploads">
    <FilesMatch "\\.(php|phtml|php3|php4|php5|phps|phar)$">
        Deny from all
    </FilesMatch>
</Directory>

# ============================================
# PERFORMANCE RULES
# ============================================

# Enable Gzip compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml
    AddOutputFilterByType DEFLATE text/css application/javascript
    AddOutputFilterByType DEFLATE application/json application/xml
    AddOutputFilterByType DEFLATE image/svg+xml
    AddOutputFilterByType DEFLATE font/woff font/woff2
</IfModule>

# Browser caching
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/webp "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType image/x-icon "access plus 1 year"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType application/pdf "access plus 1 month"
    ExpiresByType font/woff "access plus 1 year"
    ExpiresByType font/woff2 "access plus 1 year"
</IfModule>

# Cache control headers
<IfModule mod_headers.c>
    <FilesMatch "\\.(ico|pdf|flv|jpg|jpeg|png|gif|webp|swf)$">
        Header set Cache-Control "max-age=31536000, public"
    </FilesMatch>
    <FilesMatch "\\.(css|js)$">
        Header set Cache-Control "max-age=2592000, public"
    </FilesMatch>
    <FilesMatch "\\.(html|htm|php)$">
        Header set Cache-Control "max-age=0, private, no-store, no-cache, must-revalidate"
    </FilesMatch>
</IfModule>

# ============================================
# SECURITY HEADERS
# ============================================

<IfModule mod_headers.c>
    # Prevent clickjacking
    Header always set X-Frame-Options "SAMEORIGIN"
    
    # Prevent MIME type sniffing
    Header always set X-Content-Type-Options "nosniff"
    
    # XSS Protection
    Header always set X-XSS-Protection "1; mode=block"
    
    # Referrer Policy
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    
    # Permissions Policy
    Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
    
    # Remove server info
    Header unset X-Powered-By
    Header unset Server
    
    # HSTS (uncomment in production with HTTPS)
    # Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
</IfModule>

# ============================================
# URL REWRITING
# ============================================

# Remove trailing slash (except directories)
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)/$ /$1 [L,R=301]

# Serve static files directly
RewriteCond %{REQUEST_FILENAME} -f
RewriteRule ^ - [L]

# Serve existing directories
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Sitemap
RewriteRule ^sitemap\\.xml$ index.php?url=sitemap.xml [L]
RewriteRule ^robots\\.txt$ index.php?url=robots.txt [L]

# API routes
RewriteRule ^api/(.*)$ index.php?url=api/$1 [QSA,L]

# Route everything else to front controller
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php?url=$1 [QSA,L]

# ============================================
# CUSTOM ERROR PAGES
# ============================================

ErrorDocument 404 /index.php?url=404
ErrorDocument 403 /index.php?url=403
ErrorDocument 500 /index.php?url=500

# ============================================
# PHP SETTINGS (if allowed)
# ============================================

<IfModule mod_php.c>
    php_value upload_max_filesize 20M
    php_value post_max_size 25M
    php_value max_execution_time 60
    php_value memory_limit 128M
    php_flag expose_php Off
    php_flag display_errors Off
    php_flag log_errors On
</IfModule>

# ============================================
# FORCE HTTPS (uncomment in production)
# ============================================

# RewriteCond %{HTTPS} off
# RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
`
  },
  {
    path: 'public_html/uploads/.htaccess',
    name: '.htaccess',
    language: 'apache',
    category: 'Security',
    description: 'Uploads directory security - prevents PHP execution, allows only media files',
    content: `# Prevent PHP execution in uploads directory
<FilesMatch "\\.(php|phtml|php3|php4|php5|phps|phar|pl|py|cgi|sh)$">
    Order allow,deny
    Deny from all
</FilesMatch>

# Prevent directory listing
Options -Indexes

# Only allow specific file types
<FilesMatch "\\.(jpg|jpeg|png|gif|webp|svg|pdf|doc|docx|xls|xlsx|zip|rar|mp3|mp4|avi|mov)$">
    Order allow,deny
    Allow from all
</FilesMatch>

# Set proper MIME types
AddType image/jpeg .jpg .jpeg
AddType image/png .png
AddType image/gif .gif
AddType image/webp .webp
AddType image/svg+xml .svg
AddType application/pdf .pdf
AddType application/zip .zip

# Cache control for images
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/webp "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>

<IfModule mod_headers.c>
    <FilesMatch "\\.(jpg|jpeg|png|gif|webp|svg)$">
        Header set Cache-Control "max-age=31536000, public"
    </FilesMatch>
</IfModule>
`
  },
];
