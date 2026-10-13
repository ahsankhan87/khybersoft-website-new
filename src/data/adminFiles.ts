export interface AdminFile {
  path: string;
  name: string;
  language: string;
  content: string;
  description: string;
  category: 'auth' | 'layout' | 'dashboard' | 'middleware' | 'routes' | 'partials' | 'helpers';
}

export const adminFiles: AdminFile[] = [
  // ═══════════════════════════════════════════════════════
  // AUTH CONTROLLER
  // ═══════════════════════════════════════════════════════
  {
    path: 'app/controllers/admin/AuthController.php',
    name: 'AuthController.php',
    language: 'php',
    category: 'auth',
    description: 'Full authentication: login, logout, forgot/reset password, 2FA, rate limiting',
    content: `<?php
declare(strict_types=1);

namespace App\\Controllers\\Admin;

use App\\Core\\Controller;
use App\\Core\\Auth;
use App\\Core\\Validator;
use App\\Core\\Database;
use App\\Core\\CSRF;

/**
 * Admin Auth Controller
 * Handles login, logout, forgot/reset password, and 2FA
 */
class AuthController extends Controller
{
    protected string \$layout = 'auth';

    // ─── LOGIN ───────────────────────────────────────────

    public function showLogin(): void
    {
        if (Auth::check()) {
            \$this->redirect('/admin');
            return;
        }

        \$this->view('admin.auth.login', [
            'page_title' => 'Admin Login',
        ]);
    }

    public function login(): void
    {
        if (!\$this->validateCsrf()) return;

        // Rate limiting check
        if (\$this->isRateLimited()) {
            flash('error', 'Too many login attempts. Please try again in 15 minutes.');
            \$this->redirect('/admin/login');
            return;
        }

        \$validator = Validator::make(\$_POST, [
            'email'    => 'required|email',
            'password' => 'required|min:6',
        ]);

        if (!\$validator->validate()) {
            flash_input();
            flash('errors', json_encode(\$validator->errors()));
            \$this->redirect('/admin/login');
            return;
        }

        \$email    = trim(\$this->input('email'));
        \$password = \$this->input('password');
        \$remember = (bool) \$this->input('remember');

        if (Auth::attempt(\$email, \$password, \$remember)) {
            \$this->clearLoginAttempts();

            // Check if 2FA is enabled for this user
            if (Auth::hasTwoFactorEnabled()) {
                \$_SESSION['2fa_pending'] = true;
                \$this->redirect('/admin/2fa');
                return;
            }

            // Complete login
            \$this->completeLogin();
        } else {
            \$this->recordFailedAttempt();
            flash_input();
            flash('error', 'Invalid email or password.');
            \$this->redirect('/admin/login');
        }
    }

    // ─── TWO-FACTOR AUTHENTICATION ───────────────────────

    public function showTwoFactor(): void
    {
        if (!isset(\$_SESSION['2fa_pending'])) {
            \$this->redirect('/admin/login');
            return;
        }

        \$this->view('admin.auth.two-factor', [
            'page_title' => 'Two-Factor Authentication',
        ]);
    }

    public function verifyTwoFactor(): void
    {
        if (!\$this->validateCsrf()) return;

        if (!isset(\$_SESSION['2fa_pending'])) {
            \$this->redirect('/admin/login');
            return;
        }

        \$code = \$this->input('code');
        if (!\$code || strlen(\$code) !== 6) {
            flash('error', 'Please enter a valid 6-digit code.');
            \$this->redirect('/admin/2fa');
            return;
        }

        \$user = Auth::user();
        if (\$user && Auth::verifyTwoFactorCode(\$user['id'], \$code)) {
            unset(\$_SESSION['2fa_pending']);
            \$this->completeLogin();
        } else {
            flash('error', 'Invalid authentication code.');
            \$this->redirect('/admin/2fa');
        }
    }

    // ─── FORGOT PASSWORD ─────────────────────────────────

    public function showForgotPassword(): void
    {
        \$this->view('admin.auth.forgot-password', [
            'page_title' => 'Forgot Password',
        ]);
    }

    public function sendResetLink(): void
    {
        if (!\$this->validateCsrf()) return;

        \$validator = Validator::make(\$_POST, [
            'email' => 'required|email',
        ]);

        if (!\$validator->validate()) {
            flash_input();
            flash('errors', json_encode(\$validator->errors()));
            \$this->redirect('/admin/forgot-password');
            return;
        }

        \$email = trim(\$this->input('email'));
        \$db = Database::getInstance();

        \$user = \$db->fetch(
            "SELECT id, name, email FROM users WHERE email = ? AND status = 'active' AND deleted_at IS NULL",
            [\$email]
        );

        // Always show success to prevent email enumeration
        if (\$user) {
            \$token = bin2hex(random_bytes(32));
            \$hashedToken = hash('sha256', \$token);
            \$expiresAt = date('Y-m-d H:i:s', time() + 3600); // 1 hour

            // Delete any existing tokens
            \$db->delete('password_reset_tokens', 'user_id = ?', [\$user['id']]);

            \$db->insert('password_reset_tokens', [
                'user_id'    => \$user['id'],
                'token'      => \$hashedToken,
                'expires_at' => \$expiresAt,
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            // Send email
            \$resetUrl = SITE_URL . '/admin/reset-password?token=' . \$token . '&email=' . urlencode(\$email);
            \$this->sendResetEmail(\$user['email'], \$user['name'], \$resetUrl);
        }

        flash('success', 'If an account exists with that email, a reset link has been sent.');
        \$this->redirect('/admin/forgot-password');
    }

    // ─── RESET PASSWORD ──────────────────────────────────

    public function showResetPassword(): void
    {
        \$token = \$_GET['token'] ?? '';
        \$email = \$_GET['email'] ?? '';

        if (!\$token || !\$email) {
            flash('error', 'Invalid reset link.');
            \$this->redirect('/admin/login');
            return;
        }

        \$this->view('admin.auth.reset-password', [
            'page_title' => 'Reset Password',
            'token'      => \$token,
            'email'      => \$email,
        ]);
    }

    public function resetPassword(): void
    {
        if (!\$this->validateCsrf()) return;

        \$validator = Validator::make(\$_POST, [
            'token'     => 'required',
            'email'     => 'required|email',
            'password'  => 'required|min:8|confirmed',
        ]);

        if (!\$validator->validate()) {
            flash_input();
            flash('errors', json_encode(\$validator->errors()));
            \$this->redirectBack();
            return;
        }

        \$token = \$this->input('token');
        \$email = trim(\$this->input('email'));
        \$hashedToken = hash('sha256', \$token);

        \$db = Database::getInstance();

        // Verify token
        \$resetRecord = \$db->fetch(
            "SELECT prt.*, u.id as user_id
             FROM password_reset_tokens prt
             INNER JOIN users u ON prt.user_id = u.id
             WHERE prt.token = ? AND u.email = ? AND prt.expires_at > NOW()",
            [\$hashedToken, \$email]
        );

        if (!\$resetRecord) {
            flash('error', 'Invalid or expired reset token.');
            \$this->redirect('/admin/forgot-password');
            return;
        }

        // Update password
        \$newHash = password_hash(\$this->input('password'), PASSWORD_BCRYPT, ['cost' => 12]);
        \$db->update('users', [
            'password_hash' => \$newHash,
            'updated_at'    => date('Y-m-d H:i:s'),
        ], 'id = ?', [\$resetRecord['user_id']]);

        // Delete used token
        \$db->delete('password_reset_tokens', 'user_id = ?', [\$resetRecord['user_id']]);

        // Force logout all sessions (clear remember token)
        \$db->update('users', ['remember_token' => null], 'id = ?', [\$resetRecord['user_id']]);

        // Log the activity
        \$db->insert('activity_logs', [
            'user_id'     => \$resetRecord['user_id'],
            'action'      => 'password_reset',
            'description' => 'Password was reset via email',
            'ip'          => client_ip(),
            'user_agent'  => \$_SERVER['HTTP_USER_AGENT'] ?? '',
            'created_at'  => date('Y-m-d H:i:s'),
        ]);

        flash('success', 'Password has been reset successfully. Please log in.');
        \$this->redirect('/admin/login');
    }

    // ─── LOGOUT ──────────────────────────────────────────

    public function logout(): void
    {
        Auth::logout();
        \$this->redirect('/admin/login');
    }

    // ─── PRIVATE HELPERS ─────────────────────────────────

    private function completeLogin(): void
    {
        clear_old_input();
        \$intended = \$_SESSION['intended_url'] ?? SITE_URL . '/admin';
        unset(\$_SESSION['intended_url']);
        flash('success', 'Welcome back!');
        \$this->redirect(\$intended);
    }

    private function isRateLimited(): bool
    {
        \$attempts = \$_SESSION['login_attempts'] ?? [];
        \$now = time();
        \$window = 900; // 15 minutes

        // Clean old attempts
        \$attempts = array_filter(\$attempts, fn(\$t) => (\$now - \$t) < \$window);
        \$_SESSION['login_attempts'] = \$attempts;

        return count(\$attempts) >= 5;
    }

    private function recordFailedAttempt(): void
    {
        if (!isset(\$_SESSION['login_attempts'])) {
            \$_SESSION['login_attempts'] = [];
        }
        \$_SESSION['login_attempts'][] = time();
    }

    private function clearLoginAttempts(): void
    {
        unset(\$_SESSION['login_attempts']);
    }

    private function sendResetEmail(string \$email, string \$name, string \$resetUrl): void
    {
        \$siteName = setting('site_name', 'Khybersoft');
        \$subject  = "Password Reset - {\$siteName}";

        \$htmlBody = <<<HTML
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family:Arial,sans-serif;background:#0f172a;padding:40px 20px;">
            <div style="max-width:500px;margin:0 auto;background:#1e293b;border-radius:12px;padding:40px;border:1px solid #334155;">
                <h2 style="color:#fff;margin:0 0 10px;">Password Reset</h2>
                <p style="color:#94a3b8;line-height:1.6;">
                    Hi {\$name},<br><br>
                    You requested a password reset. Click the button below to set a new password.
                    This link expires in 1 hour.
                </p>
                <a href="{\$resetUrl}"
                   style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 32px;
                          border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">
                    Reset Password
                </a>
                <p style="color:#64748b;font-size:13px;margin-top:24px;">
                    If you didn't request this, you can safely ignore this email.
                </p>
            </div>
        </body>
        </html>
        HTML;

        \$headers = [
            'MIME-Version: 1.0',
            'Content-type: text/html; charset=UTF-8',
            'From: ' . \$siteName . ' <' . setting('site_email', 'noreply@khybersoft.com') . '>',
            'X-Mailer: PHP/' . phpversion(),
        ];

        // Use PHP mail() — in production, configure SMTP via settings
        @mail(\$email, \$subject, \$htmlBody, implode("\\r\\n", \$headers));
    }
}
`
  },

  // ═══════════════════════════════════════════════════════
  // DASHBOARD CONTROLLER
  // ═══════════════════════════════════════════════════════
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
use App\\Core\\Database;
use App\\Core\\Auth;

/**
 * Admin Dashboard Controller
 * Stats, charts, recent activity, system health
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

    public function index(): void
    {
        \$data = [
            'page_title'       => 'Dashboard',
            'breadcrumbs'      => [['label' => 'Dashboard', 'url' => '/admin']],
            'stats'            => \$this->getStats(),
            'sparklines'       => \$this->getSparklineData(),
            'recentInquiries'  => \$this->getRecentInquiries(),
            'recentActivity'   => \$this->getRecentActivity(),
            'topProducts'      => \$this->getTopProducts(),
            'trafficData'      => \$this->getTrafficData(),
            'systemHealth'     => \$this->getSystemHealth(),
            'quickActions'     => \$this->getQuickActions(),
        ];

        \$this->view('admin.dashboard.index', \$data);
    }

    // ─── STATS CARDS ─────────────────────────────────────

    private function getStats(): array
    {
        return [
            [
                'label'    => 'Total Products',
                'value'    => (int) \$this->db->fetchColumn(
                    "SELECT COUNT(*) FROM products WHERE deleted_at IS NULL AND status = 'published'"
                ),
                'change'   => \$this->getPercentChange('products', 30),
                'icon'     => 'package',
                'color'    => 'blue',
            ],
            [
                'label'    => 'Inquiries Today',
                'value'    => (int) \$this->db->fetchColumn(
                    "SELECT COUNT(*) FROM product_inquiries WHERE DATE(created_at) = CURDATE()"
                ),
                'change'   => \$this->getPercentChange('product_inquiries', 7),
                'icon'     => 'inbox',
                'color'    => 'emerald',
            ],
            [
                'label'    => 'Blog Posts',
                'value'    => (int) \$this->db->fetchColumn(
                    "SELECT COUNT(*) FROM blog_posts WHERE deleted_at IS NULL AND status = 'published'"
                ),
                'change'   => \$this->getPercentChange('blog_posts', 30),
                'icon'     => 'file-text',
                'color'    => 'violet',
            ],
            [
                'label'    => 'Subscribers',
                'value'    => (int) \$this->db->fetchColumn(
                    "SELECT COUNT(*) FROM newsletter_subscribers WHERE status = 'active'"
                ),
                'change'   => \$this->getPercentChange('newsletter_subscribers', 30),
                'icon'     => 'users',
                'color'    => 'amber',
            ],
        ];
    }

    private function getPercentChange(string \$table, int \$days): float
    {
        \$current = (int) \$this->db->fetchColumn(
            "SELECT COUNT(*) FROM \`{\$table}\` WHERE created_at >= DATE_SUB(NOW(), INTERVAL {\$days} DAY)"
        );
        \$previous = (int) \$this->db->fetchColumn(
            "SELECT COUNT(*) FROM \`{\$table}\` WHERE created_at >= DATE_SUB(NOW(), INTERVAL " . (\$days * 2) . " DAY)
             AND created_at < DATE_SUB(NOW(), INTERVAL {\$days} DAY)"
        );

        if (\$previous === 0) return \$current > 0 ? 100.0 : 0.0;
        return round(((\$current - \$previous) / \$previous) * 100, 1);
    }

    // ─── SPARKLINE DATA ──────────────────────────────────

    private function getSparklineData(): array
    {
        \$days = 14;
        \$tables = ['products', 'product_inquiries', 'blog_posts', 'newsletter_subscribers'];
        \$data = [];

        foreach (\$tables as \$table) {
            \$points = [];
            for (\$i = \$days - 1; \$i >= 0; \$i--) {
                \$date = date('Y-m-d', strtotime("-{\$i} days"));
                \$count = (int) \$this->db->fetchColumn(
                    "SELECT COUNT(*) FROM \`{\$table}\` WHERE DATE(created_at) = ?",
                    [\$date]
                );
                \$points[] = \$count;
            }
            \$data[\$table] = \$points;
        }

        return \$data;
    }

    // ─── RECENT INQUIRIES ────────────────────────────────

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

    // ─── RECENT ACTIVITY ─────────────────────────────────

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

    // ─── TOP PRODUCTS ────────────────────────────────────

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

    // ─── TRAFFIC DATA (for Chart.js) ────────────────────

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
            'labels'    => \$labels,
            'inquiries' => \$inquiries,
            'messages'  => \$messages,
        ];
    }

    // ─── SYSTEM HEALTH ───────────────────────────────────

    private function getSystemHealth(): array
    {
        \$dbSize = \$this->db->fetch(
            "SELECT
                ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size_mb,
                COUNT(*) as table_count
             FROM information_schema.tables
             WHERE table_schema = DATABASE()"
        );

        return [
            'php_version'    => PHP_VERSION,
            'server_software' => \$_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
            'mysql_version'  => \$this->db->fetchColumn("SELECT VERSION()"),
            'db_size'        => \$dbSize['size_mb'] ?? '0',
            'db_tables'      => \$dbSize['table_count'] ?? '0',
            'disk_free'      => function_exists('disk_free_space')
                ? round(disk_free_space('/') / 1024 / 1024 / 1024, 2) . ' GB'
                : 'N/A',
            'disk_total'     => function_exists('disk_total_space')
                ? round(disk_total_space('/') / 1024 / 1024 / 1024, 2) . ' GB'
                : 'N/A',
            'memory_limit'   => ini_get('memory_limit'),
            'upload_max'     => ini_get('upload_max_filesize'),
            'max_execution'  => ini_get('max_execution_time') . 's',
            'ssl'            => (!empty(\$_SERVER['HTTPS']) && \$_SERVER['HTTPS'] !== 'off') ? 'Active' : 'Not detected',
        ];
    }

    // ─── QUICK ACTIONS ───────────────────────────────────

    private function getQuickActions(): array
    {
        return [
            ['label' => 'New Product',   'url' => '/admin/products/create',       'icon' => 'plus-circle'],
            ['label' => 'New Blog Post', 'url' => '/admin/blog/create',           'icon' => 'edit'],
            ['label' => 'View Messages', 'url' => '/admin/messages',              'icon' => 'mail'],
            ['label' => 'Manage Users',  'url' => '/admin/users',                 'icon' => 'users'],
        ];
    }

    // ─── AJAX: Update inquiry status ─────────────────────

    public function updateInquiryStatus(): void
    {
        if (!\$this->validateCsrf()) {
            \$this->json(['error' => 'Invalid token'], 403);
            return;
        }

        \$id     = (int) \$this->input('id');
        \$status = \$this->input('status');

        \$validStatuses = ['new', 'in_progress', 'resolved', 'closed'];
        if (!in_array(\$status, \$validStatuses, true)) {
            \$this->json(['error' => 'Invalid status'], 422);
            return;
        }

        \$affected = \$this->db->update(
            'product_inquiries',
            ['status' => \$status, 'updated_at' => date('Y-m-d H:i:s')],
            'id = ?',
            [\$id]
        );

        if (\$affected) {
            // Log activity
            \$this->db->insert('activity_logs', [
                'user_id'     => Auth::id(),
                'action'      => 'inquiry_status_change',
                'model'       => 'product_inquiries',
                'model_id'    => \$id,
                'new_values'  => json_encode(['status' => \$status]),
                'description' => "Inquiry #\$id status changed to \$status",
                'ip'          => client_ip(),
                'user_agent'  => \$_SERVER['HTTP_USER_AGENT'] ?? '',
                'created_at'  => date('Y-m-d H:i:s'),
            ]);

            \$this->json(['success' => true, 'message' => 'Status updated']);
        } else {
            \$this->json(['error' => 'Update failed'], 500);
        }
    }
}
`
  },

  // ═══════════════════════════════════════════════════════
  // MIDDLEWARE
  // ═══════════════════════════════════════════════════════
  {
    path: 'app/middleware/AdminAuth.php',
    name: 'AdminAuth.php',
    language: 'php',
    category: 'middleware',
    description: 'Admin authentication middleware with session timeout check',
    content: `<?php
declare(strict_types=1);

namespace App\\Middleware;

use App\\Core\\Auth;

/**
 * Admin Authentication Middleware
 * Checks auth, session timeout, and 2FA status
 */
class AdminAuth
{
    public function handle(): bool
    {
        // Must be authenticated
        if (Auth::guest()) {
            \$_SESSION['intended_url'] = \$_SERVER['REQUEST_URI'];
            flash('error', 'Please log in to access the admin panel.');
            header('Location: ' . SITE_URL . '/admin/login');
            exit;
        }

        // Check session timeout
        \$lastActivity = \$_SESSION['last_activity'] ?? 0;
        if (time() - \$lastActivity > SESSION_LIFETIME) {
            Auth::logout();
            flash('error', 'Session expired. Please log in again.');
            header('Location: ' . SITE_URL . '/admin/login');
            exit;
        }

        // Update last activity
        \$_SESSION['last_activity'] = time();

        // Check if 2FA is pending
        if (isset(\$_SESSION['2fa_pending'])) {
            header('Location: ' . SITE_URL . '/admin/2fa');
            exit;
        }

        // Must be admin or super_admin
        if (!Auth::isAdmin()) {
            http_response_code(403);
            echo '<!DOCTYPE html><html><head><title>403 Forbidden</title></head>';
            echo '<body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;';
            echo 'min-height:100vh;background:#0f172a;color:#e2e8f0;margin:0;">';
            echo '<div style="text-align:center;">';
            echo '<h1 style="font-size:48px;margin:0;">403</h1>';
            echo '<p style="color:#94a3b8;">Access denied. Admin privileges required.</p>';
            echo '<a href="' . SITE_URL . '/admin/login" style="color:#3b82f6;">Back to login</a>';
            echo '</div></body></html>';
            exit;
        }

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
 * Checks if user has a specific permission slug
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
        // Must be authenticated first
        if (Auth::guest()) {
            \$_SESSION['intended_url'] = \$_SERVER['REQUEST_URI'];
            flash('error', 'Please log in to continue.');
            header('Location: ' . SITE_URL . '/admin/login');
            exit;
        }

        // Super admin bypasses all permission checks
        if (Auth::hasRole('super_admin')) {
            return true;
        }

        // Check specific permission
        if (\$this->permission && !Auth::can(\$this->permission)) {
            // Log unauthorized access attempt
            \$db = \\App\\Core\\Database::getInstance();
            \$db->insert('activity_logs', [
                'user_id'     => Auth::id(),
                'action'      => 'unauthorized_access',
                'description' => 'Attempted access requiring: ' . \$this->permission,
                'ip'          => \$_SERVER['REMOTE_ADDR'] ?? '',
                'user_agent'  => \$_SERVER['HTTP_USER_AGENT'] ?? '',
                'created_at'  => date('Y-m-d H:i:s'),
            ]);

            http_response_code(403);
            echo '<!DOCTYPE html><html><head><title>403 Forbidden</title></head>';
            echo '<body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;';
            echo 'min-height:100vh;background:#0f172a;color:#e2e8f0;margin:0;">';
            echo '<div style="text-align:center;">';
            echo '<h1 style="font-size:48px;margin:0;">403</h1>';
            echo '<p style="color:#94a3b8;">You do not have permission to access this resource.</p>';
            echo '<a href="' . SITE_URL . '/admin" style="color:#3b82f6;">Back to dashboard</a>';
            echo '</div></body></html>';
            exit;
        }

        return true;
    }
}
`
  },

  // ═══════════════════════════════════════════════════════
  // ADMIN LAYOUT
  // ═══════════════════════════════════════════════════════
  {
    path: 'app/views/layouts/admin.php',
    name: 'admin.php',
    language: 'php',
    category: 'layout',
    description: 'Main admin layout with sidebar, navbar, dark mode, toasts, Alpine.js',
    content: `<!DOCTYPE html>
<html lang="en" x-data="adminApp()" :class="{ 'dark': darkMode }" class="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e(\$page_title ?? 'Admin') ?> — <?= e(setting('site_name')) ?> Admin</title>
    <?= \\App\\Core\\CSRF::meta() ?>

    <!-- TailwindCSS CDN (use compiled CSS in production) -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
                    colors: {
                        brand: { 50:'#eff6ff',100:'#dbeafe',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8' }
                    }
                }
            }
        }
    </script>

    <!-- Alpine.js -->
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>

    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.x.x/dist/chart.umd.min.js"></script>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

    <style>
        [x-cloak] { display: none !important; }
        .sidebar-transition { transition: width 0.3s ease, transform 0.3s ease; }
        .fade-in { animation: fadeIn 0.2s ease-out; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
        .skeleton { background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
                    background-size: 200% 100%; animation: shimmer 1.5s infinite; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    </style>
</head>
<body class="bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-200 font-sans antialiased" x-cloak>

<!-- ═══ TOAST NOTIFICATIONS ═══ -->
<div class="fixed top-4 right-4 z-[100] space-y-2" style="min-width:320px;">
    <template x-if="toasts.length">
        <div>
            <template x-for="(toast, index) in toasts" :key="toast.id">
                <div x-show="toast.visible"
                     x-transition:enter="transition ease-out duration-300"
                     x-transition:enter-start="opacity-0 translate-x-8"
                     x-transition:enter-end="opacity-100 translate-x-0"
                     x-transition:leave="transition ease-in duration-200"
                     x-transition:leave-start="opacity-100 translate-x-0"
                     x-transition:leave-end="opacity-0 translate-x-8"
                     class="flex items-center gap-3 p-4 rounded-xl shadow-2xl border backdrop-blur-sm"
                     :class="{
                        'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200': toast.type === 'success',
                        'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200': toast.type === 'error',
                        'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200': toast.type === 'info',
                        'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200': toast.type === 'warning',
                     }">
                    <!-- Icons -->
                    <template x-if="toast.type === 'success'">
                        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </template>
                    <template x-if="toast.type === 'error'">
                        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </template>
                    <template x-if="toast.type === 'info'">
                        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </template>
                    <p class="text-sm font-medium flex-1" x-text="toast.message"></p>
                    <button @click="removeToast(index)" class="flex-shrink-0 opacity-60 hover:opacity-100">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
            </template>
        </div>
    </template>
</div>

<div class="flex h-screen overflow-hidden">

    <!-- ═══ SIDEBAR ═══ -->
    <?php include APP_PATH . '/views/partials/admin/sidebar.php'; ?>

    <!-- ═══ MAIN CONTENT AREA ═══ -->
    <div class="flex-1 flex flex-col overflow-hidden"
         :class="sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'"
         style="transition: margin-left 0.3s ease;">

        <!-- ═══ TOP NAVBAR ═══ -->
        <?php include APP_PATH . '/views/partials/admin/navbar.php'; ?>

        <!-- ═══ BREADCRUMBS ═══ -->
        <?php include APP_PATH . '/views/partials/admin/breadcrumbs.php'; ?>

        <!-- ═══ PAGE CONTENT ═══ -->
        <main class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div class="fade-in">
                <?= \$_view_content_ ?>
            </div>
        </main>
    </div>
</div>

<!-- ═══ ALPINE.JS APP COMPONENT ═══ -->
<script>
function adminApp() {
    return {
        darkMode: localStorage.getItem('admin_dark_mode') === 'true',
        sidebarOpen: localStorage.getItem('admin_sidebar') !== 'collapsed',
        mobileSidebar: false,
        toasts: [],
        searchQuery: '',
        userDropdown: false,
        notifDropdown: false,

        init() {
            // Apply dark mode
            if (this.darkMode) {
                document.documentElement.classList.add('dark');
                document.documentElement.classList.remove('light');
            }

            // Load server-side flash messages as toasts
            <?php if (has_flash('success')): ?>
            this.addToast('success', <?= json_encode(get_flash('success')) ?>);
            <?php endif; ?>
            <?php if (has_flash('error')): ?>
            this.addToast('error', <?= json_encode(get_flash('error')) ?>);
            <?php endif; ?>
            <?php if (has_flash('info')): ?>
            this.addToast('info', <?= json_encode(get_flash('info')) ?>);
            <?php endif; ?>
            <?php if (has_flash('warning')): ?>
            this.addToast('warning', <?= json_encode(get_flash('warning')) ?>);
            <?php endif; ?>
        },

        toggleDarkMode() {
            this.darkMode = !this.darkMode;
            localStorage.setItem('admin_dark_mode', this.darkMode);
            document.documentElement.classList.toggle('dark', this.darkMode);
            document.documentElement.classList.toggle('light', !this.darkMode);
        },

        toggleSidebar() {
            this.sidebarOpen = !this.sidebarOpen;
            localStorage.setItem('admin_sidebar', this.sidebarOpen ? 'expanded' : 'collapsed');
        },

        addToast(type, message) {
            const id = Date.now();
            this.toasts.push({ id, type, message, visible: true });
            setTimeout(() => this.removeToast(this.toasts.findIndex(t => t.id === id)), 5000);
        },

        removeToast(index) {
            if (index > -1 && this.toasts[index]) {
                this.toasts[index].visible = false;
                setTimeout(() => this.toasts.splice(index, 1), 300);
            }
        }
    }
}
</script>

</body>
</html>
`
  },

  // ═══════════════════════════════════════════════════════
  // AUTH LAYOUT
  // ═══════════════════════════════════════════════════════
  {
    path: 'app/views/layouts/auth.php',
    name: 'auth.php',
    language: 'php',
    category: 'layout',
    description: 'Auth layout — dark gradient background, glassmorphism card',
    content: `<!DOCTYPE html>
<html lang="en" x-data="{ darkMode: localStorage.getItem('admin_dark_mode') === 'true' }" :class="{ 'dark': darkMode }">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e(\$page_title ?? 'Login') ?> — <?= e(setting('site_name')) ?></title>
    <?= \\App\\Core\\CSRF::meta() ?>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        [x-cloak] { display: none !important; }
        .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                 border: 1px solid rgba(255,255,255,0.1); }
        .glass-input { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); }
        .glass-input:focus { background: rgba(255,255,255,0.1); border-color: rgba(99,102,241,0.6);
                            box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
        .glow { box-shadow: 0 0 60px -12px rgba(99,102,241,0.3); }
    </style>
</head>
<body class="min-h-screen font-sans antialiased" x-cloak>
    <!-- Animated gradient background -->
    <div class="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
        <div class="absolute inset-0 opacity-30"
             style="background-image: radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.15) 0%, transparent 50%),
                                     radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.12) 0%, transparent 50%),
                                     radial-gradient(ellipse at 50% 80%, rgba(59,130,246,0.1) 0%, transparent 50%);">
        </div>
        <!-- Grid pattern -->
        <div class="absolute inset-0 opacity-[0.03]"
             style="background-image: linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
                                     linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px);
                    background-size: 60px 60px;">
        </div>
    </div>

    <!-- Toast notifications -->
    <div x-data="authToasts()" class="fixed top-4 right-4 z-[100] space-y-2" style="min-width:300px;">
        <template x-for="(toast, i) in toasts" :key="toast.id">
            <div x-show="toast.visible" x-transition
                 class="p-4 rounded-xl shadow-2xl border backdrop-blur-md text-sm font-medium"
                 :class="{
                    'bg-emerald-900/50 border-emerald-500/30 text-emerald-200': toast.type === 'success',
                    'bg-red-900/50 border-red-500/30 text-red-200': toast.type === 'error',
                    'bg-amber-900/50 border-amber-500/30 text-amber-200': toast.type === 'warning',
                 }"
                 x-text="toast.message">
            </div>
        </template>
    </div>

    <!-- Content -->
    <div class="relative z-10 min-h-screen flex items-center justify-center p-4">
        <?= \$_view_content_ ?>
    </div>

    <script>
    function authToasts() {
        return {
            toasts: [],
            init() {
                <?php if (has_flash('success')): ?>
                this.toasts.push({ id: 1, type:'success', message: <?= json_encode(get_flash('success')) ?>, visible:true });
                setTimeout(() => this.toasts = [], 5000);
                <?php endif; ?>
                <?php if (has_flash('error')): ?>
                this.toasts.push({ id: 2, type:'error', message: <?= json_encode(get_flash('error')) ?>, visible:true });
                setTimeout(() => this.toasts = [], 5000);
                <?php endif; ?>
            }
        }
    }
    </script>
</body>
</html>
`
  },

  // ═══════════════════════════════════════════════════════
  // LOGIN VIEW
  // ═══════════════════════════════════════════════════════
  {
    path: 'app/views/admin/auth/login.php',
    name: 'login.php',
    language: 'php',
    category: 'auth',
    description: 'Login page — glassmorphism card, premium dark design',
    content: `<div class="w-full max-w-md">
    <!-- Logo -->
    <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25 mb-4">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
        </div>
        <h1 class="text-2xl font-bold text-white">Welcome back</h1>
        <p class="text-slate-400 mt-1">Sign in to <?= e(setting('site_name')) ?> Admin</p>
    </div>

    <!-- Login Card -->
    <div class="glass rounded-2xl p-8 glow">
        <form method="POST" action="<?= url('admin/login') ?>" x-data="{ showPassword: false, loading: false }" @submit="loading = true">
            <?= \\App\\Core\\CSRF::field() ?>

            <!-- Email -->
            <div class="mb-5">
                <label class="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                    </div>
                    <input type="email" name="email" value="<?= old('email') ?>" required autofocus
                           class="glass-input w-full pl-11 pr-4 py-3 rounded-xl text-white placeholder-slate-500
                                  outline-none transition-all duration-200 text-sm"
                           placeholder="admin@khybersoft.com">
                </div>
            </div>

            <!-- Password -->
            <div class="mb-5">
                <label class="block text-sm font-medium text-slate-300 mb-2">Password</label>
                <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                        </svg>
                    </div>
                    <input :type="showPassword ? 'text' : 'password'" name="password" required
                           class="glass-input w-full pl-11 pr-12 py-3 rounded-xl text-white placeholder-slate-500
                                  outline-none transition-all duration-200 text-sm"
                           placeholder="••••••••">
                    <button type="button" @click="showPassword = !showPassword"
                            class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300">
                        <template x-if="!showPassword">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                            </svg>
                        </template>
                        <template x-if="showPassword">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                            </svg>
                        </template>
                    </button>
                </div>
            </div>

            <!-- Remember + Forgot -->
            <div class="flex items-center justify-between mb-6">
                <label class="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" name="remember" value="1"
                           class="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500
                                  focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer">
                    <span class="text-sm text-slate-400 group-hover:text-slate-300">Remember me</span>
                </label>
                <a href="<?= url('admin/forgot-password') ?>" class="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                    Forgot password?
                </a>
            </div>

            <!-- Submit -->
            <button type="submit"
                    :disabled="loading"
                    class="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white
                           bg-gradient-to-r from-indigo-600 to-purple-600
                           hover:from-indigo-500 hover:to-purple-500
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900
                           disabled:opacity-60 disabled:cursor-not-allowed
                           transition-all duration-200 shadow-lg shadow-indigo-500/25
                           flex items-center justify-center gap-2">
                <template x-if="!loading">
                    <span>Sign In</span>
                </template>
                <template x-if="loading">
                    <div class="flex items-center gap-2">
                        <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        <span>Signing in...</span>
                    </div>
                </template>
            </button>
        </form>
    </div>

    <!-- Footer -->
    <p class="text-center text-xs text-slate-500 mt-6">
        &copy; <?= date('Y') ?> <?= e(setting('site_name')) ?>. All rights reserved.
    </p>
</div>
`
  },

  // ═══════════════════════════════════════════════════════
  // FORGOT PASSWORD VIEW
  // ═══════════════════════════════════════════════════════
  {
    path: 'app/views/admin/auth/forgot-password.php',
    name: 'forgot-password.php',
    language: 'php',
    category: 'auth',
    description: 'Forgot password page with email input',
    content: `<div class="w-full max-w-md">
    <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25 mb-4">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
            </svg>
        </div>
        <h1 class="text-2xl font-bold text-white">Forgot Password?</h1>
        <p class="text-slate-400 mt-1">No worries, we'll send you reset instructions.</p>
    </div>

    <div class="glass rounded-2xl p-8 glow">
        <form method="POST" action="<?= url('admin/forgot-password') ?>" x-data="{ loading: false }" @submit="loading = true">
            <?= \\App\\Core\\CSRF::field() ?>

            <div class="mb-6">
                <label class="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                    </div>
                    <input type="email" name="email" value="<?= old('email') ?>" required autofocus
                           class="glass-input w-full pl-11 pr-4 py-3 rounded-xl text-white placeholder-slate-500
                                  outline-none transition-all duration-200 text-sm"
                           placeholder="admin@khybersoft.com">
                </div>
                <p class="text-xs text-slate-500 mt-2">Enter the email associated with your account and we'll send a reset link.</p>
            </div>

            <button type="submit" :disabled="loading"
                    class="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white
                           bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500
                           focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900
                           disabled:opacity-60 transition-all duration-200 shadow-lg shadow-amber-500/25
                           flex items-center justify-center gap-2">
                <template x-if="!loading">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                </template>
                <span x-text="loading ? 'Sending...' : 'Send Reset Link'"></span>
            </button>
        </form>
    </div>

    <p class="text-center mt-6">
        <a href="<?= url('admin/login') ?>" class="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
            ← Back to login
        </a>
    </p>
</div>
`
  },

  // ═══════════════════════════════════════════════════════
  // RESET PASSWORD VIEW
  // ═══════════════════════════════════════════════════════
  {
    path: 'app/views/admin/auth/reset-password.php',
    name: 'reset-password.php',
    language: 'php',
    category: 'auth',
    description: 'Reset password page with new password + confirmation',
    content: `<div class="w-full max-w-md">
    <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25 mb-4">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
        </div>
        <h1 class="text-2xl font-bold text-white">Reset Password</h1>
        <p class="text-slate-400 mt-1">Enter your new password below.</p>
    </div>

    <div class="glass rounded-2xl p-8 glow">
        <form method="POST" action="<?= url('admin/reset-password') ?>" x-data="{ loading: false, showPw: false }" @submit="loading = true">
            <?= \\App\\Core\\CSRF::field() ?>
            <input type="hidden" name="token" value="<?= e(\$token) ?>">
            <input type="hidden" name="email" value="<?= e(\$email) ?>">

            <div class="mb-5">
                <label class="block text-sm font-medium text-slate-300 mb-2">New Password</label>
                <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                        </svg>
                    </div>
                    <input :type="showPw ? 'text' : 'password'" name="password" required minlength="8"
                           class="glass-input w-full pl-11 pr-12 py-3 rounded-xl text-white placeholder-slate-500 outline-none transition-all text-sm"
                           placeholder="Min. 8 characters">
                    <button type="button" @click="showPw = !showPw" class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    </button>
                </div>
            </div>

            <div class="mb-6">
                <label class="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
                <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                    </div>
                    <input type="password" name="password_confirmation" required minlength="8"
                           class="glass-input w-full pl-11 pr-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none transition-all text-sm"
                           placeholder="Confirm new password">
                </div>
            </div>

            <button type="submit" :disabled="loading"
                    class="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white
                           bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500
                           focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900
                           disabled:opacity-60 transition-all duration-200 shadow-lg shadow-emerald-500/25
                           flex items-center justify-center gap-2">
                <span x-text="loading ? 'Resetting...' : 'Reset Password'"></span>
            </button>
        </form>
    </div>
</div>
`
  },

  // ═══════════════════════════════════════════════════════
  // 2FA VIEW
  // ═══════════════════════════════════════════════════════
  {
    path: 'app/views/admin/auth/two-factor.php',
    name: 'two-factor.php',
    language: 'php',
    category: 'auth',
    description: 'Two-factor authentication code entry page',
    content: `<div class="w-full max-w-md">
    <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25 mb-4">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
        </div>
        <h1 class="text-2xl font-bold text-white">Two-Factor Authentication</h1>
        <p class="text-slate-400 mt-1">Enter the 6-digit code from your authenticator app.</p>
    </div>

    <div class="glass rounded-2xl p-8 glow">
        <form method="POST" action="<?= url('admin/2fa/verify') ?>" x-data="{ loading: false }" @submit="loading = true">
            <?= \\App\\Core\\CSRF::field() ?>

            <div class="mb-6">
                <label class="block text-sm font-medium text-slate-300 mb-3 text-center">Authentication Code</label>
                <input type="text" name="code" required maxlength="6" pattern="[0-9]{6}" autofocus
                       class="glass-input w-full text-center text-3xl font-mono tracking-[0.5em] py-4 rounded-xl
                              text-white placeholder-slate-500 outline-none transition-all duration-200"
                       placeholder="000000"
                       x-on:input="if($el.value.length === 6) $el.closest('form').requestSubmit()">
                <p class="text-xs text-slate-500 mt-2 text-center">Open your Google Authenticator app to find the code.</p>
            </div>

            <button type="submit" :disabled="loading"
                    class="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white
                           bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500
                           focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900
                           disabled:opacity-60 transition-all duration-200 shadow-lg shadow-cyan-500/25
                           flex items-center justify-center gap-2">
                <span x-text="loading ? 'Verifying...' : 'Verify Code'"></span>
            </button>
        </form>

        <div class="mt-6 text-center">
            <a href="<?= url('admin/login') ?>" class="text-sm text-slate-400 hover:text-slate-300 transition-colors">
                ← Back to login
            </a>
        </div>
    </div>
</div>
`
  },

  // ═══════════════════════════════════════════════════════
  // SIDEBAR PARTIAL
  // ═══════════════════════════════════════════════════════
  {
    path: 'app/views/partials/admin/sidebar.php',
    name: 'sidebar.php',
    language: 'php',
    category: 'partials',
    description: 'Collapsible sidebar with grouped navigation and icons',
    content: `<!-- Mobile overlay -->
<div x-show="mobileSidebar" @click="mobileSidebar = false"
     x-transition:enter="transition ease-out duration-300"
     x-transition:enter-start="opacity-0" x-transition:enter-end="opacity-100"
     x-transition:leave="transition ease-in duration-200"
     x-transition:leave-start="opacity-100" x-transition:leave-end="opacity-0"
     class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"></div>

<!-- Sidebar -->
<aside class="fixed inset-y-0 left-0 z-50 flex flex-col
              bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700
              sidebar-transition overflow-hidden
              lg:translate-x-0"
       :class="[
           sidebarOpen ? 'w-64' : 'w-20',
           mobileSidebar ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
       ]">

    <!-- Logo -->
    <div class="flex items-center h-16 px-4 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
        <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                </svg>
            </div>
            <div x-show="sidebarOpen || mobileSidebar" x-transition class="min-w-0">
                <h2 class="text-sm font-bold text-gray-900 dark:text-white truncate"><?= e(setting('site_name')) ?></h2>
                <p class="text-[10px] text-gray-500 dark:text-slate-400 truncate">Admin Panel</p>
            </div>
        </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-1" x-show="sidebarOpen || mobileSidebar" x-transition>
        <?php
        \$currentUri = parse_url(\$_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);

        \$menuGroups = [
            '' => [
                ['label' => 'Dashboard', 'url' => '/admin', 'icon' => 'home'],
            ],
            'Content' => [
                ['label' => 'Pages', 'url' => '/admin/pages', 'icon' => 'file-text'],
                ['label' => 'Blog Posts', 'url' => '/admin/blog', 'icon' => 'edit-3'],
                ['label' => 'Categories', 'url' => '/admin/blog/categories', 'icon' => 'tag'],
                ['label' => 'Comments', 'url' => '/admin/comments', 'icon' => 'message-square'],
                ['label' => 'Media Library', 'url' => '/admin/media', 'icon' => 'image'],
            ],
            'Products' => [
                ['label' => 'All Products', 'url' => '/admin/products', 'icon' => 'package'],
                ['label' => 'Categories', 'url' => '/admin/products/categories', 'icon' => 'grid'],
                ['label' => 'Plans', 'url' => '/admin/products/plans', 'icon' => 'credit-card'],
                ['label' => 'Demos', 'url' => '/admin/products/demos', 'icon' => 'play-circle'],
                ['label' => 'Inquiries', 'url' => '/admin/inquiries', 'icon' => 'inbox'],
                ['label' => 'Tutorials', 'url' => '/admin/tutorials', 'icon' => 'book-open'],
                ['label' => 'Versions', 'url' => '/admin/products/versions', 'icon' => 'git-branch'],
            ],
            'Services' => [
                ['label' => 'Services', 'url' => '/admin/services', 'icon' => 'briefcase'],
                ['label' => 'Inquiries', 'url' => '/admin/services/inquiries', 'icon' => 'mail'],
                ['label' => 'Custom Requests', 'url' => '/admin/custom-development', 'icon' => 'code'],
            ],
            'Business' => [
                ['label' => 'Testimonials', 'url' => '/admin/testimonials', 'icon' => 'star'],
                ['label' => 'Team', 'url' => '/admin/team', 'icon' => 'users'],
                ['label' => 'Clients/Portfolio', 'url' => '/admin/clients', 'icon' => 'award'],
                ['label' => 'FAQs', 'url' => '/admin/faqs', 'icon' => 'help-circle'],
                ['label' => 'Messages', 'url' => '/admin/messages', 'icon' => 'send'],
                ['label' => 'Newsletter', 'url' => '/admin/newsletter', 'icon' => 'list'],
            ],
            'Marketing' => [
                ['label' => 'SEO Manager', 'url' => '/admin/seo', 'icon' => 'search'],
                ['label' => 'Redirects', 'url' => '/admin/redirects', 'icon' => 'arrow-right-circle'],
                ['label' => 'Sitemap', 'url' => '/admin/sitemap', 'icon' => 'map'],
            ],
            'System' => [
                ['label' => 'Users', 'url' => '/admin/users', 'icon' => 'user'],
                ['label' => 'Roles & Permissions', 'url' => '/admin/roles', 'icon' => 'shield'],
                ['label' => 'Settings', 'url' => '/admin/settings', 'icon' => 'settings'],
                ['label' => 'Activity Logs', 'url' => '/admin/activity-logs', 'icon' => 'activity'],
                ['label' => 'Backup', 'url' => '/admin/backup', 'icon' => 'database'],
            ],
        ];

        function sidebarIcon(string \$name): string {
            \$icons = [
                'home' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>',
                'file-text' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>',
                'edit-3' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>',
                'tag' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>',
                'message-square' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>',
                'image' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>',
                'package' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>',
                'grid' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>',
                'credit-card' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>',
                'play-circle' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
                'inbox' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>',
                'book-open' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>',
                'git-branch' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 3v12m0 0a3 3 0 103 3m-3-3a3 3 0 113-3m12-3a3 3 0 11-3 3m0-3a3 3 0 103 3m-3 0V6"/>',
                'briefcase' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>',
                'mail' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>',
                'code' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>',
                'star' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>',
                'users' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>',
                'award' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>',
                'help-circle' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
                'send' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>',
                'list' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>',
                'search' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>',
                'arrow-right-circle' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 7l5 5m0 0l-5 5m5-5H6"/>',
                'map' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>',
                'user' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>',
                'shield' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>',
                'settings' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>',
                'activity' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>',
                'database' => '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/>',
            ];
            return \$icons[\$name] ?? \$icons['home'];
        }

        foreach (\$menuGroups as \$groupLabel => \$items):
            if (\$groupLabel):
        ?>
            <div class="pt-4 pb-1">
                <p class="px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                    <?= e(\$groupLabel) ?>
                </p>
            </div>
        <?php endif; ?>

        <?php foreach (\$items as \$item):
            \$isActive = \$currentUri === \$item['url'] || (strlen(\$item['url']) > 7 && str_starts_with(\$currentUri ?? '', \$item['url']));
        ?>
            <a href="<?= url(ltrim(\$item['url'], '/')) ?>"
               class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
                      <?= \$isActive
                          ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm'
                          : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50 hover:text-gray-900 dark:hover:text-slate-200'
                      ?>"
               title="<?= e(\$item['label']) ?>">
                <svg class="w-5 h-5 flex-shrink-0 <?= \$isActive ? 'text-indigo-500' : 'text-gray-400 dark:text-slate-500 group-hover:text-gray-600 dark:group-hover:text-slate-300' ?>"
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <?= sidebarIcon(\$item['icon']) ?>
                </svg>
                <span class="truncate"><?= e(\$item['label']) ?></span>
            </a>
        <?php endforeach; ?>
        <?php endforeach; ?>
    </nav>

    <!-- Sidebar footer -->
    <div class="flex-shrink-0 border-t border-gray-200 dark:border-slate-700 p-3"
         x-show="sidebarOpen || mobileSidebar" x-transition>
        <div class="flex items-center gap-3 px-2 py-2">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                <span class="text-xs font-bold text-white"><?= strtoupper(substr(\\App\\Core\\Auth::user()['name'] ?? 'A', 0, 1)) ?></span>
            </div>
            <div class="min-w-0 flex-1">
                <p class="text-xs font-semibold text-gray-900 dark:text-white truncate"><?= e(\\App\\Core\\Auth::user()['name'] ?? 'Admin') ?></p>
                <p class="text-[10px] text-gray-500 dark:text-slate-400 truncate"><?= e(\\App\\Core\\Auth::user()['role_name'] ?? 'Admin') ?></p>
            </div>
        </div>
    </div>
</aside>
`
  },

  // ═══════════════════════════════════════════════════════
  // NAVBAR PARTIAL
  // ═══════════════════════════════════════════════════════
  {
    path: 'app/views/partials/admin/navbar.php',
    name: 'navbar.php',
    language: 'php',
    category: 'partials',
    description: 'Top navbar with search, notifications, user dropdown, dark mode toggle',
    content: `<header class="h-16 flex items-center justify-between px-4 sm:px-6
                bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">

    <!-- Left: Toggle + Search -->
    <div class="flex items-center gap-3">
        <!-- Mobile sidebar toggle -->
        <button @click="mobileSidebar = true" class="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
        </button>

        <!-- Desktop sidebar toggle -->
        <button @click="toggleSidebar()" class="hidden lg:flex p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"/>
            </svg>
        </button>

        <!-- Search -->
        <div class="hidden sm:flex items-center relative">
            <svg class="w-4 h-4 absolute left-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input type="text" x-model="searchQuery" placeholder="Search... (⌘K)"
                   class="pl-9 pr-4 py-2 w-64 rounded-xl text-sm
                          bg-gray-100 dark:bg-slate-700/50 border border-transparent
                          focus:bg-white dark:focus:bg-slate-700 focus:border-indigo-300 dark:focus:border-indigo-500
                          text-gray-900 dark:text-slate-200 placeholder-gray-400
                          outline-none transition-all duration-200">
        </div>
    </div>

    <!-- Right: Actions -->
    <div class="flex items-center gap-2">
        <!-- Dark mode toggle -->
        <button @click="toggleDarkMode()"
                class="p-2 rounded-xl text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                :title="darkMode ? 'Switch to light mode' : 'Switch to dark mode'">
            <template x-if="!darkMode">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
                </svg>
            </template>
            <template x-if="darkMode">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
                </svg>
            </template>
        </button>

        <!-- Site preview -->
        <a href="<?= SITE_URL ?>" target="_blank"
           class="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
            </svg>
            <span>View Site</span>
        </a>

        <!-- Notifications -->
        <div class="relative" x-data="{ open: false }">
            <button @click="open = !open" class="relative p-2 rounded-xl text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
                <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div x-show="open" @click.away="open = false"
                 x-transition:enter="transition ease-out duration-200"
                 x-transition:enter-start="opacity-0 scale-95" x-transition:enter-end="opacity-100 scale-100"
                 x-transition:leave="transition ease-in duration-150"
                 x-transition:leave-start="opacity-100 scale-100" x-transition:leave-end="opacity-0 scale-95"
                 class="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden z-50">
                <div class="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                    <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
                </div>
                <div class="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-700">
                    <a href="<?= url('admin/inquiries') ?>" class="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                        <p class="text-sm text-gray-900 dark:text-slate-200">New product inquiry received</p>
                        <p class="text-xs text-gray-500 dark:text-slate-400 mt-0.5">2 minutes ago</p>
                    </a>
                    <a href="<?= url('admin/messages') ?>" class="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                        <p class="text-sm text-gray-900 dark:text-slate-200">New contact message</p>
                        <p class="text-xs text-gray-500 dark:text-slate-400 mt-0.5">15 minutes ago</p>
                    </a>
                </div>
                <div class="px-4 py-2 border-t border-gray-200 dark:border-slate-700">
                    <a href="#" class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">View all notifications</a>
                </div>
            </div>
        </div>

        <!-- User dropdown -->
        <div class="relative" x-data="{ open: false }">
            <button @click="open = !open" class="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                    <span class="text-xs font-bold text-white"><?= strtoupper(substr(\\App\\Core\\Auth::user()['name'] ?? 'A', 0, 1)) ?></span>
                </div>
                <svg class="w-4 h-4 text-gray-400 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
            </button>
            <div x-show="open" @click.away="open = false"
                 x-transition:enter="transition ease-out duration-200"
                 x-transition:enter-start="opacity-0 scale-95" x-transition:enter-end="opacity-100 scale-100"
                 x-transition:leave="transition ease-in duration-150"
                 x-transition:leave-start="opacity-100 scale-100" x-transition:leave-end="opacity-0 scale-95"
                 class="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden z-50">
                <div class="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                    <p class="text-sm font-semibold text-gray-900 dark:text-white"><?= e(\\App\\Core\\Auth::user()['name'] ?? 'Admin') ?></p>
                    <p class="text-xs text-gray-500 dark:text-slate-400"><?= e(\\App\\Core\\Auth::user()['email'] ?? '') ?></p>
                </div>
                <div class="py-1">
                    <a href="<?= url('admin/users/' . (\\App\\Core\\Auth::id() ?? 0) . '/edit') ?>" class="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                        My Profile
                    </a>
                    <a href="<?= url('admin/settings') ?>" class="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        Settings
                    </a>
                </div>
                <div class="border-t border-gray-200 dark:border-slate-700 py-1">
                    <a href="<?= url('admin/logout') ?>" class="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                        Sign Out
                    </a>
                </div>
            </div>
        </div>
    </div>
</header>
`
  },

  // ═══════════════════════════════════════════════════════
  // BREADCRUMBS PARTIAL
  // ═══════════════════════════════════════════════════════
  {
    path: 'app/views/partials/admin/breadcrumbs.php',
    name: 'breadcrumbs.php',
    language: 'php',
    category: 'partials',
    description: 'Breadcrumb navigation component',
    content: `<?php if (!empty(\$breadcrumbs)): ?>
<div class="px-4 sm:px-6 lg:px-8 py-3 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
    <nav class="flex items-center gap-1.5 text-sm">
        <a href="<?= url('admin') ?>" class="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
        </a>
        <?php foreach (\$breadcrumbs as \$i => \$crumb): ?>
            <svg class="w-3.5 h-3.5 text-gray-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
            <?php if (\$i === count(\$breadcrumbs) - 1): ?>
                <span class="text-gray-900 dark:text-slate-200 font-medium"><?= e(\$crumb['label']) ?></span>
            <?php else: ?>
                <a href="<?= url(ltrim(\$crumb['url'], '/')) ?>" class="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors">
                    <?= e(\$crumb['label']) ?>
                </a>
            <?php endif; ?>
        <?php endforeach; ?>
    </nav>
</div>
<?php endif; ?>
`
  },

  // ═══════════════════════════════════════════════════════
  // DASHBOARD VIEW
  // ═══════════════════════════════════════════════════════
  {
    path: 'app/views/admin/dashboard/index.php',
    name: 'dashboard/index.php',
    language: 'php',
    category: 'dashboard',
    description: 'Dashboard with stat cards, sparklines, charts, tables, and system health',
    content: `<div class="space-y-6" x-data="dashboardApp()" x-init="init()">

    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p class="text-sm text-gray-500 dark:text-slate-400 mt-1">Welcome back, <?= e(\\App\\Core\\Auth::user()['name'] ?? 'Admin') ?> 👋</p>
        </div>
        <div class="flex items-center gap-2">
            <?php foreach (\$quickActions as \$action): ?>
            <a href="<?= url(ltrim(\$action['url'], '/')) ?>"
               class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                      bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-sm shadow-indigo-500/25">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                <?= e(\$action['label']) ?>
            </a>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- ═══ STATS CARDS ═══ -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <?php foreach (\$stats as \$i => \$stat):
            \$colors = [
                'blue'    => ['bg' => 'bg-blue-50 dark:bg-blue-900/20', 'icon' => 'text-blue-600 dark:text-blue-400', 'ring' => 'ring-blue-500/20'],
                'emerald' => ['bg' => 'bg-emerald-50 dark:bg-emerald-900/20', 'icon' => 'text-emerald-600 dark:text-emerald-400', 'ring' => 'ring-emerald-500/20'],
                'violet'  => ['bg' => 'bg-violet-50 dark:bg-violet-900/20', 'icon' => 'text-violet-600 dark:text-violet-400', 'ring' => 'ring-violet-500/20'],
                'amber'   => ['bg' => 'bg-amber-50 dark:bg-amber-900/20', 'icon' => 'text-amber-600 dark:text-amber-400', 'ring' => 'ring-amber-500/20'],
            ];
            \$c = \$colors[\$stat['color']] ?? \$colors['blue'];
        ?>
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5 hover:shadow-lg transition-shadow duration-200">
            <div class="flex items-start justify-between">
                <div>
                    <p class="text-sm font-medium text-gray-500 dark:text-slate-400"><?= e(\$stat['label']) ?></p>
                    <p class="text-3xl font-bold text-gray-900 dark:text-white mt-1"><?= number_format(\$stat['value']) ?></p>
                </div>
                <div class="w-10 h-10 rounded-xl <?= \$c['bg'] ?> ring-1 <?= \$c['ring'] ?> flex items-center justify-center">
                    <svg class="w-5 h-5 <?= \$c['icon'] ?>" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                    </svg>
                </div>
            </div>
            <div class="mt-3 flex items-center gap-2">
                <span class="inline-flex items-center text-xs font-medium <?= \$stat['change'] >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400' ?>">
                    <?= \$stat['change'] >= 0 ? '↑' : '↓' ?> <?= abs(\$stat['change']) ?>%
                </span>
                <span class="text-xs text-gray-400 dark:text-slate-500">vs last period</span>
            </div>
            <!-- Sparkline -->
            <div class="mt-2 h-8">
                <canvas id="sparkline-<?= \$i ?>" width="200" height="32"></canvas>
            </div>
        </div>
        <?php endforeach; ?>
    </div>

    <!-- ═══ CHART + TOP PRODUCTS ═══ -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <!-- Traffic Chart -->
        <div class="xl:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Activity Overview</h3>
                <span class="text-xs text-gray-400 dark:text-slate-500">Last 30 days</span>
            </div>
            <div class="h-64">
                <canvas id="trafficChart"></canvas>
            </div>
        </div>

        <!-- Top Products -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Products</h3>
            <div class="space-y-3">
                <?php foreach (\$topProducts as \$i => \$product): ?>
                <div class="flex items-center gap-3">
                    <span class="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        <?= \$i + 1 ?>
                    </span>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900 dark:text-slate-200 truncate"><?= e(\$product['name']) ?></p>
                        <div class="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5 mt-1">
                            <div class="bg-indigo-500 h-1.5 rounded-full" style="width: <?= min(100, (\$product['inquiry_count'] / max(1, \$topProducts[0]['inquiry_count'] ?? 1)) * 100) ?>%"></div>
                        </div>
                    </div>
                    <span class="text-sm font-semibold text-gray-900 dark:text-white"><?= \$product['inquiry_count'] ?></span>
                </div>
                <?php endforeach; ?>
                <?php if (empty(\$topProducts)): ?>
                <p class="text-sm text-gray-400 dark:text-slate-500 text-center py-4">No inquiry data yet</p>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <!-- ═══ RECENT INQUIRIES + ACTIVITY ═══ -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <!-- Recent Inquiries -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Recent Inquiries</h3>
                <a href="<?= url('admin/inquiries') ?>" class="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">View all</a>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead class="bg-gray-50 dark:bg-slate-700/50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Name</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Product</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Status</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Date</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 dark:divide-slate-700">
                        <?php foreach (\$recentInquiries as \$inq):
                            \$statusColors = [
                                'new' => 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                                'in_progress' => 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                                'resolved' => 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                                'closed' => 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
                            ];
                            \$sc = \$statusColors[\$inq['status']] ?? \$statusColors['new'];
                        ?>
                        <tr class="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                            <td class="px-4 py-3">
                                <p class="font-medium text-gray-900 dark:text-slate-200"><?= e(\$inq['name']) ?></p>
                                <p class="text-xs text-gray-500 dark:text-slate-400"><?= e(\$inq['email']) ?></p>
                            </td>
                            <td class="px-4 py-3 text-gray-600 dark:text-slate-300"><?= e(\$inq['product_name'] ?? 'N/A') ?></td>
                            <td class="px-4 py-3">
                                <select onchange="updateInquiryStatus(<?= \$inq['id'] ?>, this.value)"
                                        class="text-xs font-medium px-2 py-1 rounded-full border-0 <?= \$sc ?> cursor-pointer">
                                    <option value="new" <?= \$inq['status']==='new'?'selected':'' ?>>New</option>
                                    <option value="in_progress" <?= \$inq['status']==='in_progress'?'selected':'' ?>>In Progress</option>
                                    <option value="resolved" <?= \$inq['status']==='resolved'?'selected':'' ?>>Resolved</option>
                                    <option value="closed" <?= \$inq['status']==='closed'?'selected':'' ?>>Closed</option>
                                </select>
                            </td>
                            <td class="px-4 py-3 text-xs text-gray-500 dark:text-slate-400"><?= date('M d', strtotime(\$inq['created_at'])) ?></td>
                        </tr>
                        <?php endforeach; ?>
                        <?php if (empty(\$recentInquiries)): ?>
                        <tr><td colspan="4" class="px-4 py-8 text-center text-gray-400 dark:text-slate-500">No inquiries yet</td></tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Activity Log -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Activity Log</h3>
                <a href="<?= url('admin/activity-logs') ?>" class="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">View all</a>
            </div>
            <div class="divide-y divide-gray-100 dark:divide-slate-700 max-h-[400px] overflow-y-auto">
                <?php foreach (\$recentActivity as \$log): ?>
                <div class="px-6 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div class="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span class="text-xs font-bold text-gray-500 dark:text-slate-400"><?= strtoupper(substr(\$log['user_name'] ?? '?', 0, 1)) ?></span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm text-gray-900 dark:text-slate-200">
                            <span class="font-medium"><?= e(\$log['user_name'] ?? 'System') ?></span>
                            <?= e(\$log['description'] ?: \$log['action']) ?>
                        </p>
                        <p class="text-xs text-gray-400 dark:text-slate-500 mt-0.5"><?= date('M d, H:i', strtotime(\$log['created_at'])) ?></p>
                    </div>
                </div>
                <?php endforeach; ?>
                <?php if (empty(\$recentActivity)): ?>
                <div class="px-6 py-8 text-center text-gray-400 dark:text-slate-500">No activity yet</div>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <!-- ═══ SYSTEM HEALTH ═══ -->
    <div class="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Health</h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <?php
            \$healthItems = [
                ['label' => 'PHP Version', 'value' => \$systemHealth['php_version'], 'icon' => '⚡'],
                ['label' => 'MySQL', 'value' => substr(\$systemHealth['mysql_version'] ?? '', 0, 6), 'icon' => '🗄️'],
                ['label' => 'DB Size', 'value' => \$systemHealth['db_size'] . ' MB', 'icon' => '💾'],
                ['label' => 'Disk Free', 'value' => \$systemHealth['disk_free'], 'icon' => '📀'],
                ['label' => 'SSL', 'value' => \$systemHealth['ssl'], 'icon' => '🔒'],
            ];
            foreach (\$healthItems as \$item):
            ?>
            <div class="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-4 text-center">
                <div class="text-2xl mb-1"><?= \$item['icon'] ?></div>
                <p class="text-xs text-gray-500 dark:text-slate-400"><?= \$item['label'] ?></p>
                <p class="text-sm font-bold text-gray-900 dark:text-white mt-0.5"><?= \$item['value'] ?></p>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
</div>

<!-- ═══ DASHBOARD SCRIPTS ═══ -->
<script>
function dashboardApp() {
    return {
        init() {
            this.renderSparklines();
            this.renderTrafficChart();
        },

        renderSparklines() {
            const sparkData = <?= json_encode(\$sparklines) ?>;
            const tables = ['products', 'product_inquiries', 'blog_posts', 'newsletter_subscribers'];
            const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'];

            tables.forEach((table, i) => {
                const canvas = document.getElementById('sparkline-' + i);
                if (!canvas || !sparkData[table]) return;

                const ctx = canvas.getContext('2d');
                const data = sparkData[table];
                const max = Math.max(...data, 1);
                const w = canvas.width;
                const h = canvas.height;

                ctx.clearRect(0, 0, w, h);
                ctx.beginPath();
                ctx.strokeStyle = colors[i];
                ctx.lineWidth = 2;
                ctx.lineJoin = 'round';

                data.forEach((val, j) => {
                    const x = (j / (data.length - 1)) * w;
                    const y = h - (val / max) * (h - 4) - 2;
                    j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                });
                ctx.stroke();

                // Fill gradient
                const lastX = w;
                const gradient = ctx.createLinearGradient(0, 0, 0, h);
                gradient.addColorStop(0, colors[i] + '30');
                gradient.addColorStop(1, colors[i] + '00');
                ctx.lineTo(lastX, h);
                ctx.lineTo(0, h);
                ctx.closePath();
                ctx.fillStyle = gradient;
                ctx.fill();
            });
        },

        renderTrafficChart() {
            const trafficData = <?= json_encode(\$trafficData) ?>;
            const canvas = document.getElementById('trafficChart');
            if (!canvas) return;

            const isDark = document.documentElement.classList.contains('dark');
            const gridColor = isDark ? 'rgba(148,163,184,0.1)' : 'rgba(0,0,0,0.06)';
            const textColor = isDark ? '#94a3b8' : '#6b7280';

            new Chart(canvas, {
                type: 'line',
                data: {
                    labels: trafficData.labels,
                    datasets: [
                        {
                            label: 'Inquiries',
                            data: trafficData.inquiries,
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59,130,246,0.1)',
                            fill: true,
                            tension: 0.4,
                            borderWidth: 2,
                            pointRadius: 0,
                            pointHoverRadius: 5,
                        },
                        {
                            label: 'Messages',
                            data: trafficData.messages,
                            borderColor: '#8b5cf6',
                            backgroundColor: 'rgba(139,92,246,0.1)',
                            fill: true,
                            tension: 0.4,
                            borderWidth: 2,
                            pointRadius: 0,
                            pointHoverRadius: 5,
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { intersect: false, mode: 'index' },
                    plugins: {
                        legend: { display: true, position: 'top', labels: { color: textColor, usePointStyle: true, padding: 20 } },
                        tooltip: { backgroundColor: isDark ? '#1e293b' : '#fff', titleColor: isDark ? '#e2e8f0' : '#111', bodyColor: isDark ? '#94a3b8' : '#666', borderColor: isDark ? '#334155' : '#e5e7eb', borderWidth: 1, padding: 12, cornerRadius: 8 }
                    },
                    scales: {
                        x: { grid: { color: gridColor }, ticks: { color: textColor, maxTicksLimit: 10 } },
                        y: { grid: { color: gridColor }, ticks: { color: textColor, stepSize: 1 }, beginAtZero: true }
                    }
                }
            });
        }
    }
}

// AJAX status update
function updateInquiryStatus(id, status) {
    const token = document.querySelector('meta[name="csrf-token"]')?.content;
    fetch('<?= url("admin/inquiries/status") ?>', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ id, status, _token: token })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            // Show toast via Alpine
            const app = document.querySelector('[x-data]')?.__x;
            if (app) app.\$data.addToast('success', 'Status updated');
        }
    })
    .catch(() => {});
}
</script>
`
  },

  // ═══════════════════════════════════════════════════════
  // ADMIN HELPERS
  // ═══════════════════════════════════════════════════════
  {
    path: 'app/helpers/admin-helpers.php',
    name: 'admin-helpers.php',
    language: 'php',
    category: 'helpers',
    description: 'Admin-specific helper functions for views',
    content: `<?php
declare(strict_types=1);

/**
 * Admin Helper Functions
 */

/**
 * Generate admin URL
 */
function admin_url(string \$path = ''): string
{
    return SITE_URL . '/admin' . (\$path ? '/' . ltrim(\$path, '/') : '');
}

/**
 * Check if current admin section is active
 */
function admin_active(string ...\$segments): string
{
    \$current = parse_url(\$_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?? '/admin';
    foreach (\$segments as \$segment) {
        if (str_contains(\$current, '/admin/' . \$segment)) {
            return 'active';
        }
    }
    return '';
}

/**
 * Format file size
 */
function format_file_size(int \$bytes): string
{
    \$units = ['B', 'KB', 'MB', 'GB'];
    \$i = 0;
    \$size = (float) \$bytes;
    while (\$size >= 1024 && \$i < count(\$units) - 1) {
        \$size /= 1024;
        \$i++;
    }
    return round(\$size, 2) . ' ' . \$units[\$i];
}

/**
 * Get status badge HTML
 */
function status_badge(string \$status): string
{
    \$map = [
        'new'          => 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        'active'       => 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        'published'    => 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        'draft'        => 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
        'in_progress'  => 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        'resolved'     => 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        'closed'       => 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
        'pending'      => 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        'approved'     => 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        'spam'         => 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        'archived'     => 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
        'inactive'     => 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
        'banned'       => 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    ];

    \$class = \$map[\$status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    \$label = ucwords(str_replace('_', ' ', \$status));

    return '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ' . \$class . '">' . \$label . '</span>';
}

/**
 * Generate loading skeleton HTML
 */
function skeleton(int \$lines = 3): string
{
    \$html = '';
    for (\$i = 0; \$i < \$lines; \$i++) {
        \$width = \$i === \$lines - 1 ? rand(40, 70) : 100;
        \$html .= '<div class="skeleton h-4 rounded" style="width:' . \$width . '%"></div>';
    }
    return '<div class="space-y-2">' . \$html . '</div>';
}

/**
 * Admin notification count
 */
function admin_notification_count(): int
{
    static \$count = null;
    if (\$count !== null) return \$count;

    try {
        \$db = \\App\\Core\\Database::getInstance();
        \$count = (int) \$db->fetchColumn(
            "SELECT (
                (SELECT COUNT(*) FROM product_inquiries WHERE status = 'new') +
                (SELECT COUNT(*) FROM contact_messages WHERE status = 'new') +
                (SELECT COUNT(*) FROM blog_comments WHERE status = 'pending')
            )"
        );
    } catch (\\Throwable \$e) {
        \$count = 0;
    }

    return \$count;
}
`
  },

  // ═══════════════════════════════════════════════════════
  // UPDATED ROUTES
  // ═══════════════════════════════════════════════════════
  {
    path: 'routes/admin.php',
    name: 'admin.php',
    language: 'php',
    category: 'routes',
    description: 'Admin route definitions with middleware groups',
    content: `<?php
declare(strict_types=1);

/**
 * Khybersoft - Admin Routes
 */

use App\\Core\\Router;

/** @var Router \$router */

// ═══ AUTH ROUTES (no middleware) ═══
\$router->get('/admin/login', ['Admin\\AuthController', 'showLogin'], ['Guest']);
\$router->post('/admin/login', ['Admin\\AuthController', 'login'], ['Guest']);
\$router->get('/admin/forgot-password', ['Admin\\AuthController', 'showForgotPassword'], ['Guest']);
\$router->post('/admin/forgot-password', ['Admin\\AuthController', 'sendResetLink'], ['Guest']);
\$router->get('/admin/reset-password', ['Admin\\AuthController', 'showResetPassword'], ['Guest']);
\$router->post('/admin/reset-password', ['Admin\\AuthController', 'resetPassword'], ['Guest']);

// 2FA
\$router->get('/admin/2fa', ['Admin\\AuthController', 'showTwoFactor']);
\$router->post('/admin/2fa/verify', ['Admin\\AuthController', 'verifyTwoFactor']);

// Logout
\$router->get('/admin/logout', ['Admin\\AuthController', 'logout']);

// ═══ PROTECTED ADMIN ROUTES ═══
\$router->group('/admin', function(Router \$router) {

    // Dashboard
    \$router->get('/', ['Admin\\DashboardController', 'index'], ['AdminAuth']);
    \$router->post('/inquiries/status', ['Admin\\DashboardController', 'updateInquiryStatus'], ['AdminAuth']);

    // ── Content ──
    \$router->group('', function(Router \$router) {
        // Pages
        \$router->get('/pages', ['Admin\\PageController', 'index'], ['AdminAuth']);
        \$router->get('/pages/create', ['Admin\\PageController', 'create'], ['AdminAuth']);
        \$router->post('/pages', ['Admin\\PageController', 'store'], ['AdminAuth']);
        \$router->get('/pages/{id}/edit', ['Admin\\PageController', 'edit'], ['AdminAuth']);
        \$router->post('/pages/{id}', ['Admin\\PageController', 'update'], ['AdminAuth']);
        \$router->post('/pages/{id}/delete', ['Admin\\PageController', 'destroy'], ['AdminAuth']);

        // Blog
        \$router->get('/blog', ['Admin\\BlogController', 'index'], ['AdminAuth']);
        \$router->get('/blog/create', ['Admin\\BlogController', 'create'], ['AdminAuth']);
        \$router->post('/blog', ['Admin\\BlogController', 'store'], ['AdminAuth']);
        \$router->get('/blog/{id}/edit', ['Admin\\BlogController', 'edit'], ['AdminAuth']);
        \$router->post('/blog/{id}', ['Admin\\BlogController', 'update'], ['AdminAuth']);
        \$router->post('/blog/{id}/delete', ['Admin\\BlogController', 'destroy'], ['AdminAuth']);

        // Blog Categories
        \$router->get('/blog/categories', ['Admin\\BlogCategoryController', 'index'], ['AdminAuth']);
        \$router->post('/blog/categories', ['Admin\\BlogCategoryController', 'store'], ['AdminAuth']);
        \$router->post('/blog/categories/{id}', ['Admin\\BlogCategoryController', 'update'], ['AdminAuth']);
        \$router->post('/blog/categories/{id}/delete', ['Admin\\BlogCategoryController', 'destroy'], ['AdminAuth']);

        // Comments
        \$router->get('/comments', ['Admin\\CommentController', 'index'], ['AdminAuth']);
        \$router->post('/comments/{id}/approve', ['Admin\\CommentController', 'approve'], ['AdminAuth']);
        \$router->post('/comments/{id}/spam', ['Admin\\CommentController', 'spam'], ['AdminAuth']);
        \$router->post('/comments/{id}/delete', ['Admin\\CommentController', 'destroy'], ['AdminAuth']);

        // Media
        \$router->get('/media', ['Admin\\MediaController', 'index'], ['AdminAuth']);
        \$router->post('/media/upload', ['Admin\\MediaController', 'upload'], ['AdminAuth']);
        \$router->post('/media/{id}/delete', ['Admin\\MediaController', 'destroy'], ['AdminAuth']);
    });

    // ── Products ──
    \$router->group('', function(Router \$router) {
        \$router->get('/products', ['Admin\\ProductController', 'index'], ['AdminAuth']);
        \$router->get('/products/create', ['Admin\\ProductController', 'create'], ['AdminAuth']);
        \$router->post('/products', ['Admin\\ProductController', 'store'], ['AdminAuth']);
        \$router->get('/products/{id}/edit', ['Admin\\ProductController', 'edit'], ['AdminAuth']);
        \$router->post('/products/{id}', ['Admin\\ProductController', 'update'], ['AdminAuth']);
        \$router->post('/products/{id}/delete', ['Admin\\ProductController', 'destroy'], ['AdminAuth']);

        \$router->get('/products/categories', ['Admin\\ProductCategoryController', 'index'], ['AdminAuth']);
        \$router->get('/products/plans', ['Admin\\ProductPlanController', 'index'], ['AdminAuth']);
        \$router->get('/products/demos', ['Admin\\ProductDemoController', 'index'], ['AdminAuth']);
        \$router->get('/products/versions', ['Admin\\ProductVersionController', 'index'], ['AdminAuth']);

        \$router->get('/inquiries', ['Admin\\InquiryController', 'index'], ['AdminAuth']);
        \$router->get('/inquiries/{id}', ['Admin\\InquiryController', 'show'], ['AdminAuth']);
        \$router->post('/inquiries/{id}/status', ['Admin\\InquiryController', 'updateStatus'], ['AdminAuth']);

        \$router->get('/tutorials', ['Admin\\TutorialController', 'index'], ['AdminAuth']);
    });

    // ── Services ──
    \$router->group('', function(Router \$router) {
        \$router->get('/services', ['Admin\\ServiceController', 'index'], ['AdminAuth']);
        \$router->get('/services/create', ['Admin\\ServiceController', 'create'], ['AdminAuth']);
        \$router->post('/services', ['Admin\\ServiceController', 'store'], ['AdminAuth']);
        \$router->get('/services/{id}/edit', ['Admin\\ServiceController', 'edit'], ['AdminAuth']);
        \$router->post('/services/{id}', ['Admin\\ServiceController', 'update'], ['AdminAuth']);
        \$router->post('/services/{id}/delete', ['Admin\\ServiceController', 'destroy'], ['AdminAuth']);

        \$router->get('/services/inquiries', ['Admin\\ServiceInquiryController', 'index'], ['AdminAuth']);
        \$router->get('/custom-development', ['Admin\\CustomDevController', 'index'], ['AdminAuth']);
    });

    // ── Business ──
    \$router->group('', function(Router \$router) {
        \$router->get('/testimonials', ['Admin\\TestimonialController', 'index'], ['AdminAuth']);
        \$router->get('/team', ['Admin\\TeamController', 'index'], ['AdminAuth']);
        \$router->get('/clients', ['Admin\\ClientController', 'index'], ['AdminAuth']);
        \$router->get('/faqs', ['Admin\\FaqController', 'index'], ['AdminAuth']);
        \$router->get('/messages', ['Admin\\MessageController', 'index'], ['AdminAuth']);
        \$router->get('/messages/{id}', ['Admin\\MessageController', 'show'], ['AdminAuth']);
        \$router->get('/newsletter', ['Admin\\NewsletterController', 'index'], ['AdminAuth']);
    });

    // ── Marketing ──
    \$router->group('', function(Router \$router) {
        \$router->get('/seo', ['Admin\\SeoController', 'index'], ['AdminAuth']);
        \$router->get('/redirects', ['Admin\\RedirectController', 'index'], ['AdminAuth']);
        \$router->get('/sitemap', ['Admin\\SitemapController', 'index'], ['AdminAuth']);
    });

    // ── System ──
    \$router->group('', function(Router \$router) {
        \$router->get('/users', ['Admin\\UserController', 'index'], ['AdminAuth']);
        \$router->get('/users/create', ['Admin\\UserController', 'create'], ['AdminAuth']);
        \$router->post('/users', ['Admin\\UserController', 'store'], ['AdminAuth']);
        \$router->get('/users/{id}/edit', ['Admin\\UserController', 'edit'], ['AdminAuth']);
        \$router->post('/users/{id}', ['Admin\\UserController', 'update'], ['AdminAuth']);
        \$router->post('/users/{id}/delete', ['Admin\\UserController', 'destroy'], ['AdminAuth']);

        \$router->get('/roles', ['Admin\\RoleController', 'index'], ['AdminAuth']);
        \$router->get('/settings', ['Admin\\SettingsController', 'index'], ['AdminAuth']);
        \$router->post('/settings', ['Admin\\SettingsController', 'update'], ['AdminAuth']);
        \$router->get('/activity-logs', ['Admin\\ActivityLogController', 'index'], ['AdminAuth']);
        \$router->get('/backup', ['Admin\\BackupController', 'index'], ['AdminAuth']);
        \$router->post('/backup/run', ['Admin\\BackupController', 'run'], ['AdminAuth']);
    });

}, ['AdminAuth']);
`
  },
];
