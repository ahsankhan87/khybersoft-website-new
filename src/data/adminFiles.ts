export interface AdminPhpFile {
  path: string;
  name: string;
  language: string;
  content: string;
  description: string;
  category: string;
}

export const adminPhpFiles: AdminPhpFile[] = [
  // ============================================
  // AUTH CONTROLLER
  // ============================================
  {
    path: 'app/controllers/admin/AuthController.php',
    name: 'AuthController.php',
    language: 'php',
    category: 'Authentication',
    description: 'Full authentication: login, logout, forgot/reset password, 2FA, rate limiting',
    content: `<?php
declare(strict_types=1);

namespace App\\Controllers\\Admin;

use App\\Core\\Controller;
use App\\Core\\Auth;
use App\\Core\\Validator;
use App\\Core\\Database;
use App\\Core\\RateLimiter;

/**
 * Admin Authentication Controller
 * Handles login, logout, forgot password, reset, and 2FA
 */
class AuthController extends Controller
{
    protected string \$layout = 'admin.auth';

    /**
     * Show login page
     */
    public function showLogin(): void
    {
        if (Auth::check()) {
            \$this->redirect(url('admin'));
            return;
        }

        \$this->view('admin.auth.login', [
            'page_title' => 'Admin Login',
            'email' => old('email'),
        ]);
    }

    /**
     * Process login
     */
    public function login(): void
    {
        if (!\$this->validateCsrf()) return;

        // Rate limiting: 5 attempts per 15 minutes
        \$ip = client_ip();
        \$limiter = new RateLimiter('login_' . \$ip, 5, 900);

        if (\$limiter->isLimited()) {
            \$remaining = \$limiter->getRemainingSeconds();
            flash('error', "Too many login attempts. Please try again in {\$remaining} seconds.");
            \$this->redirect(url('admin/login'));
            return;
        }

        \$validator = Validator::make(\$_POST, [
            'email' => 'required|email',
            'password' => 'required|min:6',
        ]);

        if (!\$validator->validate()) {
            flash_input();
            flash('errors', json_encode(\$validator->errors()));
            \$this->redirect(url('admin/login'));
            return;
        }

        \$email = trim(\$this->input('email'));
        \$password = \$this->input('password');
        \$remember = (bool) \$this->input('remember');

        // Check if account is locked
        \$db = Database::getInstance();
        \$user = \$db->fetch(
            "SELECT * FROM users WHERE email = ? AND deleted_at IS NULL",
            [\$email]
        );

        if (\$user && \$user['status'] === 'banned') {
            flash('error', 'Your account has been suspended. Contact administrator.');
            \$this->redirect(url('admin/login'));
            return;
        }

        // Check account lockout (after 5 failed attempts)
        if (\$user && isset(\$user['lockout_until']) && strtotime(\$user['lockout_until']) > time()) {
            \$remaining = strtotime(\$user['lockout_until']) - time();
            flash('error', "Account temporarily locked. Try again in " . ceil(\$remaining / 60) . " minutes.");
            \$this->redirect(url('admin/login'));
            return;
        }

        if (Auth::attempt(\$email, \$password, \$remember)) {
            \$limiter->clear();
            clear_old_input();

            // Reset failed login attempts
            if (\$user) {
                \$db->update('users', [
                    'failed_attempts' => 0,
                    'lockout_until' => null,
                ], 'id = ?', [\$user['id']]);
            }

            \$currentUser = Auth::user();

            // Check if 2FA is enabled
            if (\$currentUser && !empty(\$currentUser['two_factor_secret'])) {
                \$_SESSION['2fa_pending'] = true;
                \$_SESSION['2fa_user_id'] = \$currentUser['id'];
                \$this->redirect(url('admin/2fa/verify'));
                return;
            }

            // Redirect to intended or dashboard
            \$intended = \$_SESSION['intended_url'] ?? url('admin');
            unset(\$_SESSION['intended_url']);
            \$this->redirect(\$intended);
        } else {
            \$limiter->hit();

            // Track failed attempts for account lockout
            if (\$user) {
                \$failedAttempts = ((int) (\$user['failed_attempts'] ?? 0)) + 1;
                \$updateData = ['failed_attempts' => \$failedAttempts];

                if (\$failedAttempts >= 5) {
                    \$updateData['lockout_until'] = date('Y-m-d H:i:s', time() + 900); // 15 min
                    flash('error', 'Too many failed attempts. Account locked for 15 minutes.');
                } else {
                    \$remaining = 5 - \$failedAttempts;
                    flash('error', "Invalid credentials. {\$remaining} attempts remaining.");
                }

                \$db->update('users', \$updateData, 'id = ?', [\$user['id']]);
            } else {
                flash('error', 'Invalid email or password.');
            }

            flash_input();
            \$this->redirect(url('admin/login'));
        }
    }

    /**
     * Logout
     */
    public function logout(): void
    {
        Auth::logout();
        \$this->redirect(url('admin/login'));
    }

    /**
     * Show forgot password form
     */
    public function showForgotPassword(): void
    {
        \$this->view('admin.auth.forgot-password', [
            'page_title' => 'Forgot Password',
        ]);
    }

    /**
     * Process forgot password - send reset email
     */
    public function forgotPassword(): void
    {
        if (!\$this->validateCsrf()) return;

        \$validator = Validator::make(\$_POST, [
            'email' => 'required|email',
        ]);

        if (!\$validator->validate()) {
            flash_input();
            flash('errors', json_encode(\$validator->errors()));
            \$this->redirect(url('admin/forgot-password'));
            return;
        }

        \$email = trim(\$this->input('email'));
        \$db = Database::getInstance();
        \$user = \$db->fetch(
            "SELECT id, name, email FROM users WHERE email = ? AND status = 'active' AND deleted_at IS NULL",
            [\$email]
        );

        // Always show success (prevent email enumeration)
        if (\$user) {
            // Generate reset token
            \$token = bin2hex(random_bytes(32));
            \$hashedToken = hash('sha256', \$token);
            \$expiresAt = date('Y-m-d H:i:s', time() + 3600); // 1 hour

            \$db->insert('password_resets', [
                'user_id' => \$user['id'],
                'token' => \$hashedToken,
                'expires_at' => \$expiresAt,
                'used' => 0,
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            // Send email
            \$resetUrl = url('admin/reset-password?token=' . \$token . '&email=' . urlencode(\$email));
            \$this->sendResetEmail(\$user['name'], \$user['email'], \$resetUrl);

            // Log activity
            \$db->insert('activity_logs', [
                'user_id' => \$user['id'],
                'action' => 'password_reset_requested',
                'description' => 'Password reset requested',
                'ip' => client_ip(),
                'user_agent' => \$_SERVER['HTTP_USER_AGENT'] ?? '',
                'created_at' => date('Y-m-d H:i:s'),
            ]);
        }

        flash('success', 'If an account exists with that email, a password reset link has been sent.');
        \$this->redirect(url('admin/forgot-password'));
    }

    /**
     * Show reset password form
     */
    public function showResetPassword(): void
    {
        \$token = \$_GET['token'] ?? '';
        \$email = \$_GET['email'] ?? '';

        if (!\$token || !\$email) {
            flash('error', 'Invalid reset link.');
            \$this->redirect(url('admin/login'));
            return;
        }

        \$this->view('admin.auth.reset-password', [
            'page_title' => 'Reset Password',
            'token' => \$token,
            'email' => \$email,
        ]);
    }

    /**
     * Process password reset
     */
    public function resetPassword(): void
    {
        if (!\$this->validateCsrf()) return;

        \$validator = Validator::make(\$_POST, [
            'email' => 'required|email',
            'token' => 'required',
            'password' => 'required|min:8|confirmed',
        ]);

        if (!\$validator->validate()) {
            flash('errors', json_encode(\$validator->errors()));
            \$this->redirectBack();
            return;
        }

        \$email = trim(\$this->input('email'));
        \$token = \$this->input('token');
        \$hashedToken = hash('sha256', \$token);
        \$db = Database::getInstance();

        // Verify token
        \$reset = \$db->fetch(
            "SELECT pr.*, u.id as user_id FROM password_resets pr
             INNER JOIN users u ON pr.user_id = u.id
             WHERE pr.token = ? AND u.email = ? AND pr.used = 0 AND pr.expires_at > NOW()",
            [\$hashedToken, \$email]
        );

        if (!\$reset) {
            flash('error', 'Invalid or expired reset token.');
            \$this->redirect(url('admin/forgot-password'));
            return;
        }

        // Update password
        \$newPassword = password_hash(\$this->input('password'), PASSWORD_BCRYPT, ['cost' => 12]);

        \$db->update('users', [
            'password_hash' => \$newPassword,
            'updated_at' => date('Y-m-d H:i:s'),
        ], 'id = ?', [\$reset['user_id']]);

        // Mark token as used
        \$db->update('password_resets', ['used' => 1], 'id = ?', [\$reset['id']]);

        // Force logout all sessions (clear remember token)
        \$db->update('users', ['remember_token' => null], 'id = ?', [\$reset['user_id']]);

        // Log activity
        \$db->insert('activity_logs', [
            'user_id' => \$reset['user_id'],
            'action' => 'password_reset_completed',
            'description' => 'Password was reset',
            'ip' => client_ip(),
            'user_agent' => \$_SERVER['HTTP_USER_AGENT'] ?? '',
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        flash('success', 'Password has been reset successfully. Please log in with your new password.');
        \$this->redirect(url('admin/login'));
    }

    /**
     * Show 2FA verification page
     */
    public function show2FAVerify(): void
    {
        if (!isset(\$_SESSION['2fa_pending'])) {
            \$this->redirect(url('admin/login'));
            return;
        }

        \$this->view('admin.auth.two-factor', [
            'page_title' => 'Two-Factor Authentication',
        ]);
    }

    /**
     * Verify 2FA code
     */
    public function verify2FA(): void
    {
        if (!\$this->validateCsrf()) return;

        if (!isset(\$_SESSION['2fa_pending']) || !isset(\$_SESSION['2fa_user_id'])) {
            \$this->redirect(url('admin/login'));
            return;
        }

        \$code = \$this->input('code');
        \$userId = (int) \$_SESSION['2fa_user_id'];
        \$db = Database::getInstance();

        \$user = \$db->fetch("SELECT * FROM users WHERE id = ?", [\$userId]);

        if (!\$user || empty(\$user['two_factor_secret'])) {
            unset(\$_SESSION['2fa_pending'], \$_SESSION['2fa_user_id']);
            \$this->redirect(url('admin/login'));
            return;
        }

        // Verify TOTP code
        if (TOTP::verify(\$user['two_factor_secret'], \$code)) {
            unset(\$_SESSION['2fa_pending'], \$_SESSION['2fa_user_id']);

            \$intended = \$_SESSION['intended_url'] ?? url('admin');
            unset(\$_SESSION['intended_url']);
            \$this->redirect(\$intended);
        } else {
            flash('error', 'Invalid verification code. Please try again.');
            \$this->redirect(url('admin/2fa/verify'));
        }
    }

    /**
     * Send password reset email
     */
    private function sendResetEmail(string \$name, string \$email, string \$resetUrl): void
    {
        \$siteName = setting('site_name', 'Khybersoft');
        \$subject = "Password Reset - {\$siteName}";

        \$body = "
        <html>
        <body style='font-family: Arial, sans-serif; background: #f8fafc; padding: 40px;'>
            <div style='max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);'>
                <h2 style='color: #1e293b;'>Password Reset</h2>
                <p style='color: #64748b;'>Hi {\$name},</p>
                <p style='color: #64748b;'>You requested a password reset. Click the button below to reset your password:</p>
                <a href='{\$resetUrl}' style='display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;'>Reset Password</a>
                <p style='color: #94a3b8; font-size: 13px;'>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
                <p style='color: #94a3b8; font-size: 13px;'>Or copy this URL: {\$resetUrl}</p>
            </div>
        </body>
        </html>";

        \$headers = [
            'MIME-Version: 1.0',
            'Content-type: text/html; charset=UTF-8',
            'From: ' . setting('site_name', 'Khybersoft') . ' <' . setting('site_email', 'noreply@khybersoft.com') . '>',
            'X-Mailer: PHP/' . phpversion(),
        ];

        // Use PHP mail() - note: for production, configure SMTP in settings
        @mail(\$email, \$subject, \$body, implode("\\r\\n", \$headers));
    }
}
`
  },
  // ============================================
  // DASHBOARD CONTROLLER
  // ============================================
  {
    path: 'app/controllers/admin/DashboardController.php',
    name: 'DashboardController.php',
    language: 'php',
    category: 'Dashboard',
    description: 'Admin dashboard with stats, recent inquiries, activity feed, system health',
    content: `<?php
declare(strict_types=1);

namespace App\\Controllers\\Admin;

use App\\Core\\Controller;
use App\\Core\\Database;
use App\\Core\\Auth;

/**
 * Admin Dashboard Controller
 * Displays overview stats, recent activity, and system health
 */
class DashboardController extends Controller
{
    protected string \$layout = 'admin.main';

    public function index(): void
    {
        \$db = Database::getInstance();

        // ---- Stats Cards ----
        \$stats = [
            'total_products' => (int) \$db->fetchColumn(
                "SELECT COUNT(*) FROM products WHERE deleted_at IS NULL"
            ),
            'inquiries_today' => (int) \$db->fetchColumn(
                "SELECT COUNT(*) FROM product_inquiries WHERE DATE(created_at) = CURDATE()"
            ),
            'inquiries_total' => (int) \$db->fetchColumn(
                "SELECT COUNT(*) FROM product_inquiries"
            ),
            'blog_posts' => (int) \$db->fetchColumn(
                "SELECT COUNT(*) FROM blog_posts WHERE status = 'published' AND deleted_at IS NULL"
            ),
            'subscribers' => (int) \$db->fetchColumn(
                "SELECT COUNT(*) FROM newsletter_subscribers WHERE status = 'active'"
            ),
            'messages_unread' => (int) \$db->fetchColumn(
                "SELECT COUNT(*) FROM contact_messages WHERE status = 'new'"
            ),
            'total_users' => (int) \$db->fetchColumn(
                "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND status = 'active'"
            ),
            'total_pages' => (int) \$db->fetchColumn(
                "SELECT COUNT(*) FROM pages WHERE status = 'published' AND deleted_at IS NULL"
            ),
        ];

        // ---- Sparkline Data (last 7 days inquiries) ----
        \$sparklineData = \$db->fetchAll(
            "SELECT DATE(created_at) as date, COUNT(*) as count
             FROM product_inquiries
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             GROUP BY DATE(created_at)
             ORDER BY date ASC"
        );

        // ---- Recent Inquiries (last 10) ----
        \$recentInquiries = \$db->fetchAll(
            "SELECT pi.*, p.name as product_name
             FROM product_inquiries pi
             LEFT JOIN products p ON pi.product_id = p.id
             ORDER BY pi.created_at DESC
             LIMIT 10"
        );

        // ---- Recent Activity (last 20) ----
        \$recentActivity = \$db->fetchAll(
            "SELECT al.*, u.name as user_name
             FROM activity_logs al
             LEFT JOIN users u ON al.user_id = u.id
             ORDER BY al.created_at DESC
             LIMIT 20"
        );

        // ---- Top Products by Inquiries ----
        \$topProducts = \$db->fetchAll(
            "SELECT p.name, p.slug, COUNT(pi.id) as inquiry_count
             FROM products p
             INNER JOIN product_inquiries pi ON pi.product_id = p.id
             GROUP BY p.id, p.name, p.slug
             ORDER BY inquiry_count DESC
             LIMIT 5"
        );

        // ---- Traffic Data (last 30 days for chart) ----
        \$trafficData = \$db->fetchAll(
            "SELECT DATE(created_at) as date, COUNT(*) as views
             FROM activity_logs
             WHERE action = 'page_view'
               AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             GROUP BY DATE(created_at)
             ORDER BY date ASC"
        );

        // ---- System Health ----
        \$systemHealth = [
            'php_version' => PHP_VERSION,
            'mysql_version' => \$db->fetchColumn("SELECT VERSION()"),
            'server_software' => \$_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
            'disk_free' => \$this->formatBytes((int) @disk_free_space('/')),
            'disk_total' => \$this->formatBytes((int) @disk_total_space('/')),
            'memory_usage' => \$this->formatBytes(memory_get_usage(true)),
            'memory_peak' => \$this->formatBytes(memory_get_peak_usage(true)),
            'db_size' => \$this->getDatabaseSize(\$db),
            'upload_max' => ini_get('upload_max_filesize'),
            'max_execution' => ini_get('max_execution_time') . 's',
            'ssl_enabled' => (!empty(\$_SERVER['HTTPS']) && \$_SERVER['HTTPS'] !== 'off') ? 'Yes' : 'No',
            'query_count' => \$db->getQueryCount(),
        ];

        // ---- Notifications ----
        \$notifications = \$db->fetchAll(
            "SELECT 'inquiry' as type, CONCAT('New inquiry for ', p.name) as message, pi.created_at
             FROM product_inquiries pi
             LEFT JOIN products p ON pi.product_id = p.id
             WHERE pi.status = 'new'
             UNION ALL
             SELECT 'message' as type, CONCAT('New message from ', name) as message, created_at
             FROM contact_messages
             WHERE status = 'new'
             ORDER BY created_at DESC
             LIMIT 10"
        );

        \$this->view('admin.dashboard', [
            'page_title' => 'Dashboard',
            'breadcrumbs' => [
                ['label' => 'Dashboard', 'url' => null],
            ],
            'stats' => \$stats,
            'sparkline_data' => \$sparklineData,
            'recent_inquiries' => \$recentInquiries,
            'recent_activity' => \$recentActivity,
            'top_products' => \$topProducts,
            'traffic_data' => \$trafficData,
            'system_health' => \$systemHealth,
            'notifications' => \$notifications,
            'user' => Auth::user(),
        ]);
    }

    /**
     * API endpoint: Update inquiry status (AJAX)
     */
    public function updateInquiryStatus(): void
    {
        if (!\$this->validateCsrf()) {
            \$this->json(['error' => 'Invalid token'], 403);
            return;
        }

        \$id = (int) \$this->input('id');
        \$status = \$this->input('status');
        \$allowedStatuses = ['new', 'in_progress', 'resolved', 'closed'];

        if (!in_array(\$status, \$allowedStatuses, true)) {
            \$this->json(['error' => 'Invalid status'], 400);
            return;
        }

        \$db = Database::getInstance();
        \$db->update('product_inquiries', [
            'status' => \$status,
            'updated_at' => date('Y-m-d H:i:s'),
        ], 'id = ?', [\$id]);

        \$this->json(['success' => true, 'message' => 'Status updated']);
    }

    /**
     * API endpoint: Dashboard stats (for AJAX refresh)
     */
    public function statsApi(): void
    {
        \$db = Database::getInstance();

        \$stats = [
            'inquiries_today' => (int) \$db->fetchColumn(
                "SELECT COUNT(*) FROM product_inquiries WHERE DATE(created_at) = CURDATE()"
            ),
            'messages_unread' => (int) \$db->fetchColumn(
                "SELECT COUNT(*) FROM contact_messages WHERE status = 'new'"
            ),
        ];

        \$this->json(\$stats);
    }

    /**
     * Format bytes to human-readable
     */
    private function formatBytes(int \$bytes, int \$precision = 2): string
    {
        \$units = ['B', 'KB', 'MB', 'GB', 'TB'];
        \$factor = floor((strlen((string) \$bytes) - 1) / 3);
        return sprintf("%.{\$precision}f %s", \$bytes / pow(1024, \$factor), \$units[(int) \$factor]);
    }

    /**
     * Get database size
     */
    private function getDatabaseSize(Database \$db): string
    {
        \$dbName = getenv('DB_NAME') ?: 'khybersoft_db';
        \$result = \$db->fetch(
            "SELECT SUM(data_length + index_length) as size
             FROM information_schema.tables
             WHERE table_schema = ?",
            [\$dbName]
        );
        return \$this->formatBytes((int) (\$result['size'] ?? 0));
    }
}
`
  },
  // ============================================
  // RATE LIMITER
  // ============================================
  {
    path: 'app/core/RateLimiter.php',
    name: 'RateLimiter.php',
    language: 'php',
    category: 'Core',
    description: 'Session-based rate limiter for login attempts and API protection',
    content: `<?php
declare(strict_types=1);

namespace App\\Core;

/**
 * Rate Limiter - Prevents brute force attacks
 * Uses session storage (can be adapted for Redis/Memcached)
 */
class RateLimiter
{
    private string \$key;
    private int \$maxAttempts;
    private int \$decaySeconds;

    public function __construct(string \$key, int \$maxAttempts = 5, int \$decaySeconds = 900)
    {
        \$this->key = 'rate_limit_' . md5(\$key);
        \$this->maxAttempts = \$maxAttempts;
        \$this->decaySeconds = \$decaySeconds;
    }

    /**
     * Check if rate limited
     */
    public function isLimited(): bool
    {
        \$this->cleanExpired();

        \$attempts = \$_SESSION[\$this->key]['attempts'] ?? 0;
        return \$attempts >= \$this->maxAttempts;
    }

    /**
     * Record a hit
     */
    public function hit(): void
    {
        if (!isset(\$_SESSION[\$this->key])) {
            \$_SESSION[\$this->key] = [
                'attempts' => 0,
                'first_attempt' => time(),
            ];
        }

        \$_SESSION[\$this->key]['attempts']++;
    }

    /**
     * Get remaining attempts
     */
    public function getRemainingAttempts(): int
    {
        \$this->cleanExpired();
        \$attempts = \$_SESSION[\$this->key]['attempts'] ?? 0;
        return max(0, \$this->maxAttempts - \$attempts);
    }

    /**
     * Get seconds until rate limit resets
     */
    public function getRemainingSeconds(): int
    {
        \$firstAttempt = \$_SESSION[\$this->key]['first_attempt'] ?? time();
        \$elapsed = time() - \$firstAttempt;
        return max(0, \$this->decaySeconds - \$elapsed);
    }

    /**
     * Clear the rate limit
     */
    public function clear(): void
    {
        unset(\$_SESSION[\$this->key]);
    }

    /**
     * Clean expired entries
     */
    private function cleanExpired(): void
    {
        if (!isset(\$_SESSION[\$this->key])) {
            return;
        }

        \$firstAttempt = \$_SESSION[\$this->key]['first_attempt'] ?? 0;
        if ((time() - \$firstAttempt) > \$this->decaySeconds) {
            unset(\$_SESSION[\$this->key]);
        }
    }
}
`
  },
  // ============================================
  // TOTP (2FA)
  // ============================================
  {
    path: 'app/core/TOTP.php',
    name: 'TOTP.php',
    language: 'php',
    category: 'Core',
    description: 'TOTP implementation for Google Authenticator compatible 2FA',
    content: `<?php
declare(strict_types=1);

namespace App\\Core;

/**
 * TOTP - Time-based One-Time Password (RFC 6238)
 * Compatible with Google Authenticator, Authy, etc.
 */
class TOTP
{
    private const DIGITS = 6;
    private const PERIOD = 30;
    private const ALGORITHM = 'sha1';
    private const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /**
     * Generate a new secret key
     */
    public static function generateSecret(int \$length = 16): string
    {
        \$secret = '';
        \$bytes = random_bytes(\$length);

        for (\$i = 0; \$i < \$length; \$i++) {
            \$secret .= self::BASE32_CHARS[ord(\$bytes[\$i]) & 31];
        }

        return \$secret;
    }

    /**
     * Generate TOTP code for a given secret and time
     */
    public static function generateCode(string \$secret, ?int \$time = null): string
    {
        \$time = \$time ?? time();
        \$timeSlice = intdiv(\$time, self::PERIOD);

        // Decode base32 secret
        \$secretKey = self::base32Decode(\$secret);

        // Pack time into binary
        \$timePacked = pack('N*', 0) . pack('N*', \$timeSlice);

        // HMAC-SHA1
        \$hash = hash_hmac(self::ALGORITHM, \$timePacked, \$secretKey, true);

        // Dynamic truncation
        \$offset = ord(\$hash[19]) & 0x0F;
        \$code = (
            ((ord(\$hash[\$offset]) & 0x7F) << 24) |
            ((ord(\$hash[\$offset + 1]) & 0xFF) << 16) |
            ((ord(\$hash[\$offset + 2]) & 0xFF) << 8) |
            (ord(\$hash[\$offset + 3]) & 0xFF)
        ) % (10 ** self::DIGITS);

        return str_pad((string) \$code, self::DIGITS, '0', STR_PAD_LEFT);
    }

    /**
     * Verify a TOTP code (with ±1 time step tolerance)
     */
    public static function verify(string \$secret, string \$code, ?int \$time = null): bool
    {
        \$time = \$time ?? time();

        // Check current time step and ±1 for clock drift tolerance
        for (\$offset = -1; \$offset <= 1; \$offset++) {
            \$checkTime = \$time + (\$offset * self::PERIOD);
            \$expectedCode = self::generateCode(\$secret, \$checkTime);

            if (hash_equals(\$expectedCode, \$code)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Generate QR code URL for Google Authenticator
     */
    public static function getQRCodeUrl(string \$secret, string \$accountName, string \$issuer = 'Khybersoft'): string
    {
        return sprintf(
            'otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=%s&digits=%d&period=%d',
            rawurlencode(\$issuer),
            rawurlencode(\$accountName),
            \$secret,
            rawurlencode(\$issuer),
            strtoupper(self::ALGORITHM),
            self::DIGITS,
            self::PERIOD
        );
    }

    /**
     * Generate QR code image URL (using Google Charts API)
     */
    public static function getQRCodeImage(string \$secret, string \$accountName, int \$size = 200): string
    {
        \$url = self::getQRCodeUrl(\$secret, \$accountName);
        return 'https://chart.googleapis.com/chart?chs=' . \$size . 'x' . \$size . '&cht=qr&chl=' . urlencode(\$url);
    }

    /**
     * Base32 decode
     */
    private static function base32Decode(string \$input): string
    {
        \$input = strtoupper(\$input);
        \$input = rtrim(\$input, '=');

        \$buffer = 0;
        \$bitsLeft = 0;
        \$output = '';

        for (\$i = 0; \$i < strlen(\$input); \$i++) {
            \$val = strpos(self::BASE32_CHARS, \$input[\$i]);
            if (\$val === false) continue;

            \$buffer = (\$buffer << 5) | \$val;
            \$bitsLeft += 5;

            if (\$bitsLeft >= 8) {
                \$bitsLeft -= 8;
                \$output .= chr((\$buffer >> \$bitsLeft) & 0xFF);
            }
        }

        return \$output;
    }
}
`
  },
  // ============================================
  // MIDDLEWARE
  // ============================================
  {
    path: 'app/middleware/AdminAuth.php',
    name: 'AdminAuth.php',
    language: 'php',
    category: 'Middleware',
    description: 'Admin authentication middleware with session validation',
    content: `<?php
declare(strict_types=1);

namespace App\\Middleware;

use App\\Core\\Auth;

/**
 * Admin Authentication Middleware
 * Ensures user is logged in and has admin access
 */
class AdminAuth
{
    public function handle(): bool
    {
        // Initialize auth
        Auth::init();

        if (Auth::guest()) {
            // Store intended URL for redirect after login
            \$_SESSION['intended_url'] = \$_SERVER['REQUEST_URI'];

            // Flash message
            \$_SESSION['_flash']['error'] = 'Please log in to access the admin panel.';

            header('Location: ' . SITE_URL . '/admin/login');
            exit;
        }

        \$user = Auth::user();

        // Check if user is active
        if (\$user && \$user['status'] !== 'active') {
            Auth::logout();
            \$_SESSION['_flash']['error'] = 'Your account is not active.';
            header('Location: ' . SITE_URL . '/admin/login');
            exit;
        }

        // Check if user has admin role
        if (!Auth::isAdmin()) {
            http_response_code(403);
            echo '<!DOCTYPE html><html><head><title>Access Denied</title></head>';
            echo '<body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;background:#0f172a;color:#e2e8f0;">';
            echo '<div style="text-align:center;"><h1 style="font-size:48px;margin:0;">403</h1>';
            echo '<p>Access denied. Admin privileges required.</p>';
            echo '<a href="' . SITE_URL . '" style="color:#3b82f6;">Return to site</a></div></body></html>';
            exit;
        }

        // Session timeout check
        \$lastActivity = \$_SESSION['last_activity'] ?? 0;
        if (time() - \$lastActivity > SESSION_LIFETIME) {
            Auth::logout();
            \$_SESSION['_flash']['error'] = 'Session expired. Please log in again.';
            header('Location: ' . SITE_URL . '/admin/login');
            exit;
        }

        // Update last activity
        \$_SESSION['last_activity'] = time();

        return true;
    }
}
`
  },
  {
    path: 'app/middleware/Permission.php',
    name: 'Permission.php',
    language: 'php',
    category: 'Middleware',
    description: 'Permission-based access control middleware',
    content: `<?php
declare(strict_types=1);

namespace App\\Middleware;

use App\\Core\\Auth;

/**
 * Permission Middleware
 * Checks if user has a specific permission before allowing access
 */
class Permission
{
    private string \$permission;

    public function __construct(string \$permission = '')
    {
        \$this->permission = \$permission;
    }

    public function handle(): bool
    {
        // First ensure user is authenticated admin
        \$authMiddleware = new AdminAuth();
        if (!\$authMiddleware->handle()) {
            return false;
        }

        // If no specific permission required, just check admin
        if (empty(\$this->permission)) {
            return true;
        }

        // Super admin bypasses all permission checks
        if (Auth::hasRole('super_admin')) {
            return true;
        }

        // Check specific permission
        if (!Auth::can(\$this->permission)) {
            // For AJAX requests, return JSON
            if ((\$_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'XMLHttpRequest') {
                http_response_code(403);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Insufficient permissions']);
                exit;
            }

            // For regular requests, show error page
            http_response_code(403);
            echo '<!DOCTYPE html><html><head><title>Permission Denied</title>';
            echo '<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;background:#0f172a;color:#e2e8f0;margin:0;}</style>';
            echo '</head><body><div style="text-align:center;">';
            echo '<h1 style="font-size:48px;margin:0;">⛔</h1>';
            echo '<h2>Permission Denied</h2>';
            echo '<p style="color:#94a3b8;">You don\\'t have permission to access this resource.</p>';
            echo '<p style="color:#64748b;font-size:13px;">Required: ' . htmlspecialchars(\$this->permission) . '</p>';
            echo '<a href="' . SITE_URL . '/admin" style="color:#3b82f6;text-decoration:none;">← Back to Dashboard</a>';
            echo '</div></body></html>';
            exit;
        }

        return true;
    }
}
`
  },
  // ============================================
  // ADMIN ROUTES
  // ============================================
  {
    path: 'routes/admin.php',
    name: 'admin.php',
    language: 'php',
    category: 'Routes',
    description: 'Complete admin route definitions with middleware groups',
    content: `<?php
declare(strict_types=1);

/**
 * Khybersoft - Admin Routes
 * All admin routes with authentication and permission middleware
 */

/** @var \\App\\Core\\Router \$router */

// ============================================
// AUTH ROUTES (Public - no auth required)
// ============================================
\$router->get('/admin/login', ['Admin\\AuthController', 'showLogin'], ['Guest']);
\$router->post('/admin/login', ['Admin\\AuthController', 'login'], ['Guest']);
\$router->get('/admin/logout', ['Admin\\AuthController', 'logout']);
\$router->get('/admin/forgot-password', ['Admin\\AuthController', 'showForgotPassword'], ['Guest']);
\$router->post('/admin/forgot-password', ['Admin\\AuthController', 'forgotPassword'], ['Guest']);
\$router->get('/admin/reset-password', ['Admin\\AuthController', 'showResetPassword'], ['Guest']);
\$router->post('/admin/reset-password', ['Admin\\AuthController', 'resetPassword'], ['Guest']);

// 2FA Routes
\$router->get('/admin/2fa/verify', ['Admin\\AuthController', 'show2FAVerify'], ['AdminAuth']);
\$router->post('/admin/2fa/verify', ['Admin\\AuthController', 'verify2FA'], ['AdminAuth']);

// ============================================
// PROTECTED ADMIN ROUTES
// ============================================
\$router->group('/admin', function(\\App\\Core\\Router \$router) {

    // Dashboard
    \$router->get('/', ['Admin\\DashboardController', 'index'], ['AdminAuth']);
    \$router->post('/dashboard/update-inquiry-status', ['Admin\\DashboardController', 'updateInquiryStatus'], ['AdminAuth']);
    \$router->get('/api/stats', ['Admin\\DashboardController', 'statsApi'], ['AdminAuth']);

    // ---- Content ----
    \$router->group('', function(\\App\\Core\\Router \$router) {
        // Pages
        \$router->get('/pages', ['Admin\\PageController', 'index'], ['AdminAuth']);
        \$router->get('/pages/create', ['Admin\\PageController', 'create'], ['AdminAuth']);
        \$router->post('/pages', ['Admin\\PageController', 'store'], ['AdminAuth']);
        \$router->get('/pages/{id}/edit', ['Admin\\PageController', 'edit'], ['AdminAuth']);
        \$router->post('/pages/{id}', ['Admin\\PageController', 'update'], ['AdminAuth']);
        \$router->post('/pages/{id}/delete', ['Admin\\PageController', 'destroy'], ['AdminAuth']);

        // Blog Posts
        \$router->get('/blog', ['Admin\\BlogController', 'index'], ['AdminAuth']);
        \$router->get('/blog/create', ['Admin\\BlogController', 'create'], ['AdminAuth']);
        \$router->post('/blog', ['Admin\\BlogController', 'store'], ['AdminAuth']);
        \$router->get('/blog/{id}/edit', ['Admin\\BlogController', 'edit'], ['AdminAuth']);
        \$router->post('/blog/{id}', ['Admin\\BlogController', 'update'], ['AdminAuth']);
        \$router->post('/blog/{id}/delete', ['Admin\\BlogController', 'destroy'], ['AdminAuth']);

        // Blog Categories
        \$router->get('/blog-categories', ['Admin\\BlogCategoryController', 'index'], ['AdminAuth']);
        \$router->post('/blog-categories', ['Admin\\BlogCategoryController', 'store'], ['AdminAuth']);
        \$router->post('/blog-categories/{id}/delete', ['Admin\\BlogCategoryController', 'destroy'], ['AdminAuth']);

        // Comments
        \$router->get('/comments', ['Admin\\CommentController', 'index'], ['AdminAuth']);
        \$router->post('/comments/{id}/approve', ['Admin\\CommentController', 'approve'], ['AdminAuth']);
        \$router->post('/comments/{id}/reject', ['Admin\\CommentController', 'reject'], ['AdminAuth']);
        \$router->post('/comments/{id}/delete', ['Admin\\CommentController', 'destroy'], ['AdminAuth']);

        // Media
        \$router->get('/media', ['Admin\\MediaController', 'index'], ['AdminAuth']);
        \$router->post('/media/upload', ['Admin\\MediaController', 'upload'], ['AdminAuth']);
        \$router->post('/media/{id}/delete', ['Admin\\MediaController', 'destroy'], ['AdminAuth']);
    });

    // ---- Products ----
    \$router->group('', function(\\App\\Core\\Router \$router) {
        \$router->get('/product-categories', ['Admin\\ProductCategoryController', 'index'], ['AdminAuth']);
        \$router->post('/product-categories', ['Admin\\ProductCategoryController', 'store'], ['AdminAuth']);

        \$router->get('/products', ['Admin\\ProductController', 'index'], ['AdminAuth']);
        \$router->get('/products/create', ['Admin\\ProductController', 'create'], ['AdminAuth']);
        \$router->post('/products', ['Admin\\ProductController', 'store'], ['AdminAuth']);
        \$router->get('/products/{id}/edit', ['Admin\\ProductController', 'edit'], ['AdminAuth']);
        \$router->post('/products/{id}', ['Admin\\ProductController', 'update'], ['AdminAuth']);
        \$router->post('/products/{id}/delete', ['Admin\\ProductController', 'destroy'], ['AdminAuth']);

        \$router->get('/products/{id}/plans', ['Admin\\ProductPlanController', 'index'], ['AdminAuth']);
        \$router->post('/products/{id}/plans', ['Admin\\ProductPlanController', 'store'], ['AdminAuth']);

        \$router->get('/products/{id}/demos', ['Admin\\ProductDemoController', 'index'], ['AdminAuth']);
        \$router->post('/products/{id}/demos', ['Admin\\ProductDemoController', 'store'], ['AdminAuth']);

        \$router->get('/inquiries', ['Admin\\InquiryController', 'index'], ['AdminAuth']);
        \$router->get('/inquiries/{id}', ['Admin\\InquiryController', 'show'], ['AdminAuth']);
        \$router->post('/inquiries/{id}/status', ['Admin\\InquiryController', 'updateStatus'], ['AdminAuth']);

        \$router->get('/tutorials', ['Admin\\TutorialController', 'index'], ['AdminAuth']);
        \$router->get('/tutorials/create', ['Admin\\TutorialController', 'create'], ['AdminAuth']);
        \$router->post('/tutorials', ['Admin\\TutorialController', 'store'], ['AdminAuth']);

        \$router->get('/products/{id}/versions', ['Admin\\ProductVersionController', 'index'], ['AdminAuth']);
        \$router->post('/products/{id}/versions', ['Admin\\ProductVersionController', 'store'], ['AdminAuth']);
    });

    // ---- Services ----
    \$router->group('', function(\\App\\Core\\Router \$router) {
        \$router->get('/services', ['Admin\\ServiceController', 'index'], ['AdminAuth']);
        \$router->get('/services/create', ['Admin\\ServiceController', 'create'], ['AdminAuth']);
        \$router->post('/services', ['Admin\\ServiceController', 'store'], ['AdminAuth']);
        \$router->get('/services/{id}/edit', ['Admin\\ServiceController', 'edit'], ['AdminAuth']);
        \$router->post('/services/{id}', ['Admin\\ServiceController', 'update'], ['AdminAuth']);

        \$router->get('/service-inquiries', ['Admin\\ServiceInquiryController', 'index'], ['AdminAuth']);
        \$router->get('/custom-requests', ['Admin\\CustomRequestController', 'index'], ['AdminAuth']);
    });

    // ---- Business ----
    \$router->group('', function(\\App\\Core\\Router \$router) {
        \$router->get('/testimonials', ['Admin\\TestimonialController', 'index'], ['AdminAuth']);
        \$router->post('/testimonials', ['Admin\\TestimonialController', 'store'], ['AdminAuth']);

        \$router->get('/team', ['Admin\\TeamController', 'index'], ['AdminAuth']);
        \$router->post('/team', ['Admin\\TeamController', 'store'], ['AdminAuth']);

        \$router->get('/clients', ['Admin\\ClientController', 'index'], ['AdminAuth']);
        \$router->post('/clients', ['Admin\\ClientController', 'store'], ['AdminAuth']);

        \$router->get('/faqs', ['Admin\\FaqController', 'index'], ['AdminAuth']);
        \$router->post('/faqs', ['Admin\\FaqController', 'store'], ['AdminAuth']);

        \$router->get('/messages', ['Admin\\MessageController', 'index'], ['AdminAuth']);
        \$router->get('/messages/{id}', ['Admin\\MessageController', 'show'], ['AdminAuth']);
        \$router->post('/messages/{id}/status', ['Admin\\MessageController', 'updateStatus'], ['AdminAuth']);

        \$router->get('/newsletter', ['Admin\\NewsletterController', 'index'], ['AdminAuth']);
        \$router->post('/newsletter/export', ['Admin\\NewsletterController', 'export'], ['AdminAuth']);
    });

    // ---- Marketing ----
    \$router->group('', function(\\App\\Core\\Router \$router) {
        \$router->get('/seo', ['Admin\\SeoController', 'index'], ['AdminAuth']);
        \$router->post('/seo/{model}/{id}', ['Admin\\SeoController', 'update'], ['AdminAuth']);

        \$router->get('/redirects', ['Admin\\RedirectController', 'index'], ['AdminAuth']);
        \$router->post('/redirects', ['Admin\\RedirectController', 'store'], ['AdminAuth']);

        \$router->get('/sitemap', ['Admin\\SitemapController', 'index'], ['AdminAuth']);
        \$router->post('/sitemap/generate', ['Admin\\SitemapController', 'generate'], ['AdminAuth']);
    });

    // ---- System ----
    \$router->group('', function(\\App\\Core\\Router \$router) {
        \$router->get('/users', ['Admin\\UserController', 'index'], ['AdminAuth']);
        \$router->get('/users/create', ['Admin\\UserController', 'create'], ['AdminAuth']);
        \$router->post('/users', ['Admin\\UserController', 'store'], ['AdminAuth']);
        \$router->get('/users/{id}/edit', ['Admin\\UserController', 'edit'], ['AdminAuth']);
        \$router->post('/users/{id}', ['Admin\\UserController', 'update'], ['AdminAuth']);
        \$router->post('/users/{id}/delete', ['Admin\\UserController', 'destroy'], ['AdminAuth']);

        \$router->get('/roles', ['Admin\\RoleController', 'index'], ['AdminAuth']);
        \$router->post('/roles', ['Admin\\RoleController', 'store'], ['AdminAuth']);
        \$router->post('/roles/{id}/permissions', ['Admin\\RoleController', 'updatePermissions'], ['AdminAuth']);

        \$router->get('/settings', ['Admin\\SettingsController', 'index'], ['AdminAuth']);
        \$router->post('/settings', ['Admin\\SettingsController', 'update'], ['AdminAuth']);

        \$router->get('/activity-logs', ['Admin\\ActivityLogController', 'index'], ['AdminAuth']);

        \$router->get('/backup', ['Admin\\BackupController', 'index'], ['AdminAuth']);
        \$router->post('/backup/create', ['Admin\\BackupController', 'create'], ['AdminAuth']);
        \$router->post('/backup/restore', ['Admin\\BackupController', 'restore'], ['AdminAuth']);
    });

}, ['AdminAuth']);
`
  },
  // ============================================
  // PASSWORD RESETS TABLE (migration)
  // ============================================
  {
    path: 'database/migrations/password_resets.sql',
    name: 'password_resets.sql',
    language: 'sql',
    category: 'Database',
    description: 'Additional table for password reset tokens',
    content: `-- Password Resets Table
CREATE TABLE IF NOT EXISTS \`password_resets\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`user_id\` INT UNSIGNED NOT NULL,
  \`token\` VARCHAR(255) NOT NULL,
  \`expires_at\` TIMESTAMP NOT NULL,
  \`used\` TINYINT(1) NOT NULL DEFAULT 0,
  \`ip\` VARCHAR(45) NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_pr_token\` (\`token\`),
  INDEX \`idx_pr_user\` (\`user_id\`),
  INDEX \`idx_pr_expires\` (\`expires_at\`),
  CONSTRAINT \`fk_pr_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add 2FA columns to users table
ALTER TABLE \`users\`
  ADD COLUMN \`two_factor_secret\` VARCHAR(255) NULL AFTER \`remember_token\`,
  ADD COLUMN \`two_factor_enabled\` TINYINT(1) NOT NULL DEFAULT 0 AFTER \`two_factor_secret\`,
  ADD COLUMN \`failed_attempts\` INT UNSIGNED NOT NULL DEFAULT 0 AFTER \`two_factor_enabled\`,
  ADD COLUMN \`lockout_until\` TIMESTAMP NULL AFTER \`failed_attempts\`;
`
  },
  // ============================================
  // LOGIN VIEW
  // ============================================
  {
    path: 'app/views/admin/auth/login.php',
    name: 'login.php',
    language: 'php',
    category: 'Views',
    description: 'Admin login page with glassmorphism design, dark gradient background',
    content: `<?php
/**
 * Admin Login View
 * Premium glassmorphism design with dark gradient background
 */
\$email = \$email ?? '';
\$error = get_flash('error');
\$success = get_flash('success');
\$errors = json_decode(get_flash('errors') ?: '[]', true) ?: [];
?>
<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e(\$page_title ?? 'Admin Login') ?> - <?= e(setting('site_name')) ?></title>
    <?= \\App\\Core\\CSRF::meta() ?>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', system-ui, sans-serif; }
        .glass {
            background: rgba(15, 23, 42, 0.7);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .glass-input {
            background: rgba(30, 41, 59, 0.8);
            border: 1px solid rgba(71, 85, 105, 0.5);
            transition: all 0.2s;
        }
        .glass-input:focus {
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
            outline: none;
        }
        .gradient-bg {
            background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
        }
        .animate-float {
            animation: float 6s ease-in-out infinite;
        }
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
        }
        .glow {
            box-shadow: 0 0 40px rgba(59, 130, 246, 0.15), 0 0 80px rgba(139, 92, 246, 0.08);
        }
    </style>
</head>
<body class="h-full gradient-bg overflow-hidden">
    <!-- Animated background elements -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
        <div class="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float"></div>
        <div class="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" style="animation-delay: -3s;"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl"></div>
    </div>

    <div class="min-h-full flex items-center justify-center px-4 py-12 relative z-10">
        <div class="w-full max-w-md">
            <!-- Logo -->
            <div class="text-center mb-8">
                <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25 mb-4">
                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                    </svg>
                </div>
                <h1 class="text-2xl font-bold text-white">Welcome back</h1>
                <p class="text-slate-400 mt-1">Sign in to <?= e(setting('site_name')) ?> Admin</p>
            </div>

            <!-- Login Card -->
            <div class="glass rounded-2xl p-8 glow">
                <!-- Flash Messages -->
                <?php if (\$error): ?>
                <div class="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3" x-data="{ show: true }" x-show="show">
                    <svg class="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <p class="text-sm text-red-300"><?= e(\$error) ?></p>
                    <button @click="show = false" class="ml-auto text-red-400 hover:text-red-300">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
                <?php endif; ?>

                <?php if (\$success): ?>
                <div class="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-start gap-3">
                    <svg class="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <p class="text-sm text-green-300"><?= e(\$success) ?></p>
                </div>
                <?php endif; ?>

                <form method="POST" action="<?= url('admin/login') ?>" x-data="{ loading: false }" @submit="loading = true">
                    <?= \\App\\Core\\CSRF::field() ?>

                    <!-- Email -->
                    <div class="mb-5">
                        <label for="email" class="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                        <div class="relative">
                            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                                </svg>
                            </div>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value="<?= e(\$email) ?>"
                                required
                                autocomplete="email"
                                autofocus
                                placeholder="admin@khybersoft.com"
                                class="glass-input w-full pl-11 pr-4 py-3 rounded-xl text-white placeholder-slate-500 text-sm"
                            >
                        </div>
                        <?php if (!empty(\$errors['email'])): ?>
                        <p class="mt-1.5 text-xs text-red-400"><?= e(\$errors['email'][0]) ?></p>
                        <?php endif; ?>
                    </div>

                    <!-- Password -->
                    <div class="mb-5">
                        <div class="flex items-center justify-between mb-2">
                            <label for="password" class="block text-sm font-medium text-slate-300">Password</label>
                            <a href="<?= url('admin/forgot-password') ?>" class="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                                Forgot password?
                            </a>
                        </div>
                        <div class="relative" x-data="{ show: false }">
                            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                                </svg>
                            </div>
                            <input
                                :type="show ? 'text' : 'password'"
                                id="password"
                                name="password"
                                required
                                autocomplete="current-password"
                                placeholder="••••••••"
                                class="glass-input w-full pl-11 pr-12 py-3 rounded-xl text-white placeholder-slate-500 text-sm"
                            >
                            <button
                                type="button"
                                @click="show = !show"
                                class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                            >
                                <svg x-show="!show" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                </svg>
                                <svg x-show="show" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                                </svg>
                            </button>
                        </div>
                        <?php if (!empty(\$errors['password'])): ?>
                        <p class="mt-1.5 text-xs text-red-400"><?= e(\$errors['password'][0]) ?></p>
                        <?php endif; ?>
                    </div>

                    <!-- Remember Me -->
                    <div class="flex items-center mb-6">
                        <input
                            type="checkbox"
                            id="remember"
                            name="remember"
                            value="1"
                            class="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                        >
                        <label for="remember" class="ml-2.5 text-sm text-slate-400">Remember me for 30 days</label>
                    </div>

                    <!-- Submit Button -->
                    <button
                        type="submit"
                        :disabled="loading"
                        class="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
                    >
                        <span x-show="!loading" class="flex items-center justify-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
                            </svg>
                            Sign In
                        </span>
                        <span x-show="loading" class="flex items-center justify-center gap-2">
                            <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Signing in...
                        </span>
                    </button>
                </form>
            </div>

            <!-- Footer -->
            <div class="text-center mt-8">
                <p class="text-xs text-slate-500">
                    &copy; <?= date('Y') ?> <?= e(setting('site_name')) ?>. All rights reserved.
                </p>
                <p class="text-xs text-slate-600 mt-1">
                    Secured with CSRF protection & rate limiting
                </p>
            </div>
        </div>
    </div>
</body>
</html>
`
  },
  // ============================================
  // ADMIN LAYOUT
  // ============================================
  {
    path: 'app/views/layouts/admin.main.php',
    name: 'admin.main.php',
    language: 'php',
    category: 'Views',
    description: 'Main admin layout with sidebar, navbar, breadcrumbs, dark mode, toasts',
    content: `<?php
/**
 * Admin Main Layout
 * Full admin panel layout with sidebar, topbar, breadcrumbs
 * Uses Alpine.js for interactivity, TailwindCSS for styling
 */
\$user = \$user ?? \\App\\Core\\Auth::user();
\$currentPage = parse_url(\\$_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?? '/admin';
\$notifications = \$notifications ?? [];
?>
<!DOCTYPE html>
<html lang="en" x-data="{
    sidebarOpen: true,
    mobileSidebar: false,
    darkMode: localStorage.getItem('darkMode') !== 'false',
    notifications: <?= json_encode(array_slice(\$notifications ?? [], 0, 5)) ?>,
    showNotifications: false,
    showUserMenu: false,
    toasts: [],
    loading: false,
    init() {
        // Listen for toast events
        window.addEventListener('toast', (e) => {
            this.toasts.push({ id: Date.now(), ...e.detail });
            setTimeout(() => {
                this.toasts = this.toasts.filter(t => t.id !== e.detail.id);
            }, 5000);
        });

        // Apply dark mode
        if (this.darkMode) {
            document.documentElement.classList.add('dark');
        }
    },
    toggleDarkMode() {
        this.darkMode = !this.darkMode;
        localStorage.setItem('darkMode', this.darkMode);
        document.documentElement.classList.toggle('dark');
    },
    removeToast(id) {
        this.toasts = this.toasts.filter(t => t.id !== id);
    }
}" :class="darkMode ? 'dark' : ''">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e(\$page_title ?? 'Admin') ?> - <?= e(setting('site_name')) ?></title>
    <?= \\App\\Core\\CSRF::meta() ?>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
                }
            }
        }
    </script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        [x-cloak] { display: none !important; }
        .sidebar-link.active { background: rgba(59, 130, 246, 0.12); color: #60a5fa; border-right: 3px solid #3b82f6; }
        .dark .sidebar-link.active { background: rgba(59, 130, 246, 0.15); }
        .skeleton { background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    </style>
</head>
<body class="font-sans bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-200 min-h-screen" style="font-family: 'Inter', system-ui, sans-serif;">

    <!-- Mobile Sidebar Overlay -->
    <div x-show="mobileSidebar" x-cloak
         x-transition:enter="transition-opacity ease-linear duration-300"
         x-transition:leave="transition-opacity ease-linear duration-300"
         class="fixed inset-0 z-40 bg-black/50 lg:hidden"
         @click="mobileSidebar = false">
    </div>

    <!-- Sidebar -->
    <aside
        :class="mobileSidebar ? 'translate-x-0' : '-translate-x-full'"
        class="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto flex flex-col">

        <!-- Sidebar Header -->
        <div class="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
            <a href="<?= url('admin') ?>" class="flex items-center gap-2.5">
                <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span class="text-white font-bold text-sm">K</span>
                </div>
                <span class="font-bold text-gray-900 dark:text-white text-lg" x-show="sidebarOpen">Admin</span>
            </a>
            <button @click="mobileSidebar = false" class="lg:hidden p-1 text-gray-500 hover:text-gray-700 dark:text-slate-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
        </div>

        <!-- Sidebar Navigation -->
        <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            <?php
            \$menuGroups = [
                '' => [
                    ['label' => 'Dashboard', 'url' => '/admin', 'icon' => 'dashboard', 'active' => \$currentPage === '/admin' || \$currentPage === '/admin/'],
                ],
                'Content' => [
                    ['label' => 'Pages', 'url' => '/admin/pages', 'icon' => 'page'],
                    ['label' => 'Blog Posts', 'url' => '/admin/blog', 'icon' => 'blog'],
                    ['label' => 'Categories', 'url' => '/admin/blog-categories', 'icon' => 'category'],
                    ['label' => 'Comments', 'url' => '/admin/comments', 'icon' => 'comment'],
                    ['label' => 'Media Library', 'url' => '/admin/media', 'icon' => 'media'],
                ],
                'Products' => [
                    ['label' => 'Categories', 'url' => '/admin/product-categories', 'icon' => 'category'],
                    ['label' => 'Products', 'url' => '/admin/products', 'icon' => 'product'],
                    ['label' => 'Plans', 'url' => '/admin/products', 'icon' => 'plan'],
                    ['label' => 'Demos', 'url' => '/admin/products', 'icon' => 'demo'],
                    ['label' => 'Inquiries', 'url' => '/admin/inquiries', 'icon' => 'inquiry'],
                    ['label' => 'Tutorials', 'url' => '/admin/tutorials', 'icon' => 'tutorial'],
                    ['label' => 'Versions', 'url' => '/admin/products', 'icon' => 'version'],
                ],
                'Services' => [
                    ['label' => 'Services', 'url' => '/admin/services', 'icon' => 'service'],
                    ['label' => 'Inquiries', 'url' => '/admin/service-inquiries', 'icon' => 'inquiry'],
                    ['label' => 'Custom Requests', 'url' => '/admin/custom-requests', 'icon' => 'code'],
                ],
                'Business' => [
                    ['label' => 'Testimonials', 'url' => '/admin/testimonials', 'icon' => 'testimonial'],
                    ['label' => 'Team', 'url' => '/admin/team', 'icon' => 'team'],
                    ['label' => 'Clients/Portfolio', 'url' => '/admin/clients', 'icon' => 'client'],
                    ['label' => 'FAQs', 'url' => '/admin/faqs', 'icon' => 'faq'],
                    ['label' => 'Messages', 'url' => '/admin/messages', 'icon' => 'message'],
                    ['label' => 'Newsletter', 'url' => '/admin/newsletter', 'icon' => 'newsletter'],
                ],
                'Marketing' => [
                    ['label' => 'SEO Manager', 'url' => '/admin/seo', 'icon' => 'seo'],
                    ['label' => 'Redirects', 'url' => '/admin/redirects', 'icon' => 'redirect'],
                    ['label' => 'Sitemap', 'url' => '/admin/sitemap', 'icon' => 'sitemap'],
                ],
                'System' => [
                    ['label' => 'Users', 'url' => '/admin/users', 'icon' => 'users'],
                    ['label' => 'Roles & Permissions', 'url' => '/admin/roles', 'icon' => 'shield'],
                    ['label' => 'Settings', 'url' => '/admin/settings', 'icon' => 'settings'],
                    ['label' => 'Activity Logs', 'url' => '/admin/activity-logs', 'icon' => 'logs'],
                    ['label' => 'Backup', 'url' => '/admin/backup', 'icon' => 'backup'],
                ],
            ];

            \$icons = [
                'dashboard' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>',
                'page' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>',
                'blog' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>',
                'category' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>',
                'comment' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>',
                'media' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>',
                'product' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>',
                'inquiry' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>',
                'tutorial' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>',
                'service' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>',
                'testimonial' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>',
                'team' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>',
                'client' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>',
                'faq' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
                'message' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>',
                'newsletter' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"/>',
                'seo' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>',
                'redirect' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 7l5 5m0 0l-5 5m5-5H6"/>',
                'sitemap' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>',
                'users' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>',
                'shield' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>',
                'settings' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>',
                'logs' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>',
                'backup' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/>',
                'code' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>',
                'plan' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>',
                'demo' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
                'version' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>',
            ];
            ?>

            <?php foreach (\$menuGroups as \$group => \$items): ?>
                <?php if (\$group): ?>
                    <div class="pt-4 pb-1" x-data="{ open: true }">
                        <button @click="open = !open" class="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-400">
                            <span><?= e(\$group) ?></span>
                            <svg :class="open ? 'rotate-0' : '-rotate-90'" class="w-3 h-3 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                        </button>
                        <div x-show="open" x-collapse class="mt-1 space-y-0.5">
                <?php endif; ?>

                <?php foreach (\$items as \$item):
                    \$isActive = str_starts_with(\$currentPage, \$item['url']);
                    \$iconPath = \$icons[\$item['icon']] ?? \$icons['page'];
                ?>
                    <a href="<?= url(\$item['url']) ?>"
                       class="sidebar-link flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors <?= \$isActive ? 'active font-medium' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50 hover:text-gray-900 dark:hover:text-white' ?>">
                        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><?= \$iconPath ?></svg>
                        <span x-show="sidebarOpen"><?= e(\$item['label']) ?></span>
                    </a>
                <?php endforeach; ?>

                <?php if (\$group): ?>
                        </div>
                    </div>
                <?php endif; ?>
            <?php endforeach; ?>
        </nav>

        <!-- Sidebar Footer -->
        <div class="p-3 border-t border-gray-200 dark:border-slate-700 flex-shrink-0">
            <a href="<?= url('/') ?>" target="_blank" class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50 hover:text-gray-900 dark:hover:text-white transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                <span x-show="sidebarOpen">View Site</span>
            </a>
        </div>
    </aside>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-w-0">
        <!-- Top Navbar -->
        <header class="sticky top-0 z-30 h-16 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
            <!-- Left: Mobile menu + Breadcrumbs -->
            <div class="flex items-center gap-4">
                <button @click="mobileSidebar = true" class="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                </button>
                <button @click="sidebarOpen = !sidebarOpen" class="hidden lg:block p-2 text-gray-500 hover:text-gray-700 dark:text-slate-400 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8m-8 6h16"/></svg>
                </button>

                <!-- Breadcrumbs -->
                <nav class="hidden sm:flex items-center gap-1.5 text-sm">
                    <a href="<?= url('admin') ?>" class="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                    </a>
                    <?php if (!empty(\$breadcrumbs)): ?>
                        <?php foreach (\$breadcrumbs as \$i => \$crumb): ?>
                            <svg class="w-4 h-4 text-gray-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                            <?php if (\$crumb['url']): ?>
                                <a href="<?= e(\$crumb['url']) ?>" class="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white"><?= e(\$crumb['label']) ?></a>
                            <?php else: ?>
                                <span class="text-gray-900 dark:text-white font-medium"><?= e(\$crumb['label']) ?></span>
                            <?php endif; ?>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </nav>
            </div>

            <!-- Right: Search, Dark Mode, Notifications, User -->
            <div class="flex items-center gap-2">
                <!-- Search -->
                <div class="hidden md:flex items-center">
                    <div class="relative">
                        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        <input type="text" placeholder="Search..." class="pl-9 pr-4 py-2 w-56 bg-gray-100 dark:bg-slate-700 border-0 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-600 transition-all">
                    </div>
                </div>

                <!-- Dark Mode Toggle -->
                <button @click="toggleDarkMode()" class="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" title="Toggle dark mode">
                    <svg x-show="darkMode" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                    <svg x-show="!darkMode" x-cloak class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
                </button>

                <!-- Notifications -->
                <div class="relative" x-data="{ open: false }">
                    <button @click="open = !open" class="relative p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                        <?php if (count(\$notifications ?? []) > 0): ?>
                        <span class="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></span>
                        <?php endif; ?>
                    </button>

                    <!-- Notification Dropdown -->
                    <div x-show="open" x-cloak
                         @click.away="open = false"
                         x-transition
                         class="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                        <div class="p-3 border-b border-gray-200 dark:border-slate-700">
                            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
                        </div>
                        <div class="max-h-64 overflow-y-auto">
                            <?php if (empty(\$notifications)): ?>
                                <p class="p-4 text-sm text-gray-500 dark:text-slate-400 text-center">No new notifications</p>
                            <?php else: ?>
                                <?php foreach (\$notifications as \$notif): ?>
                                <a href="#" class="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700/50">
                                    <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                        <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                    </div>
                                    <div>
                                        <p class="text-sm text-gray-700 dark:text-slate-300"><?= e(\$notif['message'] ?? '') ?></p>
                                        <p class="text-xs text-gray-400 mt-0.5"><?= isset(\$notif['created_at']) ? time_ago(\$notif['created_at']) : '' ?></p>
                                    </div>
                                </a>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>

                <!-- User Dropdown -->
                <div class="relative" x-data="{ open: false }">
                    <button @click="open = !open" class="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span class="text-white text-sm font-medium"><?= strtoupper(substr(\$user['name'] ?? 'A', 0, 1)) ?></span>
                        </div>
                        <span class="hidden sm:block text-sm font-medium text-gray-700 dark:text-slate-300"><?= e(\$user['name'] ?? 'Admin') ?></span>
                        <svg class="w-4 h-4 text-gray-400 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                    </button>

                    <div x-show="open" x-cloak
                         @click.away="open = false"
                         x-transition
                         class="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                        <div class="p-3 border-b border-gray-200 dark:border-slate-700">
                            <p class="text-sm font-medium text-gray-900 dark:text-white"><?= e(\$user['name'] ?? 'Admin') ?></p>
                            <p class="text-xs text-gray-500 dark:text-slate-400"><?= e(\$user['email'] ?? '') ?></p>
                        </div>
                        <div class="py-1">
                            <a href="<?= url('admin/settings') ?>" class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                Settings
                            </a>
                            <a href="<?= url('admin/logout') ?>" class="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                                Logout
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        <!-- Page Content -->
        <main class="flex-1 p-4 lg:p-6 overflow-auto">
            <?= \$_view_content_ ?? '' ?>
        </main>
    </div>

    <!-- Toast Notifications -->
    <div class="fixed bottom-4 right-4 z-50 space-y-2" style="max-width: 400px;">
        <template x-for="toast in toasts" :key="toast.id">
            <div x-transition
                 class="flex items-center gap-3 p-4 rounded-xl shadow-lg border"
                 :class="{
                     'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800': toast.type === 'success',
                     'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800': toast.type === 'error',
                     'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800': toast.type === 'info',
                 }">
                <div x-show="toast.type === 'success'" class="text-green-500">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <div x-show="toast.type === 'error'" class="text-red-500">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <p class="text-sm font-medium" :class="{
                    'text-green-800 dark:text-green-200': toast.type === 'success',
                    'text-red-800 dark:text-red-200': toast.type === 'error',
                    'text-blue-800 dark:text-blue-200': toast.type === 'info',
                }" x-text="toast.message"></p>
                <button @click="removeToast(toast.id)" class="ml-auto text-gray-400 hover:text-gray-600">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
        </template>
    </div>

    <!-- Flash Messages to Toasts -->
    <?php
    \$flashSuccess = get_flash('success');
    \$flashError = get_flash('error');
    if (\$flashSuccess || \$flashError):
    ?>
    <script>
        document.addEventListener('alpine:init', () => {
            setTimeout(() => {
                <?php if (\$flashSuccess): ?>
                window.dispatchEvent(new CustomEvent('toast', { detail: { id: Date.now(), type: 'success', message: <?= json_encode(\$flashSuccess) ?> }}));
                <?php endif; ?>
                <?php if (\$flashError): ?>
                window.dispatchEvent(new CustomEvent('toast', { detail: { id: Date.now() + 1, type: 'error', message: <?= json_encode(\$flashError) ?> }}));
                <?php endif; ?>
            }, 300);
        });
    </script>
    <?php endif; ?>
</body>
</html>
`
  },
  // ============================================
  // DASHBOARD VIEW
  // ============================================
  {
    path: 'app/views/admin/dashboard.php',
    name: 'dashboard.php',
    language: 'php',
    category: 'Views',
    description: 'Dashboard view with stats cards, charts, tables, and system health',
    content: `<?php
/**
 * Admin Dashboard View
 * Stats cards, recent inquiries, activity feed, charts, system health
 */
?>

<!-- Page Header -->
<div class="mb-6">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
    <p class="text-sm text-gray-500 dark:text-slate-400 mt-1">Welcome back, <?= e(\$user['name'] ?? 'Admin') ?>. Here's what's happening.</p>
</div>

<!-- Stats Cards -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <?php
    \$statCards = [
        ['label' => 'Total Products', 'value' => \$stats['total_products'], 'icon' => 'product', 'color' => 'blue', 'change' => '+12%'],
        ['label' => 'Inquiries Today', 'value' => \$stats['inquiries_today'], 'icon' => 'inquiry', 'color' => 'green', 'change' => '+5%'],
        ['label' => 'Blog Posts', 'value' => \$stats['blog_posts'], 'icon' => 'blog', 'color' => 'purple', 'change' => '+3'],
        ['label' => 'Subscribers', 'value' => \$stats['subscribers'], 'icon' => 'newsletter', 'color' => 'amber', 'change' => '+8%'],
    ];
    \$colorMap = [
        'blue' => ['bg' => 'bg-blue-50 dark:bg-blue-900/20', 'icon_bg' => 'bg-blue-100 dark:bg-blue-800/30', 'text' => 'text-blue-600 dark:text-blue-400', 'sparkline' => '#3b82f6'],
        'green' => ['bg' => 'bg-green-50 dark:bg-green-900/20', 'icon_bg' => 'bg-green-100 dark:bg-green-800/30', 'text' => 'text-green-600 dark:text-green-400', 'sparkline' => '#10b981'],
        'purple' => ['bg' => 'bg-purple-50 dark:bg-purple-900/20', 'icon_bg' => 'bg-purple-100 dark:bg-purple-800/30', 'text' => 'text-purple-600 dark:text-purple-400', 'sparkline' => '#8b5cf6'],
        'amber' => ['bg' => 'bg-amber-50 dark:bg-amber-900/20', 'icon_bg' => 'bg-amber-100 dark:bg-amber-800/30', 'text' => 'text-amber-600 dark:text-amber-400', 'sparkline' => '#f59e0b'],
    ];
    ?>

    <?php foreach (\$statCards as \$card):
        \$colors = \$colorMap[\$card['color']];
    ?>
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow">
        <div class="flex items-start justify-between">
            <div>
                <p class="text-sm font-medium text-gray-500 dark:text-slate-400"><?= \$card['label'] ?></p>
                <p class="text-3xl font-bold text-gray-900 dark:text-white mt-1"><?= number_format(\$card['value']) ?></p>
                <p class="text-xs <?= \$colors['text'] ?> mt-1 font-medium"><?= \$card['change'] ?> from last week</p>
            </div>
            <div class="w-10 h-10 rounded-lg <?= \$colors['icon_bg'] ?> flex items-center justify-center">
                <svg class="w-5 h-5 <?= \$colors['text'] ?>" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
            </div>
        </div>
        <!-- Mini Sparkline -->
        <div class="mt-3 h-8">
            <svg viewBox="0 0 100 30" class="w-full h-full" preserveAspectRatio="none">
                <polyline
                    fill="none"
                    stroke="<?= \$colors['sparkline'] ?>"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    points="0,25 15,20 30,22 45,15 60,18 75,10 90,12 100,8"
                />
                <polyline
                    fill="<?= \$colors['sparkline'] ?>20"
                    stroke="none"
                    points="0,30 0,25 15,20 30,22 45,15 60,18 75,10 90,12 100,8 100,30"
                />
            </svg>
        </div>
    </div>
    <?php endforeach; ?>
</div>

<!-- Main Grid -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
    <!-- Recent Inquiries (2 cols) -->
    <div class="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
        <div class="p-5 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Recent Inquiries</h2>
            <a href="<?= url('admin/inquiries') ?>" class="text-sm text-blue-600 dark:text-blue-400 hover:underline">View all</a>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead>
                    <tr class="border-b border-gray-100 dark:border-slate-700">
                        <th class="text-left py-3 px-5 font-medium text-gray-500 dark:text-slate-400">Name</th>
                        <th class="text-left py-3 px-5 font-medium text-gray-500 dark:text-slate-400">Product</th>
                        <th class="text-left py-3 px-5 font-medium text-gray-500 dark:text-slate-400">Type</th>
                        <th class="text-left py-3 px-5 font-medium text-gray-500 dark:text-slate-400">Status</th>
                        <th class="text-left py-3 px-5 font-medium text-gray-500 dark:text-slate-400">Date</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty(\$recent_inquiries)): ?>
                    <tr><td colspan="5" class="py-8 text-center text-gray-400 dark:text-slate-500">No inquiries yet</td></tr>
                    <?php else: ?>
                    <?php foreach (array_slice(\$recent_inquiries, 0, 8) as \$inq): ?>
                    <tr class="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                        <td class="py-3 px-5">
                            <div class="font-medium text-gray-900 dark:text-white"><?= e(\$inq['name']) ?></div>
                            <div class="text-xs text-gray-500 dark:text-slate-400"><?= e(\$inq['email']) ?></div>
                        </td>
                        <td class="py-3 px-5 text-gray-600 dark:text-slate-300"><?= e(\$inq['product_name'] ?? 'N/A') ?></td>
                        <td class="py-3 px-5">
                            <span class="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                <?= e(ucfirst(\$inq['type'])) ?>
                            </span>
                        </td>
                        <td class="py-3 px-5">
                            <select onchange="updateInquiryStatus(<?= \$inq['id'] ?>, this.value)"
                                    class="text-xs rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-300 px-2 py-1">
                                <?php foreach (['new', 'in_progress', 'resolved', 'closed'] as \$s): ?>
                                <option value="<?= \$s ?>" <?= \$inq['status'] === \$s ? 'selected' : '' ?>><?= ucfirst(str_replace('_', ' ', \$s)) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </td>
                        <td class="py-3 px-5 text-gray-500 dark:text-slate-400 text-xs"><?= time_ago(\$inq['created_at']) ?></td>
                    </tr>
                    <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Top Products -->
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
        <div class="p-5 border-b border-gray-200 dark:border-slate-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Top Products</h2>
            <p class="text-xs text-gray-500 dark:text-slate-400 mt-0.5">By inquiry count</p>
        </div>
        <div class="p-5 space-y-4">
            <?php if (empty(\$top_products)): ?>
            <p class="text-sm text-gray-400 dark:text-slate-500 text-center py-4">No data yet</p>
            <?php else: ?>
            <?php \$maxInq = max(array_column(\$top_products, 'inquiry_count') ?: [1]); ?>
            <?php foreach (\$top_products as \$i => \$product): ?>
            <div>
                <div class="flex items-center justify-between mb-1.5">
                    <span class="text-sm font-medium text-gray-700 dark:text-slate-300 truncate"><?= e(\$product['name']) ?></span>
                    <span class="text-sm font-bold text-gray-900 dark:text-white"><?= \$product['inquiry_count'] ?></span>
                </div>
                <div class="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div class="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                         style="width: <?= round((\$product['inquiry_count'] / \$maxInq) * 100) ?>%"></div>
                </div>
            </div>
            <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </div>
</div>

<!-- Second Row -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
    <!-- Activity Feed -->
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
        <div class="p-5 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
            <a href="<?= url('admin/activity-logs') ?>" class="text-sm text-blue-600 dark:text-blue-400 hover:underline">View all</a>
        </div>
        <div class="p-5 space-y-4 max-h-80 overflow-y-auto">
            <?php if (empty(\$recent_activity)): ?>
            <p class="text-sm text-gray-400 dark:text-slate-500 text-center py-4">No activity yet</p>
            <?php else: ?>
            <?php foreach (array_slice(\$recent_activity, 0, 10) as \$activity): ?>
            <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <svg class="w-4 h-4 text-gray-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-700 dark:text-slate-300">
                        <span class="font-medium"><?= e(\$activity['user_name'] ?? 'System') ?></span>
                        <?= e(\$activity['description'] ?: \$activity['action']) ?>
                    </p>
                    <p class="text-xs text-gray-400 dark:text-slate-500 mt-0.5"><?= time_ago(\$activity['created_at']) ?></p>
                </div>
            </div>
            <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </div>

    <!-- System Health -->
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
        <div class="p-5 border-b border-gray-200 dark:border-slate-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">System Health</h2>
        </div>
        <div class="p-5">
            <div class="space-y-3">
                <?php
                \$healthItems = [
                    ['label' => 'PHP Version', 'value' => \$system_health['php_version'], 'status' => version_compare(\$system_health['php_version'], '8.2.0', '>=') ? 'good' : 'warn'],
                    ['label' => 'MySQL Version', 'value' => \$system_health['mysql_version'], 'status' => 'good'],
                    ['label' => 'Database Size', 'value' => \$system_health['db_size'], 'status' => 'good'],
                    ['label' => 'Disk Space Free', 'value' => \$system_health['disk_free'] . ' / ' . \$system_health['disk_total'], 'status' => 'good'],
                    ['label' => 'Memory Usage', 'value' => \$system_health['memory_usage'], 'status' => 'good'],
                    ['label' => 'Upload Max', 'value' => \$system_health['upload_max'], 'status' => 'good'],
                    ['label' => 'Max Execution', 'value' => \$system_health['max_execution'], 'status' => 'good'],
                    ['label' => 'SSL Enabled', 'value' => \$system_health['ssl_enabled'], 'status' => \$system_health['ssl_enabled'] === 'Yes' ? 'good' : 'warn'],
                    ['label' => 'Query Count', 'value' => (string) \$system_health['query_count'], 'status' => 'info'],
                ];
                ?>
                <?php foreach (\$healthItems as \$item): ?>
                <div class="flex items-center justify-between py-2 border-b border-gray-100 dark:border-slate-700/50 last:border-0">
                    <span class="text-sm text-gray-600 dark:text-slate-400"><?= \$item['label'] ?></span>
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-medium text-gray-900 dark:text-white"><?= e(\$item['value']) ?></span>
                        <span class="w-2 h-2 rounded-full <?= \$item['status'] === 'good' ? 'bg-green-400' : (\$item['status'] === 'warn' ? 'bg-amber-400' : 'bg-blue-400') ?>"></span>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
        </div>
    </div>
</div>

<!-- Traffic Chart Placeholder -->
<div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
    <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Traffic Overview</h2>
        <span class="text-xs text-gray-500 dark:text-slate-400">Last 30 days</span>
    </div>
    <div class="h-48 flex items-end justify-between gap-1 px-4" id="traffic-chart">
        <?php
        // Generate simple bar chart from traffic data
        \$maxViews = 1;
        if (!empty(\$traffic_data)) {
            \$maxViews = max(array_column(\$traffic_data, 'views') ?: [1]);
        }
        \$days = array_fill(0, 30, 0);
        if (!empty(\$traffic_data)) {
            foreach (\$traffic_data as \$d) {
                \$dayIndex = (int) date('z', strtotime(\$d['date'])) % 30;
                \$days[\$dayIndex] = (int) \$d['views'];
            }
        }
        ?>
        <?php foreach (\$days as \$i => \$views): ?>
        <div class="flex-1 flex flex-col items-center gap-1">
            <div class="w-full bg-blue-500/20 dark:bg-blue-400/20 rounded-t-sm relative overflow-hidden"
                 style="height: <?= max(4, (\$views / \$maxViews) * 160) ?>px;">
                <div class="absolute inset-0 bg-gradient-to-t from-blue-500 to-blue-400 dark:from-blue-400 dark:to-blue-300 opacity-80 rounded-t-sm"></div>
            </div>
        </div>
        <?php endforeach; ?>
    </div>
</div>

<!-- AJAX: Update Inquiry Status -->
<script>
function updateInquiryStatus(id, status) {
    const token = document.querySelector('meta[name="csrf-token"]')?.content;
    fetch('<?= url("admin/dashboard/update-inquiry-status") ?>', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
        },
        body: new URLSearchParams({ _token: token, id: id, status: status })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            window.dispatchEvent(new CustomEvent('toast', {
                detail: { id: Date.now(), type: 'success', message: 'Status updated successfully' }
            }));
        }
    })
    .catch(err => console.error('Status update failed:', err));
}
</script>
`
  },
];
