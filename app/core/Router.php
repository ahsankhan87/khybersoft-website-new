<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Router - URL routing with pattern matching
 */
class Router
{
    private array $routes = [];
    private array $middleware = [];

    public function get(string $uri, $action, array $middleware = []): self
    {
        return $this->addRoute('GET', $uri, $action, $middleware);
    }

    public function post(string $uri, $action, array $middleware = []): self
    {
        return $this->addRoute('POST', $uri, $action, $middleware);
    }

    public function any(string $uri, $action, array $middleware = []): self
    {
        $this->addRoute('GET', $uri, $action, $middleware);
        $this->addRoute('POST', $uri, $action, $middleware);
        return $this;
    }

    private function addRoute(string $method, string $uri, $action, array $middleware = []): self
    {
        $this->routes[] = [
            'method' => $method,
            'uri' => $uri,
            'action' => $action,
            'middleware' => $middleware,
            'pattern' => $this->uriToPattern($uri),
        ];
        return $this;
    }

    public function group(string $prefix, callable $callback, array $middleware = []): void
    {
        $previousRoutes = $this->routes;
        $this->routes = [];
        
        $callback($this);
        
        foreach ($this->routes as &$route) {
            $route['uri'] = $prefix . $route['uri'];
            $route['pattern'] = $this->uriToPattern($route['uri']);
            $route['middleware'] = array_merge($middleware, $route['middleware']);
        }
        
        $this->routes = array_merge($previousRoutes, $this->routes);
    }

    private function uriToPattern(string $uri): string
    {
        $pattern = preg_replace('/\{([a-zA-Z_]+)\}/', '(?P<$1>[^/]+)', $uri);
        return '#^' . $pattern . '$#';
    }

    public function dispatch(): void
    {
        $uri = $this->getRequestUri();
        $method = $_SERVER['REQUEST_METHOD'];

        // Handle method override
        if ($method === 'POST' && isset($_POST['_method'])) {
            $method = strtoupper($_POST['_method']);
        }

        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }

            if (preg_match($route['pattern'], $uri, $matches)) {
                $params = array_filter($matches, fn($key) => !is_int($key), ARRAY_FILTER_USE_KEY);

                // Run middleware
                if (!$this->runMiddleware($route['middleware'])) {
                    return;
                }

                $this->executeAction($route['action'], $params);
                return;
            }
        }

        // 404 Not Found
        http_response_code(404);
        echo '404 - Page Not Found';
    }

    private function getRequestUri(): string
    {
        $uri = $_GET['url'] ?? '';
        $uri = '/' . trim($uri, '/');
        return $uri === '/' ? '/' : rtrim($uri, '/');
    }

    private function runMiddleware(array $middlewareList): bool
    {
        foreach ($middlewareList as $middleware) {
            $class = "App\\Middleware\\{$middleware}";
            if (class_exists($class)) {
                $instance = new $class();
                if (!$instance->handle()) {
                    return false;
                }
            }
        }
        return true;
    }

    private function executeAction($action, array $params): void
    {
        if (is_array($action)) {
            [$controller, $method] = $action;
            $className = "App\\Controllers\\{$controller}";
        } else {
            [$controller, $method] = explode('@', $action);
            $className = "App\\Controllers\\{$controller}";
        }

        if (!class_exists($className)) {
            throw new \RuntimeException("Controller not found: {$className}");
        }

        $controllerInstance = new $className();

        if (!method_exists($controllerInstance, $method)) {
            throw new \RuntimeException("Method not found: {$className}@{$method}");
        }

        call_user_func_array([$controllerInstance, $method], $params);
    }
}
