<?php
declare(strict_types=1);

/**
 * Khybersoft Installation Wizard
 * Multi-step installation for cPanel deployment
 */

session_start();

function projectBasePath(): string {
    $requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $basePath = preg_replace('#/index\.php$#', '', $requestPath);
    $basePath = preg_replace('#/install/?$#', '', $basePath);
    $basePath = rtrim($basePath, '/');

    return $basePath !== '' ? $basePath : '/';
}

function redirectTo(string $path): void {
    $basePath = projectBasePath();
    $target = $basePath === '/' ? $path : $basePath . $path;
    header('Location: ' . $target);
}

// Check if already installed
if (file_exists(__DIR__ . '/../.env') && !isset($_GET['force'])) {
    redirectTo('/');
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
            $port = (int)($_POST['db_port'] ?? 3306);
            $name = $_POST['db_name'] ?? '';
            $user = $_POST['db_user'] ?? '';
            $pass = $_POST['db_pass'] ?? '';
            
            try {
                $dsn = "mysql:host=$host;port=$port";
                $pdo = new PDO($dsn, $user, $pass);
                $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                
                // Create database if not exists
                $pdo->exec("CREATE DATABASE IF NOT EXISTS `$name` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                
                $_SESSION['db_config'] = [
                    'host' => $host,
                    'port' => $port,
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
                $pdo = new PDO("mysql:host={$db['host']};port={$db['port']};dbname={$db['name']}", $db['user'], $db['pass']);
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
            $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['SERVER_PORT'] ?? 443) == 443 ? 'https' : 'http';
            $siteUrl = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . projectBasePath();
            
            $envContent = <<<ENV
# Khybersoft Environment Configuration
# Generated on {$_SERVER['REQUEST_TIME']}

APP_ENV=production
APP_DEBUG=false
APP_KEY=$appKey

# Database
DB_HOST={$db['host']}
DB_PORT={$db['port']}
DB_NAME={$db['name']}
DB_USER={$db['user']}
DB_PASS={$db['pass']}

# Site
SITE_URL={$siteUrl}
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
                $pdo = new PDO("mysql:host={$db['host']};port={$db['port']};dbname={$db['name']}", $db['user'], $db['pass']);
                
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
            
            redirectTo('/admin');
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
                    <label class="block text-sm font-medium text-slate-300 mb-2">Database Port</label>
                    <input type="number" name="db_port" value="3307" min="1" max="65535" required class="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-indigo-500">
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
