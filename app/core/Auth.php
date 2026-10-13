<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Auth - Authentication handler
 */
class Auth
{
    private static ?array $user = null;
    private static bool $initialized = false;

    public static function init(): void
    {
        if (self::$initialized) {
            return;
        }

        self::$initialized = true;

        if (isset($_SESSION['user_id'])) {
            self::$user = self::getUserFromDb((int) $_SESSION['user_id']);
            return;
        }

        if (isset($_COOKIE['remember_token'])) {
            self::loginFromCookie($_COOKIE['remember_token']);
        }
    }

    public static function attempt(string $email, string $password, bool $remember = false): bool
    {
        $db = Database::getInstance();

        $user = $db->fetch(
            "SELECT * FROM users WHERE email = ? AND status = 'active' AND deleted_at IS NULL",
            [$email]
        );

        if (!$user || !password_verify($password, $user['password_hash'])) {
            return false;
        }

        session_regenerate_id(true);

        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_role'] = $user['role_id'];
        $_SESSION['_created_at'] = time();

        $db->update('users', [
            'last_login' => date('Y-m-d H:i:s'),
            'last_login_ip' => $_SERVER['REMOTE_ADDR'] ?? '',
        ], 'id = ?', [$user['id']]);

        if ($remember) {
            self::setRememberToken((int) $user['id']);
        }

        self::$user = $user;
        return true;
    }

    public static function logout(): void
    {
        $userId = $_SESSION['user_id'] ?? null;

        if ($userId) {
            self::clearRememberToken((int) $userId);
        }

        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params['path'],
                $params['domain'],
                $params['secure'],
                $params['httponly']
            );
        }

        session_destroy();
        self::$user = null;
        self::$initialized = false;
    }

    public static function check(): bool
    {
        self::init();
        return self::$user !== null;
    }

    public static function guest(): bool
    {
        return !self::check();
    }

    public static function user(): ?array
    {
        self::init();
        return self::$user;
    }

    public static function id(): ?int
    {
        self::init();
        return self::$user ? (int) self::$user['id'] : null;
    }

    public static function hasRole(string $roleSlug): bool
    {
        self::init();
        if (!self::$user) {
            return false;
        }

        $db = Database::getInstance();
        $result = $db->fetch(
            "SELECT r.id FROM roles r
             INNER JOIN users u ON u.role_id = r.id
             WHERE u.id = ? AND r.slug = ?",
            [self::$user['id'], $roleSlug]
        );

        return $result !== false;
    }

    public static function isAdmin(): bool
    {
        return self::hasRole('super_admin') || self::hasRole('admin');
    }

    private static function setRememberToken(int $userId): void
    {
        $token = bin2hex(random_bytes(32));
        $hashedToken = hash('sha256', $token);

        $db = Database::getInstance();
        $db->update('users', ['remember_token' => $hashedToken], 'id = ?', [$userId]);

        setcookie('remember_token', $userId . ':' . $token, [
            'expires' => time() + REMEMBER_ME_LIFETIME,
            'path' => '/',
            'secure' => false,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    private static function clearRememberToken(int $userId): void
    {
        $db = Database::getInstance();
        $db->update('users', ['remember_token' => null], 'id = ?', [$userId]);

        setcookie('remember_token', '', [
            'expires' => time() - 3600,
            'path' => '/',
        ]);
    }

    private static function loginFromCookie(string $cookie): void
    {
        $parts = explode(':', $cookie, 2);
        if (count($parts) !== 2) {
            return;
        }

        [$userId, $token] = $parts;
        $hashedToken = hash('sha256', $token);

        $db = Database::getInstance();
        $user = $db->fetch(
            "SELECT * FROM users WHERE id = ? AND remember_token = ? AND status = 'active' AND deleted_at IS NULL",
            [$userId, $hashedToken]
        );

        if ($user) {
            session_regenerate_id(true);
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_role'] = $user['role_id'];
            self::$user = $user;
        }
    }

    private static function getUserFromDb(int $id): ?array
    {
        $db = Database::getInstance();
        return $db->fetch(
            "SELECT u.*, r.name as role_name, r.slug as role_slug
             FROM users u
             LEFT JOIN roles r ON u.role_id = r.id
             WHERE u.id = ? AND u.status = 'active' AND u.deleted_at IS NULL",
            [$id]
        ) ?: null;
    }
}
