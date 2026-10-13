<?php
declare(strict_types=1);

namespace App\Core;

/**
 * CSRF Protection
 */
class CSRF
{
    private const TOKEN_KEY = '_csrf_token';
    private const TOKEN_LIFETIME = 7200; // 2 hours

    public static function init(): void
    {
        if (!isset($_SESSION[self::TOKEN_KEY]) || self::isExpired()) {
            self::regenerate();
        }
    }

    public static function token(): string
    {
        return $_SESSION[self::TOKEN_KEY]['token'] ?? '';
    }

    public static function regenerate(): void
    {
        $_SESSION[self::TOKEN_KEY] = [
            'token' => bin2hex(random_bytes(32)),
            'time' => time(),
        ];
    }

    public static function verify(string $token): bool
    {
        if (!isset($_SESSION[self::TOKEN_KEY]['token'])) {
            return false;
        }

        if (self::isExpired()) {
            self::regenerate();
            return false;
        }

        return hash_equals($_SESSION[self::TOKEN_KEY]['token'], $token);
    }

    public static function field(): string
    {
        $token = htmlspecialchars(self::token(), ENT_QUOTES, 'UTF-8');
        return '<input type="hidden" name="_token" value="' . $token . '">';
    }

    public static function meta(): string
    {
        $token = htmlspecialchars(self::token(), ENT_QUOTES, 'UTF-8');
        return '<meta name="csrf-token" content="' . $token . '">';
    }

    private static function isExpired(): bool
    {
        if (!isset($_SESSION[self::TOKEN_KEY]['time'])) {
            return true;
        }
        return (time() - $_SESSION[self::TOKEN_KEY]['time']) > self::TOKEN_LIFETIME;
    }
}
