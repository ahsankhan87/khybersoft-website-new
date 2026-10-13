<?php
declare(strict_types=1);

/**
 * Khybersoft - Global Helper Functions
 */

function e(?string $value): string
{
    return htmlspecialchars($value ?? '', ENT_QUOTES, 'UTF-8');
}

function url(string $path = ''): string
{
    return SITE_URL . '/' . ltrim($path, '/');
}

function asset(string $path): string
{
    $filePath = ASSET_PATH . '/' . ltrim($path, '/');
    $version = file_exists($filePath) ? filemtime($filePath) : '';
    return ASSET_URL . '/' . ltrim($path, '/') . ($version ? '?v=' . $version : '');
}

function upload(string $path): string
{
    return UPLOAD_URL . '/' . ltrim($path, '/');
}

function slugify(string $text): string
{
    $text = mb_strtolower($text);
    $text = preg_replace('/[^a-z0-9\s-]/', '', $text);
    $text = preg_replace('/[\s-]+/', '-', $text);
    return trim($text, '-');
}

function money(float $amount, string $currency = 'USD'): string
{
    $symbols = [
        'USD' => '$',
        'EUR' => '€',
        'GBP' => '£',
        'PKR' => 'Rs.',
        'INR' => '₹',
    ];

    $symbol = $symbols[$currency] ?? $currency . ' ';
    return $symbol . number_format($amount, 2);
}

function flash(string $key, string $message): void
{
    $_SESSION['_flash'][$key] = $message;
}

function get_flash(string $key): ?string
{
    $message = $_SESSION['_flash'][$key] ?? null;
    unset($_SESSION['_flash'][$key]);
    return $message;
}

function old(string $key, string $default = ''): string
{
    $value = $_SESSION['_old_input'][$key] ?? $default;
    return e((string) $value);
}

function flash_input(): void
{
    $_SESSION['_old_input'] = $_POST;
}

function clear_old_input(): void
{
    unset($_SESSION['_old_input']);
}

function setting(string $key, string $default = ''): string
{
    static $cache = [];

    if (isset($cache[$key])) {
        return $cache[$key];
    }

    try {
        $db = \App\Core\Database::getInstance();
        $result = $db->fetch("SELECT value FROM settings WHERE `key` = ?", [$key]);
        $value = $result ? $result['value'] : $default;
        $cache[$key] = $value;
        return $value;
    } catch (\Throwable $e) {
        return $default;
    }
}

function format_date(?string $date, string $format = 'M d, Y'): string
{
    if (!$date) {
        return '';
    }
    return date($format, strtotime($date));
}

function format_datetime(?string $datetime, string $format = 'M d, Y H:i'): string
{
    if (!$datetime) {
        return '';
    }
    return date($format, strtotime($datetime));
}

function time_ago(string $datetime): string
{
    $time = strtotime($datetime);
    $diff = time() - $time;

    if ($diff < 60) return 'just now';
    if ($diff < 3600) return floor($diff / 60) . ' min ago';
    if ($diff < 86400) return floor($diff / 3600) . ' hours ago';
    if ($diff < 604800) return floor($diff / 86400) . ' days ago';
    return date('M d, Y', $time);
}

function str_limit(string $text, int $limit = 100, string $end = '...'): string
{
    if (mb_strlen($text) <= $limit) {
        return $text;
    }
    return mb_substr($text, 0, $limit) . $end;
}

function client_ip(): string
{
    return $_SERVER['HTTP_X_FORWARDED_FOR']
        ?? $_SERVER['HTTP_CLIENT_IP']
        ?? $_SERVER['REMOTE_ADDR']
        ?? '0.0.0.0';
}

function dd(mixed ...$vars): never
{
    echo '<pre style="background:#1e293b;color:#e2e8f0;padding:1rem;border-radius:8px;overflow:auto;">';
    foreach ($vars as $var) {
        var_dump($var);
        echo "\n---\n";
    }
    echo '</pre>';
    exit;
}
