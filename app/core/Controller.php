<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Base Controller
 */
abstract class Controller
{
    protected array $viewData = [];
    protected string $layout = 'main';

    protected function view(string $view, array $data = [], int $statusCode = 200): void
    {
        http_response_code($statusCode);
        $data = array_merge($this->viewData, $data);
        extract($data, EXTR_SKIP);

        ob_start();
        $viewFile = APP_PATH . '/views/' . str_replace('.', '/', $view) . '.php';

        if (!file_exists($viewFile)) {
            throw new \RuntimeException("View not found: {$viewFile}");
        }

        require $viewFile;
        $content = ob_get_clean();

        $layoutFile = APP_PATH . '/views/layouts/' . $this->layout . '.php';

        if (file_exists($layoutFile)) {
            $_view_content_ = $content;
            $_view_data_ = $data;
            require $layoutFile;
        } else {
            echo $content;
        }
    }

    protected function json(mixed $data, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    protected function redirect(string $url, int $statusCode = 302): void
    {
        http_response_code($statusCode);
        header("Location: {$url}");
        exit;
    }

    protected function redirectBack(): void
    {
        $referer = $_SERVER['HTTP_REFERER'] ?? SITE_URL;
        $this->redirect($referer);
    }

    protected function input(string $key, mixed $default = null): mixed
    {
        return $_POST[$key] ?? $_GET[$key] ?? $default;
    }

    protected function isPost(): bool
    {
        return $_SERVER['REQUEST_METHOD'] === 'POST';
    }

    protected function validateCsrf(): bool
    {
        $token = $_POST['_token'] ?? '';
        if (!CSRF::verify($token)) {
            http_response_code(403);
            echo 'Invalid security token.';
            return false;
        }
        return true;
    }

    protected function abort(int $code, string $message = ''): void
    {
        http_response_code($code);
        echo $message ?: "Error {$code}";
        exit;
    }
}
