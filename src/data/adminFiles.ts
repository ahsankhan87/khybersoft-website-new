export interface AdminFile {
  path: string;
  name: string;
  language: string;
  category: string;
  content: string;
  description: string;
}

export const adminFiles: AdminFile[] = [
  // ─── AUTH CONTROLLER ───────────────────────────────────────────────
  {
    path: 'app/controllers/admin/AuthController.php',
    name: 'AuthController.php',
    language: 'php',
    category: 'Controllers',
    description: 'Full authentication: login, forgot/reset password, 2FA, rate limiting',
    content: `<?php
declare(strict_types=1);

namespace App\\Controllers\\Admin;

use App\\Core\\Controller;
use App\\Core\\Auth;
use App\\Core\\Validator;
use App\\Core\\Database;
use App\\Core\\CSRF;
use App\\Helpers\\RateLimiter;

/**
 * Admin Authentication Controller
 * Handles login, logout, forgot/reset password, 2FA
 */
class AuthController extends Controller
{
    protected string \$layout = 'auth';

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
            'error' => get_flash('error'),
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
        \$limiter = new RateLimiter('login_attempts', 5, 900); // 15 min

        if (\$limiter->isLimited(\$ip)) {
            \$remaining = \$limiter->getRemainingTime(\$ip);
            \$minutes = (int) ceil(\$remaining / 60);
            flash('error', "Too many login attempts. Please try again in {\$minutes} minutes.");
            \$this->redirect(url('admin/login'));
            return;
        }

        \$validator = Validator::make(\$_POST, [
            'email'    => 'required|email',
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

        \$db = Database::getInstance();
        \$user = \$db->fetch(
            "SELECT * FROM users WHERE email = ? AND status = 'active' AND deleted_at IS NULL",
            [\$email]
        );

        if (!\$user || !password_verify(\$password, \$user['password_hash'])) {
            // Record failed attempt
            \$limiter->hit(\$ip);
            \$attemptsLeft = \$limiter->getRemainingAttempts(\$ip);

            // Log failed login
            \$this->logLoginAttempt(null, \$email, false);

            if (\$attemptsLeft <= 0) {
                flash('error', 'Too many failed attempts. Account temporarily locked for 15 minutes.');
            } else {
                flash('error', "Invalid credentials. {\$attemptsLeft} attempts remaining.");
            }

            flash_input();
            \$this->redirect(url('admin/login'));
            return;
        }

        // Check if account is banned
        if (\$user['status'] === 'banned') {
            flash('error', 'Your account has been suspended. Contact the administrator.');
            \$this->redirect(url('admin/login'));
            return;
        }

        // Check if 2FA is enabled
        if (!empty(\$user['two_factor_secret'])) {
            // Store user ID in session temporarily for 2FA verification
            \$_SESSION['2fa_user_id'] = \$user['id'];
            \$_SESSION['2fa_remember'] = \$remember;
            \$this->redirect(url('admin/2fa'));
            return;
        }

        // Complete login
        \$this->completeLogin(\$user, \$remember);
    }

    /**
     * Complete the login process
     */
    private function completeLogin(array \$user, bool \$remember): void
    {
        // Regenerate session ID to prevent fixation
        session_regenerate_id(true);

        // Set session data
        \$_SESSION['user_id'] = \$user['id'];
        \$_SESSION['user_role'] = \$user['role_id'];
        \$_SESSION['login_time'] = time();
        \$_SESSION['_created_at'] = time();

        // Clear 2FA temp data
        unset(\$_SESSION['2fa_user_id'], \$_SESSION['2fa_remember']);

        // Update last login
        \$db = Database::getInstance();
        \$db->update('users', [
            'last_login' => date('Y-m-d H:i:s'),
            'last_login_ip' => client_ip(),
        ], 'id = ?', [\$user['id']]);

        // Handle remember me
        if (\$remember) {
            \$this->setRememberToken((int) \$user['id']);
        }

        // Clear rate limiter on success
        \$limiter = new RateLimiter('login_attempts', 5, 900);
        \$limiter->clear(client_ip());

        // Log successful login
        \$this->logLoginAttempt((int) \$user['id'], \$user['email'], true);

        // Activity log
        \$db->insert('activity_logs', [
            'user_id' => \$user['id'],
            'action' => 'login',
            'description' => 'User logged in successfully',
            'ip' => client_ip(),
            'user_agent' => \$_SERVER['HTTP_USER_AGENT'] ?? '',
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        // Redirect to intended page or dashboard
        \$intended = \$_SESSION['intended_url'] ?? url('admin');
        unset(\$_SESSION['intended_url']);
        \$this->redirect(\$intended);
    }

    /**
     * Show 2FA verification page
     */
    public function showTwoFactor(): void
    {
        if (!isset(\$_SESSION['2fa_user_id'])) {
            \$this->redirect(url('admin/login'));
            return;
        }

        \$this->view('admin.auth.two-factor', [
            'page_title' => 'Two-Factor Authentication',
            'error' => get_flash('error'),
        ]);
    }

    /**
     * Verify 2FA code
     */
    public function verifyTwoFactor(): void
    {
        if (!\$this->validateCsrf()) return;

        if (!isset(\$_SESSION['2fa_user_id'])) {
            \$this->redirect(url('admin/login'));
            return;
        }

        \$code = \$this->input('code');
        \$userId = (int) \$_SESSION['2fa_user_id'];
        \$remember = (bool) (\$_SESSION['2fa_remember'] ?? false);

        // Rate limit 2FA attempts
        \$limiter = new RateLimiter('2fa_attempts', 5, 300);
        if (\$limiter->isLimited(client_ip())) {
            flash('error', 'Too many 2FA attempts. Please try again in 5 minutes.');
            \$this->redirect(url('admin/2fa'));
            return;
        }

        \$db = Database::getInstance();
        \$user = \$db->fetch("SELECT * FROM users WHERE id = ?", [\$userId]);

        if (!\$user || empty(\$user['two_factor_secret'])) {
            \$this->redirect(url('admin/login'));
            return;
        }

        // Verify TOTP code
        if (\$this->verifyTOTP(\$user['two_factor_secret'], \$code)) {
            \$limiter->clear(client_ip());
            \$this->completeLogin(\$user, \$remember);
        } else {
            \$limiter->hit(client_ip());
            flash('error', 'Invalid authentication code. Please try again.');
            \$this->redirect(url('admin/2fa'));
        }
    }

    /**
     * Verify TOTP code (Google Authenticator compatible)
     */
    private function verifyTOTP(string \$secret, string \$code): bool
    {
        \$timeSlice = (int) floor(time() / 30);

        // Check current and adjacent time slices (±1) for clock drift
        for (\$i = -1; \$i <= 1; \$i++) {
            \$calculatedCode = \$this->generateTOTPCode(\$secret, \$timeSlice + \$i);
            if (hash_equals(\$calculatedCode, \$code)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Generate TOTP code from secret
     */
    private function generateTOTPCode(string \$secret, int \$timeSlice): string
    {
        // Decode base32 secret
        \$secretKey = \$this->base32Decode(\$secret);

        // Pack time into binary
        \$time = pack('N*', 0, \$timeSlice);

        // Hash with HMAC-SHA1
        \$hash = hash_hmac('sha1', \$time, \$secretKey, true);

        // Get last 4 bits as offset
        \$offset = ord(\$hash[strlen(\$hash) - 1]) & 0x0F;

        // Get 32-bit code
        \$code = (
            ((ord(\$hash[\$offset]) & 0x7F) << 24) |
            ((ord(\$hash[\$offset + 1]) & 0xFF) << 16) |
            ((ord(\$hash[\$offset + 2]) & 0xFF) << 8) |
            (ord(\$hash[\$offset + 3]) & 0xFF)
        ) % 1000000;

        return str_pad((string) \$code, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Base32 decode
     */
    private function base32Decode(string \$input): string
    {
        \$map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        \$input = strtoupper(rtrim(\$input, '='));
        \$buffer = 0;
        \$bitsLeft = 0;
        \$output = '';

        for (\$i = 0; \$i < strlen(\$input); \$i++) {
            \$val = strpos(\$map, \$input[\$i]);
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

    /**
     * Show forgot password page
     */
    public function showForgotPassword(): void
    {
        \$this->view('admin.auth.forgot-password', [
            'page_title' => 'Forgot Password',
            'success' => get_flash('success'),
            'error' => get_flash('error'),
        ]);
    }

    /**
     * Process forgot password request
     */
    public function forgotPassword(): void
    {
        if (!\$this->validateCsrf()) return;

        // Rate limit password reset requests
        \$limiter = new RateLimiter('password_reset', 3, 1800); // 3 per 30 min
        if (\$limiter->isLimited(client_ip())) {
            flash('error', 'Too many reset requests. Please try again later.');
            \$this->redirect(url('admin/forgot-password'));
            return;
        }

        \$validator = Validator::make(\$_POST, [
            'email' => 'required|email',
        ]);

        if (!\$validator->validate()) {
            flash('error', 'Please enter a valid email address.');
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
        flash('success', 'If an account exists with that email, a password reset link has been sent.');
        \$limiter->hit(client_ip());

        if (\$user) {
            // Generate reset token
            \$token = bin2hex(random_bytes(32));
            \$hashedToken = hash('sha256', \$token);
            \$expiresAt = date('Y-m-d H:i:s', time() + 3600); // 1 hour

            // Store token
            \$db->insert('password_resets', [
                'user_id' => \$user['id'],
                'token' => \$hashedToken,
                'expires_at' => \$expiresAt,
                'ip' => client_ip(),
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            // Send email
            \$resetUrl = url('admin/reset-password?token=' . \$token . '&email=' . urlencode(\$email));
            \$this->sendResetEmail(\$user, \$resetUrl);

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

        \$this->redirect(url('admin/forgot-password'));
    }

    /**
     * Show reset password page
     */
    public function showResetPassword(): void
    {
        \$token = \$_GET['token'] ?? '';
        \$email = \$_GET['email'] ?? '';

        if (empty(\$token) || empty(\$email)) {
            flash('error', 'Invalid reset link.');
            \$this->redirect(url('admin/login'));
            return;
        }

        // Verify token
        \$db = Database::getInstance();
        \$hashedToken = hash('sha256', \$token);
        \$reset = \$db->fetch(
            "SELECT pr.*, u.email FROM password_resets pr
             JOIN users u ON u.id = pr.user_id
             WHERE pr.token = ? AND u.email = ? AND pr.expires_at > NOW() AND pr.used_at IS NULL",
            [\$hashedToken, \$email]
        );

        if (!\$reset) {
            flash('error', 'This reset link is invalid or has expired.');
            \$this->redirect(url('admin/forgot-password'));
            return;
        }

        \$this->view('admin.auth.reset-password', [
            'page_title' => 'Reset Password',
            'token' => \$token,
            'email' => \$email,
            'error' => get_flash('error'),
        ]);
    }

    /**
     * Process password reset
     */
    public function resetPassword(): void
    {
        if (!\$this->validateCsrf()) return;

        \$token = \$this->input('token');
        \$email = \$this->input('email');

        \$validator = Validator::make(\$_POST, [
            'password' => 'required|min:8|confirmed',
        ]);

        if (!\$validator->validate()) {
            flash('error', 'Password must be at least 8 characters and match confirmation.');
            \$this->redirect(url('admin/reset-password?token=' . urlencode(\$token) . '&email=' . urlencode(\$email)));
            return;
        }

        \$db = Database::getInstance();
        \$hashedToken = hash('sha256', \$token);

        \$reset = \$db->fetch(
            "SELECT pr.*, u.id as user_id FROM password_resets pr
             JOIN users u ON u.id = pr.user_id
             WHERE pr.token = ? AND u.email = ? AND pr.expires_at > NOW() AND pr.used_at IS NULL",
            [\$hashedToken, \$email]
        );

        if (!\$reset) {
            flash('error', 'This reset link is invalid or has expired.');
            \$this->redirect(url('admin/forgot-password'));
            return;
        }

        // Update password
        \$newHash = password_hash(\$this->input('password'), PASSWORD_BCRYPT, ['cost' => 12]);

        \$db->transaction(function() use (\$db, \$reset, \$newHash) {
            // Update user password
            \$db->update('users', [
                'password_hash' => \$newHash,
                'updated_at' => date('Y-m-d H:i:s'),
            ], 'id = ?', [\$reset['user_id']]);

            // Mark token as used
            \$db->update('password_resets', [
                'used_at' => date('Y-m-d H:i:s'),
            ], 'id = ?', [\$reset['id']]);

            // Invalidate all remember tokens (force logout everywhere)
            \$db->update('users', [
                'remember_token' => null,
            ], 'id = ?', [\$reset['user_id']]);

            // Delete all other active sessions
            \$db->update('password_resets', [
                'used_at' => date('Y-m-d H:i:s'),
            ], "user_id = ? AND id != ?", [\$reset['user_id'], \$reset['id']]);

            // Log activity
            \$db->insert('activity_logs', [
                'user_id' => \$reset['user_id'],
                'action' => 'password_changed',
                'description' => 'Password was reset via email',
                'ip' => client_ip(),
                'user_agent' => \$_SERVER['HTTP_USER_AGENT'] ?? '',
                'created_at' => date('Y-m-d H:i:s'),
            ]);
        });

        // Clear any current session
        if (isset(\$_SESSION['user_id']) && \$_SESSION['user_id'] == \$reset['user_id']) {
            session_destroy();
        }

        flash('success', 'Password has been reset successfully. You can now log in with your new password.');
        \$this->redirect(url('admin/login'));
    }

    /**
     * Logout
     */
    public function logout(): void
    {
        \$userId = \$_SESSION['user_id'] ?? null;

        if (\$userId) {
            // Clear remember token
            \$this->clearRememberToken((int) \$userId);

            // Log activity
            \$db = Database::getInstance();
            \$db->insert('activity_logs', [
                'user_id' => \$userId,
                'action' => 'logout',
                'description' => 'User logged out',
                'ip' => client_ip(),
                'user_agent' => \$_SERVER['HTTP_USER_AGENT'] ?? '',
                'created_at' => date('Y-m-d H:i:s'),
            ]);
        }

        // Destroy session completely
        \$_SESSION = [];

        if (ini_get('session.use_cookies')) {
            \$params = session_get_cookie_params();
            setcookie(
                session_name(), '', time() - 42000,
                \$params['path'], \$params['domain'],
                \$params['secure'], \$params['httponly']
            );
        }

        session_destroy();

        \$this->redirect(url('admin/login'));
    }

    /**
     * Send password reset email
     */
    private function sendResetEmail(array \$user, string \$resetUrl): void
    {
        \$siteName = setting('site_name', 'Khybersoft');
        \$fromEmail = setting('smtp_from', 'noreply@khybersoft.com');
        \$fromName = setting('smtp_from_name', \$siteName);

        \$subject = "Password Reset - {\$siteName}";
        \$body = \$this->buildResetEmailHtml(\$user['name'], \$resetUrl, \$siteName);

        \$headers = [
            'MIME-Version: 1.0',
            'Content-type: text/html; charset=UTF-8',
            "From: {\$fromName} <{\$fromEmail}>",
            'X-Mailer: Khybersoft/1.0',
        ];

        // Attempt to send via PHP mail()
        // NOTE: For production, configure SMTP in settings for better deliverability
        @mail(\$user['email'], \$subject, \$body, implode("\\r\\n", \$headers));
    }

    /**
     * Build reset email HTML
     */
    private function buildResetEmailHtml(string \$name, string \$url, string \$siteName): string
    {
        return <<<HTML
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif;">
            <div style="max-width:500px;margin:40px auto;background:#1e293b;border-radius:16px;padding:40px;border:1px solid #334155;">
                <h1 style="color:#f8fafc;margin:0 0 8px;font-size:24px;">{\$siteName}</h1>
                <p style="color:#94a3b8;margin:0 0 24px;">Password Reset Request</p>
                <p style="color:#e2e8f0;line-height:1.6;">
                    Hello {\$name},<br><br>
                    We received a request to reset your password. Click the button below to set a new password.
                    This link expires in 1 hour.
                </p>
                <a href="{\$url}" style="display:inline-block;margin:24px 0;padding:14px 32px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
                    Reset Password
                </a>
                <p style="color:#64748b;font-size:13px;margin:24px 0 0;">
                    If you didn't request this, please ignore this email. Your password will remain unchanged.
                </p>
            </div>
        </body>
        </html>
        HTML;
    }

    /**
     * Set remember-me token
     */
    private function setRememberToken(int \$userId): void
    {
        \$token = bin2hex(random_bytes(32));
        \$hashedToken = hash('sha256', \$token);

        \$db = Database::getInstance();
        \$db->update('users', ['remember_token' => \$hashedToken], 'id = ?', [\$userId]);

        setcookie('remember_token', \$userId . ':' . \$token, [
            'expires'  => time() + REMEMBER_ME_LIFETIME,
            'path'     => '/',
            'secure'   => false, // Set true with HTTPS
            'httponly'  => true,
            'samesite' => 'Lax',
        ]);
    }

    /**
     * Clear remember-me token
     */
    private function clearRememberToken(int \$userId): void
    {
        \$db = Database::getInstance();
        \$db->update('users', ['remember_token' => null], 'id = ?', [\$userId]);

        setcookie('remember_token', '', [
            'expires' => time() - 3600,
            'path'    => '/',
        ]);
    }

    /**
     * Log login attempt
     */
    private function logLoginAttempt(?int \$userId, string \$email, bool \$success): void
    {
        try {
            \$db = Database::getInstance();
            \$db->insert('activity_logs', [
                'user_id'     => \$userId,
                'action'      => \$success ? 'login_success' : 'login_failed',
                'description' => (\$success ? 'Successful login' : 'Failed login attempt') . ' for: ' . \$email,
                'ip'          => client_ip(),
                'user_agent'  => \$_SERVER['HTTP_USER_AGENT'] ?? '',
                'created_at'  => date('Y-m-d H:i:s'),
            ]);
        } catch (\\Throwable \$e) {
            error_log('Login log failed: ' . \$e->getMessage());
        }
    }
}`
  },

  // ─── DASHBOARD CONTROLLER ──────────────────────────────────────────
  {
    path: 'app/controllers/admin/DashboardController.php',
    name: 'DashboardController.php',
    language: 'php',
    category: 'Controllers',
    description: 'Admin dashboard with stats, charts, recent activity, and system health',
    content: `<?php
declare(strict_types=1);

namespace App\\Controllers\\Admin;

use App\\Core\\Controller;
use App\\Core\\Database;
use App\\Core\\Auth;

/**
 * Admin Dashboard Controller
 */
class DashboardController extends Controller
{
    protected string \$layout = 'admin';
    private Database \$db;

    public function __construct()
    {
        parent::__construct();
        \$this->db = Database::getInstance();
    }

    /**
     * Main dashboard
     */
    public function index(): void
    {
        \$data = [
            'page_title' => 'Dashboard',
            'breadcrumbs' => [
                ['label' => 'Dashboard', 'url' => null],
            ],
            'stats' => \$this->getStats(),
            'sparkline_data' => \$this->getSparklineData(),
            'recent_inquiries' => \$this->getRecentInquiries(),
            'recent_activity' => \$this->getRecentActivity(),
            'traffic_data' => \$this->getTrafficData(),
            'top_products' => \$this->getTopProducts(),
            'system_health' => \$this->getSystemHealth(),
            'quick_actions' => \$this->getQuickActions(),
        ];

        \$this->view('admin.dashboard.index', \$data);
    }

    /**
     * Dashboard stats cards
     */
    private function getStats(): array
    {
        return [
            [
                'label' => 'Total Products',
                'value' => (int) \$this->db->fetchColumn(
                    "SELECT COUNT(*) FROM products WHERE deleted_at IS NULL AND status = 'published'"
                ),
                'change' => '+12%',
                'change_type' => 'positive',
                'icon' => 'package',
                'color' => 'blue',
            ],
            [
                'label' => 'Inquiries Today',
                'value' => (int) \$this->db->fetchColumn(
                    "SELECT COUNT(*) FROM product_inquiries WHERE DATE(created_at) = CURDATE()"
                ),
                'change' => '+5%',
                'change_type' => 'positive',
                'icon' => 'mail',
                'color' => 'emerald',
            ],
            [
                'label' => 'Blog Posts',
                'value' => (int) \$this->db->fetchColumn(
                    "SELECT COUNT(*) FROM blog_posts WHERE deleted_at IS NULL AND status = 'published'"
                ),
                'change' => '+3',
                'change_type' => 'neutral',
                'icon' => 'file-text',
                'color' => 'violet',
            ],
            [
                'label' => 'Subscribers',
                'value' => (int) \$this->db->fetchColumn(
                    "SELECT COUNT(*) FROM newsletter_subscribers WHERE status = 'active' AND verified = 1"
                ),
                'change' => '+8%',
                'change_type' => 'positive',
                'icon' => 'users',
                'color' => 'amber',
            ],
        ];
    }

    /**
     * Sparkline data for stats cards
     */
    private function getSparklineData(): array
    {
        // Last 7 days data for each stat
        \$productData = \$this->db->fetchAll(
            "SELECT DATE(created_at) as date, COUNT(*) as count
             FROM products
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND deleted_at IS NULL
             GROUP BY DATE(created_at)
             ORDER BY date ASC"
        );

        \$inquiryData = \$this->db->fetchAll(
            "SELECT DATE(created_at) as date, COUNT(*) as count
             FROM product_inquiries
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             GROUP BY DATE(created_at)
             ORDER BY date ASC"
        );

        return [
            'products' => \$this->formatSparkline(\$productData),
            'inquiries' => \$this->formatSparkline(\$inquiryData),
        ];
    }

    /**
     * Format sparkline data
     */
    private function formatSparkline(array \$data): array
    {
        \$result = array_fill(0, 7, 0);
        foreach (\$data as \$row) {
            \$dayIndex = (int) floor((strtotime(\$row['date']) - strtotime('-7 days')) / 86400);
            if (\$dayIndex >= 0 && \$dayIndex < 7) {
                \$result[\$dayIndex] = (int) \$row['count'];
            }
        }
        return \$result;
    }

    /**
     * Recent product inquiries
     */
    private function getRecentInquiries(): array
    {
        return \$this->db->fetchAll(
            "SELECT pi.*, p.name as product_name
             FROM product_inquiries pi
             LEFT JOIN products p ON pi.product_id = p.id
             ORDER BY pi.created_at DESC
             LIMIT 10"
        );
    }

    /**
     * Recent activity log
     */
    private function getRecentActivity(): array
    {
        return \$this->db->fetchAll(
            "SELECT al.*, u.name as user_name
             FROM activity_logs al
             LEFT JOIN users u ON al.user_id = u.id
             ORDER BY al.created_at DESC
             LIMIT 15"
        );
    }

    /**
     * Traffic data for chart (last 30 days)
     */
    private function getTrafficData(): array
    {
        \$data = \$this->db->fetchAll(
            "SELECT DATE(created_at) as date, COUNT(*) as inquiries
             FROM product_inquiries
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             GROUP BY DATE(created_at)
             ORDER BY date ASC"
        );

        // Fill in missing dates
        \$result = [];
        for (\$i = 29; \$i >= 0; \$i--) {
            \$date = date('Y-m-d', strtotime("-{\$i} days"));
            \$found = false;
            foreach (\$data as \$row) {
                if (\$row['date'] === \$date) {
                    \$result[] = ['date' => \$date, 'inquiries' => (int) \$row['inquiries']];
                    \$found = true;
                    break;
                }
            }
            if (!\$found) {
                \$result[] = ['date' => \$date, 'inquiries' => 0];
            }
        }

        return \$result;
    }

    /**
     * Top products by inquiries
     */
    private function getTopProducts(): array
    {
        return \$this->db->fetchAll(
            "SELECT p.name, p.slug, COUNT(pi.id) as inquiry_count
             FROM products p
             INNER JOIN product_inquiries pi ON pi.product_id = p.id
             WHERE p.deleted_at IS NULL
             GROUP BY p.id, p.name, p.slug
             ORDER BY inquiry_count DESC
             LIMIT 5"
        );
    }

    /**
     * System health information
     */
    private function getSystemHealth(): array
    {
        \$health = [
            'php_version' => PHP_VERSION,
            'php_memory_limit' => ini_get('memory_limit'),
            'php_max_upload' => ini_get('upload_max_filesize'),
            'server_software' => \$_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
            'mysql_version' => '',
            'db_size' => '',
            'disk_free' => '',
            'disk_total' => '',
            'extensions' => [],
        ];

        // MySQL version
        try {
            \$health['mysql_version'] = \$this->db->fetchColumn("SELECT VERSION()");
        } catch (\\Throwable \$e) {
            \$health['mysql_version'] = 'Unknown';
        }

        // Database size
        try {
            \$dbName = getenv('DB_NAME') ?: 'khybersoft_db';
            \$health['db_size'] = \$this->db->fetchColumn(
                "SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2)
                 FROM information_schema.tables WHERE table_schema = ?",
                [\$dbName]
            ) . ' MB';
        } catch (\\Throwable \$e) {
            \$health['db_size'] = 'N/A';
        }

        // Disk space
        \$free = @disk_free_space(ROOT_PATH);
        \$total = @disk_total_space(ROOT_PATH);
        \$health['disk_free'] = \$free ? \$this->formatBytes(\$free) : 'N/A';
        \$health['disk_total'] = \$total ? \$this->formatBytes(\$total) : 'N/A';

        // Check extensions
        \$required = ['pdo', 'pdo_mysql', 'mbstring', 'json', 'openssl', 'curl', 'gd'];
        foreach (\$required as \$ext) {
            \$health['extensions'][\$ext] = extension_loaded(\$ext);
        }

        return \$health;
    }

    /**
     * Quick actions for dashboard
     */
    private function getQuickActions(): array
    {
        return [
            ['label' => 'New Product', 'url' => url('admin/products/create'), 'icon' => 'plus', 'color' => 'blue'],
            ['label' => 'New Blog Post', 'url' => url('admin/blog/create'), 'icon' => 'edit', 'color' => 'emerald'],
            ['label' => 'View Inquiries', 'url' => url('admin/inquiries'), 'icon' => 'inbox', 'color' => 'violet'],
            ['label' => 'Manage Pages', 'url' => url('admin/pages'), 'icon' => 'file', 'color' => 'amber'],
        ];
    }

    /**
     * Format bytes to human readable
     */
    private function formatBytes(int \$bytes): string
    {
        \$units = ['B', 'KB', 'MB', 'GB', 'TB'];
        \$i = 0;
        \$size = (float) \$bytes;
        while (\$size >= 1024 && \$i < count(\$units) - 1) {
            \$size /= 1024;
            \$i++;
        }
        return round(\$size, 2) . ' ' . \$units[\$i];
    }

    /**
     * API endpoint for dashboard stats (AJAX)
     */
    public function statsApi(): void
    {
        \$this->json([
            'stats' => \$this->getStats(),
            'traffic' => \$this->getTrafficData(),
            'top_products' => \$this->getTopProducts(),
        ]);
    }
}`
  },

  // ─── MIDDLEWARE ────────────────────────────────────────────────────
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
 * Validates that user is logged in and has admin access
 */
class AdminAuth
{
    public function handle(): bool
    {
        // Check if authenticated
        if (Auth::guest()) {
            // Store intended URL for redirect after login
            \$_SESSION['intended_url'] = \$_SERVER['REQUEST_URI'] ?? '/admin';

            // Flash message
            \$_SESSION['_flash']['warning'] = 'Please log in to access the admin panel.';

            header('Location: ' . SITE_URL . '/admin/login');
            exit;
        }

        // Check if user has admin role
        if (!Auth::isAdmin()) {
            http_response_code(403);

            // Log unauthorized access attempt
            try {
                \$db = \\App\\Core\\Database::getInstance();
                \$db->insert('activity_logs', [
                    'user_id' => Auth::id(),
                    'action' => 'unauthorized_access',
                    'description' => 'Attempted to access admin panel without permission',
                    'model' => 'admin',
                    'ip' => client_ip(),
                    'user_agent' => \$_SERVER['HTTP_USER_AGENT'] ?? '',
                    'created_at' => date('Y-m-d H:i:s'),
                ]);
            } catch (\\Throwable \$e) {
                error_log('Activity log failed: ' . \$e->getMessage());
            }

            echo '<!DOCTYPE html><html><head><title>403 Forbidden</title></head>';
            echo '<body style="background:#0f172a;color:#e2e8f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">';
            echo '<div style="text-align:center;"><h1 style="font-size:72px;margin:0;color:#ef4444;">403</h1>';
            echo '<p style="font-size:18px;color:#94a3b8;">Access Denied</p>';
            echo '<p style="color:#64748b;">You do not have permission to access this area.</p>';
            echo '<a href="' . SITE_URL . '" style="display:inline-block;margin-top:20px;padding:10px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:8px;">Go Home</a>';
            echo '</div></body></html>';
            exit;
        }

        // Validate session age (force re-auth after extended period)
        \$sessionMaxAge = 28800; // 8 hours
        if (isset(\$_SESSION['login_time']) && (time() - \$_SESSION['login_time']) > \$sessionMaxAge) {
            \$_SESSION['intended_url'] = \$_SERVER['REQUEST_URI'] ?? '/admin';
            \$_SESSION['_flash']['warning'] = 'Session expired. Please log in again.';
            Auth::logout();
            header('Location: ' . SITE_URL . '/admin/login');
            exit;
        }

        return true;
    }
}`
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
    private string \$requiredPermission;

    public function __construct(string \$permission = '')
    {
        \$this->requiredPermission = \$permission;
    }

    public function handle(): bool
    {
        // First ensure user is authenticated admin
        if (Auth::guest()) {
            \$_SESSION['intended_url'] = \$_SERVER['REQUEST_URI'] ?? '/admin';
            header('Location: ' . SITE_URL . '/admin/login');
            exit;
        }

        // Super admin bypasses all permission checks
        if (Auth::hasRole('super_admin')) {
            return true;
        }

        // Check specific permission
        if (\$this->requiredPermission && !Auth::can(\$this->requiredPermission)) {
            // Log the denied access
            try {
                \$db = \\App\\Core\\Database::getInstance();
                \$db->insert('activity_logs', [
                    'user_id' => Auth::id(),
                    'action' => 'permission_denied',
                    'description' => 'Attempted action requiring: ' . \$this->requiredPermission,
                    'ip' => client_ip(),
                    'user_agent' => \$_SERVER['HTTP_USER_AGENT'] ?? '',
                    'created_at' => date('Y-m-d H:i:s'),
                ]);
            } catch (\\Throwable \$e) {
                error_log('Activity log failed: ' . \$e->getMessage());
            }

            // Return 403
            http_response_code(403);
            echo '<!DOCTYPE html><html><head><title>403 - Permission Denied</title></head>';
            echo '<body style="background:#0f172a;color:#e2e8f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">';
            echo '<div style="text-align:center;max-width:400px;">';
            echo '<div style="width:64px;height:64px;margin:0 auto 16px;background:#7c3aed20;border-radius:50%;display:flex;align-items:center;justify-content:center;">';
            echo '<svg width="32" height="32" fill="none" stroke="#a78bfa" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
            echo '</div>';
            echo '<h1 style="font-size:24px;margin:0 0 8px;">Permission Denied</h1>';
            echo '<p style="color:#94a3b8;margin:0 0 24px;">You don\\'t have the required permission to perform this action.</p>';
            echo '<a href="' . SITE_URL . '/admin" style="display:inline-block;padding:10px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:8px;">Back to Dashboard</a>';
            echo '</div></body></html>';
            exit;
        }

        return true;
    }
}`
  },

  // ─── RATE LIMITER ──────────────────────────────────────────────────
  {
    path: 'app/helpers/RateLimiter.php',
    name: 'RateLimiter.php',
    language: 'php',
    category: 'Helpers',
    description: 'Rate limiting using file-based storage (no Redis needed for shared hosting)',
    content: `<?php
declare(strict_types=1);

namespace App\\Helpers;

/**
 * Rate Limiter - File-based rate limiting for shared hosting
 * Uses file system instead of Redis/Memcached
 */
class RateLimiter
{
    private string \$key;
    private int \$maxAttempts;
    private int \$decaySeconds;
    private string \$storagePath;

    public function __construct(string \$key, int \$maxAttempts = 5, int \$decaySeconds = 900)
    {
        \$this->key = \$key;
        \$this->maxAttempts = \$maxAttempts;
        \$this->decaySeconds = \$decaySeconds;
        \$this->storagePath = (defined('CACHE_PATH') ? CACHE_PATH : sys_get_temp_dir()) . '/rate_limits';

        if (!is_dir(\$this->storagePath)) {
            mkdir(\$this->storagePath, 0755, true);
        }
    }

    /**
     * Check if the identifier is rate limited
     */
    public function isLimited(string \$identifier): bool
    {
        \$data = \$this->getData(\$identifier);

        if (\$data === null) {
            return false;
        }

        // Check if decay period has passed
        if (time() - \$data['first_attempt'] > \$this->decaySeconds) {
            \$this->clear(\$identifier);
            return false;
        }

        return \$data['attempts'] >= \$this->maxAttempts;
    }

    /**
     * Record a hit/attempt
     */
    public function hit(string \$identifier): int
    {
        \$data = \$this->getData(\$identifier);

        if (\$data === null || (time() - \$data['first_attempt'] > \$this->decaySeconds)) {
            \$data = [
                'attempts' => 1,
                'first_attempt' => time(),
            ];
        } else {
            \$data['attempts']++;
        }

        \$this->saveData(\$identifier, \$data);
        return \$data['attempts'];
    }

    /**
     * Get remaining attempts
     */
    public function getRemainingAttempts(string \$identifier): int
    {
        \$data = \$this->getData(\$identifier);

        if (\$data === null) {
            return \$this->maxAttempts;
        }

        if (time() - \$data['first_attempt'] > \$this->decaySeconds) {
            return \$this->maxAttempts;
        }

        return max(0, \$this->maxAttempts - \$data['attempts']);
    }

    /**
     * Get remaining time until limit resets (in seconds)
     */
    public function getRemainingTime(string \$identifier): int
    {
        \$data = \$this->getData(\$identifier);

        if (\$data === null) {
            return 0;
        }

        \$elapsed = time() - \$data['first_attempt'];
        return max(0, \$this->decaySeconds - \$elapsed);
    }

    /**
     * Clear rate limit for identifier
     */
    public function clear(string \$identifier): void
    {
        \$file = \$this->getFilePath(\$identifier);
        if (file_exists(\$file)) {
            @unlink(\$file);
        }
    }

    /**
     * Get attempt count
     */
    public function getAttempts(string \$identifier): int
    {
        \$data = \$this->getData(\$identifier);
        return \$data ? \$data['attempts'] : 0;
    }

    /**
     * Too many requests response headers
     */
    public function tooManyRequestsHeaders(string \$identifier): void
    {
        \$retryAfter = \$this->getRemainingTime(\$identifier);
        header('Retry-After: ' . \$retryAfter);
        header('X-RateLimit-Limit: ' . \$this->maxAttempts);
        header('X-RateLimit-Remaining: 0');
        header('X-RateLimit-Reset: ' . (time() + \$retryAfter));
    }

    /**
     * Get data for identifier
     */
    private function getData(string \$identifier): ?array
    {
        \$file = \$this->getFilePath(\$identifier);

        if (!file_exists(\$file)) {
            return null;
        }

        \$content = @file_get_contents(\$file);
        if (\$content === false) {
            return null;
        }

        \$data = @json_decode(\$content, true);
        if (!is_array(\$data)) {
            return null;
        }

        return \$data;
    }

    /**
     * Save data for identifier
     */
    private function saveData(string \$identifier, array \$data): void
    {
        \$file = \$this->getFilePath(\$identifier);
        @file_put_contents(\$file, json_encode(\$data), LOCK_EX);
    }

    /**
     * Get file path for identifier
     */
    private function getFilePath(string \$identifier): string
    {
        \$safeKey = preg_replace('/[^a-zA-Z0-9_-]/', '_', \$this->key . '_' . \$identifier);
        return \$this->storagePath . '/' . \$safeKey . '.json';
    }

    /**
     * Cleanup expired rate limit files
     */
    public static function cleanup(string \$storagePath = ''): int
    {
        \$path = \$storagePath ?: ((defined('CACHE_PATH') ? CACHE_PATH : sys_get_temp_dir()) . '/rate_limits');

        if (!is_dir(\$path)) {
            return 0;
        }

        \$cleaned = 0;
        \$files = glob(\$path . '/*.json');

        foreach (\$files as \$file) {
            // Remove files older than 1 hour
            if (filemtime(\$file) < time() - 3600) {
                @unlink(\$file);
                \$cleaned++;
            }
        }

        return \$cleaned;
    }
}`
  },

  // ─── ADMIN LAYOUT ──────────────────────────────────────────────────
  {
    path: 'app/views/layouts/admin.php',
    name: 'admin.php (layout)',
    language: 'php',
    category: 'Views/Layout',
    description: 'Main admin layout with sidebar, navbar, breadcrumbs, dark mode, toasts',
    content: `<?php
declare(strict_types=1);
/**
 * Admin Layout - Main template
 * Uses TailwindCSS + Alpine.js for interactivity
 */
use App\\Core\\Auth;
\$currentUser = Auth::user();
\$pageTitle = \$page_title ?? 'Admin';
\$breadcrumbs = \$breadcrumbs ?? [];
?>
<!DOCTYPE html>
<html lang="en" x-data="{ darkMode: localStorage.getItem('darkMode') !== 'false', sidebarOpen: true, mobileSidebar: false }"
      :class="{ 'dark': darkMode }">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="<?= e(\\App\\Core\\CSRF::token()) ?>">
    <title><?= e(\$pageTitle) ?> - Admin | <?= e(setting('site_name')) ?></title>

    <!-- TailwindCSS CDN (replace with compiled version in production) -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        primary: { 50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',300:'#93c5fd',400:'#60a5fa',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8',800:'#1e40af',900:'#1e3a8a' },
                        dark: { 50:'#f8fafc',100:'#f1f5f9',200:'#e2e8f0',300:'#cbd5e1',400:'#94a3b8',500:'#64748b',600:'#475569',700:'#334155',800:'#1e293b',900:'#0f172a',950:'#020617' }
                    }
                }
            }
        }
    </script>

    <!-- Alpine.js -->
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>

    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.x.x/dist/chart.umd.min.js"></script>

    <style>
        [x-cloak] { display: none !important; }
        .sidebar-transition { transition: width 0.3s ease, transform 0.3s ease; }
        .fade-in { animation: fadeIn 0.2s ease-out; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
        .skeleton { background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .toast-enter { animation: toastIn 0.3s ease-out; }
        @keyframes toastIn { from { opacity:0; transform:translateX(100%); } to { opacity:1; transform:translateX(0); } }
    </style>
</head>
<body class="bg-gray-50 dark:bg-dark-950 text-gray-900 dark:text-gray-100 min-h-screen" x-data="adminApp()">

    <!-- Toast Container -->
    <div x-ref="toastContainer" class="fixed top-4 right-4 z-[100] space-y-2 max-w-sm">
        <?php if (has_flash('success')): ?>
        <div x-init="showToast('success', '<?= e(get_flash('success')) ?>')" class="hidden"></div>
        <?php endif; ?>
        <?php if (has_flash('error')): ?>
        <div x-init="showToast('error', '<?= e(get_flash('error')) ?>')" class="hidden"></div>
        <?php endif; ?>
        <?php if (has_flash('warning')): ?>
        <div x-init="showToast('warning', '<?= e(get_flash('warning')) ?>')" class="hidden"></div>
        <?php endif; ?>

        <template x-for="toast in toasts" :key="toast.id">
            <div x-show="toast.visible"
                 x-transition:enter="toast-enter"
                 x-transition:leave="opacity-0 translate-x-full"
                 class="flex items-center gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-sm"
                 :class="{
                     'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800': toast.type === 'success',
                     'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800': toast.type === 'error',
                     'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800': toast.type === 'warning',
                     'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800': toast.type === 'info'
                 }">
                <div x-html="toast.icon"></div>
                <p class="text-sm font-medium" :class="{
                    'text-emerald-800 dark:text-emerald-200': toast.type === 'success',
                    'text-red-800 dark:text-red-200': toast.type === 'error',
                    'text-amber-800 dark:text-amber-200': toast.type === 'warning',
                    'text-blue-800 dark:text-blue-200': toast.type === 'info'
                }" x-text="toast.message"></p>
                <button @click="removeToast(toast.id)" class="ml-auto p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
                    <svg class="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
        </template>
    </div>

    <!-- Mobile Sidebar Overlay -->
    <div x-show="mobileSidebar" x-cloak
         x-transition:enter="transition-opacity ease-out duration-300"
         x-transition:enter-start="opacity-0"
         x-transition:enter-end="opacity-100"
         x-transition:leave="transition-opacity ease-in duration-200"
         x-transition:leave-start="opacity-100"
         x-transition:leave-end="opacity-0"
         @click="mobileSidebar = false"
         class="fixed inset-0 bg-black/50 z-40 lg:hidden"></div>

    <!-- Sidebar -->
    <aside
        :class="{
            'w-64': sidebarOpen,
            'w-20': !sidebarOpen,
            '-translate-x-full': !mobileSidebar,
            'translate-x-0': mobileSidebar
        }"
        class="sidebar-transition fixed top-0 left-0 h-full bg-white dark:bg-dark-900 border-r border-gray-200 dark:border-dark-700 z-50 lg:translate-x-0 flex flex-col">

        <!-- Logo -->
        <div class="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-dark-700">
            <a href="<?= url('admin') ?>" class="flex items-center gap-3">
                <div class="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span class="text-white font-bold text-sm">K</span>
                </div>
                <span x-show="sidebarOpen" x-cloak class="font-bold text-lg text-gray-900 dark:text-white">Khybersoft</span>
            </a>
            <button @click="sidebarOpen = !sidebarOpen" class="hidden lg:flex p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/></svg>
            </button>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 overflow-y-auto py-4 px-3">
            <?php include APP_PATH . '/views/admin/partials/sidebar.php'; ?>
        </nav>

        <!-- User section at bottom -->
        <div class="p-3 border-t border-gray-200 dark:border-dark-700">
            <div class="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors">
                <div class="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <span class="text-white font-semibold text-sm"><?= e(substr(\$currentUser['name'] ?? 'A', 0, 1)) ?></span>
                </div>
                <div x-show="sidebarOpen" x-cloak class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 dark:text-white truncate"><?= e(\$currentUser['name'] ?? 'Admin') ?></p>
                    <p class="text-xs text-gray-500 truncate"><?= e(\$currentUser['role_name'] ?? 'Admin') ?></p>
                </div>
                <a href="<?= url('admin/logout') ?>" x-show="sidebarOpen" x-cloak class="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600 text-gray-400 hover:text-red-500" title="Logout">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                </a>
            </div>
        </div>
    </aside>

    <!-- Main Content Area -->
    <div :class="{ 'lg:ml-64': sidebarOpen, 'lg:ml-20': !sidebarOpen }" class="sidebar-transition min-h-screen flex flex-col">

        <!-- Top Navbar -->
        <header class="h-16 bg-white dark:bg-dark-900 border-b border-gray-200 dark:border-dark-700 sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6">
            <!-- Left: Mobile menu + Breadcrumbs -->
            <div class="flex items-center gap-4">
                <button @click="mobileSidebar = !mobileSidebar" class="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                </button>

                <!-- Breadcrumbs -->
                <nav class="hidden sm:flex items-center gap-2 text-sm">
                    <a href="<?= url('admin') ?>" class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                    </a>
                    <?php foreach (\$breadcrumbs as \$i => \$crumb): ?>
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                    <?php if (\$crumb['url']): ?>
                    <a href="<?= e(\$crumb['url']) ?>" class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"><?= e(\$crumb['label']) ?></a>
                    <?php else: ?>
                    <span class="text-gray-900 dark:text-white font-medium"><?= e(\$crumb['label']) ?></span>
                    <?php endif; ?>
                    <?php endforeach; ?>
                </nav>
            </div>

            <!-- Right: Search, Notifications, Theme, User -->
            <div class="flex items-center gap-2">
                <!-- Search -->
                <div class="hidden md:flex items-center">
                    <div class="relative">
                        <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        <input type="text" placeholder="Search..." class="pl-9 pr-4 py-2 w-64 bg-gray-100 dark:bg-dark-800 border-0 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                    </div>
                </div>

                <!-- Site Preview -->
                <a href="<?= url('/') ?>" target="_blank" class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" title="View Site">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                </a>

                <!-- Dark Mode Toggle -->
                <button @click="darkMode = !darkMode; localStorage.setItem('darkMode', darkMode)" class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    <svg x-show="!darkMode" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
                    <svg x-show="darkMode" x-cloak class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                </button>

                <!-- Notifications -->
                <div x-data="{ open: false }" class="relative">
                    <button @click="open = !open" class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 relative">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                        <span class="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-dark-900"></span>
                    </button>

                    <div x-show="open" @click.away="open = false" x-cloak
                         x-transition:enter="transition ease-out duration-200"
                         x-transition:enter-start="opacity-0 translate-y-1"
                         x-transition:enter-end="opacity-100 translate-y-0"
                         class="absolute right-0 mt-2 w-80 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-2xl shadow-xl overflow-hidden">
                        <div class="p-4 border-b border-gray-200 dark:border-dark-700">
                            <h3 class="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                        </div>
                        <div class="max-h-80 overflow-y-auto">
                            <a href="<?= url('admin/inquiries') ?>" class="flex items-start gap-3 p-4 hover:bg-gray-50 dark:hover:bg-dark-700 border-b border-gray-100 dark:border-dark-700">
                                <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                                </div>
                                <div>
                                    <p class="text-sm font-medium text-gray-900 dark:text-white">New product inquiries</p>
                                    <p class="text-xs text-gray-500 mt-0.5">Check the latest customer inquiries</p>
                                </div>
                            </a>
                        </div>
                        <div class="p-3 border-t border-gray-200 dark:border-dark-700">
                            <a href="#" class="text-center text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">View all notifications</a>
                        </div>
                    </div>
                </div>

                <!-- User Dropdown -->
                <div x-data="{ open: false }" class="relative">
                    <button @click="open = !open" class="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                            <span class="text-white font-semibold text-xs"><?= e(substr(\$currentUser['name'] ?? 'A', 0, 1)) ?></span>
                        </div>
                        <span class="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300"><?= e(\$currentUser['name'] ?? 'Admin') ?></span>
                    </button>

                    <div x-show="open" @click.away="open = false" x-cloak
                         x-transition class="absolute right-0 mt-2 w-56 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-2xl shadow-xl overflow-hidden">
                        <div class="p-3 border-b border-gray-200 dark:border-dark-700">
                            <p class="text-sm font-medium text-gray-900 dark:text-white"><?= e(\$currentUser['name'] ?? '') ?></p>
                            <p class="text-xs text-gray-500"><?= e(\$currentUser['email'] ?? '') ?></p>
                        </div>
                        <div class="py-1">
                            <a href="<?= url('admin/users/' . (\$currentUser['id'] ?? '') . '/edit') ?>" class="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                                Profile Settings
                            </a>
                            <a href="<?= url('admin/settings') ?>" class="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                Settings
                            </a>
                        </div>
                        <div class="border-t border-gray-200 dark:border-dark-700 py-1">
                            <a href="<?= url('admin/logout') ?>" class="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                                Logout
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        <!-- Page Content -->
        <main class="flex-1 p-4 lg:p-6">
            <div class="fade-in">
                <?= \$_view_content_ ?? '' ?>
            </div>
        </main>

        <!-- Footer -->
        <footer class="border-t border-gray-200 dark:border-dark-700 py-4 px-6 text-center text-xs text-gray-500">
            &copy; <?= date('Y') ?> <?= e(setting('site_name')) ?>. Admin Panel v<?= APP_VERSION ?>
        </footer>
    </div>

    <!-- Alpine.js App -->
    <script>
    function adminApp() {
        return {
            toasts: [],
            toastId: 0,

            showToast(type, message, duration = 5000) {
                const id = ++this.toastId;
                const icons = {
                    success: '<svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
                    error: '<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
                    warning: '<svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>',
                    info: '<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
                };

                this.toasts.push({ id, type, message, icon: icons[type] || icons.info, visible: true });

                setTimeout(() => this.removeToast(id), duration);
            },

            removeToast(id) {
                const idx = this.toasts.findIndex(t => t.id === id);
                if (idx > -1) this.toasts.splice(idx, 1);
            }
        }
    }
    </script>
</body>
</html>`
  },

  // ─── SIDEBAR PARTIAL ───────────────────────────────────────────────
  {
    path: 'app/views/admin/partials/sidebar.php',
    name: 'sidebar.php',
    language: 'php',
    category: 'Views/Partials',
    description: 'Collapsible sidebar navigation with grouped menu items',
    content: `<?php
declare(strict_types=1);
/**
 * Admin Sidebar Navigation
 * Grouped menu with icons (inline Heroicons SVG)
 */
\$currentPath = parse_url(\$_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?? '/';

\$menuGroups = [
    [
        'label' => null, // No label for first group
        'items' => [
            ['label' => 'Dashboard', 'url' => '/admin', 'icon' => 'home', 'active' => \$currentPath === '/admin' || \$currentPath === '/admin/'],
        ]
    ],
    [
        'label' => 'Content',
        'items' => [
            ['label' => 'Pages', 'url' => '/admin/pages', 'icon' => 'document'],
            ['label' => 'Blog Posts', 'url' => '/admin/blog', 'icon' => 'pencil'],
            ['label' => 'Categories', 'url' => '/admin/blog/categories', 'icon' => 'tag'],
            ['label' => 'Comments', 'url' => '/admin/comments', 'icon' => 'chat'],
            ['label' => 'Media Library', 'url' => '/admin/media', 'icon' => 'photo'],
        ]
    ],
    [
        'label' => 'Products',
        'items' => [
            ['label' => 'Categories', 'url' => '/admin/product-categories', 'icon' => 'folder'],
            ['label' => 'Products', 'url' => '/admin/products', 'icon' => 'cube'],
            ['label' => 'Plans', 'url' => '/admin/product-plans', 'icon' => 'credit-card'],
            ['label' => 'Demos', 'url' => '/admin/product-demos', 'icon' => 'play'],
            ['label' => 'Inquiries', 'url' => '/admin/inquiries', 'icon' => 'inbox'],
            ['label' => 'Tutorials', 'url' => '/admin/tutorials', 'icon' => 'academic-cap'],
            ['label' => 'Versions', 'url' => '/admin/product-versions', 'icon' => 'download'],
        ]
    ],
    [
        'label' => 'Services',
        'items' => [
            ['label' => 'Services', 'url' => '/admin/services', 'icon' => 'briefcase'],
            ['label' => 'Inquiries', 'url' => '/admin/service-inquiries', 'icon' => 'mail'],
            ['label' => 'Custom Requests', 'url' => '/admin/custom-requests', 'icon' => 'code'],
        ]
    ],
    [
        'label' => 'Business',
        'items' => [
            ['label' => 'Testimonials', 'url' => '/admin/testimonials', 'icon' => 'star'],
            ['label' => 'Team', 'url' => '/admin/team', 'icon' => 'user-group'],
            ['label' => 'Clients', 'url' => '/admin/clients', 'icon' => 'building'],
            ['label' => 'FAQs', 'url' => '/admin/faqs', 'icon' => 'question'],
            ['label' => 'Messages', 'url' => '/admin/messages', 'icon' => 'envelope'],
            ['label' => 'Newsletter', 'url' => '/admin/newsletter', 'icon' => 'rss'],
        ]
    ],
    [
        'label' => 'Marketing',
        'items' => [
            ['label' => 'SEO Manager', 'url' => '/admin/seo', 'icon' => 'search'],
            ['label' => 'Redirects', 'url' => '/admin/redirects', 'icon' => 'arrow-right'],
            ['label' => 'Sitemap', 'url' => '/admin/sitemap', 'icon' => 'map'],
        ]
    ],
    [
        'label' => 'System',
        'items' => [
            ['label' => 'Users', 'url' => '/admin/users', 'icon' => 'users'],
            ['label' => 'Roles', 'url' => '/admin/roles', 'icon' => 'shield'],
            ['label' => 'Settings', 'url' => '/admin/settings', 'icon' => 'cog'],
            ['label' => 'Activity Logs', 'url' => '/admin/activity-logs', 'icon' => 'clipboard'],
            ['label' => 'Backup', 'url' => '/admin/backup', 'icon' => 'database'],
        ]
    ],
];

// Icon SVG map (Heroicons outline)
\$icons = [
    'home' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>',
    'document' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>',
    'pencil' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>',
    'tag' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>',
    'chat' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>',
    'photo' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>',
    'folder' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>',
    'cube' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>',
    'credit-card' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>',
    'play' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
    'inbox' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>',
    'academic-cap' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 14l9-5-9-5-9 5 9 5z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>',
    'download' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>',
    'briefcase' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>',
    'mail' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>',
    'code' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>',
    'star' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>',
    'user-group' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>',
    'building' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>',
    'question' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
    'envelope' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"/>',
    'rss' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z"/>',
    'search' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>',
    'arrow-right' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 7l5 5m0 0l-5 5m5-5H6"/>',
    'map' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>',
    'users' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>',
    'shield' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>',
    'cog' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>',
    'clipboard' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>',
    'database' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/>',
];

function isActive(string \$url, string \$currentPath): bool {
    return \$currentPath === \$url || str_starts_with(\$currentPath, \$url . '/');
}
?>

<div class="space-y-6" x-show="sidebarOpen" x-cloak>
    <?php foreach (\$menuGroups as \$group): ?>
    <div>
        <?php if (\$group['label']): ?>
        <p class="px-3 mb-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            <?= e(\$group['label']) ?>
        </p>
        <?php endif; ?>

        <div class="space-y-0.5">
            <?php foreach (\$group['items'] as \$item):
                \$active = isActive(\$item['url'], \$currentPath);
                \$iconSvg = \$icons[\$item['icon']] ?? \$icons['document'];
            ?>
            <a href="<?= url(\$item['url']) ?>"
               class="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150
                      <?= \$active
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 hover:text-gray-900 dark:hover:text-gray-200'
                      ?>">
                <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <?= \$iconSvg ?>
                </svg>
                <span class="truncate"><?= e(\$item['label']) ?></span>
            </a>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endforeach; ?>
</div>

<!-- Collapsed sidebar (icons only) -->
<div class="space-y-1" x-show="!sidebarOpen" x-cloak>
    <?php foreach (\$menuGroups as \$group): ?>
        <?php foreach (\$group['items'] as \$item):
            \$active = isActive(\$item['url'], \$currentPath);
            \$iconSvg = \$icons[\$item['icon']] ?? \$icons['document'];
        ?>
        <a href="<?= url(\$item['url']) ?>"
           title="<?= e(\$item['label']) ?>"
           class="flex items-center justify-center p-2.5 rounded-xl transition-all duration-150
                  <?= \$active
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 hover:text-gray-700'
                  ?>">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <?= \$iconSvg ?>
            </svg>
        </a>
        <?php endforeach; ?>
    <?php endforeach; ?>
</div>`
  },

  // ─── LOGIN VIEW ────────────────────────────────────────────────────
  {
    path: 'app/views/admin/auth/login.php',
    name: 'login.php',
    language: 'php',
    category: 'Views/Auth',
    description: 'Premium login page with dark gradient, glassmorphism card',
    content: `<?php
declare(strict_types=1);
/**
 * Admin Login Page
 * Premium design with glassmorphism card on dark gradient
 */
\$page_title = \$page_title ?? 'Admin Login';
\$error = \$error ?? null;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e(\$page_title) ?> | <?= e(setting('site_name')) ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <style>
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
        @keyframes pulse-slow { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        .float-1 { animation: float 6s ease-in-out infinite; }
        .float-2 { animation: float 8s ease-in-out infinite 1s; }
        .float-3 { animation: float 7s ease-in-out infinite 2s; }
        .glass { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(148, 163, 184, 0.1); }
        .input-glow:focus { box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }
    </style>
</head>
<body class="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative overflow-hidden">

    <!-- Background Effects -->
    <div class="absolute inset-0">
        <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl float-1"></div>
        <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl float-2"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl float-3"></div>
        <!-- Grid pattern -->
        <div class="absolute inset-0" style="background-image: radial-gradient(rgba(148,163,184,0.05) 1px, transparent 1px); background-size: 40px 40px;"></div>
    </div>

    <!-- Login Card -->
    <div class="relative z-10 w-full max-w-md">
        <!-- Logo -->
        <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg shadow-blue-500/25 mb-4">
                <span class="text-white font-bold text-2xl">K</span>
            </div>
            <h1 class="text-2xl font-bold text-white">Welcome back</h1>
            <p class="text-gray-400 mt-1">Sign in to your admin account</p>
        </div>

        <!-- Card -->
        <div class="glass rounded-2xl p-8 shadow-2xl">
            <?php if (\$error): ?>
            <div class="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                <svg class="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p class="text-sm text-red-300"><?= e(\$error) ?></p>
            </div>
            <?php endif; ?>

            <form method="POST" action="<?= url('admin/login') ?>" x-data="{ showPassword: false, loading: false }" @submit="loading = true">
                <?= \\App\\Core\\CSRF::field() ?>

                <!-- Email -->
                <div class="mb-5">
                    <label for="email" class="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                            </svg>
                        </div>
                        <input type="email" id="email" name="email" value="<?= old('email') ?>" required autofocus
                               class="w-full pl-11 pr-4 py-3 bg-dark-800/50 border border-dark-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 input-glow transition-all"
                               placeholder="admin@khybersoft.com">
                    </div>
                </div>

                <!-- Password -->
                <div class="mb-5">
                    <label for="password" class="block text-sm font-medium text-gray-300 mb-2">Password</label>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                            </svg>
                        </div>
                        <input :type="showPassword ? 'text' : 'password'" id="password" name="password" required
                               class="w-full pl-11 pr-12 py-3 bg-dark-800/50 border border-dark-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 input-glow transition-all"
                               placeholder="••••••••">
                        <button type="button" @click="showPassword = !showPassword" class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-gray-300">
                            <svg x-show="!showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                            <svg x-show="showPassword" x-cloak class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                        </button>
                    </div>
                </div>

                <!-- Remember + Forgot -->
                <div class="flex items-center justify-between mb-6">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" name="remember" value="1" class="w-4 h-4 rounded border-dark-600 bg-dark-800 text-blue-600 focus:ring-blue-500/30">
                        <span class="text-sm text-gray-400">Remember me</span>
                    </label>
                    <a href="<?= url('admin/forgot-password') ?>" class="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                        Forgot password?
                    </a>
                </div>

                <!-- Submit -->
                <button type="submit" :disabled="loading"
                        class="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    <svg x-show="loading" x-cloak class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span x-text="loading ? 'Signing in...' : 'Sign In'"></span>
                </button>
            </form>
        </div>

        <!-- Footer -->
        <p class="text-center text-gray-500 text-sm mt-6">
            &copy; <?= date('Y') ?> <?= e(setting('site_name')) ?>. All rights reserved.
        </p>
    </div>
</body>
</html>`
  },

  // ─── FORGOT PASSWORD VIEW ──────────────────────────────────────────
  {
    path: 'app/views/admin/auth/forgot-password.php',
    name: 'forgot-password.php',
    language: 'php',
    category: 'Views/Auth',
    description: 'Forgot password page with email input',
    content: `<?php
declare(strict_types=1);
\$page_title = \$page_title ?? 'Forgot Password';
\$success = \$success ?? null;
\$error = \$error ?? null;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e(\$page_title) ?> | <?= e(setting('site_name')) ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <style>
        .glass { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(20px); border: 1px solid rgba(148, 163, 184, 0.1); }
        .input-glow:focus { box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }
    </style>
</head>
<body class="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative overflow-hidden">
    <div class="absolute inset-0">
        <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>
    </div>

    <div class="relative z-10 w-full max-w-md">
        <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg shadow-blue-500/25 mb-4">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 14H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l3.914-3.914A6 6 0 0117 9z"/></svg>
            </div>
            <h1 class="text-2xl font-bold text-white">Forgot Password</h1>
            <p class="text-gray-400 mt-1">Enter your email to receive a reset link</p>
        </div>

        <div class="glass rounded-2xl p-8 shadow-2xl">
            <?php if (\$success): ?>
            <div class="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3">
                <svg class="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p class="text-sm text-emerald-300"><?= e(\$success) ?></p>
            </div>
            <?php endif; ?>

            <?php if (\$error): ?>
            <div class="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                <svg class="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p class="text-sm text-red-300"><?= e(\$error) ?></p>
            </div>
            <?php endif; ?>

            <form method="POST" action="<?= url('admin/forgot-password') ?>">
                <?= \\App\\Core\\CSRF::field() ?>

                <div class="mb-6">
                    <label for="email" class="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                        </div>
                        <input type="email" id="email" name="email" required autofocus
                               class="w-full pl-11 pr-4 py-3 bg-dark-800/50 border border-dark-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 input-glow transition-all"
                               placeholder="admin@khybersoft.com">
                    </div>
                </div>

                <button type="submit" class="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all">
                    Send Reset Link
                </button>
            </form>

            <div class="mt-6 text-center">
                <a href="<?= url('admin/login') ?>" class="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                    ← Back to login
                </a>
            </div>
        </div>
    </div>
</body>
</html>`
  },

  // ─── RESET PASSWORD VIEW ───────────────────────────────────────────
  {
    path: 'app/views/admin/auth/reset-password.php',
    name: 'reset-password.php',
    language: 'php',
    category: 'Views/Auth',
    description: 'Reset password page with new password + confirmation',
    content: `<?php
declare(strict_types=1);
\$page_title = \$page_title ?? 'Reset Password';
\$token = \$token ?? '';
\$email = \$email ?? '';
\$error = \$error ?? null;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e(\$page_title) ?> | <?= e(setting('site_name')) ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <style>
        .glass { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(20px); border: 1px solid rgba(148, 163, 184, 0.1); }
        .input-glow:focus { box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }
    </style>
</head>
<body class="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative overflow-hidden">
    <div class="absolute inset-0">
        <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>
    </div>

    <div class="relative z-10 w-full max-w-md">
        <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-500/25 mb-4">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            </div>
            <h1 class="text-2xl font-bold text-white">Reset Password</h1>
            <p class="text-gray-400 mt-1">Create a new secure password</p>
        </div>

        <div class="glass rounded-2xl p-8 shadow-2xl">
            <?php if (\$error): ?>
            <div class="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p class="text-sm text-red-300"><?= e(\$error) ?></p>
            </div>
            <?php endif; ?>

            <form method="POST" action="<?= url('admin/reset-password') ?>" x-data="{ showPw: false, showPwC: false }">
                <?= \\App\\Core\\CSRF::field() ?>
                <input type="hidden" name="token" value="<?= e(\$token) ?>">
                <input type="hidden" name="email" value="<?= e(\$email) ?>">

                <div class="mb-5">
                    <label for="password" class="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                        </div>
                        <input :type="showPw ? 'text' : 'password'" id="password" name="password" required minlength="8"
                               class="w-full pl-11 pr-12 py-3 bg-dark-800/50 border border-dark-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 input-glow transition-all"
                               placeholder="Min 8 characters">
                        <button type="button" @click="showPw = !showPw" class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-gray-300">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        </button>
                    </div>
                </div>

                <div class="mb-6">
                    <label for="password_confirmation" class="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                        </div>
                        <input :type="showPwC ? 'text' : 'password'" id="password_confirmation" name="password_confirmation" required
                               class="w-full pl-11 pr-12 py-3 bg-dark-800/50 border border-dark-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 input-glow transition-all"
                               placeholder="Confirm new password">
                        <button type="button" @click="showPwC = !showPwC" class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-gray-300">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        </button>
                    </div>
                </div>

                <button type="submit" class="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all">
                    Reset Password
                </button>
            </form>
        </div>
    </div>
</body>
</html>`
  },

  // ─── 2FA VIEW ──────────────────────────────────────────────────────
  {
    path: 'app/views/admin/auth/two-factor.php',
    name: 'two-factor.php',
    language: 'php',
    category: 'Views/Auth',
    description: 'Two-factor authentication code entry page',
    content: `<?php
declare(strict_types=1);
\$page_title = \$page_title ?? 'Two-Factor Authentication';
\$error = \$error ?? null;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e(\$page_title) ?> | <?= e(setting('site_name')) ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <style>
        .glass { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(20px); border: 1px solid rgba(148, 163, 184, 0.1); }
        .input-glow:focus { box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }
    </style>
</head>
<body class="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative overflow-hidden">
    <div class="absolute inset-0">
        <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>
        <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
    </div>

    <div class="relative z-10 w-full max-w-md">
        <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg shadow-violet-500/25 mb-4">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            </div>
            <h1 class="text-2xl font-bold text-white">Two-Factor Auth</h1>
            <p class="text-gray-400 mt-1">Enter the 6-digit code from your authenticator app</p>
        </div>

        <div class="glass rounded-2xl p-8 shadow-2xl">
            <?php if (\$error): ?>
            <div class="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p class="text-sm text-red-300"><?= e(\$error) ?></p>
            </div>
            <?php endif; ?>

            <form method="POST" action="<?= url('admin/2fa/verify') ?>" x-data="{ code: '' }">
                <?= \\App\\Core\\CSRF::field() ?>

                <div class="mb-6">
                    <input type="text" name="code" x-model="code" maxlength="6" required autofocus
                           pattern="[0-9]{6}" inputmode="numeric" autocomplete="one-time-code"
                           class="w-full text-center text-3xl font-mono tracking-[0.5em] py-4 bg-dark-800/50 border border-dark-600 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 input-glow transition-all"
                           placeholder="000000">
                    <p class="text-center text-xs text-gray-500 mt-2">Enter the code from Google Authenticator</p>
                </div>

                <button type="submit" class="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 transition-all">
                    Verify Code
                </button>
            </form>

            <div class="mt-6 text-center">
                <a href="<?= url('admin/login') ?>" class="text-sm text-gray-400 hover:text-gray-300 transition-colors">
                    ← Back to login
                </a>
            </div>
        </div>
    </div>
</body>
</html>`
  },

  // ─── DASHBOARD VIEW ────────────────────────────────────────────────
  {
    path: 'app/views/admin/dashboard/index.php',
    name: 'dashboard/index.php',
    language: 'php',
    category: 'Views/Dashboard',
    description: 'Admin dashboard with stats cards, charts, tables, and system health',
    content: `<?php
declare(strict_types=1);
/**
 * Admin Dashboard View
 * Stats cards, recent inquiries, activity feed, traffic chart, system health
 */
\$stats = \$stats ?? [];
\$sparkline_data = \$sparkline_data ?? [];
\$recent_inquiries = \$recent_inquiries ?? [];
\$recent_activity = \$recent_activity ?? [];
\$traffic_data = \$traffic_data ?? [];
\$top_products = \$top_products ?? [];
\$system_health = \$system_health ?? [];
\$quick_actions = \$quick_actions ?? [];
?>

<!-- Page Header -->
<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
    <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">Welcome back, <?= e(Auth::user()['name'] ?? 'Admin') ?> 👋</p>
    </div>
    <div class="flex items-center gap-2">
        <?php foreach (\$quick_actions as \$action): ?>
        <a href="<?= e(\$action['url']) ?>" class="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors shadow-sm">
            <svg class="w-4 h-4 text-<?= e(\$action['color']) ?>-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            <?= e(\$action['label']) ?>
        </a>
        <?php endforeach; ?>
    </div>
</div>

<!-- Stats Cards -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    <?php foreach (\$stats as \$i => \$stat): ?>
    <div class="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-2xl p-5 hover:shadow-lg transition-shadow">
        <div class="flex items-center justify-between mb-3">
            <div class="w-10 h-10 bg-<?= e(\$stat['color']) ?>-100 dark:bg-<?= e(\$stat['color']) ?>-900/30 rounded-xl flex items-center justify-center">
                <svg class="w-5 h-5 text-<?= e(\$stat['color']) ?>-600 dark:text-<?= e(\$stat['color']) ?>-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <?php if (\$stat['icon'] === 'package'): ?>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                    <?php elseif (\$stat['icon'] === 'mail'): ?>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    <?php elseif (\$stat['icon'] === 'file-text'): ?>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    <?php else: ?>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <?php endif; ?>
                </svg>
            </div>
            <span class="text-xs font-medium px-2 py-1 rounded-full
                <?= \$stat['change_type'] === 'positive' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400' ?>">
                <?= e(\$stat['change']) ?>
            </span>
        </div>
        <div class="text-3xl font-bold text-gray-900 dark:text-white"><?= number_format(\$stat['value']) ?></div>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1"><?= e(\$stat['label']) ?></p>
        <!-- Mini sparkline -->
        <div class="mt-3 h-8" id="sparkline-<?= \$i ?>"></div>
    </div>
    <?php endforeach; ?>
</div>

<!-- Main Grid -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
    <!-- Traffic Chart (2 cols) -->
    <div class="lg:col-span-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-2xl p-6">
        <div class="flex items-center justify-between mb-6">
            <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Inquiry Traffic</h3>
                <p class="text-sm text-gray-500">Last 30 days</p>
            </div>
            <select class="text-sm bg-gray-100 dark:bg-dark-700 border-0 rounded-lg px-3 py-1.5 text-gray-600 dark:text-gray-300">
                <option>Last 30 days</option>
                <option>Last 7 days</option>
                <option>Last 90 days</option>
            </select>
        </div>
        <div class="h-64">
            <canvas id="trafficChart"></canvas>
        </div>
    </div>

    <!-- Top Products -->
    <div class="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-2xl p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Products</h3>
        <p class="text-sm text-gray-500 mb-4">By inquiry count</p>
        <div class="space-y-4">
            <?php foreach (\$top_products as \$i => \$product):
                \$maxCount = !empty(\$top_products) ? (int) \$top_products[0]['inquiry_count'] : 1;
                \$percent = \$maxCount > 0 ? round(((int) \$product['inquiry_count'] / \$maxCount) * 100) : 0;
                \$colors = ['blue', 'emerald', 'violet', 'amber', 'rose'];
                \$color = \$colors[\$i % count(\$colors)];
            ?>
            <div>
                <div class="flex items-center justify-between mb-1.5">
                    <a href="<?= url('admin/products') ?>" class="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 truncate">
                        <?= e(\$product['name']) ?>
                    </a>
                    <span class="text-sm font-semibold text-gray-900 dark:text-white"><?= (int) \$product['inquiry_count'] ?></span>
                </div>
                <div class="w-full h-2 bg-gray-100 dark:bg-dark-700 rounded-full overflow-hidden">
                    <div class="h-full bg-<?= \$color ?>-500 rounded-full transition-all duration-500" style="width: <?= \$percent ?>%"></div>
                </div>
            </div>
            <?php endforeach; ?>
            <?php if (empty(\$top_products)): ?>
            <p class="text-sm text-gray-500 text-center py-4">No inquiry data yet</p>
            <?php endif; ?>
        </div>
    </div>
</div>

<!-- Second Row -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
    <!-- Recent Inquiries -->
    <div class="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-2xl overflow-hidden">
        <div class="p-6 border-b border-gray-200 dark:border-dark-700">
            <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Recent Inquiries</h3>
                <a href="<?= url('admin/inquiries') ?>" class="text-sm text-blue-600 dark:text-blue-400 hover:underline">View all</a>
            </div>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full">
                <thead>
                    <tr class="border-b border-gray-100 dark:border-dark-700">
                        <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Name</th>
                        <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Product</th>
                        <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
                        <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Date</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-dark-700">
                    <?php foreach (array_slice(\$recent_inquiries, 0, 5) as \$inq): ?>
                    <tr class="hover:bg-gray-50 dark:hover:bg-dark-700/50">
                        <td class="px-6 py-3">
                            <p class="text-sm font-medium text-gray-900 dark:text-white"><?= e(\$inq['name']) ?></p>
                            <p class="text-xs text-gray-500"><?= e(\$inq['email']) ?></p>
                        </td>
                        <td class="px-6 py-3 text-sm text-gray-600 dark:text-gray-400"><?= e(\$inq['product_name'] ?? 'N/A') ?></td>
                        <td class="px-6 py-3">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                <?= \$inq['status'] === 'new' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : '' ?>
                                <?= \$inq['status'] === 'in_progress' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : '' ?>
                                <?= \$inq['status'] === 'resolved' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : '' ?>
                                <?= \$inq['status'] === 'closed' ? 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400' : '' ?>">
                                <?= e(ucfirst(\$inq['status'])) ?>
                            </span>
                        </td>
                        <td class="px-6 py-3 text-sm text-gray-500"><?= e(time_ago(\$inq['created_at'])) ?></td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Activity Feed -->
    <div class="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-2xl overflow-hidden">
        <div class="p-6 border-b border-gray-200 dark:border-dark-700">
            <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Activity Log</h3>
                <a href="<?= url('admin/activity-logs') ?>" class="text-sm text-blue-600 dark:text-blue-400 hover:underline">View all</a>
            </div>
        </div>
        <div class="p-6 space-y-4 max-h-96 overflow-y-auto">
            <?php foreach (\$recent_activity as \$log):
                \$iconColor = match(\$log['action']) {
                    'login', 'login_success' => 'emerald',
                    'login_failed' => 'red',
                    'logout' => 'gray',
                    'create', 'store' => 'blue',
                    'update' => 'amber',
                    'delete' => 'red',
                    default => 'blue',
                };
            ?>
            <div class="flex items-start gap-3">
                <div class="w-8 h-8 bg-<?= \$iconColor ?>-100 dark:bg-<?= \$iconColor ?>-900/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div class="w-2 h-2 bg-<?= \$iconColor ?>-500 rounded-full"></div>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-700 dark:text-gray-300">
                        <span class="font-medium"><?= e(\$log['user_name'] ?? 'System') ?></span>
                        <?= e(\$log['description'] ?? \$log['action']) ?>
                    </p>
                    <p class="text-xs text-gray-500 mt-0.5"><?= e(time_ago(\$log['created_at'])) ?></p>
                </div>
            </div>
            <?php endforeach; ?>
            <?php if (empty(\$recent_activity)): ?>
            <p class="text-sm text-gray-500 text-center py-4">No recent activity</p>
            <?php endif; ?>
        </div>
    </div>
</div>

<!-- System Health -->
<div class="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-2xl p-6">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Health</h3>
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div class="text-center p-3 bg-gray-50 dark:bg-dark-700/50 rounded-xl">
            <p class="text-xs text-gray-500 mb-1">PHP</p>
            <p class="text-sm font-semibold text-gray-900 dark:text-white"><?= e(\$system_health['php_version'] ?? 'N/A') ?></p>
        </div>
        <div class="text-center p-3 bg-gray-50 dark:bg-dark-700/50 rounded-xl">
            <p class="text-xs text-gray-500 mb-1">MySQL</p>
            <p class="text-sm font-semibold text-gray-900 dark:text-white"><?= e(\$system_health['mysql_version'] ?? 'N/A') ?></p>
        </div>
        <div class="text-center p-3 bg-gray-50 dark:bg-dark-700/50 rounded-xl">
            <p class="text-xs text-gray-500 mb-1">DB Size</p>
            <p class="text-sm font-semibold text-gray-900 dark:text-white"><?= e(\$system_health['db_size'] ?? 'N/A') ?></p>
        </div>
        <div class="text-center p-3 bg-gray-50 dark:bg-dark-700/50 rounded-xl">
            <p class="text-xs text-gray-500 mb-1">Disk Free</p>
            <p class="text-sm font-semibold text-gray-900 dark:text-white"><?= e(\$system_health['disk_free'] ?? 'N/A') ?></p>
        </div>
        <div class="text-center p-3 bg-gray-50 dark:bg-dark-700/50 rounded-xl">
            <p class="text-xs text-gray-500 mb-1">Memory</p>
            <p class="text-sm font-semibold text-gray-900 dark:text-white"><?= e(\$system_health['php_memory_limit'] ?? 'N/A') ?></p>
        </div>
        <div class="text-center p-3 bg-gray-50 dark:bg-dark-700/50 rounded-xl">
            <p class="text-xs text-gray-500 mb-1">Extensions</p>
            <p class="text-sm font-semibold text-emerald-600">
                <?php
                \$extOk = true;
                foreach ((\$system_health['extensions'] ?? []) as \$ext => \$loaded) {
                    if (!\$loaded) { \$extOk = false; break; }
                }
                echo \$extOk ? '✓ All OK' : '✗ Missing';
                ?>
            </p>
        </div>
    </div>
</div>

<!-- Chart.js Initialization -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    // Traffic Chart
    const trafficCtx = document.getElementById('trafficChart');
    if (trafficCtx) {
        const trafficData = <?= json_encode(\$traffic_data) ?>;
        const labels = trafficData.map(d => {
            const date = new Date(d.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        const values = trafficData.map(d => d.inquiries);

        new Chart(trafficCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Inquiries',
                    data: values,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#3b82f6',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleColor: '#f8fafc',
                        bodyColor: '#94a3b8',
                        borderColor: '#334155',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12,
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8', maxTicksLimit: 8 }
                    },
                    y: {
                        grid: { color: 'rgba(148,163,184,0.1)' },
                        ticks: { color: '#94a3b8', beginAtZero: true }
                    }
                },
                interaction: { intersect: false, mode: 'index' }
            }
        });
    }

    // Sparklines
    const sparklineData = <?= json_encode(\$sparkline_data) ?>;
    <?php foreach (\$stats as \$i => \$stat): ?>
    const sparkCtx<?= \$i ?> = document.getElementById('sparkline-<?= \$i ?>');
    if (sparkCtx<?= \$i ?>) {
        const key = '<?= strtolower(str_replace(' ', '_', \$stat['label'])) ?>';
        const data = sparklineData[key] || [0,0,0,0,0,0,0];
        new Chart(sparkCtx<?= \$i ?>, {
            type: 'line',
            data: {
                labels: data.map((_, i) => i),
                datasets: [{
                    data: data,
                    borderColor: '<?= in_array(\$stat['color'], ['blue','emerald','violet','amber']) ? '#3b82f6' : '#3b82f6' ?>',
                    borderWidth: 1.5,
                    fill: true,
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    tension: 0.4,
                    pointRadius: 0,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: { x: { display: false }, y: { display: false } }
            }
        });
    }
    <?php endforeach; ?>
});
</script>`
  },

  // ─── USER MODEL ────────────────────────────────────────────────────
  {
    path: 'app/models/User.php',
    name: 'User.php',
    language: 'php',
    category: 'Models',
    description: 'User model with role checking and password management',
    content: `<?php
declare(strict_types=1);

namespace App\\Models;

use App\\Core\\Model;
use App\\Core\\Database;

/**
 * User Model
 */
class User extends Model
{
    protected string \$table = 'users';
    protected bool \$softDelete = true;
    protected array \$fillable = [
        'name', 'email', 'password_hash', 'role_id', 'avatar',
        'status', 'email_verified_at', 'two_factor_secret',
    ];
    protected array \$hidden = ['password_hash', 'remember_token', 'two_factor_secret'];

    /**
     * Find user with role info
     */
    public function withRole(int \$id): ?array
    {
        \$user = \$this->db->fetch(
            "SELECT u.*, r.name as role_name, r.slug as role_slug
             FROM users u
             LEFT JOIN roles r ON u.role_id = r.id
             WHERE u.id = ? AND u.deleted_at IS NULL",
            [\$id]
        );
        return \$user ?: null;
    }

    /**
     * Create user with hashed password
     */
    public function createUser(array \$data): int
    {
        if (isset(\$data['password'])) {
            \$data['password_hash'] = password_hash(\$data['password'], PASSWORD_BCRYPT, ['cost' => 12]);
            unset(\$data['password']);
        }
        return \$this->create(\$data);
    }

    /**
     * Update password
     */
    public function updatePassword(int \$userId, string \$newPassword): bool
    {
        \$hash = password_hash(\$newPassword, PASSWORD_BCRYPT, ['cost' => 12]);

        return \$this->db->transaction(function() use (\$userId, \$hash) {
            // Update password
            \$this->db->update('users', [
                'password_hash' => \$hash,
                'updated_at' => date('Y-m-d H:i:s'),
            ], 'id = ?', [\$userId]);

            // Clear remember token (force logout everywhere)
            \$this->db->update('users', [
                'remember_token' => null,
            ], 'id = ?', [\$userId]);

            return true;
        });
    }

    /**
     * Get user permissions
     */
    public function getPermissions(int \$userId): array
    {
        return \$this->db->fetchAll(
            "SELECT p.slug FROM permissions p
             INNER JOIN role_permissions rp ON rp.permission_id = p.id
             INNER JOIN users u ON u.role_id = rp.role_id
             WHERE u.id = ?",
            [\$userId]
        );
    }

    /**
     * Get all users with roles
     */
    public function allWithRoles(): array
    {
        return \$this->db->fetchAll(
            "SELECT u.*, r.name as role_name, r.slug as role_slug
             FROM users u
             LEFT JOIN roles r ON u.role_id = r.id
             WHERE u.deleted_at IS NULL
             ORDER BY u.created_at DESC"
        );
    }
}`
  },

  // ─── ADMIN ROUTES ──────────────────────────────────────────────────
  {
    path: 'routes/admin.php',
    name: 'admin.php',
    language: 'php',
    category: 'Routes',
    description: 'Admin route definitions with middleware groups',
    content: `<?php
declare(strict_types=1);

/**
 * Admin Routes
 * All routes protected by AdminAuth middleware
 */

use App\\Core\\Router;

/** @var Router \$router */

// ─── Auth Routes (no admin middleware) ───────────────────────
\$router->get('/admin/login', ['Admin\\AuthController', 'showLogin'], ['Guest']);
\$router->post('/admin/login', ['Admin\\AuthController', 'login'], ['Guest']);
\$router->get('/admin/forgot-password', ['Admin\\AuthController', 'showForgotPassword'], ['Guest']);
\$router->post('/admin/forgot-password', ['Admin\\AuthController', 'forgotPassword'], ['Guest']);
\$router->get('/admin/reset-password', ['Admin\\AuthController', 'showResetPassword'], ['Guest']);
\$router->post('/admin/reset-password', ['Admin\\AuthController', 'resetPassword'], ['Guest']);
\$router->get('/admin/2fa', ['Admin\\AuthController', 'showTwoFactor'], ['Guest']);
\$router->post('/admin/2fa/verify', ['Admin\\AuthController', 'verifyTwoFactor'], ['Guest']);
\$router->get('/admin/logout', ['Admin\\AuthController', 'logout']);

// ─── Protected Admin Routes ──────────────────────────────────
\$router->group('/admin', function(Router \$router) {

    // Dashboard
    \$router->get('/', ['Admin\\DashboardController', 'index'], ['AdminAuth']);
    \$router->get('/dashboard/stats', ['Admin\\DashboardController', 'statsApi'], ['AdminAuth']);

    // Products
    \$router->get('/products', ['Admin\\ProductController', 'index'], ['AdminAuth']);
    \$router->get('/products/create', ['Admin\\ProductController', 'create'], ['AdminAuth']);
    \$router->post('/products', ['Admin\\ProductController', 'store'], ['AdminAuth']);
    \$router->get('/products/{id}/edit', ['Admin\\ProductController', 'edit'], ['AdminAuth']);
    \$router->post('/products/{id}', ['Admin\\ProductController', 'update'], ['AdminAuth']);
    \$router->post('/products/{id}/delete', ['Admin\\ProductController', 'destroy'], ['AdminAuth']);

    // Blog
    \$router->get('/blog', ['Admin\\BlogController', 'index'], ['AdminAuth']);
    \$router->get('/blog/create', ['Admin\\BlogController', 'create'], ['AdminAuth']);
    \$router->post('/blog', ['Admin\\BlogController', 'store'], ['AdminAuth']);
    \$router->get('/blog/{id}/edit', ['Admin\\BlogController', 'edit'], ['AdminAuth']);
    \$router->post('/blog/{id}', ['Admin\\BlogController', 'update'], ['AdminAuth']);
    \$router->post('/blog/{id}/delete', ['Admin\\BlogController', 'destroy'], ['AdminAuth']);

    // Inquiries
    \$router->get('/inquiries', ['Admin\\InquiryController', 'index'], ['AdminAuth']);
    \$router->get('/inquiries/{id}', ['Admin\\InquiryController', 'show'], ['AdminAuth']);
    \$router->post('/inquiries/{id}/status', ['Admin\\InquiryController', 'updateStatus'], ['AdminAuth']);

    // Messages
    \$router->get('/messages', ['Admin\\MessageController', 'index'], ['AdminAuth']);
    \$router->get('/messages/{id}', ['Admin\\MessageController', 'show'], ['AdminAuth']);
    \$router->post('/messages/{id}/status', ['Admin\\MessageController', 'updateStatus'], ['AdminAuth']);

    // Users
    \$router->get('/users', ['Admin\\UserController', 'index'], ['AdminAuth']);
    \$router->get('/users/create', ['Admin\\UserController', 'create'], ['AdminAuth']);
    \$router->post('/users', ['Admin\\UserController', 'store'], ['AdminAuth']);
    \$router->get('/users/{id}/edit', ['Admin\\UserController', 'edit'], ['AdminAuth']);
    \$router->post('/users/{id}', ['Admin\\UserController', 'update'], ['AdminAuth']);
    \$router->post('/users/{id}/delete', ['Admin\\UserController', 'destroy'], ['AdminAuth']);

    // Settings
    \$router->get('/settings', ['Admin\\SettingsController', 'index'], ['AdminAuth']);
    \$router->post('/settings', ['Admin\\SettingsController', 'update'], ['AdminAuth']);

    // Media
    \$router->get('/media', ['Admin\\MediaController', 'index'], ['AdminAuth']);
    \$router->post('/media/upload', ['Admin\\MediaController', 'upload'], ['AdminAuth']);
    \$router->post('/media/{id}/delete', ['Admin\\MediaController', 'destroy'], ['AdminAuth']);

    // Pages
    \$router->get('/pages', ['Admin\\PageController', 'index'], ['AdminAuth']);
    \$router->get('/pages/create', ['Admin\\PageController', 'create'], ['AdminAuth']);
    \$router->post('/pages', ['Admin\\PageController', 'store'], ['AdminAuth']);
    \$router->get('/pages/{id}/edit', ['Admin\\PageController', 'edit'], ['AdminAuth']);
    \$router->post('/pages/{id}', ['Admin\\PageController', 'update'], ['AdminAuth']);
    \$router->post('/pages/{id}/delete', ['Admin\\PageController', 'destroy'], ['AdminAuth']);

    // Roles & Permissions
    \$router->get('/roles', ['Admin\\RoleController', 'index'], ['AdminAuth']);
    \$router->post('/roles', ['Admin\\RoleController', 'store'], ['AdminAuth']);
    \$router->post('/roles/{id}', ['Admin\\RoleController', 'update'], ['AdminAuth']);

    // Activity Logs
    \$router->get('/activity-logs', ['Admin\\ActivityLogController', 'index'], ['AdminAuth']);

    // Backup
    \$router->get('/backup', ['Admin\\BackupController', 'index'], ['AdminAuth']);
    \$router->post('/backup/create', ['Admin\\BackupController', 'create'], ['AdminAuth']);
    \$router->post('/backup/{id}/restore', ['Admin\\BackupController', 'restore'], ['AdminAuth']);

}, ['AdminAuth']);`
  },

  // ─── PASSWORD RESETS TABLE ─────────────────────────────────────────
  {
    path: 'database/migrations/password_resets.sql',
    name: 'password_resets.sql',
    language: 'sql',
    category: 'Database',
    description: 'Additional table for password reset tokens',
    content: `-- Password Resets Table (add to main schema)
CREATE TABLE IF NOT EXISTS \`password_resets\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`user_id\` INT UNSIGNED NOT NULL,
  \`token\` VARCHAR(255) NOT NULL,
  \`expires_at\` TIMESTAMP NOT NULL,
  \`used_at\` TIMESTAMP NULL,
  \`ip\` VARCHAR(45) NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_pr_token\` (\`token\`),
  INDEX \`idx_pr_user\` (\`user_id\`),
  INDEX \`idx_pr_expires\` (\`expires_at\`),
  CONSTRAINT \`fk_pr_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add 2FA column to users table
ALTER TABLE \`users\` ADD COLUMN \`two_factor_secret\` VARCHAR(255) NULL AFTER \`remember_token\`;
ALTER TABLE \`users\` ADD COLUMN \`two_factor_enabled\` TINYINT(1) NOT NULL DEFAULT 0 AFTER \`two_factor_secret\`;
ALTER TABLE \`users\` ADD INDEX \`idx_users_2fa\` (\`two_factor_enabled\`);

-- Cleanup expired tokens (run as cron job)
-- DELETE FROM password_resets WHERE expires_at < NOW() OR used_at IS NOT NULL;`
  },
];
