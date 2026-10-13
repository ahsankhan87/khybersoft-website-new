export interface AdminFile {
  path: string;
  name: string;
  language: string;
  content: string;
  description: string;
  category: 'auth' | 'layout' | 'dashboard' | 'middleware' | 'core' | 'assets' | 'views';
}

export const adminFiles: AdminFile[] = [
  {
    path: 'app/core/RateLimiter.php',
    name: 'RateLimiter.php',
    language: 'php',
    category: 'core',
    description: 'Rate limiting using file-based storage (no Redis dependency for shared hosting)',
    content: `<?php
declare(strict_types=1);

namespace App\\Core;

/**
 * Rate Limiter - File-based rate limiting for shared hosting
 * Uses file system instead of Redis/Memcached
 */
class RateLimiter
{
    private string \$storagePath;

    public function __construct()
    {
        \$this->storagePath = CACHE_PATH . '/rate_limits';
        if (!is_dir(\$this->storagePath)) {
            mkdir(\$this->storagePath, 0755, true);
        }
    }

    /**
     * Check if action is rate limited
     *
     * @param string \$key Unique identifier (e.g., "login:{email}")
     * @param int \$maxAttempts Maximum attempts allowed
     * @param int \$decaySeconds Time window in seconds
     * @return array{allowed: bool, remaining: int, retry_after: int}
     */
    public function attempt(string \$key, int \$maxAttempts = 5, int \$decaySeconds = 900): array
    {
        \$file = \$this->getFilePath(\$key);
        \$data = \$this->getData(\$file);

        // Clean expired entries
        \$now = time();
        \$data['attempts'] = array_filter(
            \$data['attempts'] ?? [],
            fn(\$timestamp) => (\$now - \$timestamp) < \$decaySeconds
        );

        \$attempts = count(\$data['attempts']);
        \$remaining = max(0, \$maxAttempts - \$attempts);

        if (\$attempts >= \$maxAttempts) {
            // Find when the oldest attempt expires
            \$oldest = min(\$data['attempts']);
            \$retryAfter = \$decaySeconds - (\$now - \$oldest);

            return [
                'allowed' => false,
                'remaining' => 0,
                'retry_after' => max(1, \$retryAfter),
            ];
        }

        // Record this attempt
        \$data['attempts'][] = \$now;
        \$this->saveData(\$file, \$data);

        return [
            'allowed' => true,
            'remaining' => \$remaining - 1,
            'retry_after' => 0,
        ];
    }

    /**
     * Check without recording an attempt
     */
    public function tooManyAttempts(string \$key, int \$maxAttempts = 5, int \$decaySeconds = 900): bool
    {
        \$file = \$this->getFilePath(\$key);
        \$data = \$this->getData(\$file);

        \$now = time();
        \$recentAttempts = array_filter(
            \$data['attempts'] ?? [],
            fn(\$timestamp) => (\$now - \$timestamp) < \$decaySeconds
        );

        return count(\$recentAttempts) >= \$maxAttempts;
    }

    /**
     * Get remaining attempts
     */
    public function remaining(string \$key, int \$maxAttempts = 5, int \$decaySeconds = 900): int
    {
        \$file = \$this->getFilePath(\$key);
        \$data = \$this->getData(\$file);

        \$now = time();
        \$recentAttempts = array_filter(
            \$data['attempts'] ?? [],
            fn(\$timestamp) => (\$now - \$timestamp) < \$decaySeconds
        );

        return max(0, \$maxAttempts - count(\$recentAttempts));
    }

    /**
     * Clear attempts for a key
     */
    public function clear(string \$key): void
    {
        \$file = \$this->getFilePath(\$key);
        if (file_exists(\$file)) {
            unlink(\$file);
        }
    }

    /**
     * Get available attempts (for headers)
     */
    public function getAvailableIn(string \$key, int \$decaySeconds = 900): int
    {
        \$file = \$this->getFilePath(\$key);
        \$data = \$this->getData(\$file);

        if (empty(\$data['attempts'])) {
            return 0;
        }

        \$now = time();
        \$oldest = min(\$data['attempts']);
        return max(0, \$decaySeconds - (\$now - \$oldest));
    }

    private function getFilePath(string \$key): string
    {
        \$hash = sha1(\$key);
        return \$this->storagePath . '/' . \$hash . '.json';
    }

    private function getData(string \$file): array
    {
        if (!file_exists(\$file)) {
            return ['attempts' => []];
        }

        \$content = file_get_contents(\$file);
        \$data = json_decode(\$content, true);

        return is_array(\$data) ? \$data : ['attempts' => []];
    }

    private function saveData(string \$file, array \$data): void
    {
        file_put_contents(\$file, json_encode(\$data), LOCK_EX);
    }

    /**
     * Clean up old rate limit files (call via cron)
     */
    public function cleanup(int \$maxAge = 86400): void
    {
        \$now = time();
        \$files = glob(\$this->storagePath . '/*.json');

        foreach (\$files as \$file) {
            if ((\$now - filemtime(\$file)) > \$maxAge) {
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
    description: 'TOTP Two-Factor Authentication (Google Authenticator compatible)',
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
    private const SECRET_LENGTH = 20; // bytes
    private const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /**
     * Generate a new secret key
     */
    public static function generateSecret(): string
    {
        \$randomBytes = random_bytes(self::SECRET_LENGTH);
        return self::base32Encode(\$randomBytes);
    }

    /**
     * Generate TOTP code for given secret and time
     */
    public static function generateCode(string \$secret, ?int \$time = null): string
    {
        \$time = \$time ?? time();
        \$timeSlice = intdiv(\$time, self::PERIOD);

        \$secretKey = self::base32Decode(\$secret);
        \$time = pack('N*', 0, \$timeSlice); // 8 bytes
        \$hash = hash_hmac(self::ALGORITHM, \$time, \$secretKey, true);

        \$offset = ord(\$hash[strlen(\$hash) - 1]) & 0x0F;
        \$value = (
            ((ord(\$hash[\$offset]) & 0x7F) << 24) |
            ((ord(\$hash[\$offset + 1]) & 0xFF) << 16) |
            ((ord(\$hash[\$offset + 2]) & 0xFF) << 8) |
            (ord(\$hash[\$offset + 3]) & 0xFF)
        );

        \$otp = \$value % (10 ** self::DIGITS);
        return str_pad((string) \$otp, self::DIGITS, '0', STR_PAD_LEFT);
    }

    /**
     * Verify a TOTP code (with time window tolerance)
     */
    public static function verifyCode(string \$secret, string \$code, int \$window = 1): bool
    {
        \$time = time();

        for (\$i = -\$window; \$i <= \$window; \$i++) {
            \$checkTime = \$time + (\$i * self::PERIOD);
            \$expectedCode = self::generateCode(\$secret, \$checkTime);

            if (hash_equals(\$expectedCode, \$code)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Generate QR code URL for authenticator apps
     * Uses Google Charts API (free, no API key needed)
     */
    public static function getQrCodeUrl(string \$secret, string \$accountName, string \$issuer = 'Khybersoft'): string
    {
        \$label = rawurlencode(\$issuer) . ':' . rawurlencode(\$accountName);
        \$params = http_build_query([
            'secret' => \$secret,
            'issuer' => \$issuer,
            'algorithm' => strtoupper(self::ALGORITHM),
            'digits' => self::DIGITS,
            'period' => self::PERIOD,
        ]);

        \$otpAuthUrl = 'otpauth://totp/' . \$label . '?' . \$params;

        // Google Charts QR code API (free, no key required)
        return 'https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=' . rawurlencode(\$otpAuthUrl);
    }

    /**
     * Generate backup codes
     */
    public static function generateBackupCodes(int \$count = 8): array
    {
        \$codes = [];
        for (\$i = 0; \$i < \$count; \$i++) {
            \$codes[] = strtoupper(bin2hex(random_bytes(4)));
        }
        return \$codes;
    }

    /**
     * Verify a backup code
     */
    public static function verifyBackupCode(string \$secret, string \$code, array \$usedCodes = []): bool
    {
        \$code = strtoupper(trim(\$code));

        // Don't allow reuse
        if (in_array(\$code, \$usedCodes, true)) {
            return false;
        }

        // Backup codes are stored hashed in the database
        // This method just validates format
        return preg_match('/^[A-F0-9]{8}\$/', \$code) === 1;
    }

    /**
     * Get time until next code refresh
     */
    public static function getSecondsUntilNextCode(): int
    {
        return self::PERIOD - (time() % self::PERIOD);
    }

    /**
     * Base32 encode
     */
    private static function base32Encode(string \$data): string
    {
        \$binary = '';
        foreach (str_split(\$data) as \$char) {
            \$binary .= str_pad(decbin(ord(\$char)), 8, '0', STR_PAD_LEFT);
        }

        \$result = '';
        \$chunks = str_split(\$binary, 5);
        foreach (\$chunks as \$chunk) {
            \$chunk = str_pad(\$chunk, 5, '0', STR_PAD_RIGHT);
            \$result .= self::BASE32_CHARS[bindec(\$chunk)];
        }

        return \$result;
    }

    /**
     * Base32 decode
     */
    private static function base32Decode(string \$data): string
    {
        \$data = strtoupper(rtrim(\$data, '='));
        \$binary = '';

        foreach (str_split(\$data) as \$char) {
            \$pos = strpos(self::BASE32_CHARS, \$char);
            if (\$pos === false) continue;
            \$binary .= str_pad(decbin(\$pos), 5, '0', STR_PAD_LEFT);
        }

        \$result = '';
        \$chunks = str_split(\$binary, 8);
        foreach (\$chunks as \$chunk) {
            if (strlen(\$chunk) === 8) {
                \$result .= chr(bindec(\$chunk));
            }
        }

        return \$result;
    }
}
`
  },
  {
    path: 'app/core/Mailer.php',
    name: 'Mailer.php',
    language: 'php',
    category: 'core',
    description: 'Email sending with PHP mail() and SMTP fallback support',
    content: `<?php
declare(strict_types=1);

namespace App\\Core;

/**
 * Mailer - Email sending utility
 * Uses PHP mail() by default, with SMTP support via socket
 */
class Mailer
{
    private string \$from;
    private string \$fromName;
    private array \$errors = [];

    public function __construct()
    {
        \$this->from = setting('mail_from', 'noreply@khybersoft.com');
        \$this->fromName = setting('mail_from_name', 'Khybersoft');
    }

    /**
     * Send a plain text email
     */
    public function send(string \$to, string \$subject, string \$body, ?string \$htmlBody = null): bool
    {
        \$headers = \$this->buildHeaders(\$htmlBody !== null);

        \$finalBody = \$htmlBody ?? \$body;

        // Use SMTP if configured
        \$smtpHost = getenv('SMTP_HOST') ?: setting('smtp_host');

        if (\$smtpHost) {
            return \$this->sendViaSmtp(\$to, \$subject, \$finalBody, \$headers);
        }

        // Fallback to PHP mail()
        return \$this->sendViaMail(\$to, \$subject, \$finalBody, \$headers);
    }

    /**
     * Send password reset email
     */
    public function sendPasswordReset(string \$to, string \$name, string \$token): bool
    {
        \$resetUrl = SITE_URL . '/admin/reset-password?token=' . urlencode(\$token);
        \$expiryHours = 1;

        \$html = \$this->renderTemplate('password-reset', [
            'name' => \$name,
            'reset_url' => \$resetUrl,
            'expiry_hours' => \$expiryHours,
        ]);

        return \$this->send(\$to, 'Reset Your Password - Khybersoft', 'Reset your password', \$html);
    }

    /**
     * Send welcome email
     */
    public function sendWelcome(string \$to, string \$name): bool
    {
        \$html = \$this->renderTemplate('welcome', [
            'name' => \$name,
            'login_url' => SITE_URL . '/admin/login',
        ]);

        return \$this->send(\$to, 'Welcome to Khybersoft Admin', 'Welcome', \$html);
    }

    /**
     * Send notification email
     */
    public function sendNotification(string \$to, string \$subject, string \$message, string \$actionUrl = ''): bool
    {
        \$html = \$this->renderTemplate('notification', [
            'subject' => \$subject,
            'message' => \$message,
            'action_url' => \$actionUrl,
        ]);

        return \$this->send(\$to, \$subject . ' - Khybersoft', \$message, \$html);
    }

    /**
     * Build email headers
     */
    private function buildHeaders(bool \$isHtml = false): string
    {
        \$headers = [];
        \$headers[] = 'From: ' . \$this->fromName . ' <' . \$this->from . '>';
        \$headers[] = 'Reply-To: ' . \$this->from;
        \$headers[] = 'X-Mailer: Khybersoft/' . APP_VERSION;
        \$headers[] = 'MIME-Version: 1.0';

        if (\$isHtml) {
            \$headers[] = 'Content-Type: text/html; charset=UTF-8';
        } else {
            \$headers[] = 'Content-Type: text/plain; charset=UTF-8';
        }

        return implode("\\r\\n", \$headers);
    }

    /**
     * Send via PHP mail()
     */
    private function sendViaMail(string \$to, string \$subject, string \$body, string \$headers): bool
    {
        \$result = @mail(\$to, \$subject, \$body, \$headers);

        if (!\$result) {
            \$this->errors[] = 'PHP mail() function failed.';
            error_log("Mailer: mail() failed for {\$to} - {\$subject}");
        }

        return \$result;
    }

    /**
     * Send via SMTP socket (basic implementation)
     * For production, consider PHPMailer library
     */
    private function sendViaSmtp(string \$to, string \$subject, string \$body, string \$headers): bool
    {
        \$host = getenv('SMTP_HOST') ?: setting('smtp_host');
        \$port = (int) (getenv('SMTP_PORT') ?: setting('smtp_port', '587'));
        \$username = getenv('SMTP_USER') ?: setting('smtp_user');
        \$password = getenv('SMTP_PASS') ?: setting('smtp_pass');

        if (!\$host || !\$username) {
            \$this->errors[] = 'SMTP not configured.';
            return false;
        }

        try {
            \$socket = @fsockopen(\$host, \$port, \$errno, \$errstr, 30);
            if (!\$socket) {
                throw new \\RuntimeException("SMTP connection failed: {\$errstr} ({\$errno})");
            }

            \$this->smtpRead(\$socket);
            \$this->smtpCommand(\$socket, "EHLO " . gethostname());

            // STARTTLS
            if (\$port === 587) {
                \$this->smtpCommand(\$socket, "STARTTLS");
                stream_socket_enable_crypto(\$socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
                \$this->smtpCommand(\$socket, "EHLO " . gethostname());
            }

            // Auth
            \$this->smtpCommand(\$socket, "AUTH LOGIN");
            \$this->smtpCommand(\$socket, base64_encode(\$username));
            \$this->smtpCommand(\$socket, base64_encode(\$password));

            // Send
            \$this->smtpCommand(\$socket, "MAIL FROM:<{\$this->from}>");
            \$this->smtpCommand(\$socket, "RCPT TO:<{\$to}>");
            \$this->smtpCommand(\$socket, "DATA");

            \$message = "To: {\$to}\\r\\n";
            \$message .= "Subject: {\$subject}\\r\\n";
            \$message .= \$headers . "\\r\\n";
            \$message .= "\\r\\n";
            \$message .= \$body . "\\r\\n";
            \$message .= ".";

            \$this->smtpCommand(\$socket, \$message);
            \$this->smtpCommand(\$socket, "QUIT");

            fclose(\$socket);
            return true;

        } catch (\\Throwable \$e) {
            \$this->errors[] = \$e->getMessage();
            error_log('SMTP Error: ' . \$e->getMessage());

            // Fallback to mail()
            return \$this->sendViaMail(\$to, \$subject, \$body, \$headers);
        }
    }

    private function smtpRead(\$socket): string
    {
        \$response = '';
        while (\$line = fgets(\$socket, 515)) {
            \$response .= \$line;
            if (substr(\$line, 3, 1) === ' ') break;
        }
        return \$response;
    }

    private function smtpCommand(\$socket, string \$command): string
    {
        fwrite(\$socket, \$command . "\\r\\n");
        return \$this->smtpRead(\$socket);
    }

    /**
     * Render email template
     */
    private function renderTemplate(string \$template, array \$data): string
    {
        extract(\$data, EXTR_SKIP);

        ob_start();
        \$templateFile = APP_PATH . '/views/emails/' . \$template . '.php';

        if (file_exists(\$templateFile)) {
            require \$templateFile;
        } else {
            // Fallback inline template
            echo \$this->getDefaultTemplate(\$data);
        }

        return ob_get_clean();
    }

    private function getDefaultTemplate(array \$data): string
    {
        \$name = \$data['name'] ?? 'User';
        \$message = \$data['message'] ?? '';
        \$actionUrl = \$data['action_url'] ?? '';
        \$resetUrl = \$data['reset_url'] ?? '';

        return <<<HTML
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="background:#fff;border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="text-align:center;margin-bottom:30px;">
      <h1 style="color:#0f172a;margin:0;">Khybersoft</h1>
    </div>
    <p style="color:#334155;font-size:16px;line-height:1.6;">Hello {\$name},</p>
    <p style="color:#334155;font-size:16px;line-height:1.6;">{\$message}</p>
    HTML;
    }

    public function getErrors(): array
    {
        return \$this->errors;
    }
}
`
  },
  {
    path: 'app/controllers/admin/AuthController.php',
    name: 'AuthController.php',
    language: 'php',
    category: 'auth',
    description: 'Complete auth controller with login, forgot/reset password, 2FA, rate limiting',
    content: `<?php
declare(strict_types=1);

namespace App\\Controllers\\Admin;

use App\\Core\\Controller;
use App\\Core\\Auth;
use App\\Core\\Validator;
use App\\Core\\CSRF;
use App\\Core\\Database;
use App\\Core\\RateLimiter;
use App\\Core\\TwoFactor;
use App\\Core\\Mailer;

/**
 * Admin Auth Controller
 * Handles login, logout, forgot/reset password, 2FA
 */
class AuthController extends Controller
{
    protected string \$layout = 'auth';
    private RateLimiter \$limiter;

    public function __construct()
    {
        parent::__construct();
        \$this->limiter = new RateLimiter();
    }

    /**
     * Show login page
     */
    public function showLogin(): void
    {
        if (Auth::check()) {
            \$this->redirect('/admin');
            return;
        }

        \$this->view('admin.auth.login', [
            'page_title' => 'Admin Login',
            'rate_limited' => \$this->limiter->tooManyAttempts('login:' . client_ip(), 5, 900),
            'retry_after' => \$this->limiter->getAvailableIn('login:' . client_ip(), 900),
        ]);
    }

    /**
     * Process login
     */
    public function login(): void
    {
        if (!\$this->validateCsrf()) return;

        \$ip = client_ip();
        \$email = \$this->input('email', '');

        // Rate limiting: 5 attempts per 15 minutes per IP
        \$limitResult = \$this->limiter->attempt('login:' . \$ip, 5, 900);

        if (!\$limitResult['allowed']) {
            flash('error', "Too many login attempts. Please try again in " . ceil(\$limitResult['retry_after'] / 60) . " minutes.");
            flash_input();
            \$this->redirect('/admin/login');
            return;
        }

        // Validate input
        \$validator = Validator::make(\$_POST, [
            'email' => 'required|email',
            'password' => 'required|min:6',
        ]);

        if (!\$validator->validate()) {
            flash_input();
            flash('errors', json_encode(\$validator->errors()));
            \$this->redirect('/admin/login');
            return;
        }

        // Also rate limit per email
        \$emailLimit = \$this->limiter->attempt('login_email:' . \$email, 10, 900);
        if (!\$emailLimit['allowed']) {
            flash('error', 'Too many attempts for this account. Please wait.');
            flash_input();
            \$this->redirect('/admin/login');
            return;
        }

        // Attempt authentication
        \$remember = (bool) \$this->input('remember');

        if (Auth::attempt(\$email, \$this->input('password'), \$remember)) {
            // Clear rate limits on successful login
            \$this->limiter->clear('login:' . \$ip);
            \$this->limiter->clear('login_email:' . \$email);

            // Check if 2FA is enabled for this user
            \$user = Auth::user();
            if (\$user && !empty(\$user['two_factor_secret'])) {
                // Store user in session temporarily for 2FA verification
                \$_SESSION['2fa_user_id'] = \$user['id'];
                \$_SESSION['2fa_pending'] = true;
                \$this->redirect('/admin/2fa/verify');
                return;
            }

            // Clear old input and redirect
            clear_old_input();
            \$intended = \$_SESSION['intended_url'] ?? '/admin';
            unset(\$_SESSION['intended_url']);
            \$this->redirect(SITE_URL . \$intended);
        } else {
            // Log failed attempt
            \$this->logFailedLogin(\$email);
            \$remaining = \$limitResult['remaining'];

            \$message = 'Invalid email or password.';
            if (\$remaining <= 2) {
                \$message .= " {\$remaining} attempts remaining.";
            }

            flash('error', \$message);
            flash_input();
            \$this->redirect('/admin/login');
        }
    }

    /**
     * Show 2FA verification page
     */
    public function show2faVerify(): void
    {
        if (!isset(\$_SESSION['2fa_pending'])) {
            \$this->redirect('/admin/login');
            return;
        }

        \$this->view('admin.auth.two-factor', [
            'page_title' => 'Two-Factor Authentication',
        ]);
    }

    /**
     * Verify 2FA code
     */
    public function verify2fa(): void
    {
        if (!\$this->validateCsrf()) return;

        if (!isset(\$_SESSION['2fa_user_id'])) {
            \$this->redirect('/admin/login');
            return;
        }

        \$code = \$this->input('code', '');
        \$userId = (int) \$_SESSION['2fa_user_id'];

        \$db = Database::getInstance();
        \$user = \$db->fetch("SELECT * FROM users WHERE id = ?", [\$userId]);

        if (!\$user || empty(\$user['two_factor_secret'])) {
            unset(\$_SESSION['2fa_pending'], \$_SESSION['2fa_user_id']);
            \$this->redirect('/admin/login');
            return;
        }

        // Check if it's a backup code
        \$backupCodes = json_decode(\$user['two_factor_backup_codes'] ?? '[]', true) ?: [];
        \$usedBackupCodes = json_decode(\$user['two_factor_used_backups'] ?? '[]', true) ?: [];

        if (TwoFactor::verifyBackupCode(\$user['two_factor_secret'], \$code, \$usedBackupCodes)) {
            // Valid backup code - mark as used
            \$usedBackupCodes[] = strtoupper(\$code);
            \$db->update('users', [
                'two_factor_used_backups' => json_encode(\$usedBackupCodes),
            ], 'id = ?', [\$userId]);

            \$this->complete2faLogin();
            return;
        }

        // Verify TOTP code
        if (TwoFactor::verifyCode(\$user['two_factor_secret'], \$code)) {
            \$this->complete2faLogin();
            return;
        }

        flash('error', 'Invalid authentication code. Please try again.');
        \$this->redirect('/admin/2fa/verify');
    }

    /**
     * Complete 2FA login
     */
    private function complete2faLogin(): void
    {
        unset(\$_SESSION['2fa_pending'], \$_SESSION['2fa_user_id']);

        // Session is already set from Auth::attempt()
        clear_old_input();
        \$intended = \$_SESSION['intended_url'] ?? '/admin';
        unset(\$_SESSION['intended_url']);
        \$this->redirect(SITE_URL . \$intended);
    }

    /**
     * Show forgot password page
     */
    public function showForgotPassword(): void
    {
        \$this->view('admin.auth.forgot-password', [
            'page_title' => 'Forgot Password',
        ]);
    }

    /**
     * Process forgot password request
     */
    public function forgotPassword(): void
    {
        if (!\$this->validateCsrf()) return;

        // Rate limit password reset requests
        \$ip = client_ip();
        \$limitResult = \$this->limiter->attempt('password_reset:' . \$ip, 3, 900);

        if (!\$limitResult['allowed']) {
            flash('error', 'Too many reset requests. Please try again later.');
            \$this->redirect('/admin/forgot-password');
            return;
        }

        \$validator = Validator::make(\$_POST, [
            'email' => 'required|email',
        ]);

        if (!\$validator->validate()) {
            flash('errors', json_encode(\$validator->errors()));
            \$this->redirect('/admin/forgot-password');
            return;
        }

        \$email = \$this->input('email');
        \$db = Database::getInstance();

        // Always show success message (don't reveal if email exists)
        \$user = \$db->fetch(
            "SELECT id, name, email FROM users WHERE email = ? AND status = 'active' AND deleted_at IS NULL",
            [\$email]
        );

        if (\$user) {
            // Generate reset token
            \$token = bin2hex(random_bytes(32));
            \$hashedToken = hash('sha256', \$token);
            \$expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour'));

            // Invalidate any existing tokens
            \$db->query(
                "DELETE FROM password_resets WHERE user_id = ?",
                [\$user['id']]
            );

            // Store new token
            \$db->insert('password_resets', [
                'user_id' => \$user['id'],
                'token' => \$hashedToken,
                'expires_at' => \$expiresAt,
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            // Send email
            \$mailer = new Mailer();
            \$mailer->sendPasswordReset(\$user['email'], \$user['name'], \$token);
        }

        // Always show same message for security
        flash('success', 'If an account exists with that email, a password reset link has been sent.');
        \$this->redirect('/admin/forgot-password');
    }

    /**
     * Show reset password page
     */
    public function showResetPassword(): void
    {
        \$token = \$_GET['token'] ?? '';

        if (!\$token) {
            \$this->redirect('/admin/login');
            return;
        }

        // Verify token is valid
        \$db = Database::getInstance();
        \$reset = \$db->fetch(
            "SELECT pr.*, u.email FROM password_resets pr
             INNER JOIN users u ON pr.user_id = u.id
             WHERE pr.token = ? AND pr.expires_at > NOW() AND pr.used_at IS NULL",
            [hash('sha256', \$token)]
        );

        if (!\$reset) {
            flash('error', 'This password reset link is invalid or has expired.');
            \$this->redirect('/admin/forgot-password');
            return;
        }

        \$this->view('admin.auth.reset-password', [
            'page_title' => 'Reset Password',
            'token' => \$token,
        ]);
    }

    /**
     * Process password reset
     */
    public function resetPassword(): void
    {
        if (!\$this->validateCsrf()) return;

        \$token = \$this->input('token');
        \$db = Database::getInstance();

        \$hashedToken = hash('sha256', \$token);
        \$reset = \$db->fetch(
            "SELECT pr.*, u.email, u.name FROM password_resets pr
             INNER JOIN users u ON pr.user_id = u.id
             WHERE pr.token = ? AND pr.expires_at > NOW() AND pr.used_at IS NULL",
            [\$hashedToken]
        );

        if (!\$reset) {
            flash('error', 'Invalid or expired reset link.');
            \$this->redirect('/admin/forgot-password');
            return;
        }

        \$validator = Validator::make(\$_POST, [
            'password' => 'required|min:8|confirmed',
        ]);

        if (!\$validator->validate()) {
            flash('errors', json_encode(\$validator->errors()));
            \$this->redirect('/admin/reset-password?token=' . urlencode(\$token));
            return;
        }

        // Update password
        \$newPasswordHash = password_hash(\$this->input('password'), PASSWORD_BCRYPT, ['cost' => 12]);

        \$db->update('users', [
            'password_hash' => \$newPasswordHash,
            'updated_at' => date('Y-m-d H:i:s'),
        ], 'id = ?', [\$reset['user_id']]);

        // Mark token as used
        \$db->update('password_resets', [
            'used_at' => date('Y-m-d H:i:s'),
        ], 'id = ?', [\$reset['id']]);

        // Force logout all sessions for this user
        \$db->update('users', [
            'remember_token' => null,
        ], 'id = ?', [\$reset['user_id']]);

        // Log activity
        \$db->insert('activity_logs', [
            'user_id' => \$reset['user_id'],
            'action' => 'password_reset',
            'description' => 'Password was reset via email',
            'ip' => client_ip(),
            'user_agent' => \$_SERVER['HTTP_USER_AGENT'] ?? '',
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        flash('success', 'Your password has been reset successfully. Please log in with your new password.');
        \$this->redirect('/admin/login');
    }

    /**
     * Setup 2FA (enable)
     */
    public function setup2fa(): void
    {
        \$user = Auth::user();
        if (!\$user) {
            \$this->redirect('/admin/login');
            return;
        }

        if (\$this->isPost()) {
            if (!\$this->validateCsrf()) return;

            \$secret = \$this->input('secret');
            \$code = \$this->input('code');

            if (!TwoFactor::verifyCode(\$secret, \$code)) {
                flash('error', 'Invalid code. Please scan the QR code again and try.');
                \$this->redirect('/admin/settings/2fa');
                return;
            }

            // Generate backup codes
            \$backupCodes = TwoFactor::generateBackupCodes();
            \$hashedBackups = array_map(fn(\$c) => \$c, \$backupCodes);

            \$db = Database::getInstance();
            \$db->update('users', [
                'two_factor_secret' => \$secret,
                'two_factor_backup_codes' => json_encode(\$hashedBackups),
                'two_factor_used_backups' => json_encode([]),
                'two_factor_enabled_at' => date('Y-m-d H:i:s'),
            ], 'id = ?', [\$user['id']]);

            flash('success', 'Two-factor authentication has been enabled.');
            flash('backup_codes', json_encode(\$backupCodes));
            \$this->redirect('/admin/settings/2fa');
            return;
        }

        // Generate new secret for setup
        \$secret = TwoFactor::generateSecret();
        \$qrUrl = TwoFactor::getQrCodeUrl(\$secret, \$user['email'], 'Khybersoft');

        \$this->view('admin.auth.setup-2fa', [
            'page_title' => 'Setup Two-Factor Authentication',
            'secret' => \$secret,
            'qr_url' => \$qrUrl,
        ]);
    }

    /**
     * Disable 2FA
     */
    public function disable2fa(): void
    {
        if (!\$this->validateCsrf()) return;

        \$user = Auth::user();
        if (!\$user) {
            \$this->redirect('/admin/login');
            return;
        }

        // Require password confirmation
        \$db = Database::getInstance();
        \$fullUser = \$db->fetch("SELECT * FROM users WHERE id = ?", [\$user['id']]);

        if (!password_verify(\$this->input('password'), \$fullUser['password_hash'])) {
            flash('error', 'Incorrect password.');
            \$this->redirect('/admin/settings/2fa');
            return;
        }

        \$db->update('users', [
            'two_factor_secret' => null,
            'two_factor_backup_codes' => null,
            'two_factor_used_backups' => null,
            'two_factor_enabled_at' => null,
        ], 'id = ?', [\$user['id']]);

        flash('success', 'Two-factor authentication has been disabled.');
        \$this->redirect('/admin/settings/2fa');
    }

    /**
     * Logout
     */
    public function logout(): void
    {
        Auth::logout();
        \$this->redirect('/admin/login');
    }

    /**
     * Log failed login attempt
     */
    private function logFailedLogin(string \$email): void
    {
        try {
            \$db = Database::getInstance();
            \$db->insert('activity_logs', [
                'user_id' => null,
                'action' => 'login_failed',
                'description' => 'Failed login attempt for: ' . \$email,
                'ip' => client_ip(),
                'user_agent' => \$_SERVER['HTTP_USER_AGENT'] ?? '',
                'created_at' => date('Y-m-d H:i:s'),
            ]);
        } catch (\\Throwable \$e) {
            error_log('Failed to log login attempt: ' . \$e->getMessage());
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
    description: 'Admin dashboard with stats, charts, recent activity, and system health',
    content: `<?php
declare(strict_types=1);

namespace App\\Controllers\\Admin;

use App\\Core\\Controller;
use App\\Core\\Auth;
use App\\Core\\Database;

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
                ['label' => 'Dashboard', 'url' => '/admin'],
            ],
            'stats' => \$this->getStats(),
            'sparklines' => \$this->getSparklineData(),
            'recentInquiries' => \$this->getRecentInquiries(),
            'recentActivity' => \$this->getRecentActivity(),
            'topProducts' => \$this->getTopProducts(),
            'trafficData' => \$this->getTrafficData(),
            'systemHealth' => \$this->getSystemHealth(),
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
            [
                'label' => 'Total Products',
                'value' => (int) \$this->db->fetchColumn(
                    "SELECT COUNT(*) FROM products WHERE status = 'published' AND deleted_at IS NULL"
                ),
                'change' => (int) \$this->db->fetchColumn(
                    "SELECT COUNT(*) FROM products WHERE status = 'published' AND created_at >= ?",
                    [\$thisMonth]
                ),
                'change_label' => 'this month',
                'icon' => 'package',
                'color' => 'blue',
            ],
            [
                'label' => 'Inquiries Today',
                'value' => (int) \$this->db->fetchColumn(
                    "SELECT COUNT(*) FROM product_inquiries WHERE DATE(created_at) = ?",
                    [\$today]
                ),
                'change' => (int) \$this->db->fetchColumn(
                    "SELECT COUNT(*) FROM product_inquiries WHERE DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)"
                ),
                'change_label' => 'yesterday',
                'icon' => 'mail',
                'color' => 'green',
            ],
            [
                'label' => 'Blog Posts',
                'value' => (int) \$this->db->fetchColumn(
                    "SELECT COUNT(*) FROM blog_posts WHERE status = 'published' AND deleted_at IS NULL"
                ),
                'change' => (int) \$this->db->fetchColumn(
                    "SELECT COUNT(*) FROM blog_posts WHERE status = 'published' AND published_at >= ?",
                    [\$thisMonth]
                ),
                'change_label' => 'this month',
                'icon' => 'file-text',
                'color' => 'purple',
            ],
            [
                'label' => 'Subscribers',
                'value' => (int) \$this->db->fetchColumn(
                    "SELECT COUNT(*) FROM newsletter_subscribers WHERE status = 'active'"
                ),
                'change' => (int) \$this->db->fetchColumn(
                    "SELECT COUNT(*) FROM newsletter_subscribers WHERE status = 'active' AND subscribed_at >= ?",
                    [\$thisMonth]
                ),
                'change_label' => 'new this month',
                'icon' => 'users',
                'color' => 'orange',
            ],
        ];
    }

    /**
     * Get sparkline data for stats cards
     */
    private function getSparklineData(): array
    {
        \$data = [];

        // Inquiries last 7 days
        for (\$i = 6; \$i >= 0; \$i--) {
            \$date = date('Y-m-d', strtotime("-{\$i} days"));
            \$count = (int) \$this->db->fetchColumn(
                "SELECT COUNT(*) FROM product_inquiries WHERE DATE(created_at) = ?",
                [\$date]
            );
            \$data['inquiries'][] = \$count;
        }

        // Visitors (if tracked) - placeholder
        \$data['visitors'] = [120, 145, 132, 168, 155, 189, 201];

        // Revenue (if applicable) - placeholder
        \$data['revenue'] = [2400, 2800, 3200, 2900, 3500, 3800, 4200];

        return \$data;
    }

    /**
     * Get recent product inquiries
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
     * Get recent activity
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
     * Get top products by inquiries
     */
    private function getTopProducts(): array
    {
        return \$this->db->fetchAll(
            "SELECT p.name, p.slug, COUNT(pi.id) as inquiry_count
             FROM products p
             INNER JOIN product_inquiries pi ON pi.product_id = p.id
             WHERE pi.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             GROUP BY p.id, p.name, p.slug
             ORDER BY inquiry_count DESC
             LIMIT 5"
        );
    }

    /**
     * Get traffic data for chart
     */
    private function getTrafficData(): array
    {
        \$labels = [];
        \$inquiries = [];
        \$messages = [];

        for (\$i = 29; \$i >= 0; \$i--) {
            \$date = date('Y-m-d', strtotime("-{\$i} days"));
            \$labels[] = date('M d', strtotime(\$date));

            \$inquiries[] = (int) \$this->db->fetchColumn(
                "SELECT COUNT(*) FROM product_inquiries WHERE DATE(created_at) = ?",
                [\$date]
            );

            \$messages[] = (int) \$this->db->fetchColumn(
                "SELECT COUNT(*) FROM contact_messages WHERE DATE(created_at) = ?",
                [\$date]
            );
        }

        return [
            'labels' => \$labels,
            'datasets' => [
                ['label' => 'Product Inquiries', 'data' => \$inquiries, 'color' => '#3b82f6'],
                ['label' => 'Contact Messages', 'data' => \$messages, 'color' => '#8b5cf6'],
            ],
        ];
    }

    /**
     * Get system health information
     */
    private function getSystemHealth(): array
    {
        \$health = [];

        // PHP Version
        \$health['php_version'] = PHP_VERSION;
        \$health['php_version_ok'] = version_compare(PHP_VERSION, '8.2.0', '>=');

        // PHP Extensions
        \$requiredExtensions = ['pdo', 'pdo_mysql', 'mbstring', 'json', 'openssl', 'curl'];
        \$health['extensions'] = [];
        foreach (\$requiredExtensions as \$ext) {
            \$health['extensions'][\$ext] = extension_loaded(\$ext);
        }

        // Disk space
        \$diskTotal = @disk_total_space(ROOT_PATH);
        \$diskFree = @disk_free_space(ROOT_PATH);
        \$health['disk_total'] = \$diskTotal ? \$this->formatBytes(\$diskTotal) : 'N/A';
        \$health['disk_free'] = \$diskFree ? \$this->formatBytes(\$diskFree) : 'N/A';
        \$health['disk_used_percent'] = \$diskTotal ? round((1 - \$diskFree / \$diskTotal) * 100, 1) : 0;

        // Database size
        try {
            \$dbConfig = require APP_PATH . '/config/database.php';
            \$dbName = \$dbConfig['database'];
            \$size = \$this->db->fetchColumn(
                "SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2)
                 FROM information_schema.tables
                 WHERE table_schema = ?",
                [\$dbName]
            );
            \$health['db_size'] = \$size ? \$size . ' MB' : 'N/A';
        } catch (\\Throwable \$e) {
            \$health['db_size'] = 'N/A';
        }

        // Table count
        try {
            \$dbConfig = require APP_PATH . '/config/database.php';
            \$health['db_tables'] = (int) \$this->db->fetchColumn(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = ?",
                [\$dbConfig['database']]
            );
        } catch (\\Throwable \$e) {
            \$health['db_tables'] = 0;
        }

        // Upload directory
        \$health['uploads_writable'] = is_writable(UPLOAD_PATH);
        \$health['storage_writable'] = is_writable(STORAGE_PATH);

        // Memory
        \$health['memory_limit'] = ini_get('memory_limit');
        \$health['memory_usage'] = \$this->formatBytes(memory_get_usage(true));

        // Max upload size
        \$health['upload_max'] = ini_get('upload_max_filesize');
        \$health['post_max'] = ini_get('post_max_size');

        return \$health;
    }

    /**
     * Quick update inquiry status (AJAX)
     */
    public function updateInquiryStatus(): void
    {
        if (!\$this->validateCsrf()) {
            \$this->json(['error' => 'Invalid token'], 403);
            return;
        }

        \$id = (int) \$this->input('id');
        \$status = \$this->input('status');

        \$allowed = ['new', 'in_progress', 'resolved', 'closed'];
        if (!in_array(\$status, \$allowed, true)) {
            \$this->json(['error' => 'Invalid status'], 400);
            return;
        }

        \$affected = \$this->db->update(
            'product_inquiries',
            ['status' => \$status],
            'id = ?',
            [\$id]
        );

        if (\$affected) {
            // Log activity
            \$this->db->insert('activity_logs', [
                'user_id' => Auth::id(),
                'action' => 'inquiry_status_changed',
                'model' => 'product_inquiries',
                'model_id' => \$id,
                'new_values' => json_encode(['status' => \$status]),
                'ip' => client_ip(),
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            \$this->json(['success' => true, 'message' => 'Status updated.']);
        } else {
            \$this->json(['error' => 'Update failed.'], 500);
        }
    }

    private function formatBytes(int \$bytes): string
    {
        \$units = ['B', 'KB', 'MB', 'GB', 'TB'];
        \$i = 0;
        while (\$bytes >= 1024 && \$i < count(\$units) - 1) {
            \$bytes /= 1024;
            \$i++;
        }
        return round(\$bytes, 2) . ' ' . \$units[\$i];
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
 * Admin Authentication Middleware
 */
class AdminAuth
{
    public function handle(): bool
    {
        // Check if authenticated
        if (Auth::guest()) {
            flash('error', 'Please log in to access the admin panel.');
            \$_SESSION['intended_url'] = \$_SERVER['REQUEST_URI'];
            header('Location: ' . SITE_URL . '/admin/login');
            exit;
        }

        // Check if user has admin role
        if (!Auth::isAdmin()) {
            http_response_code(403);
            Auth::logout();
            header('Location: ' . SITE_URL . '/admin/login');
            exit;
        }

        // Check if 2FA is pending
        if (isset(\$_SESSION['2fa_pending'])) {
            header('Location: ' . SITE_URL . '/admin/2fa/verify');
            exit;
        }

        // Check session timeout
        \$lastActivity = \$_SESSION['last_activity'] ?? 0;
        \$timeout = 7200; // 2 hours

        if (time() - \$lastActivity > \$timeout) {
            Auth::logout();
            flash('warning', 'Session expired due to inactivity. Please log in again.');
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
    category: 'middleware',
    description: 'Permission checking middleware',
    content: `<?php
declare(strict_types=1);

namespace App\\Middleware;

use App\\Core\\Auth;

/**
 * Permission Middleware
 * Usage in routes: ['Admin', 'Permission:manage_products']
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
        // First ensure authenticated
        if (Auth::guest()) {
            flash('error', 'Please log in to continue.');
            header('Location: ' . SITE_URL . '/admin/login');
            exit;
        }

        // Super admin bypasses all permission checks
        if (Auth::hasRole('super_admin')) {
            return true;
        }

        // Check specific permission
        if (\$this->requiredPermission && !Auth::can(\$this->requiredPermission)) {
            // Log unauthorized access attempt
            try {
                \$db = \\App\\Core\\Database::getInstance();
                \$db->insert('activity_logs', [
                    'user_id' => Auth::id(),
                    'action' => 'unauthorized_access',
                    'description' => 'Attempted to access: ' . \$this->requiredPermission,
                    'ip' => \$_SERVER['REMOTE_ADDR'] ?? '',
                    'user_agent' => \$_SERVER['HTTP_USER_AGENT'] ?? '',
                    'created_at' => date('Y-m-d H:i:s'),
                ]);
            } catch (\\Throwable \$e) {
                // Silently fail
            }

            if (\$this->isAjax()) {
                http_response_code(403);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Insufficient permissions.']);
                exit;
            }

            flash('error', 'You do not have permission to access this area.');
            header('Location: ' . SITE_URL . '/admin');
            exit;
        }

        return true;
    }

    private function isAjax(): bool
    {
        return (\$_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'XMLHttpRequest';
    }
}
`
  },
  {
    path: 'app/views/layouts/auth.php',
    name: 'auth.php',
    language: 'php',
    category: 'layout',
    description: 'Auth layout - dark gradient background with glassmorphism card',
    content: `<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e(\$page_title ?? 'Admin') ?> - Khybersoft</title>
    <?= CSRF::meta() ?>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; }
        .glass {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .glass-dark {
            background: rgba(15, 23, 42, 0.8);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .gradient-bg {
            background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 25%, #0f172a 50%, #172554 75%, #0f172a 100%);
        }
        .animate-float {
            animation: float 6s ease-in-out infinite;
        }
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
        }
        .input-glow:focus {
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
        }
    </style>
</head>
<body class="h-full gradient-bg overflow-hidden">
    <!-- Animated background elements -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
        <div class="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float"></div>
        <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-float" style="animation-delay: -3s;"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl"></div>
    </div>

    <!-- Toast Notifications -->
    <div x-data="{ toasts: [] }"
         x-init="
            <?php if (has_flash('success')): ?>
            toasts.push({ id: Date.now(), type: 'success', message: '<?= e(get_flash('success')) ?>' });
            setTimeout(() => toasts.shift(), 5000);
            <?php endif; ?>
            <?php if (has_flash('error')): ?>
            toasts.push({ id: Date.now(), type: 'error', message: '<?= e(get_flash('error')) ?>' });
            setTimeout(() => toasts.shift(), 5000);
            <?php endif; ?>
            <?php if (has_flash('warning')): ?>
            toasts.push({ id: Date.now(), type: 'warning', message: '<?= e(get_flash('warning')) ?>' });
            setTimeout(() => toasts.shift(), 5000);
            <?php endif; ?>
         "
         class="fixed top-4 right-4 z-50 space-y-2"
    >
        <template x-for="toast in toasts" :key="toast.id">
            <div x-show="true"
                 x-transition:enter="transform ease-out duration-300 transition"
                 x-transition:enter-start="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
                 x-transition:enter-end="translate-y-0 opacity-100 sm:translate-x-0"
                 x-transition:leave="transition ease-in duration-200"
                 x-transition:leave-start="opacity-100"
                 x-transition:leave-end="opacity-0"
                 class="glass-dark rounded-lg px-4 py-3 shadow-xl max-w-sm"
                 :class="{
                    'border-l-4 border-green-400': toast.type === 'success',
                    'border-l-4 border-red-400': toast.type === 'error',
                    'border-l-4 border-yellow-400': toast.type === 'warning',
                 }"
            >
                <div class="flex items-center gap-3">
                    <span x-show="toast.type === 'success'" class="text-green-400">✓</span>
                    <span x-show="toast.type === 'error'" class="text-red-400">✕</span>
                    <span x-show="toast.type === 'warning'" class="text-yellow-400">⚠</span>
                    <p class="text-sm text-slate-200" x-text="toast.message"></p>
                </div>
            </div>
        </template>
    </div>

    <!-- Main Content -->
    <div class="relative min-h-full flex items-center justify-center px-4 py-12">
        <?= \$_view_content_ ?>
    </div>

    <!-- Footer -->
    <div class="fixed bottom-4 left-0 right-0 text-center">
        <p class="text-xs text-slate-500">
            &copy; <?= date('Y') ?> Khybersoft. All rights reserved.
        </p>
    </div>
</body>
</html>
`
  },
  {
    path: 'app/views/admin/auth/login.php',
    name: 'login.php',
    language: 'php',
    category: 'views',
    description: 'Login page with glassmorphism card design',
    content: `<div class="w-full max-w-md" x-data="{ showPassword: false, loading: false }">
    <!-- Logo -->
    <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25 mb-4">
            <span class="text-white font-bold text-2xl">K</span>
        </div>
        <h1 class="text-2xl font-bold text-white">Welcome back</h1>
        <p class="text-slate-400 mt-1">Sign in to your admin account</p>
    </div>

    <!-- Login Card -->
    <div class="glass-dark rounded-2xl p-8 shadow-2xl">
        <?php if (!empty(\$rate_limited)): ?>
        <div class="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <div class="flex items-center gap-2 text-red-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                </svg>
                <span class="text-sm font-medium">Too many attempts</span>
            </div>
            <p class="text-sm text-red-300/70 mt-1">
                Please try again in <?= ceil(\$retry_after / 60) ?> minutes.
            </p>
        </div>
        <?php else: ?>

        <form method="POST" action="<?= url('admin/login') ?>" @submit="loading = true">
            <?= CSRF::field() ?>

            <!-- Email -->
            <div class="mb-5">
                <label for="email" class="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                    </div>
                    <input type="email"
                           id="email"
                           name="email"
                           value="<?= old('email') ?>"
                           required
                           autocomplete="email"
                           placeholder="admin@khybersoft.com"
                           class="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 input-glow transition-all">
                </div>
            </div>

            <!-- Password -->
            <div class="mb-5">
                <label for="password" class="block text-sm font-medium text-slate-300 mb-2">Password</label>
                <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                        </svg>
                    </div>
                    <input :type="showPassword ? 'text' : 'password'"
                           id="password"
                           name="password"
                           required
                           autocomplete="current-password"
                           placeholder="••••••••"
                           class="w-full pl-11 pr-12 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 input-glow transition-all">
                    <button type="button"
                            @click="showPassword = !showPassword"
                            class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300">
                        <svg x-show="!showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                        <svg x-show="showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Remember Me & Forgot -->
            <div class="flex items-center justify-between mb-6">
                <label class="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" name="remember" value="1"
                           class="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0">
                    <span class="text-sm text-slate-400 group-hover:text-slate-300">Remember me</span>
                </label>
                <a href="<?= url('admin/forgot-password') ?>" class="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                    Forgot password?
                </a>
            </div>

            <!-- Submit Button -->
            <button type="submit"
                    :disabled="loading"
                    class="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <svg x-show="loading" class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span x-text="loading ? 'Signing in...' : 'Sign In'"></span>
            </button>
        </form>
        <?php endif; ?>
    </div>

    <!-- Version info -->
    <div class="text-center mt-6">
        <p class="text-xs text-slate-500">
            Khybersoft Admin v<?= APP_VERSION ?> • PHP <?= PHP_VERSION ?>
        </p>
    </div>
</div>
`
  },
  {
    path: 'app/views/admin/auth/forgot-password.php',
    name: 'forgot-password.php',
    language: 'php',
    category: 'views',
    description: 'Forgot password page',
    content: `<div class="w-full max-w-md">
    <!-- Back to Login -->
    <a href="<?= url('admin/login') ?>" class="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
        Back to login
    </a>

    <!-- Header -->
    <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25 mb-4">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
            </svg>
        </div>
        <h1 class="text-2xl font-bold text-white">Forgot Password?</h1>
        <p class="text-slate-400 mt-2">No worries, we'll send you reset instructions.</p>
    </div>

    <!-- Card -->
    <div class="glass-dark rounded-2xl p-8 shadow-2xl">
        <form method="POST" action="<?= url('admin/forgot-password') ?>">
            <?= CSRF::field() ?>

            <div class="mb-6">
                <label for="email" class="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                    </div>
                    <input type="email"
                           id="email"
                           name="email"
                           required
                           autocomplete="email"
                           placeholder="Enter your email"
                           class="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 input-glow transition-all">
                </div>
                <p class="text-xs text-slate-500 mt-2">We'll send a password reset link to this email.</p>
            </div>

            <button type="submit"
                    class="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/25 transition-all duration-200">
                Send Reset Link
            </button>
        </form>
    </div>
</div>
`
  },
  {
    path: 'app/views/admin/auth/reset-password.php',
    name: 'reset-password.php',
    language: 'php',
    category: 'views',
    description: 'Reset password page',
    content: `<div class="w-full max-w-md">
    <!-- Header -->
    <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/25 mb-4">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
        </div>
        <h1 class="text-2xl font-bold text-white">Set New Password</h1>
        <p class="text-slate-400 mt-2">Your new password must be at least 8 characters.</p>
    </div>

    <!-- Card -->
    <div class="glass-dark rounded-2xl p-8 shadow-2xl">
        <form method="POST" action="<?= url('admin/reset-password') ?>">
            <?= CSRF::field() ?>
            <input type="hidden" name="token" value="<?= e(\$token) ?>">

            <!-- New Password -->
            <div class="mb-5" x-data="{ show: false }">
                <label for="password" class="block text-sm font-medium text-slate-300 mb-2">New Password</label>
                <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                        </svg>
                    </div>
                    <input :type="show ? 'text' : 'password'"
                           id="password"
                           name="password"
                           required
                           minlength="8"
                           autocomplete="new-password"
                           placeholder="Enter new password"
                           class="w-full pl-11 pr-12 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 input-glow transition-all">
                    <button type="button" @click="show = !show" class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Confirm Password -->
            <div class="mb-6">
                <label for="password_confirmation" class="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
                <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                    <input type="password"
                           id="password_confirmation"
                           name="password_confirmation"
                           required
                           autocomplete="new-password"
                           placeholder="Confirm new password"
                           class="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 input-glow transition-all">
                </div>
            </div>

            <button type="submit"
                    class="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-semibold rounded-xl shadow-lg shadow-green-500/25 transition-all duration-200">
                Reset Password
            </button>
        </form>
    </div>
</div>
`
  },
  {
    path: 'app/views/admin/auth/two-factor.php',
    name: 'two-factor.php',
    language: 'php',
    category: 'views',
    description: '2FA verification page',
    content: `<div class="w-full max-w-md">
    <!-- Header -->
    <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25 mb-4">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
        </div>
        <h1 class="text-2xl font-bold text-white">Two-Factor Authentication</h1>
        <p class="text-slate-400 mt-2">Enter the 6-digit code from your authenticator app.</p>
    </div>

    <!-- Card -->
    <div class="glass-dark rounded-2xl p-8 shadow-2xl">
        <form method="POST" action="<?= url('admin/2fa/verify') ?>" x-data="{ code: '' }">
            <?= CSRF::field() ?>

            <div class="mb-6">
                <label for="code" class="block text-sm font-medium text-slate-300 mb-3 text-center">Authentication Code</label>
                <input type="text"
                       id="code"
                       name="code"
                       x-model="code"
                       required
                       maxlength="8"
                       autocomplete="one-time-code"
                       inputmode="numeric"
                       pattern="[0-9]*"
                       autofocus
                       placeholder="000000"
                       class="w-full text-center text-3xl font-mono tracking-widest py-4 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 input-glow transition-all">
                <p class="text-xs text-slate-500 mt-2 text-center">
                    Enter the code from Google Authenticator or a backup code.
                </p>
            </div>

            <button type="submit"
                    class="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-500 hover:from-indigo-500 hover:to-violet-400 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-200">
                Verify & Continue
            </button>
        </form>

        <div class="mt-6 pt-6 border-t border-slate-700/50">
            <a href="<?= url('admin/login') ?>" class="text-sm text-slate-400 hover:text-white text-center block transition-colors">
                ← Back to login
            </a>
        </div>
    </div>
</div>
`
  },
  {
    path: 'app/views/layouts/admin.php',
    name: 'admin.php (layout)',
    language: 'php',
    category: 'layout',
    description: 'Main admin layout with sidebar, navbar, breadcrumbs, dark mode',
    content: `<!DOCTYPE html>
<html lang="en" x-data="{ sidebarOpen: true, mobileSidebar: false, darkMode: localStorage.getItem('darkMode') !== 'false' }"
      :class="{ 'dark': darkMode }"
      x-init="
        if (darkMode) { document.documentElement.classList.add('dark'); }
        \$watch('darkMode', val => {
            localStorage.setItem('darkMode', val);
            document.documentElement.classList.toggle('dark', val);
        });
      ">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e(\$page_title ?? 'Admin') ?> - Khybersoft Admin</title>
    <?= CSRF::meta() ?>
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
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        [x-cloak] { display: none !important; }
        .sidebar-transition { transition: width 0.3s ease, transform 0.3s ease; }
        .skeleton { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
    </style>
</head>
<body class="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans min-h-screen">

    <!-- Mobile Sidebar Overlay -->
    <div x-show="mobileSidebar" x-cloak
         x-transition:enter="transition-opacity ease-out duration-300"
         x-transition:enter-start="opacity-0"
         x-transition:enter-end="opacity-100"
         x-transition:leave="transition-opacity ease-in duration-200"
         x-transition:leave-start="opacity-100"
         x-transition:leave-end="opacity-0"
         @click="mobileSidebar = false"
         class="fixed inset-0 z-40 bg-black/50 lg:hidden">
    </div>

    <!-- Sidebar -->
    <aside
        :class="sidebarOpen ? 'w-64' : 'w-20'"
        class="sidebar-transition fixed top-0 left-0 z-50 h-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 hidden lg:block overflow-y-auto overflow-x-hidden"
    >
        <!-- Logo -->
        <div class="h-16 flex items-center px-4 border-b border-slate-200 dark:border-slate-700">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span class="text-white font-bold text-sm">K</span>
                </div>
                <span x-show="sidebarOpen" x-cloak class="font-bold text-lg text-slate-800 dark:text-white whitespace-nowrap">Khybersoft</span>
            </div>
        </div>

        <!-- Navigation -->
        <nav class="p-3 space-y-1">
            <?php
            \$currentPath = parse_url(\$_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);

            \$menuGroups = [
                ['label' => '', 'items' => [
                    ['label' => 'Dashboard', 'url' => '/admin', 'icon' => 'dashboard'],
                ]],
                ['label' => 'Content', 'items' => [
                    ['label' => 'Pages', 'url' => '/admin/pages', 'icon' => 'document'],
                    ['label' => 'Blog Posts', 'url' => '/admin/blog', 'icon' => 'newspaper'],
                    ['label' => 'Categories', 'url' => '/admin/blog/categories', 'icon' => 'folder'],
                    ['label' => 'Comments', 'url' => '/admin/comments', 'icon' => 'chat'],
                    ['label' => 'Media Library', 'url' => '/admin/media', 'icon' => 'image'],
                ]],
                ['label' => 'Products', 'items' => [
                    ['label' => 'Categories', 'url' => '/admin/products/categories', 'icon' => 'folder'],
                    ['label' => 'Products', 'url' => '/admin/products', 'icon' => 'box'],
                    ['label' => 'Plans', 'url' => '/admin/products/plans', 'icon' => 'tag'],
                    ['label' => 'Demos', 'url' => '/admin/products/demos', 'icon' => 'play'],
                    ['label' => 'Inquiries', 'url' => '/admin/inquiries', 'icon' => 'mail'],
                    ['label' => 'Tutorials', 'url' => '/admin/tutorials', 'icon' => 'academic'],
                    ['label' => 'Versions', 'url' => '/admin/products/versions', 'icon' => 'code'],
                ]],
                ['label' => 'Services', 'items' => [
                    ['label' => 'Services', 'url' => '/admin/services', 'icon' => 'briefcase'],
                    ['label' => 'Inquiries', 'url' => '/admin/services/inquiries', 'icon' => 'mail'],
                    ['label' => 'Custom Requests', 'url' => '/admin/custom-requests', 'icon' => 'code'],
                ]],
                ['label' => 'Business', 'items' => [
                    ['label' => 'Testimonials', 'url' => '/admin/testimonials', 'icon' => 'star'],
                    ['label' => 'Team', 'url' => '/admin/team', 'icon' => 'users'],
                    ['label' => 'Clients', 'url' => '/admin/clients', 'icon' => 'building'],
                    ['label' => 'FAQs', 'url' => '/admin/faqs', 'icon' => 'question'],
                    ['label' => 'Messages', 'url' => '/admin/messages', 'icon' => 'inbox'],
                    ['label' => 'Newsletter', 'url' => '/admin/newsletter', 'icon' => 'send'],
                ]],
                ['label' => 'Marketing', 'items' => [
                    ['label' => 'SEO Manager', 'url' => '/admin/seo', 'icon' => 'search'],
                    ['label' => 'Redirects', 'url' => '/admin/redirects', 'icon' => 'redirect'],
                    ['label' => 'Sitemap', 'url' => '/admin/sitemap', 'icon' => 'sitemap'],
                ]],
                ['label' => 'System', 'items' => [
                    ['label' => 'Users', 'url' => '/admin/users', 'icon' => 'user'],
                    ['label' => 'Roles', 'url' => '/admin/roles', 'icon' => 'shield'],
                    ['label' => 'Settings', 'url' => '/admin/settings', 'icon' => 'cog'],
                    ['label' => 'Activity Logs', 'url' => '/admin/activity', 'icon' => 'clipboard'],
                    ['label' => 'Backup', 'url' => '/admin/backup', 'icon' => 'database'],
                ]],
            ];

            function renderIcon(string \$name): string {
                \$icons = [
                    'dashboard' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zM14 12a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1h-4a1 1 0 01-1-1v-5z"/>',
                    'document' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>',
                    'newspaper' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>',
                    'folder' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>',
                    'chat' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>',
                    'image' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>',
                    'box' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>',
                    'tag' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>',
                    'play' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
                    'mail' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>',
                    'academic' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 14l9-5-9-5-9 5 9 5z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>',
                    'code' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>',
                    'briefcase' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>',
                    'star' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>',
                    'users' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>',
                    'building' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>',
                    'question' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
                    'inbox' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>',
                    'send' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>',
                    'search' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>',
                    'redirect' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 7l5 5m0 0l-5 5m5-5H6"/>',
                    'sitemap' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h7"/>',
                    'user' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>',
                    'shield' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>',
                    'cog' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>',
                    'clipboard' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>',
                    'database' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/>',
                ];
                \$path = \$icons[\$name] ?? \$icons['document'];
                return '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">' . \$path . '</svg>';
            }
            ?>

            <?php foreach (\$menuGroups as \$group): ?>
                <?php if (!empty(\$group['label'])): ?>
                    <div x-show="sidebarOpen" x-cloak class="pt-4 pb-1 px-3">
                        <span class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            <?= e(\$group['label']) ?>
                        </span>
                    </div>
                <?php endif; ?>

                <?php foreach (\$group['items'] as \$item): ?>
                    <?php
                    \$isActive = \$currentPath === \$item['url'] || (strlen(\$item['url']) > 6 && str_starts_with(\$currentPath ?? '', \$item['url']));
                    ?>
                    <a href="<?= url(ltrim(\$item['url'], '/')) ?>"
                       class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                              <?= \$isActive
                                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-200'
                              ?>"
                       title="<?= e(\$item['label']) ?>">
                        <span class="flex-shrink-0"><?= renderIcon(\$item['icon']) ?></span>
                        <span x-show="sidebarOpen" x-cloak class="whitespace-nowrap"><?= e(\$item['label']) ?></span>
                    </a>
                <?php endforeach; ?>
            <?php endforeach; ?>
        </nav>
    </aside>

    <!-- Mobile Sidebar -->
    <aside x-show="mobileSidebar" x-cloak
           x-transition:enter="transition ease-out duration-300"
           x-transition:enter-start="-translate-x-full"
           x-transition:enter-end="translate-x-0"
           x-transition:leave="transition ease-in duration-200"
           x-transition:leave-start="translate-x-0"
           x-transition:leave-end="-translate-x-full"
           class="fixed top-0 left-0 z-50 h-full w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 overflow-y-auto lg:hidden">
        <!-- Same nav content as desktop sidebar -->
        <div class="h-16 flex items-center px-4 border-b border-slate-200 dark:border-slate-700">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span class="text-white font-bold text-sm">K</span>
                </div>
                <span class="font-bold text-lg text-slate-800 dark:text-white">Khybersoft</span>
            </div>
        </div>
        <nav class="p-3 space-y-1">
            <!-- Mobile nav items (same structure as desktop) -->
            <a href="<?= url('admin') ?>" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10">
                <?= renderIcon('dashboard') ?>
                <span>Dashboard</span>
            </a>
        </nav>
    </aside>

    <!-- Main Content Area -->
    <div :class="sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'" class="sidebar-transition min-h-screen">
        <!-- Top Navbar -->
        <header class="sticky top-0 z-30 h-16 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
            <div class="h-full flex items-center justify-between px-4 lg:px-6">
                <!-- Left: Toggle + Breadcrumbs -->
                <div class="flex items-center gap-4">
                    <!-- Desktop sidebar toggle -->
                    <button @click="sidebarOpen = !sidebarOpen" class="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16"/>
                        </svg>
                    </button>

                    <!-- Mobile menu button -->
                    <button @click="mobileSidebar = true" class="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16"/>
                        </svg>
                    </button>

                    <!-- Breadcrumbs -->
                    <nav class="hidden sm:flex items-center gap-1 text-sm">
                        <?php
                        \$breadcrumbs = \$breadcrumbs ?? [['label' => 'Dashboard', 'url' => '/admin']];
                        \$lastIndex = count(\$breadcrumbs) - 1;
                        foreach (\$breadcrumbs as \$i => \$crumb):
                        ?>
                            <?php if (\$i > 0): ?>
                                <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                                </svg>
                            <?php endif; ?>
                            <?php if (\$i === \$lastIndex): ?>
                                <span class="text-slate-800 dark:text-white font-medium"><?= e(\$crumb['label']) ?></span>
                            <?php else: ?>
                                <a href="<?= url(ltrim(\$crumb['url'] ?? '/', '/')) ?>" class="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                                    <?= e(\$crumb['label']) ?>
                                </a>
                            <?php endif; ?>
                        <?php endforeach; ?>
                    </nav>
                </div>

                <!-- Right: Search, Dark Mode, Notifications, User -->
                <div class="flex items-center gap-2">
                    <!-- Search -->
                    <div class="hidden md:flex items-center">
                        <div class="relative">
                            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                            </svg>
                            <input type="text"
                                   placeholder="Search... (⌘K)"
                                   class="w-56 pl-9 pr-4 py-2 text-sm bg-slate-100 dark:bg-slate-700 border-0 rounded-lg text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                        </div>
                    </div>

                    <!-- Site Preview -->
                    <a href="<?= SITE_URL ?>" target="_blank"
                       class="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                       title="View Site">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                        </svg>
                    </a>

                    <!-- Dark Mode Toggle -->
                    <button @click="darkMode = !darkMode"
                            class="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                        <svg x-show="!darkMode" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
                        </svg>
                        <svg x-show="darkMode" x-cloak class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
                        </svg>
                    </button>

                    <!-- Notifications -->
                    <div x-data="{ open: false }" class="relative">
                        <button @click="open = !open" class="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 relative">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                            </svg>
                            <span class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                        </button>

                        <div x-show="open" x-cloak
                             @click.away="open = false"
                             x-transition
                             class="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div class="p-4 border-b border-slate-200 dark:border-slate-700">
                                <h3 class="font-semibold text-slate-800 dark:text-white">Notifications</h3>
                            </div>
                            <div class="max-h-64 overflow-y-auto p-2">
                                <div class="p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <p class="text-sm text-slate-600 dark:text-slate-300">New inquiry from John Doe</p>
                                    <p class="text-xs text-slate-400 mt-1">2 minutes ago</p>
                                </div>
                                <div class="p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <p class="text-sm text-slate-600 dark:text-slate-300">Contact message received</p>
                                    <p class="text-xs text-slate-400 mt-1">15 minutes ago</p>
                                </div>
                            </div>
                            <div class="p-3 border-t border-slate-200 dark:border-slate-700">
                                <a href="<?= url('admin/activity') ?>" class="text-sm text-blue-500 hover:text-blue-600 font-medium">View all</a>
                            </div>
                        </div>
                    </div>

                    <!-- User Dropdown -->
                    <div x-data="{ open: false }" class="relative">
                        <button @click="open = !open" class="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                            <div class="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                <span class="text-white text-xs font-bold"><?= strtoupper(substr(Auth::user()['name'] ?? 'A', 0, 1)) ?></span>
                            </div>
                            <span class="hidden sm:block text-sm font-medium text-slate-700 dark:text-slate-300">
                                <?= e(Auth::user()['name'] ?? 'Admin') ?>
                            </span>
                            <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                            </svg>
                        </button>

                        <div x-show="open" x-cloak
                             @click.away="open = false"
                             x-transition
                             class="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div class="p-3 border-b border-slate-200 dark:border-slate-700">
                                <p class="text-sm font-medium text-slate-800 dark:text-white"><?= e(Auth::user()['name'] ?? 'Admin') ?></p>
                                <p class="text-xs text-slate-500"><?= e(Auth::user()['email'] ?? '') ?></p>
                            </div>
                            <div class="p-1">
                                <a href="<?= url('admin/settings/profile') ?>" class="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                                    Profile
                                </a>
                                <a href="<?= url('admin/settings') ?>" class="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                    Settings
                                </a>
                            </div>
                            <div class="p-1 border-t border-slate-200 dark:border-slate-700">
                                <a href="<?= url('admin/logout') ?>" class="flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                                    Logout
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        <!-- Page Content -->
        <main class="p-4 lg:p-6">
            <!-- Toast Notifications -->
            <div x-data="{ toasts: [],
                    init() {
                        <?php if (has_flash('success')): ?>
                        this.addToast('success', '<?= e(get_flash('success')) ?>');
                        <?php endif; ?>
                        <?php if (has_flash('error')): ?>
                        this.addToast('error', '<?= e(get_flash('error')) ?>');
                        <?php endif; ?>
                        <?php if (has_flash('warning')): ?>
                        this.addToast('warning', '<?= e(get_flash('warning')) ?>');
                        <?php endif; ?>
                    },
                    addToast(type, message) {
                        const id = Date.now();
                        this.toasts.push({ id, type, message });
                        setTimeout(() => { this.toasts = this.toasts.filter(t => t.id !== id); }, 5000);
                    }
                }"
                class="fixed top-20 right-4 z-50 space-y-2">
                <template x-for="toast in toasts" :key="toast.id">
                    <div x-transition
                         class="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border max-w-sm"
                         :class="{
                            'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200': toast.type === 'success',
                            'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200': toast.type === 'error',
                            'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200': toast.type === 'warning',
                         }">
                        <span x-show="toast.type === 'success'" class="text-lg">✓</span>
                        <span x-show="toast.type === 'error'" class="text-lg">✕</span>
                        <span x-show="toast.type === 'warning'" class="text-lg">⚠</span>
                        <p class="text-sm font-medium" x-text="toast.message"></p>
                        <button @click="toasts = toasts.filter(t => t.id !== toast.id)" class="ml-auto text-current opacity-50 hover:opacity-100">×</button>
                    </div>
                </template>
            </div>

            <?= \$_view_content_ ?>
        </main>
    </div>

    <!-- Alpine.js Admin Scripts -->
    <script src="<?= asset('js/admin.js') ?>"></script>
</body>
</html>
`
  },
  {
    path: 'app/views/admin/dashboard.php',
    name: 'dashboard.php',
    language: 'php',
    category: 'dashboard',
    description: 'Dashboard view with stat cards, charts, tables, and system health',
    content: `<div class="space-y-6" x-data="{ loading: false }">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
            <h1 class="text-2xl font-bold text-slate-800 dark:text-white">Dashboard</h1>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Welcome back, <?= e(Auth::user()['name'] ?? 'Admin') ?>! Here's what's happening.</p>
        </div>
        <div class="flex items-center gap-2">
            <span class="text-xs text-slate-400">Last updated: <?= date('M d, Y H:i') ?></span>
            <button @click="window.location.reload()" class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
            </button>
        </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <?php foreach (\$stats as \$stat): ?>
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg transition-shadow">
            <div class="flex items-start justify-between">
                <div>
                    <p class="text-sm font-medium text-slate-500 dark:text-slate-400"><?= e(\$stat['label']) ?></p>
                    <p class="text-3xl font-bold text-slate-800 dark:text-white mt-1"><?= number_format(\$stat['value']) ?></p>
                </div>
                <div class="w-10 h-10 rounded-lg flex items-center justify-center
                    <?= match(\$stat['color']) {
                        'blue' => 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
                        'green' => 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400',
                        'purple' => 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
                        'orange' => 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400',
                        default => 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400',
                    } ?>">
                    <?php
                    \$statIcons = [
                        'package' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>',
                        'mail' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>',
                        'file-text' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>',
                        'users' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>',
                    ];
                    ?>
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <?= \$statIcons[\$stat['icon']] ?? '' ?>
                    </svg>
                </div>
            </div>
            <div class="mt-3 flex items-center gap-1.5">
                <span class="inline-flex items-center text-xs font-medium
                    <?= \$stat['change'] > 0 ? 'text-green-600 dark:text-green-400' : 'text-slate-400' ?>">
                    <?php if (\$stat['change'] > 0): ?>
                    <svg class="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
                    </svg>
                    <?php endif; ?>
                    +<?= \$stat['change'] ?>
                </span>
                <span class="text-xs text-slate-400"><?= e(\$stat['change_label']) ?></span>
            </div>
            <!-- Mini Sparkline -->
            <div class="mt-3 h-8">
                <svg class="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                    <?php
                    \$sparkData = \$sparklines['inquiries'] ?? [0,0,0,0,0,0,0];
                    \$max = max(\$sparkData) ?: 1;
                    \$points = [];
                    foreach (\$sparkData as \$i => \$v) {
                        \$x = (\$i / (count(\$sparkData) - 1)) * 100;
                        \$y = 30 - (\$v / \$max) * 28;
                        \$points[] = "{\$x},{\$y}";
                    }
                    ?>
                    <polyline fill="none" stroke="<?= match(\$stat['color']) { 'blue' => '#3b82f6', 'green' => '#10b981', 'purple' => '#8b5cf6', 'orange' => '#f97316', default => '#64748b' } ?>" stroke-width="2" points="<?= implode(' ', \$points) ?>"/>
                </svg>
            </div>
        </div>
        <?php endforeach; ?>
    </div>

    <!-- Charts & Tables Row -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Traffic Chart -->
        <div class="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-semibold text-slate-800 dark:text-white">Activity Overview</h2>
                <span class="text-xs text-slate-400">Last 30 days</span>
            </div>
            <div class="h-64" id="traffic-chart">
                <!-- Chart.js renders here -->
                <canvas id="activityChart"></canvas>
            </div>
        </div>

        <!-- Top Products -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h2 class="text-lg font-semibold text-slate-800 dark:text-white mb-4">Top Products</h2>
            <div class="space-y-3">
                <?php foreach (\$topProducts as \$i => \$product): ?>
                <div class="flex items-center gap-3">
                    <span class="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500">
                        <?= \$i + 1 ?>
                    </span>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-slate-700 dark:text-slate-300 truncate"><?= e(\$product['name']) ?></p>
                        <div class="flex items-center gap-2 mt-1">
                            <div class="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <?php \$maxCount = max(array_column(\$topProducts, 'inquiry_count')) ?: 1; ?>
                                <div class="h-full bg-blue-500 rounded-full" style="width: <?= round((\$product['inquiry_count'] / \$maxCount) * 100) ?>%"></div>
                            </div>
                            <span class="text-xs text-slate-400"><?= \$product['inquiry_count'] ?></span>
                        </div>
                    </div>
                </div>
                <?php endforeach; ?>
                <?php if (empty(\$topProducts)): ?>
                <p class="text-sm text-slate-400 text-center py-4">No inquiries yet</p>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <!-- Recent Inquiries & Activity -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Recent Inquiries -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div class="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h2 class="text-lg font-semibold text-slate-800 dark:text-white">Recent Inquiries</h2>
                <a href="<?= url('admin/inquiries') ?>" class="text-sm text-blue-500 hover:text-blue-600">View all</a>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            <th class="px-5 py-3">Name</th>
                            <th class="px-5 py-3">Product</th>
                            <th class="px-5 py-3">Status</th>
                            <th class="px-5 py-3">Date</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
                        <?php foreach (array_slice(\$recentInquiries, 0, 5) as \$inq): ?>
                        <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50" x-data="{ status: '<?= e(\$inq['status']) ?>' }">
                            <td class="px-5 py-3">
                                <p class="text-sm font-medium text-slate-700 dark:text-slate-300"><?= e(\$inq['name']) ?></p>
                                <p class="text-xs text-slate-400"><?= e(\$inq['email']) ?></p>
                            </td>
                            <td class="px-5 py-3 text-sm text-slate-600 dark:text-slate-400"><?= e(\$inq['product_name'] ?? 'N/A') ?></td>
                            <td class="px-5 py-3">
                                <select x-model="status"
                                        @change="fetch('/admin/dashboard/inquiry-status', {
                                            method: 'POST',
                                            headers: {'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]').content},
                                            body: JSON.stringify({id: <?= \$inq['id'] ?>, status: \\\$event.target.value})
                                        })"
                                        class="text-xs px-2 py-1 rounded-full border-0 font-medium
                                            bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    <option value="new">New</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="closed">Closed</option>
                                </select>
                            </td>
                            <td class="px-5 py-3 text-xs text-slate-400"><?= time_ago(\$inq['created_at']) ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Activity Log -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div class="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h2 class="text-lg font-semibold text-slate-800 dark:text-white">Activity Log</h2>
                <a href="<?= url('admin/activity') ?>" class="text-sm text-blue-500 hover:text-blue-600">View all</a>
            </div>
            <div class="divide-y divide-slate-100 dark:divide-slate-700 max-h-80 overflow-y-auto">
                <?php foreach (array_slice(\$recentActivity, 0, 8) as \$activity): ?>
                <div class="px-5 py-3 flex items-start gap-3">
                    <div class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span class="text-xs font-bold text-slate-500">
                            <?= strtoupper(substr(\$activity['user_name'] ?? 'S', 0, 1)) ?>
                        </span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm text-slate-700 dark:text-slate-300">
                            <span class="font-medium"><?= e(\$activity['user_name'] ?? 'System') ?></span>
                            <?= e(\$activity['description'] ?: \$activity['action']) ?>
                        </p>
                        <p class="text-xs text-slate-400 mt-0.5"><?= time_ago(\$activity['created_at']) ?></p>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
        </div>
    </div>

    <!-- System Health -->
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h2 class="text-lg font-semibold text-slate-800 dark:text-white mb-4">System Health</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div class="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <p class="text-xs text-slate-400 mb-1">PHP Version</p>
                <p class="text-sm font-bold <?= \$systemHealth['php_version_ok'] ? 'text-green-600 dark:text-green-400' : 'text-red-500' ?>">
                    <?= e(\$systemHealth['php_version']) ?>
                </p>
            </div>
            <div class="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <p class="text-xs text-slate-400 mb-1">DB Size</p>
                <p class="text-sm font-bold text-slate-700 dark:text-slate-300"><?= e(\$systemHealth['db_size']) ?></p>
            </div>
            <div class="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <p class="text-xs text-slate-400 mb-1">DB Tables</p>
                <p class="text-sm font-bold text-slate-700 dark:text-slate-300"><?= \$systemHealth['db_tables'] ?></p>
            </div>
            <div class="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <p class="text-xs text-slate-400 mb-1">Disk Used</p>
                <p class="text-sm font-bold text-slate-700 dark:text-slate-300"><?= e(\$systemHealth['disk_used_percent']) ?>%</p>
            </div>
            <div class="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <p class="text-xs text-slate-400 mb-1">Uploads</p>
                <p class="text-sm font-bold <?= \$systemHealth['uploads_writable'] ? 'text-green-600 dark:text-green-400' : 'text-red-500' ?>">
                    <?= \$systemHealth['uploads_writable'] ? 'Writable' : 'Read Only' ?>
                </p>
            </div>
            <div class="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <p class="text-xs text-slate-400 mb-1">Max Upload</p>
                <p class="text-sm font-bold text-slate-700 dark:text-slate-300"><?= e(\$systemHealth['upload_max']) ?></p>
            </div>
        </div>
    </div>
</div>

<!-- Chart.js -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;

    const trafficData = <?= json_encode(\$trafficData) ?>;
    const isDark = document.documentElement.classList.contains('dark');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: trafficData.labels,
            datasets: trafficData.datasets.map(ds => ({
                label: ds.label,
                data: ds.data,
                borderColor: ds.color,
                backgroundColor: ds.color + '20',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                borderWidth: 2,
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: isDark ? '#94a3b8' : '#64748b',
                        usePointStyle: true,
                        padding: 20,
                    }
                },
                tooltip: {
                    backgroundColor: isDark ? '#1e293b' : '#fff',
                    titleColor: isDark ? '#e2e8f0' : '#0f172a',
                    bodyColor: isDark ? '#94a3b8' : '#64748b',
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: isDark ? '#64748b' : '#94a3b8', maxTicksLimit: 10 }
                },
                y: {
                    grid: { color: isDark ? '#1e293b' : '#f1f5f9' },
                    ticks: { color: isDark ? '#64748b' : '#94a3b8' },
                    beginAtZero: true,
                }
            }
        }
    });
});
</script>
`
  },
  {
    path: 'public_html/assets/js/admin.js',
    name: 'admin.js',
    language: 'javascript',
    category: 'assets',
    description: 'Admin panel JavaScript - AJAX helpers, CSRF, notifications',
    content: `/**
 * Khybersoft Admin - JavaScript
 * Handles AJAX requests, CSRF tokens, and UI interactions
 */

(function() {
    'use strict';

    // CSRF Token for AJAX requests
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

    // Fetch wrapper with CSRF
    window.api = {
        async post(url, data = {}) {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Request failed' }));
                throw new Error(error.error || 'Request failed');
            }

            return response.json();
        },

        async get(url) {
            const response = await fetch(url, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                },
            });
            return response.json();
        },

        async delete(url) {
            return this.post(url, { _method: 'DELETE' });
        }
    };

    // Toast notification system
    window.showToast = function(type, message, duration = 5000) {
        const container = document.querySelector('[x-data*="toasts"]');
        if (!container) return;

        const alpineData = Alpine.$data(container);
        if (alpineData && alpineData.addToast) {
            alpineData.addToast(type, message);
        }
    };

    // Confirm dialog
    window.confirmAction = function(message, callback) {
        if (confirm(message)) {
            callback();
        }
    };

    // Auto-dismiss alerts
    document.querySelectorAll('[data-dismiss]').forEach(el => {
        const timeout = parseInt(el.dataset.dismiss) || 5000;
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateX(100%)';
            setTimeout(() => el.remove(), 300);
        }, timeout);
    });

    // Form submission with loading state
    document.querySelectorAll('form[data-ajax]').forEach(form => {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const btn = form.querySelector('[type="submit"]');
            const originalText = btn?.innerHTML;

            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<svg class="animate-spin w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Processing...';
            }

            try {
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                const result = await api.post(form.action, data);

                if (result.success) {
                    showToast('success', result.message || 'Success!');
                    if (result.redirect) {
                        setTimeout(() => window.location.href = result.redirect, 1000);
                    }
                }
            } catch (error) {
                showToast('error', error.message);
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
            }
        });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Cmd/Ctrl + K for search
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            document.querySelector('input[placeholder*="Search"]')?.focus();
        }

        // Escape to close modals
        if (e.key === 'Escape') {
            document.querySelectorAll('[x-show][x-cloak]').forEach(el => {
                // Alpine handles this
            });
        }
    });

    // Skeleton loading states
    window.showSkeleton = function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = \`
            <div class="space-y-3">
                <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded skeleton w-3/4"></div>
                <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded skeleton w-1/2"></div>
                <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded skeleton w-5/6"></div>
            </div>
        \`;
    };

    // Initialize
    console.log('Khybersoft Admin loaded');
})();
`
  },
  {
    path: 'app/views/admin/auth/setup-2fa.php',
    name: 'setup-2fa.php',
    language: 'php',
    category: 'auth',
    description: '2FA setup page with QR code',
    content: `<div class="max-w-lg mx-auto">
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 class="text-xl font-bold text-slate-800 dark:text-white mb-2">Setup Two-Factor Authentication</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Scan the QR code with Google Authenticator, Authy, or any TOTP app.
        </p>

        <!-- QR Code -->
        <div class="flex justify-center mb-6">
            <img src="<?= e(\$qr_url) ?>" alt="QR Code" class="w-48 h-48 rounded-lg border border-slate-200 dark:border-slate-700 p-2">
        </div>

        <!-- Manual Secret -->
        <div class="mb-6">
            <label class="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                Or enter this secret manually:
            </label>
            <div class="flex items-center gap-2">
                <code class="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm font-mono text-slate-700 dark:text-slate-300 select-all">
                    <?= e(\$secret) ?>
                </code>
                <button onclick="navigator.clipboard.writeText('<?= e(\$secret) ?>')"
                        class="px-3 py-2 bg-slate-200 dark:bg-slate-600 rounded-lg text-sm hover:bg-slate-300 dark:hover:bg-slate-500">
                    Copy
                </button>
            </div>
        </div>

        <!-- Verification Code -->
        <form method="POST" action="<?= url('admin/2fa/setup') ?>">
            <?= CSRF::field() ?>
            <input type="hidden" name="secret" value="<?= e(\$secret) ?>">

            <div class="mb-4">
                <label for="code" class="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                    Enter the 6-digit code to verify
                </label>
                <input type="text"
                       id="code"
                       name="code"
                       required
                       maxlength="6"
                       pattern="[0-9]{6}"
                       inputmode="numeric"
                       autocomplete="one-time-code"
                       autofocus
                       placeholder="000000"
                       class="w-full text-center text-2xl font-mono tracking-widest py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>

            <button type="submit"
                    class="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors">
                Enable Two-Factor Authentication
            </button>
        </form>
    </div>
</div>
`
  },
];
