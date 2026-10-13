export interface AdminPhpFile {
  path: string;
  name: string;
  language: string;
  content: string;
  description: string;
  category: 'auth' | 'layout' | 'dashboard' | 'middleware' | 'core' | 'routes' | 'helpers';
}

export const adminFiles: AdminPhpFile[] = [
  {
    path: 'app/controllers/admin/AuthController.php',
    name: 'AuthController.php',
    language: 'php',
    category: 'auth',
    description: 'Admin authentication with login, forgot/reset password, 2FA, rate limiting',
    content: `<?php
declare(strict_types=1);

namespace App\\Controllers\\Admin;

use App\\Core\\Controller;
use App\\Core\\Auth;
use App\\Core\\Validator;
use App\\Core\\Database;
use App\\Core\\CSRF;
use App\\Core\\RateLimiter;
use App\\Core\\TwoFactor;

/**
 * Admin Auth Controller
 * Handles login, logout, forgot password, reset password, 2FA
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
            'success' => get_flash('success'),
        ]);
    }

    /**
     * Process login
     */
    public function login(): void
    {
        if (!\$this->validateCsrf()) return;

        // Rate limiting: 5 attempts per 15 minutes per IP
        \$limiter = new RateLimiter('login_attempts', 5, 900);
        \$ip = client_ip();

        if (\$limiter->isLimited(\$ip)) {
            \$remaining = \$limiter->getRemainingTime(\$ip);
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

        // Attempt authentication
        if (Auth::attempt(\$email, \$password, \$remember)) {
            \$limiter->clear(\$ip);
            clear_old_input();

            \$user = Auth::user();

            // Check if 2FA is enabled for this user
            if (!empty(\$user['two_factor_secret'])) {
                \$_SESSION['2fa_pending'] = true;
                \$_SESSION['2fa_user_id'] = \$user['id'];
                \$this->redirect(url('admin/2fa/verify'));
                return;
            }

            // Login successful
            \$intended = \$_SESSION['intended_url'] ?? url('admin');
            unset(\$_SESSION['intended_url']);
            \$this->redirect(\$intended);
        } else {
            // Record failed attempt
            \$limiter->hit(\$ip);
            \$attempts = \$limiter->getAttempts(\$ip);
            \$remaining = 5 - \$attempts;

            flash_input();
            if (\$remaining > 0) {
                flash('error', "Invalid email or password. {\$remaining} attempts remaining.");
            } else {
                flash('error', 'Too many login attempts. Please try again in 15 minutes.');
            }
            \$this->redirect(url('admin/login'));
        }
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

        \$this->view('admin.auth.2fa-verify', [
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

        \$totp = new TwoFactor();
        if (\$totp->verifyCode(\$user['two_factor_secret'], (string) \$code)) {
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
     * Logout
     */
    public function logout(): void
    {
        Auth::logout();
        \$this->redirect(url('admin/login'));
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
     * Process forgot password - send reset email
     */
    public function forgotPassword(): void
    {
        if (!\$this->validateCsrf()) return;

        // Rate limit password reset requests
        \$limiter = new RateLimiter('password_reset', 3, 1800);
        \$ip = client_ip();

        if (\$limiter->isLimited(\$ip)) {
            flash('error', 'Too many password reset requests. Please try again later.');
            \$this->redirect(url('admin/forgot-password'));
            return;
        }

        \$validator = Validator::make(\$_POST, [
            'email' => 'required|email',
        ]);

        if (!\$validator->validate()) {
            flash('error', 'Please provide a valid email address.');
            \$this->redirect(url('admin/forgot-password'));
            return;
        }

        \$email = trim(\$this->input('email'));
        \$db = Database::getInstance();
        \$user = \$db->fetch("SELECT * FROM users WHERE email = ? AND status = 'active' AND deleted_at IS NULL", [\$email]);

        // Always show success to prevent email enumeration
        if (\$user) {
            // Generate reset token
            \$token = bin2hex(random_bytes(32));
            \$hashedToken = hash('sha256', \$token);
            \$expiresAt = date('Y-m-d H:i:s', time() + 3600); // 1 hour

            \$db->insert('password_resets', [
                'email' => \$email,
                'token' => \$hashedToken,
                'expires_at' => \$expiresAt,
                'ip' => client_ip(),
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            // Send email
            \$resetUrl = url("admin/reset-password?token={\$token}&email=" . urlencode(\$email));
            \$this->sendResetEmail(\$email, \$user['name'], \$resetUrl);

            \$limiter->hit(\$ip);
        }

        flash('success', 'If an account exists with that email, a password reset link has been sent.');
        \$this->redirect(url('admin/forgot-password'));
    }

    /**
     * Show reset password page
     */
    public function showResetPassword(): void
    {
        \$token = \$this->input('token');
        \$email = \$this->input('email');

        if (!\$token || !\$email) {
            flash('error', 'Invalid reset link.');
            \$this->redirect(url('admin/forgot-password'));
            return;
        }

        // Verify token
        \$db = Database::getInstance();
        \$hashedToken = hash('sha256', \$token);
        \$reset = \$db->fetch(
            "SELECT * FROM password_resets WHERE email = ? AND token = ? AND expires_at > NOW() AND used_at IS NULL",
            [\$email, \$hashedToken]
        );

        if (!\$reset) {
            flash('error', 'This reset link has expired or already been used.');
            \$this->redirect(url('admin/forgot-password'));
            return;
        }

        \$this->view('admin.auth.reset-password', [
            'page_title' => 'Reset Password',
            'token' => e(\$token),
            'email' => e(\$email),
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
        \$password = \$this->input('password');
        \$passwordConfirm = \$this->input('password_confirmation');

        \$validator = Validator::make(\$_POST, [
            'password' => 'required|min:8|confirmed',
        ]);

        if (!\$validator->validate()) {
            flash('errors', json_encode(\$validator->errors()));
            \$this->redirect(url("admin/reset-password?token={\$token}&email=" . urlencode(\$email)));
            return;
        }

        \$db = Database::getInstance();
        \$hashedToken = hash('sha256', \$token);

        \$reset = \$db->fetch(
            "SELECT * FROM password_resets WHERE email = ? AND token = ? AND expires_at > NOW() AND used_at IS NULL",
            [\$email, \$hashedToken]
        );

        if (!\$reset) {
            flash('error', 'This reset link has expired or already been used.');
            \$this->redirect(url('admin/forgot-password'));
            return;
        }

        // Update password
        \$user = \$db->fetch("SELECT id FROM users WHERE email = ?", [\$email]);
        if (!\$user) {
            flash('error', 'Account not found.');
            \$this->redirect(url('admin/forgot-password'));
            return;
        }

        \$db->update('users', [
            'password_hash' => password_hash(\$password, PASSWORD_BCRYPT, ['cost' => 12]),
            'remember_token' => null, // Clear remember me
            'updated_at' => date('Y-m-d H:i:s'),
        ], 'id = ?', [\$user['id']]);

        // Mark token as used
        \$db->update('password_resets', [
            'used_at' => date('Y-m-d H:i:s'),
        ], 'id = ?', [\$reset['id']]);

        // Force logout all sessions for this user
        \$db->update('users', [
            'remember_token' => null,
        ], 'id = ?', [\$user['id']]);

        flash('success', 'Password has been reset successfully. Please log in with your new password.');
        \$this->redirect(url('admin/login'));
    }

    /**
     * Send password reset email
     */
    private function sendResetEmail(string \$email, string \$name, string \$resetUrl): void
    {
        \$siteName = setting('site_name', 'Khybersoft');
        \$subject = "Password Reset - {\$siteName}";

        \$htmlBody = <<<HTML
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: Arial, sans-serif; background: #f1f5f9; padding: 40px;">
            <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h2 style="color: #1e293b; margin-bottom: 16px;">Password Reset Request</h2>
                <p style="color: #475569; line-height: 1.6;">
                    Hello {\$name},<br><br>
                    We received a request to reset your password for your {\$siteName} admin account.
                    Click the button below to set a new password:
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{\$resetUrl}" style="background: #3b82f6; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                        Reset Password
                    </a>
                </div>
                <p style="color: #94a3b8; font-size: 13px;">
                    This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
                </p>
            </div>
        </body>
        </html>
        HTML;

        \$textBody = "Password Reset - {\$siteName}\\n\\nHello {\$name},\\n\\nReset your password: {\$resetUrl}\\n\\nThis link expires in 1 hour.";

        \$headers = [
            'From: ' . \$siteName . ' <' . setting('site_email', 'noreply@khybersoft.com') . '>',
            'Reply-To: ' . setting('site_email', 'noreply@khybersoft.com'),
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'X-Mailer: PHP/' . phpversion(),
        ];

        // Try SMTP first if configured, fallback to mail()
        \$smtpHost = getenv('SMTP_HOST');
        if (\$smtpHost) {
            // SMTP would use a library like PHPMailer in production
            // For now, use mail() with note about SMTP setup
            error_log('SMTP configured but using mail() fallback. Install PHPMailer for SMTP support.');
        }

        @mail(\$email, \$subject, \$htmlBody, implode("\\r\\n", \$headers));
    }
}
`
  },
  {
    path: 'app/core/RateLimiter.php',
    name: 'RateLimiter.php',
    language: 'php',
    category: 'core',
    description: 'Rate limiter using file-based storage for shared hosting compatibility',
    content: `<?php
declare(strict_types=1);

namespace App\\Core;

/**
 * Rate Limiter - File-based rate limiting for shared hosting
 * Uses file storage instead of Redis for cPanel compatibility
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
        \$this->storagePath = CACHE_PATH . '/rate_limits';

        if (!is_dir(\$this->storagePath)) {
            mkdir(\$this->storagePath, 0755, true);
        }
    }

    /**
     * Check if the given key is rate limited
     */
    public function isLimited(string \$identifier): bool
    {
        return \$this->getAttempts(\$identifier) >= \$this->maxAttempts;
    }

    /**
     * Record an attempt
     */
    public function hit(string \$identifier): int
    {
        \$data = \$this->getData(\$identifier);
        \$now = time();

        // Clean expired attempts
        \$data['attempts'] = array_filter(
            \$data['attempts'] ?? [],
            fn(\$timestamp) => (\$now - \$timestamp) < \$this->decaySeconds
        );

        // Add new attempt
        \$data['attempts'][] = \$now;
        \$data['last_attempt'] = \$now;

        \$this->saveData(\$identifier, \$data);

        return count(\$data['attempts']);
    }

    /**
     * Get number of attempts
     */
    public function getAttempts(string \$identifier): int
    {
        \$data = \$this->getData(\$identifier);
        \$now = time();

        \$activeAttempts = array_filter(
            \$data['attempts'] ?? [],
            fn(\$timestamp) => (\$now - \$timestamp) < \$this->decaySeconds
        );

        return count(\$activeAttempts);
    }

    /**
     * Get remaining time until limit resets (seconds)
     */
    public function getRemainingTime(string \$identifier): int
    {
        \$data = \$this->getData(\$identifier);
        \$now = time();

        if (empty(\$data['attempts'])) {
            return 0;
        }

        \$oldestActive = null;
        foreach (\$data['attempts'] as \$timestamp) {
            if ((\$now - \$timestamp) < \$this->decaySeconds) {
                if (\$oldestActive === null || \$timestamp < \$oldestActive) {
                    \$oldestActive = \$timestamp;
                }
            }
        }

        if (\$oldestActive === null) {
            return 0;
        }

        return max(0, \$this->decaySeconds - (\$now - \$oldestActive));
    }

    /**
     * Get remaining attempts allowed
     */
    public function getRemainingAttempts(string \$identifier): int
    {
        return max(0, \$this->maxAttempts - \$this->getAttempts(\$identifier));
    }

    /**
     * Clear attempts for identifier
     */
    public function clear(string \$identifier): void
    {
        \$file = \$this->getFilePath(\$identifier);
        if (file_exists(\$file)) {
            unlink(\$file);
        }
    }

    /**
     * Get data for identifier
     */
    private function getData(string \$identifier): array
    {
        \$file = \$this->getFilePath(\$identifier);

        if (!file_exists(\$file)) {
            return ['attempts' => [], 'last_attempt' => 0];
        }

        \$content = file_get_contents(\$file);
        if (\$content === false) {
            return ['attempts' => [], 'last_attempt' => 0];
        }

        \$data = json_decode(\$content, true);
        return is_array(\$data) ? \$data : ['attempts' => [], 'last_attempt' => 0];
    }

    /**
     * Save data for identifier
     */
    private function saveData(string \$identifier, array \$data): void
    {
        \$file = \$this->getFilePath(\$identifier);
        file_put_contents(\$file, json_encode(\$data), LOCK_EX);
    }

    /**
     * Get file path for identifier
     */
    private function getFilePath(string \$identifier): string
    {
        \$safeKey = preg_replace('/[^a-zA-Z0-9_-]/', '_', \$this->key);
        \$safeId = preg_replace('/[^a-zA-Z0-9._-]/', '_', \$identifier);
        return \$this->storagePath . '/' . \$safeKey . '_' . \$safeId . '.json';
    }

    /**
     * Clean up expired rate limit files
     */
    public static function cleanup(): void
    {
        \$path = CACHE_PATH . '/rate_limits';
        if (!is_dir(\$path)) return;

        \$files = glob(\$path . '/*.json');
        foreach (\$files as \$file) {
            if (filemtime(\$file) < time() - 86400) {
                unlink(\$file);
            }
        }
    }
}
`
  },
  {
    path: 'app/core/TwoFactor.php',
    name: 'TwoFactor.php',
    language: 'php',
    category: 'core',
    description: 'TOTP-based two-factor authentication (Google Authenticator compatible)',
    content: `<?php
declare(strict_types=1);

namespace App\\Core;

/**
 * Two-Factor Authentication - TOTP (RFC 6238)
 * Compatible with Google Authenticator, Authy, etc.
 */
class TwoFactor
{
    private const DIGITS = 6;
    private const PERIOD = 30;
    private const ALGORITHM = 'sha1';
    private const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /**
     * Generate a new secret key
     */
    public function generateSecret(int \$length = 20): string
    {
        \$bytes = random_bytes(\$length);
        return \$this->base32Encode(\$bytes);
    }

    /**
     * Generate a QR code URL for Google Authenticator
     */
    public function getQRCodeUrl(string \$secret, string \$email, string \$issuer = 'Khybersoft'): string
    {
        \$label = urlencode(\$issuer . ':' . \$email);
        \$params = http_build_query([
            'secret' => \$secret,
            'issuer' => \$issuer,
            'algorithm' => strtoupper(self::ALGORITHM),
            'digits' => self::DIGITS,
            'period' => self::PERIOD,
        ]);

        return "otpauth://totp/{\$label}?{\$params}";
    }

    /**
     * Get QR code image URL (using Google Charts API)
     */
    public function getQRCodeImage(string \$secret, string \$email, string \$issuer = 'Khybersoft', int \$size = 200): string
    {
        \$url = \$this->getQRCodeUrl(\$secret, \$email, \$issuer);
        return 'https://chart.googleapis.com/chart?chs=' . \$size . 'x' . \$size . '&cht=qr&chl=' . urlencode(\$url) . '&choe=UTF-8';
    }

    /**
     * Verify a TOTP code
     */
    public function verifyCode(string \$secret, string \$code, int \$window = 1): bool
    {
        \$code = str_pad(\$code, self::DIGITS, '0', STR_PAD_LEFT);
        \$time = (int) floor(time() / self::PERIOD);

        for (\$i = -\$window; \$i <= \$window; \$i++) {
            \$calculatedCode = \$this->generateCode(\$secret, \$time + \$i);
            if (hash_equals(\$calculatedCode, \$code)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Generate TOTP code for a given time
     */
    public function generateCode(string \$secret, ?int \$time = null): string
    {
        if (\$time === null) {
            \$time = (int) floor(time() / self::PERIOD);
        }

        // Decode secret from base32
        \$secretKey = \$this->base32Decode(\$secret);

        // Pack time as 64-bit unsigned integer (big endian)
        \$timePacked = pack('N*', 0, \$time);

        // HMAC-SHA1
        \$hash = hash_hmac(self::ALGORITHM, \$timePacked, \$secretKey, true);

        // Dynamic truncation
        \$offset = ord(\$hash[strlen(\$hash) - 1]) & 0x0F;
        \$binary = (
            ((ord(\$hash[\$offset]) & 0x7F) << 24) |
            ((ord(\$hash[\$offset + 1]) & 0xFF) << 16) |
            ((ord(\$hash[\$offset + 2]) & 0xFF) << 8) |
            (ord(\$hash[\$offset + 3]) & 0xFF)
        );

        \$otp = \$binary % (10 ** self::DIGITS);
        return str_pad((string) \$otp, self::DIGITS, '0', STR_PAD_LEFT);
    }

    /**
     * Enable 2FA for a user
     */
    public function enableForUser(int \$userId): string
    {
        \$secret = \$this->generateSecret();
        \$db = Database::getInstance();

        \$db->update('users', [
            'two_factor_secret' => \$secret,
            'two_factor_enabled' => 0, // Not confirmed yet
            'updated_at' => date('Y-m-d H:i:s'),
        ], 'id = ?', [\$userId]);

        return \$secret;
    }

    /**
     * Confirm 2FA setup (after user verifies first code)
     */
    public function confirmForUser(int \$userId, string \$code): bool
    {
        \$db = Database::getInstance();
        \$user = \$db->fetch("SELECT two_factor_secret FROM users WHERE id = ?", [\$userId]);

        if (!\$user || empty(\$user['two_factor_secret'])) {
            return false;
        }

        if (\$this->verifyCode(\$user['two_factor_secret'], \$code)) {
            \$db->update('users', [
                'two_factor_enabled' => 1,
                'updated_at' => date('Y-m-d H:i:s'),
            ], 'id = ?', [\$userId]);
            return true;
        }

        return false;
    }

    /**
     * Disable 2FA for a user
     */
    public function disableForUser(int \$userId): void
    {
        \$db = Database::getInstance();
        \$db->update('users', [
            'two_factor_secret' => null,
            'two_factor_enabled' => 0,
            'updated_at' => date('Y-m-d H:i:s'),
        ], 'id = ?', [\$userId]);
    }

    // --- Base32 Encoding/Decoding ---

    private function base32Encode(string \$data): string
    {
        \$binary = '';
        foreach (str_split(\$data) as \$char) {
            \$binary .= str_pad(base_convert(ord(\$char), 10, 2), 8, '0', STR_PAD_LEFT);
        }

        \$result = '';
        foreach (str_split(\$binary, 5) as \$chunk) {
            \$chunk = str_pad(\$chunk, 5, '0', STR_PAD_RIGHT);
            \$result .= self::BASE32_CHARS[base_convert(\$chunk, 2, 10)];
        }

        return \$result;
    }

    private function base32Decode(string \$data): string
    {
        \$data = strtoupper(rtrim(\$data, '='));
        \$binary = '';

        foreach (str_split(\$data) as \$char) {
            \$pos = strpos(self::BASE32_CHARS, \$char);
            if (\$pos === false) continue;
            \$binary .= str_pad(base_convert((string) \$pos, 10, 2), 5, '0', STR_PAD_LEFT);
        }

        \$result = '';
        foreach (str_split(\$binary, 8) as \$byte) {
            if (strlen(\$byte) < 8) break;
            \$result .= chr(base_convert(\$byte, 2, 10));
        }

        return \$result;
    }
}
`
  },
  {
    path: 'app/middleware/AdminAuth.php',
    name: 'AdminAuth.php',
    language: 'php',
    category: 'middleware',
    description: 'Admin authentication middleware with 2FA check',
    content: `<?php
declare(strict_types=1);

namespace App\\Middleware;

use App\\Core\\Auth;

/**
 * Admin Auth Middleware
 * Ensures user is authenticated and has admin access
 */
class AdminAuth
{
    public function handle(): bool
    {
        // Check if user is logged in
        if (Auth::guest()) {
            \$_SESSION['intended_url'] = \$_SERVER['REQUEST_URI'];
            flash('error', 'Please log in to access the admin panel.');
            header('Location: ' . url('admin/login'));
            exit;
        }

        // Check if 2FA is pending
        if (isset(\$_SESSION['2fa_pending'])) {
            header('Location: ' . url('admin/2fa/verify'));
            exit;
        }

        // Check if user has admin role
        \$user = Auth::user();
        if (!\$user || !in_array(\$user['role_slug'] ?? '', ['super_admin', 'admin', 'editor'])) {
            Auth::logout();
            flash('error', 'You do not have permission to access the admin panel.');
            header('Location: ' . url('admin/login'));
            exit;
        }

        // Check if user account is active
        if ((\$user['status'] ?? '') !== 'active') {
            Auth::logout();
            flash('error', 'Your account has been deactivated.');
            header('Location: ' . url('admin/login'));
            exit;
        }

        // Session timeout check (configurable)
        \$timeout = (int) setting('admin_session_timeout', '7200');
        if (isset(\$_SESSION['_last_activity'])) {
            if (time() - \$_SESSION['_last_activity'] > \$timeout) {
                Auth::logout();
                flash('error', 'Session expired. Please log in again.');
                header('Location: ' . url('admin/login'));
                exit;
            }
        }
        \$_SESSION['_last_activity'] = time();

        return true;
    }
}
`
  },
  {
    path: 'app/middleware/Permission.php',
    name: 'Permission.php',
    language: 'php',
    category: 'middleware',
    description: 'Permission-based access control middleware',
    content: `<?php
declare(strict_types=1);

namespace App\\Middleware;

use App\\Core\\Auth;

/**
 * Permission Middleware
 * Checks if authenticated user has required permission
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
        // First ensure user is authenticated
        if (Auth::guest()) {
            \$_SESSION['intended_url'] = \$_SERVER['REQUEST_URI'];
            flash('error', 'Please log in to continue.');
            header('Location: ' . url('admin/login'));
            exit;
        }

        // Super admin bypasses all permission checks
        if (Auth::hasRole('super_admin')) {
            return true;
        }

        // Check specific permission
        if (\$this->permission && !Auth::can(\$this->permission)) {
            // Log unauthorized access attempt
            \$this->logUnauthorizedAccess();

            if (\$this->isAjax()) {
                http_response_code(403);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Insufficient permissions.']);
                exit;
            }

            flash('error', 'You do not have permission to perform this action.');
            header('Location: ' . url('admin'));
            exit;
        }

        return true;
    }

    private function isAjax(): bool
    {
        return (\$_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'XMLHttpRequest';
    }

    private function logUnauthorizedAccess(): void
    {
        try {
            \$db = \\App\\Core\\Database::getInstance();
            \$db->insert('activity_logs', [
                'user_id' => Auth::id(),
                'action' => 'unauthorized_access',
                'description' => 'Attempted access with insufficient permissions: ' . \$this->permission,
                'model' => 'middleware',
                'ip' => client_ip(),
                'user_agent' => \$_SERVER['HTTP_USER_AGENT'] ?? '',
                'created_at' => date('Y-m-d H:i:s'),
            ]);
        } catch (\\Throwable \$e) {
            error_log('Failed to log unauthorized access: ' . \$e->getMessage());
        }
    }
}
`
  },
  {
    path: 'app/controllers/admin/DashboardController.php',
    name: 'DashboardController.php',
    language: 'php',
    category: 'dashboard',
    description: 'Admin dashboard with widgets, stats, charts, and system health',
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
                ['label' => 'Dashboard', 'url' => url('admin')],
            ],
            'stats' => \$this->getStats(),
            'recentInquiries' => \$this->getRecentInquiries(),
            'recentActivity' => \$this->getRecentActivity(),
            'topProducts' => \$this->getTopProducts(),
            'trafficData' => \$this->getTrafficData(),
            'systemHealth' => \$this->getSystemHealth(),
            'quickActions' => \$this->getQuickActions(),
        ];

        \$this->view('admin.dashboard', \$data);
    }

    /**
     * Get dashboard statistics
     */
    private function getStats(): array
    {
        \$today = date('Y-m-d');
        \$thisMonth = date('Y-m-01');

        return [
            'products' => [
                'label' => 'Total Products',
                'value' => (int) \$this->db->fetchColumn(
                    "SELECT COUNT(*) FROM products WHERE status = 'published' AND deleted_at IS NULL"
                ),
                'change' => (int) \$this->db->fetchColumn(
                    "SELECT COUNT(*) FROM products WHERE created_at >= ?", [\$thisMonth]
                ),
                'change_label' => 'this month',
                'icon' => 'package',
                'color' => 'blue',
                'sparkline' => \$this->getSparklineData('products', 7),
            ],
            'inquiries' => [
                'label' => 'Inquiries Today',
                'value' => (int) \$this->db->fetchColumn(
                    "SELECT COUNT(*) FROM product_inquiries WHERE DATE(created_at) = ?", [\$today]
                ),
                'change' => (int) \$this->db->fetchColumn(
                    "SELECT COUNT(*) FROM product_inquiries WHERE status = 'new'"
                ),
                'change_label' => 'pending',
                'icon' => 'inbox',
                'color' => 'green',
                'sparkline' => \$this->getSparklineData('inquiries', 7),
            ],
            'posts' => [
                'label' => 'Blog Posts',
                'value' => (int) \$this->db->fetchColumn(
                    "SELECT COUNT(*) FROM blog_posts WHERE status = 'published' AND deleted_at IS NULL"
                ),
                'change' => (int) \$this->db->fetchColumn(
                    "SELECT COUNT(*) FROM blog_posts WHERE published_at >= ?", [\$thisMonth]
                ),
                'change_label' => 'this month',
                'icon' => 'file-text',
                'color' => 'purple',
                'sparkline' => \$this->getSparklineData('posts', 7),
            ],
            'subscribers' => [
                'label' => 'Newsletter',
                'value' => (int) \$this->db->fetchColumn(
                    "SELECT COUNT(*) FROM newsletter_subscribers WHERE status = 'active'"
                ),
                'change' => (int) \$this->db->fetchColumn(
                    "SELECT COUNT(*) FROM newsletter_subscribers WHERE subscribed_at >= ?", [\$thisMonth]
                ),
                'change_label' => 'new subs',
                'icon' => 'users',
                'color' => 'orange',
                'sparkline' => \$this->getSparklineData('subscribers', 7),
            ],
        ];
    }

    /**
     * Get sparkline data for mini charts
     */
    private function getSparklineData(string \$type, int \$days): array
    {
        \$data = [];
        for (\$i = \$days - 1; \$i >= 0; \$i--) {
            \$date = date('Y-m-d', strtotime("-{\$i} days"));
            \$count = 0;

            switch (\$type) {
                case 'products':
                    \$count = (int) \$this->db->fetchColumn(
                        "SELECT COUNT(*) FROM products WHERE DATE(created_at) = ?", [\$date]
                    );
                    break;
                case 'inquiries':
                    \$count = (int) \$this->db->fetchColumn(
                        "SELECT COUNT(*) FROM product_inquiries WHERE DATE(created_at) = ?", [\$date]
                    );
                    break;
                case 'posts':
                    \$count = (int) \$this->db->fetchColumn(
                        "SELECT COUNT(*) FROM blog_posts WHERE DATE(published_at) = ?", [\$date]
                    );
                    break;
                case 'subscribers':
                    \$count = (int) \$this->db->fetchColumn(
                        "SELECT COUNT(*) FROM newsletter_subscribers WHERE DATE(subscribed_at) = ?", [\$date]
                    );
                    break;
            }

            \$data[] = ['date' => \$date, 'value' => \$count];
        }
        return \$data;
    }

    /**
     * Get recent inquiries
     */
    private function getRecentInquiries(int \$limit = 10): array
    {
        return \$this->db->fetchAll(
            "SELECT pi.*, p.name as product_name
             FROM product_inquiries pi
             LEFT JOIN products p ON pi.product_id = p.id
             ORDER BY pi.created_at DESC
             LIMIT ?",
            [\$limit]
        );
    }

    /**
     * Get recent activity
     */
    private function getRecentActivity(int \$limit = 15): array
    {
        return \$this->db->fetchAll(
            "SELECT al.*, u.name as user_name
             FROM activity_logs al
             LEFT JOIN users u ON al.user_id = u.id
             ORDER BY al.created_at DESC
             LIMIT ?",
            [\$limit]
        );
    }

    /**
     * Get top products by inquiries
     */
    private function getTopProducts(int \$limit = 5): array
    {
        return \$this->db->fetchAll(
            "SELECT p.name, p.slug, COUNT(pi.id) as inquiry_count
             FROM products p
             INNER JOIN product_inquiries pi ON pi.product_id = p.id
             WHERE p.deleted_at IS NULL
             GROUP BY p.id, p.name, p.slug
             ORDER BY inquiry_count DESC
             LIMIT ?",
            [\$limit]
        );
    }

    /**
     * Get traffic data for chart (last 30 days)
     */
    private function getTrafficData(): array
    {
        \$data = [];
        for (\$i = 29; \$i >= 0; \$i--) {
            \$date = date('Y-m-d', strtotime("-{\$i} days"));
            \$data[] = [
                'date' => date('M d', strtotime(\$date)),
                'visitors' => random_int(50, 300), // Placeholder - integrate analytics
                'pageviews' => random_int(100, 800),
            ];
        }
        return \$data;
    }

    /**
     * Get system health info
     */
    private function getSystemHealth(): array
    {
        \$dbSize = \$this->db->fetch(
            "SELECT
                ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb,
                COUNT(*) AS tables_count
             FROM information_schema.tables
             WHERE table_schema = ?",
            [getenv('DB_NAME') ?: 'khybersoft_db']
        );

        return [
            'php_version' => PHP_VERSION,
            'php_memory_limit' => ini_get('memory_limit'),
            'php_max_upload' => ini_get('upload_max_filesize'),
            'server_software' => \$_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
            'db_size' => (\$dbSize['size_mb'] ?? 0) . ' MB',
            'db_tables' => \$dbSize['tables_count'] ?? 0,
            'disk_free' => function_exists('disk_free_space')
                ? round(disk_free_space('/') / 1024 / 1024 / 1024, 2) . ' GB'
                : 'N/A',
            'disk_total' => function_exists('disk_total_space')
                ? round(disk_total_space('/') / 1024 / 1024 / 1024, 2) . ' GB'
                : 'N/A',
            'ssl' => (!empty(\$_SERVER['HTTPS']) && \$_SERVER['HTTPS'] !== 'off') ? 'Active' : 'Not detected',
            'extensions' => [
                'pdo_mysql' => extension_loaded('pdo_mysql'),
                'mbstring' => extension_loaded('mbstring'),
                'json' => extension_loaded('json'),
                'openssl' => extension_loaded('openssl'),
                'curl' => extension_loaded('curl'),
                'gd' => extension_loaded('gd'),
            ],
        ];
    }

    /**
     * Get quick action links
     */
    private function getQuickActions(): array
    {
        return [
            ['label' => 'New Product', 'url' => url('admin/products/create'), 'icon' => 'plus', 'color' => 'blue'],
            ['label' => 'New Blog Post', 'url' => url('admin/blog/create'), 'icon' => 'edit', 'color' => 'purple'],
            ['label' => 'View Inquiries', 'url' => url('admin/inquiries'), 'icon' => 'mail', 'color' => 'green'],
            ['label' => 'Settings', 'url' => url('admin/settings'), 'icon' => 'settings', 'color' => 'gray'],
        ];
    }

    /**
     * AJAX: Update inquiry status
     */
    public function updateInquiryStatus(): void
    {
        if (!\$this->validateCsrf()) {
            \$this->json(['error' => 'Invalid token'], 403);
            return;
        }

        \$id = (int) \$this->input('id');
        \$status = \$this->input('status');

        \$validStatuses = ['new', 'in_progress', 'resolved', 'closed'];
        if (!in_array(\$status, \$validStatuses)) {
            \$this->json(['error' => 'Invalid status'], 422);
            return;
        }

        \$this->db->update('product_inquiries', [
            'status' => \$status,
            'updated_at' => date('Y-m-d H:i:s'),
        ], 'id = ?', [\$id]);

        // Log activity
        \$this->db->insert('activity_logs', [
            'user_id' => Auth::id(),
            'action' => 'inquiry_status_change',
            'model' => 'product_inquiries',
            'model_id' => \$id,
            'new_values' => json_encode(['status' => \$status]),
            'ip' => client_ip(),
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        \$this->json(['success' => true, 'message' => 'Status updated successfully.']);
    }
}
`
  },
  {
    path: 'app/views/layouts/admin.php',
    name: 'admin.php (layout)',
    language: 'php',
    category: 'layout',
    description: 'Admin layout with sidebar, navbar, breadcrumbs, dark mode, toasts',
    content: `<?php
declare(strict_types=1);
/**
 * Admin Layout - Main template with sidebar, navbar, and content area
 * Uses TailwindCSS + Alpine.js for interactivity
 */
use App\\Core\\Auth;
use App\\Core\\CSRF;

\$user = Auth::user();
\$currentPage = parse_url(\$_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?? '/admin';
?>
<!DOCTYPE html>
<html lang="en" x-data="{ darkMode: localStorage.getItem('darkMode') === 'true', sidebarOpen: true, mobileSidebar: false }"
      :class="{ 'dark': darkMode }">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e(\$page_title ?? 'Admin') ?> - <?= e(setting('site_name')) ?></title>
    <?= CSRF::meta() ?>

    <!-- TailwindCSS CDN (use compiled CSS in production) -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        primary: { 50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',300:'#93c5fd',400:'#60a5fa',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8',800:'#1e40af',900:'#1e3a8a' },
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
        .fade-in { animation: fadeIn 0.2s ease-in; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .skeleton { background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    </style>
</head>
<body class="bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 min-h-screen" x-data="adminApp()">

    <!-- Toast Notifications -->
    <div x-data="toasts()" class="fixed top-4 right-4 z-[100] space-y-2 max-w-sm">
        <?php if (has_flash('success')): ?>
        <div x-init="addToast('success', '<?= e(get_flash('success')) ?>')" ></div>
        <?php endif; ?>
        <?php if (has_flash('error')): ?>
        <div x-init="addToast('error', '<?= e(get_flash('error')) ?>')" ></div>
        <?php endif; ?>
        <template x-for="toast in toasts" :key="toast.id">
            <div x-show="toast.visible"
                 x-transition:enter="transform ease-out duration-300 transition"
                 x-transition:enter-start="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
                 x-transition:enter-end="translate-y-0 opacity-100 sm:translate-x-0"
                 x-transition:leave="transition ease-in duration-100"
                 x-transition:leave-start="opacity-100"
                 x-transition:leave-end="opacity-0"
                 :class="toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'"
                 class="rounded-lg shadow-lg p-4 text-white flex items-center gap-3">
                <span x-html="toast.type === 'success' ? '✓' : '✕'" class="text-lg font-bold"></span>
                <span x-text="toast.message" class="text-sm"></span>
                <button @click="removeToast(toast.id)" class="ml-auto text-white/70 hover:text-white">✕</button>
            </div>
        </template>
    </div>

    <!-- Mobile Sidebar Overlay -->
    <div x-show="mobileSidebar" x-cloak
         x-transition:enter="transition-opacity ease-out duration-300"
         x-transition:enter-start="opacity-0" x-transition:enter-end="opacity-100"
         x-transition:leave="transition-opacity ease-in duration-200"
         x-transition:leave-start="opacity-100" x-transition:leave-end="opacity-0"
         @click="mobileSidebar = false"
         class="fixed inset-0 bg-black/50 z-40 lg:hidden"></div>

    <!-- Sidebar -->
    <aside
        :class="[
            sidebarOpen ? 'w-64' : 'w-20',
            mobileSidebar ? 'translate-x-0' : '-translate-x-full'
        ]"
        class="sidebar-transition fixed top-0 left-0 h-full bg-slate-800 dark:bg-slate-900 border-r border-slate-700 z-50 lg:translate-x-0 overflow-y-auto overflow-x-hidden">

        <!-- Logo -->
        <div class="h-16 flex items-center justify-between px-4 border-b border-slate-700">
            <a href="<?= url('admin') ?>" class="flex items-center gap-3">
                <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span class="text-white font-bold text-sm">K</span>
                </div>
                <span x-show="sidebarOpen" x-cloak class="text-white font-bold text-lg">Khybersoft</span>
            </a>
            <button @click="sidebarOpen = !sidebarOpen" class="hidden lg:block text-slate-400 hover:text-white p-1">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
                </svg>
            </button>
        </div>

        <!-- Navigation -->
        <nav class="p-3 space-y-1">
            <?php include APP_PATH . '/views/partials/sidebar-menu.php'; ?>
        </nav>
    </aside>

    <!-- Main Content Area -->
    <div :class="sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'" class="transition-all duration-300 min-h-screen">

        <!-- Top Navbar -->
        <header class="h-16 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6">
            <!-- Left: Mobile menu + Breadcrumbs -->
            <div class="flex items-center gap-4">
                <button @click="mobileSidebar = true" class="lg:hidden text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>

                <!-- Breadcrumbs -->
                <nav class="hidden sm:flex items-center gap-2 text-sm">
                    <a href="<?= url('admin') ?>" class="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                    </a>
                    <?php if (!empty(\$breadcrumbs)): ?>
                        <?php foreach (\$breadcrumbs as \$i => \$crumb): ?>
                            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                            <?php if (\$i < count(\$breadcrumbs) - 1): ?>
                                <a href="<?= e(\$crumb['url']) ?>" class="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white"><?= e(\$crumb['label']) ?></a>
                            <?php else: ?>
                                <span class="text-gray-900 dark:text-white font-medium"><?= e(\$crumb['label']) ?></span>
                            <?php endif; ?>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </nav>
            </div>

            <!-- Right: Search, Notifications, User -->
            <div class="flex items-center gap-3">
                <!-- Search -->
                <div class="hidden md:flex items-center bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-2">
                    <svg class="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    <input type="text" placeholder="Search..." class="bg-transparent border-none outline-none text-sm w-40 text-gray-700 dark:text-slate-200 placeholder-gray-400">
                </div>

                <!-- Dark Mode Toggle -->
                <button @click="darkMode = !darkMode; localStorage.setItem('darkMode', darkMode)"
                        class="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                    <svg x-show="!darkMode" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
                    <svg x-show="darkMode" x-cloak class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                </button>

                <!-- Site Preview -->
                <a href="<?= url('/') ?>" target="_blank" class="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" title="View Site">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                </a>

                <!-- Notifications -->
                <div x-data="{ open: false }" class="relative">
                    <button @click="open = !open" class="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors relative">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                        <span class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                    </button>
                    <div x-show="open" x-cloak @click.away="open = false"
                         x-transition class="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                        <div class="p-3 border-b border-gray-200 dark:border-slate-700">
                            <h3 class="font-semibold text-sm">Notifications</h3>
                        </div>
                        <div class="max-h-64 overflow-y-auto p-2">
                            <p class="text-sm text-gray-500 dark:text-slate-400 text-center py-4">No new notifications</p>
                        </div>
                    </div>
                </div>

                <!-- User Dropdown -->
                <div x-data="{ open: false }" class="relative">
                    <button @click="open = !open" class="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                        <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span class="text-white text-xs font-bold"><?= e(strtoupper(substr(\$user['name'] ?? 'A', 0, 1))) ?></span>
                        </div>
                        <span class="hidden md:block text-sm font-medium"><?= e(\$user['name'] ?? 'Admin') ?></span>
                        <svg class="w-4 h-4 text-gray-400 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    <div x-show="open" x-cloak @click.away="open = false"
                         x-transition class="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                        <div class="p-3 border-b border-gray-200 dark:border-slate-700">
                            <p class="text-sm font-medium"><?= e(\$user['name'] ?? 'Admin') ?></p>
                            <p class="text-xs text-gray-500 dark:text-slate-400"><?= e(\$user['email'] ?? '') ?></p>
                        </div>
                        <div class="p-1">
                            <a href="<?= url('admin/settings') ?>" class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                Settings
                            </a>
                            <a href="<?= url('admin/logout') ?>" class="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                                Logout
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        <!-- Page Content -->
        <main class="p-4 lg:p-6 fade-in">
            <?= \$_view_content_ ?>
        </main>
    </div>

    <!-- Alpine.js App Logic -->
    <script>
    function adminApp() {
        return {
            init() {
                // Watch for dark mode changes
                this.\\$watch('darkMode', value => {
                    document.documentElement.classList.toggle('dark', value);
                });
            }
        }
    }

    function toasts() {
        return {
            toasts: [],
            counter: 0,
            addToast(type, message) {
                const id = ++this.counter;
                this.toasts.push({ id, type, message, visible: true });
                setTimeout(() => this.removeToast(id), 5000);
            },
            removeToast(id) {
                const toast = this.toasts.find(t => t.id === id);
                if (toast) toast.visible = false;
                setTimeout(() => {
                    this.toasts = this.toasts.filter(t => t.id !== id);
                }, 300);
            }
        }
    }
    </script>
</body>
</html>
`
  },
  {
    path: 'app/views/admin/auth/login.php',
    name: 'login.php',
    language: 'php',
    category: 'auth',
    description: 'Premium login page with glassmorphism card and dark gradient background',
    content: `<?php
declare(strict_types=1);
use App\\Core\\CSRF;
/**
 * Admin Login Page - Premium glassmorphism design
 */
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e(\$page_title ?? 'Admin Login') ?> - <?= e(setting('site_name')) ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <style>
        .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); }
        .glass-input { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); }
        .glass-input:focus { background: rgba(255,255,255,0.08); border-color: rgba(99,102,241,0.5); box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
        .gradient-bg { background: linear-gradient(135deg, #0f0c29 0%, #1a1a3e 25%, #24243e 50%, #141432 75%, #0f0c29 100%); }
        .floating-orb { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.3; animation: float 8s ease-in-out infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-30px) scale(1.05); } }
        .btn-glow { box-shadow: 0 0 20px rgba(99,102,241,0.3); }
        .btn-glow:hover { box-shadow: 0 0 30px rgba(99,102,241,0.5); }
    </style>
</head>
<body class="gradient-bg min-h-screen flex items-center justify-center p-4 relative overflow-hidden">

    <!-- Floating orbs -->
    <div class="floating-orb w-72 h-72 bg-indigo-600 top-10 -left-20" style="animation-delay: 0s;"></div>
    <div class="floating-orb w-96 h-96 bg-purple-600 bottom-10 -right-20" style="animation-delay: 2s;"></div>
    <div class="floating-orb w-64 h-64 bg-blue-600 top-1/2 left-1/3" style="animation-delay: 4s;"></div>

    <!-- Login Card -->
    <div class="glass rounded-2xl p-8 w-full max-w-md relative z-10 shadow-2xl">
        <!-- Logo -->
        <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
                <span class="text-white font-bold text-2xl">K</span>
            </div>
            <h1 class="text-2xl font-bold text-white">Welcome Back</h1>
            <p class="text-slate-400 text-sm mt-1">Sign in to your admin account</p>
        </div>

        <!-- Error Message -->
        <?php if (!empty(\$error)): ?>
        <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span class="text-red-300 text-sm"><?= e(\$error) ?></span>
        </div>
        <?php endif; ?>

        <!-- Success Message -->
        <?php if (!empty(\$success)): ?>
        <div class="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span class="text-green-300 text-sm"><?= e(\$success) ?></span>
        </div>
        <?php endif; ?>

        <!-- Login Form -->
        <form method="POST" action="<?= url('admin/login') ?>" x-data="{ loading: false }" @submit="loading = true">
            <?= CSRF::field() ?>

            <!-- Email -->
            <div class="mb-4">
                <label for="email" class="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
                <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"/></svg>
                    </div>
                    <input type="email" id="email" name="email" value="<?= old('email') ?>" required
                           class="glass-input w-full pl-10 pr-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none transition-all"
                           placeholder="admin@khybersoft.com">
                </div>
            </div>

            <!-- Password -->
            <div class="mb-4">
                <label for="password" class="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                <div x-data="{ show: false }" class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                    </div>
                    <input :type="show ? 'text' : 'password'" id="password" name="password" required
                           class="glass-input w-full pl-10 pr-12 py-3 rounded-xl text-white placeholder-slate-500 outline-none transition-all"
                           placeholder="••••••••">
                    <button type="button" @click="show = !show" class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300">
                        <svg x-show="!show" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        <svg x-show="show" x-cloak class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                    </button>
                </div>
            </div>

            <!-- Remember + Forgot -->
            <div class="flex items-center justify-between mb-6">
                <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="remember" value="1"
                           class="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0">
                    <span class="text-sm text-slate-400">Remember me</span>
                </label>
                <a href="<?= url('admin/forgot-password') ?>" class="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                    Forgot password?
                </a>
            </div>

            <!-- Submit -->
            <button type="submit" :disabled="loading"
                    class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3 px-4 rounded-xl transition-all btn-glow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <svg x-show="loading" class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                <span x-text="loading ? 'Signing in...' : 'Sign In'"></span>
            </button>
        </form>

        <!-- Footer -->
        <div class="mt-6 text-center">
            <p class="text-xs text-slate-500">
                Protected by CSRF & rate limiting<br>
                <span class="text-slate-600"><?= e(setting('site_name')) ?> &copy; <?= date('Y') ?></span>
            </p>
        </div>
    </div>
</body>
</html>
`
  },
  {
    path: 'app/views/admin/auth/forgot-password.php',
    name: 'forgot-password.php',
    language: 'php',
    category: 'auth',
    description: 'Forgot password page with email input',
    content: `<?php
declare(strict_types=1);
use App\\Core\\CSRF;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Forgot Password - <?= e(setting('site_name')) ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); }
        .glass-input { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); }
        .glass-input:focus { background: rgba(255,255,255,0.08); border-color: rgba(99,102,241,0.5); box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
        .gradient-bg { background: linear-gradient(135deg, #0f0c29 0%, #1a1a3e 25%, #24243e 50%, #141432 75%, #0f0c29 100%); }
        .floating-orb { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.3; animation: float 8s ease-in-out infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-30px) scale(1.05); } }
    </style>
</head>
<body class="gradient-bg min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
    <div class="floating-orb w-72 h-72 bg-indigo-600 top-10 -left-20"></div>
    <div class="floating-orb w-96 h-96 bg-purple-600 bottom-10 -right-20" style="animation-delay:2s"></div>

    <div class="glass rounded-2xl p-8 w-full max-w-md relative z-10">
        <div class="text-center mb-6">
            <div class="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl mb-4">
                <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
            </div>
            <h1 class="text-xl font-bold text-white">Forgot Password?</h1>
            <p class="text-slate-400 text-sm mt-1">Enter your email to receive a reset link</p>
        </div>

        <?php if (!empty(\$error)): ?>
        <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
            <span class="text-red-300 text-sm"><?= e(\$error) ?></span>
        </div>
        <?php endif; ?>

        <?php if (!empty(\$success)): ?>
        <div class="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
            <span class="text-green-300 text-sm"><?= e(\$success) ?></span>
        </div>
        <?php endif; ?>

        <form method="POST" action="<?= url('admin/forgot-password') ?>">
            <?= CSRF::field() ?>
            <div class="mb-4">
                <label for="email" class="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
                <input type="email" id="email" name="email" required
                       class="glass-input w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none transition-all"
                       placeholder="admin@khybersoft.com">
            </div>
            <button type="submit"
                    class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3 rounded-xl transition-all">
                Send Reset Link
            </button>
        </form>

        <div class="mt-4 text-center">
            <a href="<?= url('admin/login') ?>" class="text-sm text-indigo-400 hover:text-indigo-300">← Back to Login</a>
        </div>
    </div>
</body>
</html>
`
  },
  {
    path: 'app/views/admin/auth/reset-password.php',
    name: 'reset-password.php',
    language: 'php',
    category: 'auth',
    description: 'Reset password page with new password + confirmation',
    content: `<?php
declare(strict_types=1);
use App\\Core\\CSRF;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password - <?= e(setting('site_name')) ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <style>
        .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); }
        .glass-input { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); }
        .glass-input:focus { background: rgba(255,255,255,0.08); border-color: rgba(99,102,241,0.5); }
        .gradient-bg { background: linear-gradient(135deg, #0f0c29 0%, #1a1a3e 50%, #0f0c29 100%); }
        .floating-orb { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.3; }
    </style>
</head>
<body class="gradient-bg min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
    <div class="floating-orb w-72 h-72 bg-green-600 top-10 -left-20"></div>
    <div class="floating-orb w-96 h-96 bg-blue-600 bottom-10 -right-20"></div>

    <div class="glass rounded-2xl p-8 w-full max-w-md relative z-10" x-data="{ password: '', strength: 0 }">
        <div class="text-center mb-6">
            <div class="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mb-4">
                <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            </div>
            <h1 class="text-xl font-bold text-white">Set New Password</h1>
            <p class="text-slate-400 text-sm mt-1">Choose a strong password for your account</p>
        </div>

        <form method="POST" action="<?= url('admin/reset-password') ?>">
            <?= CSRF::field() ?>
            <input type="hidden" name="token" value="<?= \$token ?>">
            <input type="hidden" name="email" value="<?= \$email ?>">

            <div class="mb-4">
                <label class="block text-sm font-medium text-slate-300 mb-1.5">New Password</label>
                <input type="password" name="password" x-model="password"
                       @input="strength = password.length >= 12 ? 3 : (password.length >= 8 ? 2 : (password.length >= 6 ? 1 : 0))"
                       required minlength="8"
                       class="glass-input w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none"
                       placeholder="Minimum 8 characters">
                <!-- Strength meter -->
                <div class="flex gap-1 mt-2">
                    <div class="h-1 flex-1 rounded-full" :class="strength >= 1 ? 'bg-red-500' : 'bg-slate-700'"></div>
                    <div class="h-1 flex-1 rounded-full" :class="strength >= 2 ? 'bg-yellow-500' : 'bg-slate-700'"></div>
                    <div class="h-1 flex-1 rounded-full" :class="strength >= 3 ? 'bg-green-500' : 'bg-slate-700'"></div>
                </div>
            </div>

            <div class="mb-6">
                <label class="block text-sm font-medium text-slate-300 mb-1.5">Confirm Password</label>
                <input type="password" name="password_confirmation" required
                       class="glass-input w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none"
                       placeholder="Re-enter password">
            </div>

            <button type="submit"
                    class="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold py-3 rounded-xl transition-all">
                Reset Password
            </button>
        </form>
    </div>
</body>
</html>
`
  },
  {
    path: 'app/views/admin/auth/2fa-verify.php',
    name: '2fa-verify.php',
    language: 'php',
    category: 'auth',
    description: 'Two-factor authentication verification page',
    content: `<?php
declare(strict_types=1);
use App\\Core\\CSRF;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>2FA Verification - <?= e(setting('site_name')) ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); }
        .glass-input { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); }
        .glass-input:focus { background: rgba(255,255,255,0.08); border-color: rgba(99,102,241,0.5); }
        .gradient-bg { background: linear-gradient(135deg, #0f0c29 0%, #1a1a3e 50%, #0f0c29 100%); }
        .code-input { width: 48px; height: 56px; text-align: center; font-size: 1.5rem; font-weight: 700; }
    </style>
</head>
<body class="gradient-bg min-h-screen flex items-center justify-center p-4">
    <div class="glass rounded-2xl p-8 w-full max-w-md">
        <div class="text-center mb-6">
            <div class="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl mb-4">
                <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            </div>
            <h1 class="text-xl font-bold text-white">Two-Factor Authentication</h1>
            <p class="text-slate-400 text-sm mt-1">Enter the 6-digit code from your authenticator app</p>
        </div>

        <?php if (has_flash('error')): ?>
        <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
            <span class="text-red-300 text-sm"><?= e(get_flash('error')) ?></span>
        </div>
        <?php endif; ?>

        <form method="POST" action="<?= url('admin/2fa/verify') ?>">
            <?= CSRF::field() ?>
            <div class="flex justify-center gap-2 mb-6">
                <?php for (\$i = 0; \$i < 6; \$i++): ?>
                <input type="text" inputmode="numeric" maxlength="1" name="code_digits[]"
                       class="code-input glass-input rounded-xl text-white outline-none"
                       oninput="this.value=this.value.replace(/[^0-9]/g,''); if(this.value && this.nextElementSibling) this.nextElementSibling.focus()"
                       onkeydown="if(event.key==='Backspace'&&!this.value&&this.previousElementSibling) this.previousElementSibling.focus()"
                       autofocus="<?= \$i === 0 ? 'autofocus' : '' ?>">
                <?php endfor; ?>
            </div>
            <input type="hidden" name="code" id="code-combined">

            <button type="submit" onclick="document.getElementById('code-combined').value = Array.from(document.querySelectorAll('input[name=\\'code_digits[]\\']')).map(i=>i.value).join('')"
                    class="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-3 rounded-xl transition-all">
                Verify Code
            </button>
        </form>

        <div class="mt-4 text-center">
            <a href="<?= url('admin/login') ?>" class="text-sm text-slate-400 hover:text-slate-300">← Back to Login</a>
        </div>
    </div>
</body>
</html>
`
  },
  {
    path: 'app/views/admin/dashboard.php',
    name: 'dashboard.php',
    language: 'php',
    category: 'dashboard',
    description: 'Admin dashboard with stats cards, charts, tables, and system health',
    content: `<?php
declare(strict_types=1);
/**
 * Admin Dashboard View
 * Widgets: Stats, Recent Inquiries, Activity Log, Traffic Chart, Top Products, System Health
 */
?>

<!-- Page Header -->
<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
    <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p class="text-sm text-gray-500 dark:text-slate-400 mt-1">Welcome back, <?= e(\$user['name'] ?? 'Admin') ?>! Here's what's happening.</p>
    </div>
    <div class="mt-3 sm:mt-0 flex gap-2">
        <?php foreach (\$quickActions as \$action): ?>
        <a href="<?= e(\$action['url']) ?>"
           class="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
            <svg class="w-4 h-4 text-<?= \$action['color'] ?>-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            <?= e(\$action['label']) ?>
        </a>
        <?php endforeach; ?>
    </div>
</div>

<!-- Stats Cards -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <?php foreach (\$stats as \$key => \$stat): ?>
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 hover:shadow-lg transition-shadow">
        <div class="flex items-start justify-between">
            <div>
                <p class="text-sm font-medium text-gray-500 dark:text-slate-400"><?= e(\$stat['label']) ?></p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1"><?= number_format(\$stat['value']) ?></p>
                <p class="text-xs text-gray-500 dark:text-slate-500 mt-1">
                    <span class="font-medium text-<?= \$stat['color'] ?>-500">+<?= \$stat['change'] ?></span> <?= e(\$stat['change_label']) ?>
                </p>
            </div>
            <div class="w-10 h-10 rounded-lg bg-<?= \$stat['color'] ?>-100 dark:bg-<?= \$stat['color'] ?>-900/30 flex items-center justify-center">
                <svg class="w-5 h-5 text-<?= \$stat['color'] ?>-600 dark:text-<?= \$stat['color'] ?>-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <?php if (\$stat['icon'] === 'package'): ?>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                    <?php elseif (\$stat['icon'] === 'inbox'): ?>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                    <?php elseif (\$stat['icon'] === 'file-text'): ?>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    <?php else: ?>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                    <?php endif; ?>
                </svg>
            </div>
        </div>
        <!-- Mini Sparkline -->
        <div class="mt-3 h-8">
            <canvas id="sparkline-<?= \$key ?>" height="32"></canvas>
        </div>
    </div>
    <?php endforeach; ?>
</div>

<!-- Charts + Activity Row -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
    <!-- Traffic Chart -->
    <div class="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Traffic Overview</h2>
            <select class="text-sm bg-gray-100 dark:bg-slate-700 border-0 rounded-lg px-3 py-1.5 text-gray-600 dark:text-slate-300">
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
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Products</h2>
        <div class="space-y-3">
            <?php foreach (\$topProducts as \$i => \$product): ?>
            <div class="flex items-center gap-3">
                <span class="w-6 h-6 rounded-full bg-<?= ['blue','purple','green','orange','pink'][\$i % 5] ?>-100 dark:bg-<?= ['blue','purple','green','orange','pink'][\$i % 5] ?>-900/30 flex items-center justify-center text-xs font-bold text-<?= ['blue','purple','green','orange','pink'][\$i % 5] ?>-600 dark:text-<?= ['blue','purple','green','orange','pink'][\$i % 5] ?>-400"><?= \$i + 1 ?></span>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 dark:text-white truncate"><?= e(\$product['name']) ?></p>
                    <div class="flex items-center gap-2 mt-0.5">
                        <div class="flex-1 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div class="h-full bg-<?= ['blue','purple','green','orange','pink'][\$i % 5] ?>-500 rounded-full" style="width: <?= min(100, (\$product['inquiry_count'] / max(1, \$topProducts[0]['inquiry_count'] ?? 1)) * 100) ?>%"></div>
                        </div>
                        <span class="text-xs text-gray-500 dark:text-slate-400"><?= \$product['inquiry_count'] ?></span>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
            <?php if (empty(\$topProducts)): ?>
            <p class="text-sm text-gray-500 dark:text-slate-400 text-center py-4">No inquiry data yet</p>
            <?php endif; ?>
        </div>
    </div>
</div>

<!-- Recent Inquiries + Activity Row -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
    <!-- Recent Inquiries -->
    <div class="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div class="p-5 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Recent Inquiries</h2>
            <a href="<?= url('admin/inquiries') ?>" class="text-sm text-blue-600 dark:text-blue-400 hover:underline">View all →</a>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full">
                <thead class="bg-gray-50 dark:bg-slate-700/50">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Name</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Product</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Type</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Status</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Date</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-slate-700">
                    <?php foreach (\$recentInquiries as \$inquiry): ?>
                    <tr class="hover:bg-gray-50 dark:hover:bg-slate-700/30" x-data="{ status: '<?= e(\$inquiry['status']) ?>' }">
                        <td class="px-4 py-3">
                            <p class="text-sm font-medium text-gray-900 dark:text-white"><?= e(\$inquiry['name']) ?></p>
                            <p class="text-xs text-gray-500 dark:text-slate-400"><?= e(\$inquiry['email']) ?></p>
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-600 dark:text-slate-300"><?= e(\$inquiry['product_name'] ?? 'N/A') ?></td>
                        <td class="px-4 py-3">
                            <span class="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-<?= \$inquiry['type'] === 'demo' ? 'blue' : (\$inquiry['type'] === 'quote' ? 'purple' : 'green') ?>-100 dark:bg-<?= \$inquiry['type'] === 'demo' ? 'blue' : (\$inquiry['type'] === 'quote' ? 'purple' : 'green') ?>-900/30 text-<?= \$inquiry['type'] === 'demo' ? 'blue' : (\$inquiry['type'] === 'quote' ? 'purple' : 'green') ?>-700 dark:text-<?= \$inquiry['type'] === 'demo' ? 'blue' : (\$inquiry['type'] === 'quote' ? 'purple' : 'green') ?>-400">
                                <?= e(ucfirst(\$inquiry['type'])) ?>
                            </span>
                        </td>
                        <td class="px-4 py-3">
                            <select x-model="status" @change="updateStatus(<?= \$inquiry['id'] ?>, \\$event.target.value)"
                                    class="text-xs border-0 rounded-full px-2 py-1 font-medium bg-transparent text-gray-700 dark:text-slate-300 cursor-pointer">
                                <option value="new" :selected="status==='new'">🔵 New</option>
                                <option value="in_progress" :selected="status==='in_progress'">🟡 In Progress</option>
                                <option value="resolved" :selected="status==='resolved'">🟢 Resolved</option>
                                <option value="closed" :selected="status==='closed'">⚫ Closed</option>
                            </select>
                        </td>
                        <td class="px-4 py-3 text-xs text-gray-500 dark:text-slate-400"><?= date('M d, H:i', strtotime(\$inquiry['created_at'])) ?></td>
                    </tr>
                    <?php endforeach; ?>
                    <?php if (empty(\$recentInquiries)): ?>
                    <tr><td colspan="5" class="px-4 py-8 text-center text-sm text-gray-500 dark:text-slate-400">No inquiries yet</td></tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Activity Log -->
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div class="p-5 border-b border-gray-200 dark:border-slate-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Activity Log</h2>
        </div>
        <div class="divide-y divide-gray-200 dark:divide-slate-700 max-h-96 overflow-y-auto">
            <?php foreach (\$recentActivity as \$activity): ?>
            <div class="px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-full bg-<?= \$activity['action'] === 'login' ? 'green' : (\$activity['action'] === 'logout' ? 'gray' : 'blue') ?>-100 dark:bg-<?= \$activity['action'] === 'login' ? 'green' : (\$activity['action'] === 'logout' ? 'gray' : 'blue') ?>-900/30 flex items-center justify-center flex-shrink-0">
                        <span class="text-xs"><?= \$activity['action'] === 'login' ? '🔑' : (\$activity['action'] === 'logout' ? '🚪' : '📝') ?></span>
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="text-sm text-gray-900 dark:text-white truncate">
                            <span class="font-medium"><?= e(\$activity['user_name'] ?? 'System') ?></span>
                            <?= e(\$activity['description'] ?: \$activity['action']) ?>
                        </p>
                        <p class="text-xs text-gray-500 dark:text-slate-500 mt-0.5"><?= date('M d, H:i', strtotime(\$activity['created_at'])) ?></p>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
            <?php if (empty(\$recentActivity)): ?>
            <p class="text-sm text-gray-500 dark:text-slate-400 text-center py-4">No activity yet</p>
            <?php endif; ?>
        </div>
    </div>
</div>

<!-- System Health -->
<div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
    <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Health</h2>
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div class="text-center p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <p class="text-xs text-gray-500 dark:text-slate-400">PHP Version</p>
            <p class="text-sm font-bold text-gray-900 dark:text-white mt-1"><?= e(\$systemHealth['php_version']) ?></p>
        </div>
        <div class="text-center p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <p class="text-xs text-gray-500 dark:text-slate-400">Database Size</p>
            <p class="text-sm font-bold text-gray-900 dark:text-white mt-1"><?= e(\$systemHealth['db_size']) ?></p>
        </div>
        <div class="text-center p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <p class="text-xs text-gray-500 dark:text-slate-400">DB Tables</p>
            <p class="text-sm font-bold text-gray-900 dark:text-white mt-1"><?= \$systemHealth['db_tables'] ?></p>
        </div>
        <div class="text-center p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <p class="text-xs text-gray-500 dark:text-slate-400">Disk Free</p>
            <p class="text-sm font-bold text-gray-900 dark:text-white mt-1"><?= e(\$systemHealth['disk_free']) ?></p>
        </div>
        <div class="text-center p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <p class="text-xs text-gray-500 dark:text-slate-400">SSL</p>
            <p class="text-sm font-bold mt-1 <?= \$systemHealth['ssl'] === 'Active' ? 'text-green-600' : 'text-red-500' ?>"><?= e(\$systemHealth['ssl']) ?></p>
        </div>
        <div class="text-center p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <p class="text-xs text-gray-500 dark:text-slate-400">Memory Limit</p>
            <p class="text-sm font-bold text-gray-900 dark:text-white mt-1"><?= e(\$systemHealth['php_memory_limit']) ?></p>
        </div>
    </div>
    <!-- Extensions -->
    <div class="mt-4 flex flex-wrap gap-2">
        <?php foreach (\$systemHealth['extensions'] as \$ext => \$loaded): ?>
        <span class="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full <?= \$loaded ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' ?>">
            <?= \$loaded ? '✓' : '✕' ?> <?= e(\$ext) ?>
        </span>
        <?php endforeach; ?>
    </div>
</div>

<!-- Charts Script -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    // Traffic Chart
    const trafficCtx = document.getElementById('trafficChart');
    if (trafficCtx) {
        const trafficData = <?= json_encode(\$trafficData) ?>;
        new Chart(trafficCtx, {
            type: 'line',
            data: {
                labels: trafficData.map(d => d.date),
                datasets: [
                    {
                        label: 'Page Views',
                        data: trafficData.map(d => d.pageviews),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                    },
                    {
                        label: 'Visitors',
                        data: trafficData.map(d => d.visitors),
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: 'top', labels: { usePointStyle: true, padding: 20 } }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } },
                    y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.1)' } }
                },
                interaction: { intersect: false, mode: 'index' }
            }
        });
    }

    // Sparklines
    <?php foreach (\$stats as \$key => \$stat): ?>
    const sparkCtx<?= ucfirst(\$key) ?> = document.getElementById('sparkline-<?= \$key ?>');
    if (sparkCtx<?= ucfirst(\$key) ?>) {
        const sparkData = <?= json_encode(\$stat['sparkline']) ?>;
        const colors = { blue: '#3b82f6', green: '#10b981', purple: '#8b5cf6', orange: '#f59e0b' };
        new Chart(sparkCtx<?= ucfirst(\$key) ?>, {
            type: 'line',
            data: {
                labels: sparkData.map(d => d.date),
                datasets: [{
                    data: sparkData.map(d => d.value),
                    borderColor: colors['<?= \$stat['color'] ?>'] || '#3b82f6',
                    backgroundColor: (colors['<?= \$stat['color'] ?>'] || '#3b82f6') + '20',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    borderWidth: 2,
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

// Update inquiry status via AJAX
function updateStatus(id, status) {
    const token = document.querySelector('meta[name="csrf-token"]')?.content;
    fetch('<?= url("admin/inquiries/update-status") ?>', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ id, status, _token: token })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            // Show success toast
            console.log('Status updated');
        }
    })
    .catch(err => console.error('Update failed:', err));
}
</script>
`
  },
  {
    path: 'app/views/partials/sidebar-menu.php',
    name: 'sidebar-menu.php',
    language: 'php',
    category: 'layout',
    description: 'Sidebar navigation menu with grouped items and icons',
    content: `<?php
declare(strict_types=1);
/**
 * Sidebar Menu - Grouped navigation with icons (Heroicons SVG)
 */
\$currentPage = parse_url(\$_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?? '/admin';

\$menuGroups = [
    ['label' => '', 'items' => [
        ['label' => 'Dashboard', 'url' => url('admin'), 'icon' => 'home', 'match' => ['/admin', '/admin/']],
    ]],
    ['label' => 'Content', 'items' => [
        ['label' => 'Pages', 'url' => url('admin/pages'), 'icon' => 'document', 'match' => ['/admin/pages']],
        ['label' => 'Blog Posts', 'url' => url('admin/blog'), 'icon' => 'pencil', 'match' => ['/admin/blog']],
        ['label' => 'Categories', 'url' => url('admin/blog-categories'), 'icon' => 'folder', 'match' => ['/admin/blog-categories']],
        ['label' => 'Comments', 'url' => url('admin/comments'), 'icon' => 'chat', 'match' => ['/admin/comments']],
        ['label' => 'Media Library', 'url' => url('admin/media'), 'icon' => 'photo', 'match' => ['/admin/media']],
    ]],
    ['label' => 'Products', 'items' => [
        ['label' => 'Categories', 'url' => url('admin/product-categories'), 'icon' => 'tag', 'match' => ['/admin/product-categories']],
        ['label' => 'Products', 'url' => url('admin/products'), 'icon' => 'package', 'match' => ['/admin/products']],
        ['label' => 'Plans', 'url' => url('admin/plans'), 'icon' => 'credit-card', 'match' => ['/admin/plans']],
        ['label' => 'Demos', 'url' => url('admin/demos'), 'icon' => 'play', 'match' => ['/admin/demos']],
        ['label' => 'Inquiries', 'url' => url('admin/inquiries'), 'icon' => 'inbox', 'match' => ['/admin/inquiries']],
        ['label' => 'Tutorials', 'url' => url('admin/tutorials'), 'icon' => 'academic', 'match' => ['/admin/tutorials']],
        ['label' => 'Versions', 'url' => url('admin/versions'), 'icon' => 'download', 'match' => ['/admin/versions']],
    ]],
    ['label' => 'Services', 'items' => [
        ['label' => 'Services', 'url' => url('admin/services'), 'icon' => 'briefcase', 'match' => ['/admin/services']],
        ['label' => 'Inquiries', 'url' => url('admin/service-inquiries'), 'icon' => 'mail', 'match' => ['/admin/service-inquiries']],
        ['label' => 'Custom Requests', 'url' => url('admin/custom-requests'), 'icon' => 'code', 'match' => ['/admin/custom-requests']],
    ]],
    ['label' => 'Business', 'items' => [
        ['label' => 'Testimonials', 'url' => url('admin/testimonials'), 'icon' => 'star', 'match' => ['/admin/testimonials']],
        ['label' => 'Team', 'url' => url('admin/team'), 'icon' => 'user-group', 'match' => ['/admin/team']],
        ['label' => 'Clients', 'url' => url('admin/clients'), 'icon' => 'building', 'match' => ['/admin/clients']],
        ['label' => 'FAQs', 'url' => url('admin/faqs'), 'icon' => 'question', 'match' => ['/admin/faqs']],
        ['label' => 'Messages', 'url' => url('admin/messages'), 'icon' => 'envelope', 'match' => ['/admin/messages']],
        ['label' => 'Newsletter', 'url' => url('admin/newsletter'), 'icon' => 'megaphone', 'match' => ['/admin/newsletter']],
    ]],
    ['label' => 'Marketing', 'items' => [
        ['label' => 'SEO Manager', 'url' => url('admin/seo'), 'icon' => 'search', 'match' => ['/admin/seo']],
        ['label' => 'Redirects', 'url' => url('admin/redirects'), 'icon' => 'redirect', 'match' => ['/admin/redirects']],
        ['label' => 'Sitemap', 'url' => url('admin/sitemap'), 'icon' => 'map', 'match' => ['/admin/sitemap']],
    ]],
    ['label' => 'System', 'items' => [
        ['label' => 'Users', 'url' => url('admin/users'), 'icon' => 'users', 'match' => ['/admin/users']],
        ['label' => 'Roles', 'url' => url('admin/roles'), 'icon' => 'shield', 'match' => ['/admin/roles']],
        ['label' => 'Settings', 'url' => url('admin/settings'), 'icon' => 'cog', 'match' => ['/admin/settings']],
        ['label' => 'Activity Logs', 'url' => url('admin/activity'), 'icon' => 'clipboard', 'match' => ['/admin/activity']],
        ['label' => 'Backup', 'url' => url('admin/backup'), 'icon' => 'database', 'match' => ['/admin/backup']],
    ]],
];

// Icon SVGs (Heroicons outline)
\$icons = [
    'home' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>',
    'document' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>',
    'pencil' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>',
    'folder' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>',
    'chat' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>',
    'photo' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>',
    'tag' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 7h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2z"/>',
    'package' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>',
    'credit-card' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>',
    'play' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
    'inbox' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>',
    'academic' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 14l9-5-9-5-9 5 9 5z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>',
    'download' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>',
    'briefcase' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>',
    'mail' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>',
    'code' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>',
    'star' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>',
    'user-group' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>',
    'building' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>',
    'question' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
    'envelope' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>',
    'megaphone' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/>',
    'search' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>',
    'redirect' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 7l5 5m0 0l-5 5m5-5H6"/>',
    'map' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>',
    'users' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>',
    'shield' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>',
    'cog' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>',
    'clipboard' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>',
    'database' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/>',
];

function isActive(array \$matches): bool {
    global \$currentPage;
    foreach (\$matches as \$match) {
        if (\$currentPage === \$match || str_starts_with(\$currentPage, rtrim(\$match, '/') . '/')) {
            return true;
        }
    }
    return false;
}
?>

<?php foreach (\$menuGroups as \$group): ?>
    <?php if (!empty(\$group['label'])): ?>
    <div class="pt-4 pb-1" x-show="sidebarOpen" x-cloak>
        <p class="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"><?= e(\$group['label']) ?></p>
    </div>
    <?php endif; ?>

    <?php foreach (\$group['items'] as \$item): ?>
    <?php \$active = isActive(\$item['match']); ?>
    <a href="<?= e(\$item['url']) ?>"
       class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors <?= \$active ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200' ?>">
        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <?= \$icons[\$item['icon']] ?? \$icons['document'] ?>
        </svg>
        <span x-show="sidebarOpen" x-cloak class="truncate"><?= e(\$item['label']) ?></span>
    </a>
    <?php endforeach; ?>
<?php endforeach; ?>
`
  },
  {
    path: 'routes/admin.php',
    name: 'admin.php (routes)',
    language: 'php',
    category: 'routes',
    description: 'Admin route definitions with middleware groups',
    content: `<?php
declare(strict_types=1);

/**
 * Admin Routes
 */

use App\\Core\\Router;

// Auth routes (no admin middleware)
\$router->get('/admin/login', ['Admin\\AuthController', 'showLogin'], ['Guest']);
\$router->post('/admin/login', ['Admin\\AuthController', 'login'], ['Guest']);
\$router->get('/admin/logout', ['Admin\\AuthController', 'logout']);
\$router->get('/admin/forgot-password', ['Admin\\AuthController', 'showForgotPassword'], ['Guest']);
\$router->post('/admin/forgot-password', ['Admin\\AuthController', 'forgotPassword'], ['Guest']);
\$router->get('/admin/reset-password', ['Admin\\AuthController', 'showResetPassword'], ['Guest']);
\$router->post('/admin/reset-password', ['Admin\\AuthController', 'resetPassword'], ['Guest']);

// 2FA routes
\$router->get('/admin/2fa/verify', ['Admin\\AuthController', 'show2FAVerify']);
\$router->post('/admin/2fa/verify', ['Admin\\AuthController', 'verify2FA']);

// Protected admin routes
\$router->group('/admin', function(Router \$router) {
    // Dashboard
    \$router->get('/', ['Admin\\DashboardController', 'index'], ['AdminAuth']);
    \$router->post('/inquiries/update-status', ['Admin\\DashboardController', 'updateInquiryStatus'], ['AdminAuth']);

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

    // Inquiries
    \$router->get('/inquiries', ['Admin\\InquiryController', 'index'], ['AdminAuth']);
    \$router->get('/inquiries/{id}', ['Admin\\InquiryController', 'show'], ['AdminAuth']);
    \$router->post('/inquiries/{id}/status', ['Admin\\InquiryController', 'updateStatus'], ['AdminAuth']);

    // Messages
    \$router->get('/messages', ['Admin\\MessageController', 'index'], ['AdminAuth']);
    \$router->get('/messages/{id}', ['Admin\\MessageController', 'show'], ['AdminAuth']);

    // Pages
    \$router->get('/pages', ['Admin\\PageController', 'index'], ['AdminAuth']);
    \$router->get('/pages/create', ['Admin\\PageController', 'create'], ['AdminAuth']);
    \$router->post('/pages', ['Admin\\PageController', 'store'], ['AdminAuth']);
    \$router->get('/pages/{id}/edit', ['Admin\\PageController', 'edit'], ['AdminAuth']);
    \$router->post('/pages/{id}', ['Admin\\PageController', 'update'], ['AdminAuth']);
    \$router->post('/pages/{id}/delete', ['Admin\\PageController', 'destroy'], ['AdminAuth']);
}, ['AdminAuth']);
`
  },
  {
    path: 'app/helpers/admin-helpers.php',
    name: 'admin-helpers.php',
    language: 'php',
    category: 'helpers',
    description: 'Admin-specific helper functions',
    content: `<?php
declare(strict_types=1);

/**
 * Admin Helper Functions
 */

/**
 * Check if current admin page is active
 */
function admin_active(string ...\$paths): string
{
    \$current = parse_url(\$_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?? '/admin';
    foreach (\$paths as \$path) {
        if (\$current === \$path || str_starts_with(\$current, rtrim(\$path, '/') . '/')) {
            return 'bg-blue-600/20 text-blue-400';
        }
    }
    return 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200';
}

/**
 * Generate admin breadcrumb HTML
 */
function admin_breadcrumbs(array \$items): string
{
    \$html = '<nav class="flex items-center gap-2 text-sm">';
    \$html .= '<a href="' . url('admin') . '" class="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white">';
    \$html .= '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>';
    \$html .= '</a>';

    foreach (\$items as \$i => \$item) {
        \$html .= '<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>';
        if (\$i < count(\$items) - 1) {
            \$html .= '<a href="' . e(\$item['url'] ?? '#') . '" class="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white">' . e(\$item['label']) . '</a>';
        } else {
            \$html .= '<span class="text-gray-900 dark:text-white font-medium">' . e(\$item['label']) . '</span>';
        }
    }

    \$html .= '</nav>';
    return \$html;
}

/**
 * Format status badge
 */
function status_badge(string \$status): string
{
    \$colors = [
        'new' => 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        'active' => 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        'published' => 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        'draft' => 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
        'in_progress' => 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        'resolved' => 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        'closed' => 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
        'pending' => 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        'approved' => 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        'spam' => 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        'banned' => 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        'inactive' => 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    ];

    \$class = \$colors[\$status] ?? 'bg-gray-100 text-gray-700';
    return '<span class="inline-flex px-2 py-0.5 text-xs font-medium rounded-full ' . \$class . '">' . e(ucfirst(str_replace('_', ' ', \$status))) . '</span>';
}

/**
 * Generate admin table action buttons
 */
function admin_actions(string \$editUrl, string \$deleteUrl, string \$deleteId = ''): string
{
    \$token = htmlspecialchars(\\App\\Core\\CSRF::token(), ENT_QUOTES, 'UTF-8');
    return '
    <div class="flex items-center gap-1">
        <a href="' . e(\$editUrl) . '" class="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Edit">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
        </a>
        <form method="POST" action="' . e(\$deleteUrl) . '" onsubmit="return confirm(\\'Are you sure you want to delete this item?\\')">
            <input type="hidden" name="_token" value="' . \$token . '">
            <button type="submit" class="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
        </form>
    </div>';
}

/**
 * Generate admin pagination
 */
function admin_pagination(array \$data, string \$baseUrl): string
{
    if (\$data['last_page'] <= 1) return '';

    \$html = '<div class="flex items-center justify-between mt-4">';
    \$html .= '<p class="text-sm text-gray-500 dark:text-slate-400">Showing ' . \$data['from'] . ' to ' . \$data['to'] . ' of ' . \$data['total'] . ' results</p>';
    \$html .= '<div class="flex items-center gap-1">';

    if (\$data['current_page'] > 1) {
        \$html .= '<a href="' . \$baseUrl . '?page=' . (\$data['current_page'] - 1) . '" class="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">←</a>';
    }

    for (\$i = max(1, \$data['current_page'] - 2); \$i <= min(\$data['last_page'], \$data['current_page'] + 2); \$i++) {
        if (\$i === \$data['current_page']) {
            \$html .= '<span class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg">' . \$i . '</span>';
        } else {
            \$html .= '<a href="' . \$baseUrl . '?page=' . \$i . '" class="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">' . \$i . '</a>';
        }
    }

    if (\$data['current_page'] < \$data['last_page']) {
        \$html .= '<a href="' . \$baseUrl . '?page=' . (\$data['current_page'] + 1) . '" class="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">→</a>';
    }

    \$html .= '</div></div>';
    return \$html;
}
`
  },
];
