export interface PhpFile {
  path: string;
  name: string;
  language: string;
  content: string;
  description: string;
}

export const phpFiles: PhpFile[] = [
  {
    path: 'public_html/index.php',
    name: 'index.php',
    language: 'php',
    description: 'Front Controller - Entry point for all requests',
    content: `<?php
declare(strict_types=1);

/**
 * Khybersoft - Front Controller
 * All requests are routed through this file
 */

// Define root paths
define('ROOT_PATH', dirname(__DIR__));
define('APP_PATH', ROOT_PATH . '/app');
define('PUBLIC_PATH', __DIR__);

// Load configuration
require_once APP_PATH . '/config/config.php';
require_once APP_PATH . '/config/database.php';

// Autoloader
spl_autoload_register(function (string \$class): void {
    \$paths = [
        APP_PATH . '/core/',
        APP_PATH . '/controllers/',
        APP_PATH . '/controllers/admin/',
        APP_PATH . '/controllers/front/',
        APP_PATH . '/models/',
        APP_PATH . '/middleware/',
        APP_PATH . '/helpers/',
    ];

    foreach (\$paths as \$path) {
        \$file = \$path . \$class . '.php';
        if (file_exists(\$file)) {
            require_once \$file;
            return;
        }
    }
});

// Load helpers
require_once APP_PATH . '/helpers/functions.php';

// Start session securely
session_start([
    'cookie_httponly' => true,
    'cookie_secure' => false, // Set to true in production with HTTPS
    'cookie_samesite' => 'Lax',
    'use_strict_mode' => true,
    'use_only_cookies' => true,
    'name' => 'KHYBERSOFT_SID',
]);

// Regenerate session ID periodically to prevent fixation
if (!isset(\$_SESSION['_created_at'])) {
    \$_SESSION['_created_at'] = time();
} elseif (time() - \$_SESSION['_created_at'] > 1800) {
    session_regenerate_id(true);
    \$_SESSION['_created_at'] = time();
}

// Initialize CSRF
CSRF::init();

// Handle redirects
\$redirect = new \\App\\Core\\Redirect();
if (\$redirect->check()) {
    exit;
}

// Route the request
\$router = new \\App\\Core\\Router();
\$router->dispatch();
`
  },
  {
    path: 'public_html/.htaccess',
    name: '.htaccess',
    language: 'apache',
    description: 'Apache rewrite rules for pretty URLs and security',
    content: `# Khybersoft - Apache Configuration
# Enable Rewrite Engine
RewriteEngine On

# Set the base directory
RewriteBase /

# Block access to sensitive files
<FilesMatch "\\.(env|log|sql|md|json|lock|yml|yaml)\$">
    Order allow,deny
    Deny from all
</FilesMatch>

# Block access to hidden files
RewriteRule "^\\." - [F,L]

# Block access to app directory
RewriteRule "^app/" - [F,L]

# Remove trailing slash (except for directories)
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)/\$ /\$1 [L,R=301]

# Serve static files directly
RewriteCond %{REQUEST_FILENAME} -f
RewriteRule ^ - [L]

# Serve existing directories
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Route everything else to front controller
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)\$ index.php?url=\$1 [QSA,L]

# Security Headers
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
    Header set Referrer-Policy "strict-origin-when-cross-origin"
    Header set Permissions-Policy "camera=(), microphone=(), geolocation=()"
</IfModule>

# Compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType application/pdf "access plus 1 month"
</IfModule>

# Custom error pages
ErrorDocument 404 /404
ErrorDocument 403 /403
ErrorDocument 500 /500

# PHP settings (if allowed)
<IfModule mod_php.c>
    php_value upload_max_filesize 20M
    php_value post_max_size 25M
    php_value max_execution_time 60
    php_value memory_limit 128M
</IfModule>
`
  },
  {
    path: 'app/config/config.php',
    name: 'config.php',
    language: 'php',
    description: 'Application configuration - constants, site URL, environment',
    content: `<?php
declare(strict_types=1);

/**
 * Khybersoft - Application Configuration
 * Edit these values for your environment
 */

// Error reporting (disable in production)
if (getenv('APP_ENV') === 'production') {
    error_reporting(0);
    ini_set('display_errors', '0');
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
}

// Application Constants
define('APP_NAME', 'Khybersoft');
define('APP_VERSION', '1.0.0');
define('APP_ENV', getenv('APP_ENV') ?: 'development');
define('APP_DEBUG', APP_ENV !== 'production');

// Site URL (no trailing slash)
define('SITE_URL', 'https://khybersoft.com');
define('SITE_NAME', 'Khybersoft');
define('SITE_EMAIL', 'info@khybersoft.com');

// Paths
define('UPLOAD_PATH', PUBLIC_PATH . '/uploads');
define('UPLOAD_URL', SITE_URL . '/uploads');
define('ASSET_PATH', PUBLIC_PATH . '/assets');
define('ASSET_URL', SITE_URL . '/assets');
define('STORAGE_PATH', ROOT_PATH . '/storage');
define('LOG_PATH', STORAGE_PATH . '/logs');
define('CACHE_PATH', STORAGE_PATH . '/cache');

// Pagination
define('PER_PAGE', 20);
define('ADMIN_PER_PAGE', 15);

// Session
define('SESSION_LIFETIME', 7200); // 2 hours
define('REMEMBER_ME_LIFETIME', 2592000); // 30 days

// Upload
define('MAX_UPLOAD_SIZE', 10 * 1024 * 1024); // 10MB
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']);
define('ALLOWED_DOC_TYPES', ['application/pdf', 'application/zip', 'application/x-zip-compressed']);

// Timezone
date_default_timezone_set('UTC');

// Create required directories
\$dirs = [STORAGE_PATH, LOG_PATH, CACHE_PATH, UPLOAD_PATH];
foreach (\$dirs as \$dir) {
    if (!is_dir(\$dir)) {
        mkdir(\$dir, 0755, true);
    }
}

// Autoload environment variables if .env exists
\$envFile = ROOT_PATH . '/.env';
if (file_exists(\$envFile)) {
    \$lines = file(\$envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach (\$lines as \$line) {
        \$line = trim(\$line);
        if (str_starts_with(\$line, '#') || !str_contains(\$line, '=')) {
            continue;
        }
        [\$key, \$value] = explode('=', \$line, 2);
        \$key = trim(\$key);
        \$value = trim(\$value, " \\t\\n\\r\\0\\x0B\\"'");
        if (!array_key_exists(\$key, \$_ENV)) {
            \$_ENV[\$key] = \$value;
            putenv("\$key=\$value");
        }
    }
}
`
  },
  {
    path: 'app/config/database.php',
    name: 'database.php',
    language: 'php',
    description: 'Database connection configuration',
    content: `<?php
declare(strict_types=1);

/**
 * Khybersoft - Database Configuration
 */

return [
    'driver' => 'mysql',
    'host' => getenv('DB_HOST') ?: 'localhost',
    'port' => getenv('DB_PORT') ?: '3306',
    'database' => getenv('DB_NAME') ?: 'khybersoft_db',
    'username' => getenv('DB_USER') ?: 'root',
    'password' => getenv('DB_PASS') ?: '',
    'charset' => 'utf8mb4',
    'collation' => 'utf8mb4_unicode_ci',
    'prefix' => '',
    'options' => [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_STRINGIFY_FETCHES => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
    ],
];
`
  },
  {
    path: 'app/core/Database.php',
    name: 'Database.php',
    language: 'php',
    description: 'PDO Singleton with prepared statements and query builder',
    content: `<?php
declare(strict_types=1);

namespace App\\Core;

use PDO;
use PDOException;
use PDOStatement;

/**
 * Database - PDO Singleton wrapper
 */
class Database
{
    private static ?Database \$instance = null;
    private PDO \$pdo;
    private int \$queryCount = 0;
    private array \$queryLog = [];
    private bool \$logging = false;

    private function __construct()
    {
        \$config = require APP_PATH . '/config/database.php';

        \$dsn = sprintf(
            '%s:host=%s;port=%s;dbname=%s;charset=%s',
            \$config['driver'],
            \$config['host'],
            \$config['port'],
            \$config['database'],
            \$config['charset']
        );

        try {
            \$this->pdo = new PDO(
                \$dsn,
                \$config['username'],
                \$config['password'],
                \$config['options']
            );
        } catch (PDOException \$e) {
            if (APP_DEBUG) {
                throw new \\RuntimeException('Database connection failed: ' . \$e->getMessage());
            }
            error_log('Database connection failed: ' . \$e->getMessage());
            throw new \\RuntimeException('Database connection failed.');
        }
    }

    // Prevent cloning and unserialization
    private function __clone() {}
    public function __wakeup()
    {
        throw new \\RuntimeException('Cannot unserialize singleton.');
    }

    public static function getInstance(): self
    {
        if (self::\$instance === null) {
            self::\$instance = new self();
        }
        return self::\$instance;
    }

    public function getPdo(): PDO
    {
        return \$this->pdo;
    }

    /**
     * Execute a prepared query
     */
    public function query(string \$sql, array \$params = []): PDOStatement
    {
        \$this->queryCount++;

        if (\$this->logging) {
            \$this->queryLog[] = ['sql' => \$sql, 'params' => \$params, 'time' => microtime(true)];
        }

        try {
            \$stmt = \$this->pdo->prepare(\$sql);
            \$stmt->execute(\$params);
            return \$stmt;
        } catch (PDOException \$e) {
            if (APP_DEBUG) {
                throw new \\RuntimeException(
                    'Query failed: ' . \$e->getMessage() . ' | SQL: ' . \$sql
                );
            }
            error_log('Query failed: ' . \$e->getMessage());
            throw new \\RuntimeException('Database query failed.');
        }
    }

    /**
     * Fetch all results
     */
    public function fetchAll(string \$sql, array \$params = []): array
    {
        return \$this->query(\$sql, \$params)->fetchAll();
    }

    /**
     * Fetch single row
     */
    public function fetch(string \$sql, array \$params = []): array|false
    {
        return \$this->query(\$sql, \$params)->fetch();
    }

    /**
     * Fetch single column value
     */
    public function fetchColumn(string \$sql, array \$params = [], int \$column = 0): mixed
    {
        return \$this->query(\$sql, \$params)->fetchColumn(\$column);
    }

    /**
     * Insert a record and return the last insert ID
     */
    public function insert(string \$table, array \$data): int
    {
        \$columns = implode(', ', array_map(fn(\$col) => "\`\$col\`", array_keys(\$data)));
        \$placeholders = implode(', ', array_fill(0, count(\$data), '?'));

        \$sql = "INSERT INTO \`{\$table}\` ({\$columns}) VALUES ({\$placeholders})";
        \$this->query(\$sql, array_values(\$data));

        return (int) \$this->pdo->lastInsertId();
    }

    /**
     * Update records
     */
    public function update(string \$table, array \$data, string \$where, array \$whereParams = []): int
    {
        \$set = implode(', ', array_map(fn(\$col) => "\`{\$col}\` = ?", array_keys(\$data)));
        \$sql = "UPDATE \`{\$table}\` SET {\$set} WHERE {\$where}";

        \$params = array_merge(array_values(\$data), \$whereParams);
        \$stmt = \$this->query(\$sql, \$params);

        return \$stmt->rowCount();
    }

    /**
     * Delete records
     */
    public function delete(string \$table, string \$where, array \$params = []): int
    {
        \$sql = "DELETE FROM \`{\$table}\` WHERE {\$where}";
        \$stmt = \$this->query(\$sql, \$params);
        return \$stmt->rowCount();
    }

    /**
     * Begin transaction
     */
    public function beginTransaction(): bool
    {
        return \$this->pdo->beginTransaction();
    }

    /**
     * Commit transaction
     */
    public function commit(): bool
    {
        return \$this->pdo->commit();
    }

    /**
     * Rollback transaction
     */
    public function rollback(): bool
    {
        return \$this->pdo->rollBack();
    }

    /**
     * Execute within a transaction
     */
    public function transaction(callable \$callback): mixed
    {
        \$this->beginTransaction();
        try {
            \$result = \$callback(\$this);
            \$this->commit();
            return \$result;
        } catch (\\Throwable \$e) {
            \$this->rollback();
            throw \$e;
        }
    }

    /**
     * Get last insert ID
     */
    public function lastInsertId(): string
    {
        return \$this->pdo->lastInsertId();
    }

    /**
     * Enable/disable query logging
     */
    public function enableLogging(bool \$enable = true): void
    {
        \$this->logging = \$enable;
    }

    /**
     * Get query count
     */
    public function getQueryCount(): int
    {
        return \$this->queryCount;
    }

    /**
     * Get query log
     */
    public function getQueryLog(): array
    {
        return \$this->queryLog;
    }
}
`
  },
  {
    path: 'app/core/Router.php',
    name: 'Router.php',
    language: 'php',
    description: 'URL Router with dynamic segments, middleware, and named routes',
    content: `<?php
declare(strict_types=1);

namespace App\\Core;

/**
 * Router - Handles URL routing with pattern matching
 */
class Router
{
    private array \$routes = [];
    private array \$namedRoutes = [];
    private array \$middleware = [];
    private array \$groupStack = [];
    private string \$currentGroupPrefix = '';
    private array \$currentGroupMiddleware = [];

    /**
     * Register a GET route
     */
    public function get(string \$uri, string|array \$action, array \$middleware = []): self
    {
        return \$this->addRoute('GET', \$uri, \$action, \$middleware);
    }

    /**
     * Register a POST route
     */
    public function post(string \$uri, string|array \$action, array \$middleware = []): self
    {
        return \$this->addRoute('POST', \$uri, \$action, \$middleware);
    }

    /**
     * Register a route for any method
     */
    public function any(string \$uri, string|array \$action, array \$middleware = []): self
    {
        \$this->addRoute('GET', \$uri, \$action, \$middleware);
        \$this->addRoute('POST', \$uri, \$action, \$middleware);
        return \$this;
    }

    /**
     * Add a route
     */
    private function addRoute(string \$method, string \$uri, string|array \$action, array \$middleware = []): self
    {
        \$uri = \$this->currentGroupPrefix . \$uri;
        \$middleware = array_merge(\$this->currentGroupMiddleware, \$middleware);

        \$route = [
            'method' => \$method,
            'uri' => \$uri,
            'action' => \$action,
            'middleware' => \$middleware,
            'pattern' => \$this->uriToPattern(\$uri),
        ];

        \$this->routes[] = \$route;
        return \$this;
    }

    /**
     * Create a route group
     */
    public function group(string \$prefix, callable \$callback, array \$middleware = []): void
    {
        \$previousPrefix = \$this->currentGroupPrefix;
        \$previousMiddleware = \$this->currentGroupMiddleware;

        \$this->currentGroupPrefix .= \$prefix;
        \$this->currentGroupMiddleware = array_merge(\$this->currentGroupMiddleware, \$middleware);

        \$callback(\$this);

        \$this->currentGroupPrefix = \$previousPrefix;
        \$this->currentGroupMiddleware = \$previousMiddleware;
    }

    /**
     * Convert URI pattern to regex
     */
    private function uriToPattern(string \$uri): string
    {
        // Replace {param} with regex capture groups
        \$pattern = preg_replace('/\\{([a-zA-Z_]+)\\}/', '(?P<\$1>[^/]+)', \$uri);
        return '#^' . \$pattern . '\$#';
    }

    /**
     * Dispatch the current request
     */
    public function dispatch(): void
    {
        \$uri = \$this->getRequestUri();
        \$method = \$_SERVER['REQUEST_METHOD'];

        // Handle method override for forms
        if (\$method === 'POST' && isset(\$_POST['_method'])) {
            \$method = strtoupper(\$_POST['_method']);
        }

        foreach (\$this->routes as \$route) {
            if (\$route['method'] !== \$method) {
                continue;
            }

            if (preg_match(\$route['pattern'], \$uri, \$matches)) {
                // Extract named parameters
                \$params = array_filter(\$matches, fn(\$key) => !is_int(\$key), ARRAY_FILTER_USE_KEY);

                // Run middleware
                if (!\$this->runMiddleware(\$route['middleware'])) {
                    return;
                }

                // Execute the action
                \$this->executeAction(\$route['action'], \$params);
                return;
            }
        }

        // 404 Not Found
        http_response_code(404);
        \$this->executeAction(['Front\\PageController', 'notFound'], []);
    }

    /**
     * Get the current request URI
     */
    private function getRequestUri(): string
    {
        \$uri = \$_GET['url'] ?? '';
        \$uri = '/' . trim(\$uri, '/');
        return \$uri === '/' ? '/' : rtrim(\$uri, '/');
    }

    /**
     * Run middleware stack
     */
    private function runMiddleware(array \$middlewareList): bool
    {
        foreach (\$middlewareList as \$middleware) {
            \$class = "App\\\\Middleware\\\\{\$middleware}";
            if (class_exists(\$class)) {
                \$instance = new \$class();
                if (!\$instance->handle()) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Execute a controller action
     */
    private function executeAction(string|array \$action, array \$params): void
    {
        if (is_array(\$action)) {
            [\$controller, \$method] = \$action;
            \$className = "App\\\\Controllers\\\\{\$controller}";
        } else {
            [\$controller, \$method] = explode('@', \$action);
            \$className = "App\\\\Controllers\\\\{\$controller}";
        }

        if (!class_exists(\$className)) {
            throw new \\RuntimeException("Controller not found: {\$className}");
        }

        \$controllerInstance = new \$className();

        if (!method_exists(\$controllerInstance, \$method)) {
            throw new \\RuntimeException("Method not found: {\$className}@{\$method}");
        }

        call_user_func_array([\$controllerInstance, \$method], \$params);
    }

    /**
     * Generate URL for a named route
     */
    public function url(string \$name, array \$params = []): string
    {
        if (!isset(\$this->namedRoutes[\$name])) {
            throw new \\RuntimeException("Route not found: {\$name}");
        }

        \$uri = \$this->namedRoutes[\$name];
        foreach (\$params as \$key => \$value) {
            \$uri = str_replace('{'.\$key.'}', (string) \$value, \$uri);
        }

        return SITE_URL . \$uri;
    }

    /**
     * Load routes from file
     */
    public function loadRoutes(string \$file): void
    {
        if (file_exists(\$file)) {
            \$router = \$this;
            require \$file;
        }
    }
}
`
  },
  {
    path: 'app/core/Controller.php',
    name: 'Controller.php',
    language: 'php',
    description: 'Base Controller with view rendering, model loading, and JSON responses',
    content: `<?php
declare(strict_types=1);

namespace App\\Core;

/**
 * Base Controller
 */
abstract class Controller
{
    protected array \$viewData = [];
    protected string \$layout = 'main';

    /**
     * Share data with all views
     */
    protected function share(string \$key, mixed \$value): void
    {
        \$this->viewData[\$key] = \$value;
    }

    /**
     * Render a view
     */
    protected function view(string \$view, array \$data = [], int \$statusCode = 200): void
    {
        http_response_code(\$statusCode);

        // Merge shared data
        \$data = array_merge(\$this->viewData, \$data);

        // Extract data for use in views
        extract(\$data, EXTR_SKIP);

        // Start output buffering for the view content
        ob_start();
        \$viewFile = APP_PATH . '/views/' . str_replace('.', '/', \$view) . '.php';

        if (!file_exists(\$viewFile)) {
            throw new \\RuntimeException("View not found: {\$viewFile}");
        }

        require \$viewFile;
        \$content = ob_get_clean();

        // Render within layout
        \$layoutFile = APP_PATH . '/views/layouts/' . \$this->layout . '.php';

        if (file_exists(\$layoutFile)) {
            \$_view_content_ = \$content;
            \$_view_data_ = \$data;
            require \$layoutFile;
        } else {
            echo \$content;
        }
    }

    /**
     * Render a partial view (no layout)
     */
    protected function partial(string \$view, array \$data = []): void
    {
        extract(\$data, EXTR_SKIP);
        \$viewFile = APP_PATH . '/views/' . str_replace('.', '/', \$view) . '.php';

        if (!file_exists(\$viewFile)) {
            throw new \\RuntimeException("View not found: {\$viewFile}");
        }

        require \$viewFile;
    }

    /**
     * Return JSON response
     */
    protected function json(mixed \$data, int \$statusCode = 200): void
    {
        http_response_code(\$statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(\$data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /**
     * Redirect to URL
     */
    protected function redirect(string \$url, int \$statusCode = 302): void
    {
        http_response_code(\$statusCode);
        header("Location: {\$url}");
        exit;
    }

    /**
     * Redirect back with data
     */
    protected function redirectBack(): void
    {
        \$referer = \$_SERVER['HTTP_REFERER'] ?? SITE_URL;
        \$this->redirect(\$referer);
    }

    /**
     * Redirect with flash message
     */
    protected function redirectWith(string \$url, string \$type, string \$message): void
    {
        flash(\$type, \$message);
        \$this->redirect(\$url);
    }

    /**
     * Get request input
     */
    protected function input(string \$key, mixed \$default = null): mixed
    {
        return \$_POST[\$key] ?? \$_GET[\$key] ?? \$default;
    }

    /**
     * Get all input
     */
    protected function all(): array
    {
        return array_merge(\$_GET, \$_POST);
    }

    /**
     * Check if request is POST
     */
    protected function isPost(): bool
    {
        return \$_SERVER['REQUEST_METHOD'] === 'POST';
    }

    /**
     * Validate CSRF token
     */
    protected function validateCsrf(): bool
    {
        \$token = \$_POST['_token'] ?? '';
        if (!CSRF::verify(\$token)) {
            http_response_code(403);
            \$this->view('errors.403', ['message' => 'Invalid security token. Please try again.']);
            return false;
        }
        return true;
    }

    /**
     * Get uploaded file
     */
    protected function file(string \$key): ?array
    {
        if (!isset(\$_FILES[\$key]) || \$_FILES[\$key]['error'] === UPLOAD_ERR_NO_FILE) {
            return null;
        }
        return \$_FILES[\$key];
    }

    /**
     * Abort with error
     */
    protected function abort(int \$code, string \$message = ''): void
    {
        http_response_code(\$code);
        \$this->view("errors.{\$code}", ['message' => \$message]);
        exit;
    }
}
`
  },
  {
    path: 'app/core/Model.php',
    name: 'Model.php',
    language: 'php',
    description: 'Base Model with CRUD, pagination, soft deletes, and relationships',
    content: `<?php
declare(strict_types=1);

namespace App\\Core;

/**
 * Base Model - Active Record pattern
 */
abstract class Model
{
    protected string \$table = '';
    protected string \$primaryKey = 'id';
    protected bool \$timestamps = true;
    protected bool \$softDelete = false;
    protected string \$deletedAtColumn = 'deleted_at';
    protected array \$fillable = [];
    protected array \$hidden = ['password_hash', 'remember_token'];
    protected array \$casts = [];
    protected array \$relations = [];

    protected Database \$db;

    public function __construct()
    {
        \$this->db = Database::getInstance();
    }

    /**
     * Find a record by primary key
     */
    public function find(int|string \$id): ?array
    {
        \$sql = "SELECT * FROM \`{\$this->table}\` WHERE \`{\$this->primaryKey}\` = ?";

        if (\$this->softDelete) {
            \$sql .= " AND \`{\$this->deletedAtColumn}\` IS NULL";
        }

        \$result = \$this->db->fetch(\$sql, [\$id]);
        return \$result ?: null;
    }

    /**
     * Find or fail
     */
    public function findOrFail(int|string \$id): array
    {
        \$result = \$this->find(\$id);
        if (!\$result) {
            throw new \\RuntimeException('Record not found.');
        }
        return \$result;
    }

    /**
     * Find by column value
     */
    public function findBy(string \$column, mixed \$value): ?array
    {
        \$sql = "SELECT * FROM \`{\$this->table}\` WHERE \`{\$column}\` = ?";

        if (\$this->softDelete) {
            \$sql .= " AND \`{\$this->deletedAtColumn}\` IS NULL";
        }

        \$result = \$this->db->fetch(\$sql, [\$value]);
        return \$result ?: null;
    }

    /**
     * Get all records
     */
    public function all(string \$orderBy = 'created_at DESC'): array
    {
        \$sql = "SELECT * FROM \`{\$this->table}\`";

        if (\$this->softDelete) {
            \$sql .= " WHERE \`{\$this->deletedAtColumn}\` IS NULL";
        }

        \$sql .= " ORDER BY {\$orderBy}";
        return \$this->db->fetchAll(\$sql);
    }

    /**
     * Get records with conditions
     */
    public function where(string \$column, mixed \$value, string \$operator = '='): array
    {
        \$sql = "SELECT * FROM \`{\$this->table}\` WHERE \`{\$column}\` {\$operator} ?";

        if (\$this->softDelete) {
            \$sql .= " AND \`{\$this->deletedAtColumn}\` IS NULL";
        }

        return \$this->db->fetchAll(\$sql, [\$value]);
    }

    /**
     * Create a new record
     */
    public function create(array \$data): int
    {
        \$data = \$this->filterFillable(\$data);

        if (\$this->timestamps) {
            \$data['created_at'] = date('Y-m-d H:i:s');
            \$data['updated_at'] = date('Y-m-d H:i:s');
        }

        return \$this->db->insert(\$this->table, \$data);
    }

    /**
     * Update a record
     */
    public function update(int|string \$id, array \$data): bool
    {
        \$data = \$this->filterFillable(\$data);

        if (\$this->timestamps) {
            \$data['updated_at'] = date('Y-m-d H:i:s');
        }

        \$affected = \$this->db->update(
            \$this->table,
            \$data,
            "\`{\$this->primaryKey}\` = ?",
            [\$id]
        );

        return \$affected > 0;
    }

    /**
     * Delete a record (soft or hard)
     */
    public function delete(int|string \$id): bool
    {
        if (\$this->softDelete) {
            return \$this->db->update(
                \$this->table,
                [\$this->deletedAtColumn => date('Y-m-d H:i:s')],
                "\`{\$this->primaryKey}\` = ?",
                [\$id]
            ) > 0;
        }

        return \$this->db->delete(
            \$this->table,
            "\`{\$this->primaryKey}\` = ?",
            [\$id]
        ) > 0;
    }

    /**
     * Force delete (even with soft delete)
     */
    public function forceDelete(int|string \$id): bool
    {
        return \$this->db->delete(
            \$this->table,
            "\`{\$this->primaryKey}\` = ?",
            [\$id]
        ) > 0;
    }

    /**
     * Restore a soft-deleted record
     */
    public function restore(int|string \$id): bool
    {
        if (!\$this->softDelete) {
            return false;
        }

        return \$this->db->update(
            \$this->table,
            [\$this->deletedAtColumn => null],
            "\`{\$this->primaryKey}\` = ?",
            [\$id]
        ) > 0;
    }

    /**
     * Paginate results
     */
    public function paginate(int \$page = 1, int \$perPage = PER_PAGE, string \$where = '1=1', array \$params = [], string \$orderBy = 'created_at DESC'): array
    {
        \$offset = (\$page - 1) * \$perPage;

        \$countSql = "SELECT COUNT(*) FROM \`{\$this->table}\` WHERE {\$where}";
        if (\$this->softDelete) {
            \$countSql .= " AND \`{\$this->deletedAtColumn}\` IS NULL";
        }
        \$total = (int) \$this->db->fetchColumn(\$countSql, \$params);

        \$sql = "SELECT * FROM \`{\$this->table}\` WHERE {\$where}";
        if (\$this->softDelete) {
            \$sql .= " AND \`{\$this->deletedAtColumn}\` IS NULL";
        }
        \$sql .= " ORDER BY {\$orderBy} LIMIT ? OFFSET ?";

        \$items = \$this->db->fetchAll(\$sql, array_merge(\$params, [\$perPage, \$offset]));

        return [
            'data' => \$items,
            'total' => \$total,
            'per_page' => \$perPage,
            'current_page' => \$page,
            'last_page' => (int) ceil(\$total / \$perPage),
            'from' => \$offset + 1,
            'to' => min(\$offset + \$perPage, \$total),
        ];
    }

    /**
     * Count records
     */
    public function count(string \$where = '1=1', array \$params = []): int
    {
        \$sql = "SELECT COUNT(*) FROM \`{\$this->table}\` WHERE {\$where}";
        if (\$this->softDelete) {
            \$sql .= " AND \`{\$this->deletedAtColumn}\` IS NULL";
        }
        return (int) \$this->db->fetchColumn(\$sql, \$params);
    }

    /**
     * Check if exists
     */
    public function exists(string \$column, mixed \$value): bool
    {
        \$sql = "SELECT COUNT(*) FROM \`{\$this->table}\` WHERE \`{\$column}\` = ?";
        if (\$this->softDelete) {
            \$sql .= " AND \`{\$this->deletedAtColumn}\` IS NULL";
        }
        return (int) \$this->db->fetchColumn(\$sql, [\$value]) > 0;
    }

    /**
     * Filter data by fillable attributes
     */
    protected function filterFillable(array \$data): array
    {
        if (empty(\$this->fillable)) {
            return \$data;
        }
        return array_intersect_key(\$data, array_flip(\$this->fillable));
    }

    /**
     * Hide sensitive fields from output
     */
    public function hideFields(array \$record): array
    {
        foreach (\$this->hidden as \$field) {
            unset(\$record[\$field]);
        }
        return \$record;
    }

    /**
     * Get the table name
     */
    public function getTable(): string
    {
        return \$this->table;
    }
}
`
  },
  {
    path: 'app/core/Auth.php',
    name: 'Auth.php',
    language: 'php',
    description: 'Authentication - login, logout, remember-me, role checking',
    content: `<?php
declare(strict_types=1);

namespace App\\Core;

/**
 * Auth - Authentication handler
 */
class Auth
{
    private static ?array \$user = null;
    private static bool \$initialized = false;

    /**
     * Initialize auth state from session/cookie
     */
    public static function init(): void
    {
        if (self::\$initialized) {
            return;
        }

        self::\$initialized = true;

        // Check session first
        if (isset(\$_SESSION['user_id'])) {
            self::\$user = self::getUserFromDb((int) \$_SESSION['user_id']);
            return;
        }

        // Check remember me cookie
        if (isset(\$_COOKIE['remember_token'])) {
            self::loginFromCookie(\$_COOKIE['remember_token']);
        }
    }

    /**
     * Attempt login
     */
    public static function attempt(string \$email, string \$password, bool \$remember = false): bool
    {
        \$db = Database::getInstance();

        \$user = \$db->fetch(
            "SELECT * FROM users WHERE email = ? AND status = 'active' AND deleted_at IS NULL",
            [\$email]
        );

        if (!\$user || !password_verify(\$password, \$user['password_hash'])) {
            // Log failed attempt
            self::logActivity(null, 'login_failed', 'User login failed for: ' . \$email);
            return false;
        }

        // Regenerate session ID to prevent fixation
        session_regenerate_id(true);

        // Set session
        \$_SESSION['user_id'] = \$user['id'];
        \$_SESSION['user_role'] = \$user['role_id'];
        \$_SESSION['_created_at'] = time();

        // Update last login
        \$db->update('users', [
            'last_login' => date('Y-m-d H:i:s'),
            'last_login_ip' => \$_SERVER['REMOTE_ADDR'] ?? '',
        ], 'id = ?', [\$user['id']]);

        // Handle remember me
        if (\$remember) {
            self::setRememberToken((int) \$user['id']);
        }

        self::\$user = \$user;
        self::logActivity((int) \$user['id'], 'login', 'User logged in');

        return true;
    }

    /**
     * Logout
     */
    public static function logout(): void
    {
        \$userId = \$_SESSION['user_id'] ?? null;

        if (\$userId) {
            self::logActivity((int) \$userId, 'logout', 'User logged out');
            self::clearRememberToken((int) \$userId);
        }

        // Destroy session
        \$_SESSION = [];

        if (ini_get('session.use_cookies')) {
            \$params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                \$params['path'],
                \$params['domain'],
                \$params['secure'],
                \$params['httponly']
            );
        }

        session_destroy();
        self::\$user = null;
        self::\$initialized = false;
    }

    /**
     * Check if user is authenticated
     */
    public static function check(): bool
    {
        self::init();
        return self::\$user !== null;
    }

    /**
     * Check if user is a guest
     */
    public static function guest(): bool
    {
        return !self::check();
    }

    /**
     * Get current user
     */
    public static function user(): ?array
    {
        self::init();
        return self::\$user;
    }

    /**
     * Get current user ID
     */
    public static function id(): ?int
    {
        self::init();
        return self::\$user ? (int) self::\$user['id'] : null;
    }

    /**
     * Check if user has a specific role
     */
    public static function hasRole(string \$roleSlug): bool
    {
        self::init();
        if (!self::\$user) {
            return false;
        }

        \$db = Database::getInstance();
        \$result = \$db->fetch(
            "SELECT r.id FROM roles r
             INNER JOIN users u ON u.role_id = r.id
             WHERE u.id = ? AND r.slug = ?",
            [self::\$user['id'], \$roleSlug]
        );

        return \$result !== false;
    }

    /**
     * Check if user has a specific permission
     */
    public static function can(string \$permissionSlug): bool
    {
        self::init();
        if (!self::\$user) {
            return false;
        }

        // Super admin has all permissions
        if (self::hasRole('super_admin')) {
            return true;
        }

        \$db = Database::getInstance();
        \$result = \$db->fetch(
            "SELECT p.id FROM permissions p
             INNER JOIN role_permissions rp ON rp.permission_id = p.id
             INNER JOIN users u ON u.role_id = rp.role_id
             WHERE u.id = ? AND p.slug = ?",
            [self::\$user['id'], \$permissionSlug]
        );

        return \$result !== false;
    }

    /**
     * Check if user is admin or super admin
     */
    public static function isAdmin(): bool
    {
        return self::hasRole('super_admin') || self::hasRole('admin');
    }

    /**
     * Set remember me token
     */
    private static function setRememberToken(int \$userId): void
    {
        \$token = bin2hex(random_bytes(32));
        \$hashedToken = hash('sha256', \$token);

        \$db = Database::getInstance();
        \$db->update('users', ['remember_token' => \$hashedToken], 'id = ?', [\$userId]);

        setcookie('remember_token', \$userId . ':' . \$token, [
            'expires' => time() + REMEMBER_ME_LIFETIME,
            'path' => '/',
            'secure' => false, // Set true with HTTPS
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    /**
     * Clear remember me token
     */
    private static function clearRememberToken(int \$userId): void
    {
        \$db = Database::getInstance();
        \$db->update('users', ['remember_token' => null], 'id = ?', [\$userId]);

        setcookie('remember_token', '', [
            'expires' => time() - 3600,
            'path' => '/',
        ]);
    }

    /**
     * Login from remember cookie
     */
    private static function loginFromCookie(string \$cookie): void
    {
        \$parts = explode(':', \$cookie, 2);
        if (count(\$parts) !== 2) {
            return;
        }

        [\$userId, \$token] = \$parts;
        \$hashedToken = hash('sha256', \$token);

        \$db = Database::getInstance();
        \$user = \$db->fetch(
            "SELECT * FROM users WHERE id = ? AND remember_token = ? AND status = 'active' AND deleted_at IS NULL",
            [\$userId, \$hashedToken]
        );

        if (\$user) {
            session_regenerate_id(true);
            \$_SESSION['user_id'] = \$user['id'];
            \$_SESSION['user_role'] = \$user['role_id'];
            self::\$user = \$user;
        }
    }

    /**
     * Get user from database
     */
    private static function getUserFromDb(int \$id): ?array
    {
        \$db = Database::getInstance();
        return \$db->fetch(
            "SELECT u.*, r.name as role_name, r.slug as role_slug
             FROM users u
             LEFT JOIN roles r ON u.role_id = r.id
             WHERE u.id = ? AND u.status = 'active' AND u.deleted_at IS NULL",
            [\$id]
        ) ?: null;
    }

    /**
     * Log activity
     */
    private static function logActivity(?int \$userId, string \$action, string \$description = ''): void
    {
        try {
            \$db = Database::getInstance();
            \$db->insert('activity_logs', [
                'user_id' => \$userId,
                'action' => \$action,
                'description' => \$description,
                'ip' => \$_SERVER['REMOTE_ADDR'] ?? '',
                'user_agent' => \$_SERVER['HTTP_USER_AGENT'] ?? '',
                'created_at' => date('Y-m-d H:i:s'),
            ]);
        } catch (\\Throwable \$e) {
            error_log('Activity log failed: ' . \$e->getMessage());
        }
    }
}
`
  },
  {
    path: 'app/core/Validator.php',
    name: 'Validator.php',
    language: 'php',
    description: 'Input validation with rules, custom messages, and error handling',
    content: `<?php
declare(strict_types=1);

namespace App\\Core;

/**
 * Validator - Input validation
 */
class Validator
{
    private array \$data;
    private array \$rules;
    private array \$errors = [];
    private array \$customMessages = [];

    public function __construct(array \$data, array \$rules, array \$messages = [])
    {
        \$this->data = \$data;
        \$this->rules = \$rules;
        \$this->customMessages = \$messages;
    }

    /**
     * Run validation
     */
    public function validate(): bool
    {
        \$this->errors = [];

        foreach (\$this->rules as \$field => \$ruleSet) {
            \$rules = is_string(\$ruleSet) ? explode('|', \$ruleSet) : \$ruleSet;
            \$label = str_replace('_', ' ', \$field);

            foreach (\$rules as \$rule) {
                \$params = [];
                if (str_contains(\$rule, ':')) {
                    [\$rule, \$paramStr] = explode(':', \$rule, 2);
                    \$params = explode(',', \$paramStr);
                }

                \$method = 'rule' . ucfirst(\$rule);
                if (method_exists(\$this, \$method)) {
                    \$value = \$this->getNestedValue(\$field);
                    \$error = \$this->\$method(\$field, \$value, \$params, \$label);
                    if (\$error) {
                        \$this->errors[\$field][] = \$error;
                    }
                }
            }
        }

        return empty(\$this->errors);
    }

    /**
     * Get validation errors
     */
    public function errors(): array
    {
        return \$this->errors;
    }

    /**
     * Get first error for a field
     */
    public function firstError(string \$field): ?string
    {
        return \$this->errors[\$field][0] ?? null;
    }

    /**
     * Get all errors as flat array
     */
    public function allErrors(): array
    {
        \$flat = [];
        foreach (\$this->errors as \$field => \$messages) {
            foreach (\$messages as \$msg) {
                \$flat[] = \$msg;
            }
        }
        return \$flat;
    }

    /**
     * Static helper - quick validation
     */
    public static function make(array \$data, array \$rules, array \$messages = []): self
    {
        return new self(\$data, \$rules, \$messages);
    }

    // --- Rule Methods ---

    private function ruleRequired(string \$field, mixed \$value, array \$params, string \$label): ?string
    {
        if (\$value === null || \$value === '' || \$value === []) {
            return \$this->getMessage(\$field, 'required', "The {\$label} field is required.");
        }
        return null;
    }

    private function ruleEmail(string \$field, mixed \$value, array \$params, string \$label): ?string
    {
        if (\$value && !filter_var(\$value, FILTER_VALIDATE_EMAIL)) {
            return \$this->getMessage(\$field, 'email', "The {\$label} must be a valid email address.");
        }
        return null;
    }

    private function ruleMin(string \$field, mixed \$value, array \$params, string \$label): ?string
    {
        \$min = (int) (\$params[0] ?? 0);
        if (is_string(\$value) && mb_strlen(\$value) < \$min) {
            return \$this->getMessage(\$field, 'min', "The {\$label} must be at least {\$min} characters.");
        }
        if (is_numeric(\$value) && \$value < \$min) {
            return \$this->getMessage(\$field, 'min', "The {\$label} must be at least {\$min}.");
        }
        return null;
    }

    private function ruleMax(string \$field, mixed \$value, array \$params, string \$label): ?string
    {
        \$max = (int) (\$params[0] ?? 0);
        if (is_string(\$value) && mb_strlen(\$value) > \$max) {
            return \$this->getMessage(\$field, 'max', "The {\$label} must not exceed {\$max} characters.");
        }
        if (is_numeric(\$value) && \$value > \$max) {
            return \$this->getMessage(\$field, 'max', "The {\$label} must not exceed {\$max}.");
        }
        return null;
    }

    private function ruleNumeric(string \$field, mixed \$value, array \$params, string \$label): ?string
    {
        if (\$value !== null && \$value !== '' && !is_numeric(\$value)) {
            return \$this->getMessage(\$field, 'numeric', "The {\$label} must be a number.");
        }
        return null;
    }

    private function ruleAlpha(string \$field, mixed \$value, array \$params, string \$label): ?string
    {
        if (\$value && !preg_match('/^[a-zA-Z]+\$/', \$value)) {
            return \$this->getMessage(\$field, 'alpha', "The {\$label} must contain only letters.");
        }
        return null;
    }

    private function ruleAlphaNum(string \$field, mixed \$value, array \$params, string \$label): ?string
    {
        if (\$value && !preg_match('/^[a-zA-Z0-9]+\$/', \$value)) {
            return \$this->getMessage(\$field, 'alpha_num', "The {\$label} must contain only letters and numbers.");
        }
        return null;
    }

    private function ruleSlug(string \$field, mixed \$value, array \$params, string \$label): ?string
    {
        if (\$value && !preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*\$/', \$value)) {
            return \$this->getMessage(\$field, 'slug', "The {\$label} must be a valid slug (lowercase, hyphens).");
        }
        return null;
    }

    private function ruleUnique(string \$field, mixed \$value, array \$params, string \$label): ?string
    {
        \$table = \$params[0] ?? '';
        \$column = \$params[1] ?? \$field;
        \$ignoreId = \$params[2] ?? null;

        if (!\$table || !\$value) {
            return null;
        }

        \$db = Database::getInstance();
        \$sql = "SELECT COUNT(*) FROM \`{\$table}\` WHERE \`{\$column}\` = ?";
        \$bindParams = [\$value];

        if (\$ignoreId) {
            \$sql .= " AND id != ?";
            \$bindParams[] = \$ignoreId;
        }

        \$count = (int) \$db->fetchColumn(\$sql, \$bindParams);
        if (\$count > 0) {
            return \$this->getMessage(\$field, 'unique', "The {\$label} has already been taken.");
        }
        return null;
    }

    private function ruleIn(string \$field, mixed \$value, array \$params, string \$label): ?string
    {
        if (\$value !== null && \$value !== '' && !in_array(\$value, \$params, true)) {
            \$allowed = implode(', ', \$params);
            return \$this->getMessage(\$field, 'in', "The {\$label} must be one of: {\$allowed}.");
        }
        return null;
    }

    private function ruleUrl(string \$field, mixed \$value, array \$params, string \$label): ?string
    {
        if (\$value && !filter_var(\$value, FILTER_VALIDATE_URL)) {
            return \$this->getMessage(\$field, 'url', "The {\$label} must be a valid URL.");
        }
        return null;
    }

    private function ruleConfirmed(string \$field, mixed \$value, array \$params, string \$label): ?string
    {
        \$confirmField = \$field . '_confirmation';
        \$confirmValue = \$this->data[\$confirmField] ?? null;
        if (\$value !== \$confirmValue) {
            return \$this->getMessage(\$field, 'confirmed', "The {\$label} confirmation does not match.");
        }
        return null;
    }

    private function ruleNullable(string \$field, mixed \$value, array \$params, string \$label): ?string
    {
        // Nullable just means the field can be null - handled by skipping other rules
        return null;
    }

    private function ruleInteger(string \$field, mixed \$value, array \$params, string \$label): ?string
    {
        if (\$value !== null && \$value !== '' && filter_var(\$value, FILTER_VALIDATE_INT) === false) {
            return \$this->getMessage(\$field, 'integer', "The {\$label} must be an integer.");
        }
        return null;
    }

    private function rulePhone(string \$field, mixed \$value, array \$params, string \$label): ?string
    {
        if (\$value && !preg_match('/^[\\+]?[0-9\\s\\-\\(\\)]{7,20}\$/', \$value)) {
            return \$this->getMessage(\$field, 'phone', "The {\$label} must be a valid phone number.");
        }
        return null;
    }

    // --- Helpers ---

    private function getNestedValue(string \$field): mixed
    {
        \$keys = explode('.', \$field);
        \$value = \$this->data;

        foreach (\$keys as \$key) {
            if (!is_array(\$value) || !array_key_exists(\$key, \$value)) {
                return null;
            }
            \$value = \$value[\$key];
        }

        return \$value;
    }

    private function getMessage(string \$field, string \$rule, string \$default): string
    {
        \$key = "{\$field}.{\$rule}";
        return \$this->customMessages[\$key] ?? \$default;
    }
}
`
  },
  {
    path: 'app/core/CSRF.php',
    name: 'CSRF.php',
    language: 'php',
    description: 'CSRF token generation and verification',
    content: `<?php
declare(strict_types=1);

namespace App\\Core;

/**
 * CSRF Protection
 */
class CSRF
{
    private const TOKEN_KEY = '_csrf_token';
    private const TOKEN_LIFETIME = 7200; // 2 hours

    /**
     * Initialize CSRF - generate token if needed
     */
    public static function init(): void
    {
        if (!isset(\$_SESSION[self::TOKEN_KEY]) || self::isExpired()) {
            self::regenerate();
        }
    }

    /**
     * Get the current token
     */
    public static function token(): string
    {
        return \$_SESSION[self::TOKEN_KEY]['token'] ?? '';
    }

    /**
     * Regenerate the token
     */
    public static function regenerate(): void
    {
        \$_SESSION[self::TOKEN_KEY] = [
            'token' => bin2hex(random_bytes(32)),
            'time' => time(),
        ];
    }

    /**
     * Verify a token
     */
    public static function verify(string \$token): bool
    {
        if (!isset(\$_SESSION[self::TOKEN_KEY]['token'])) {
            return false;
        }

        if (self::isExpired()) {
            self::regenerate();
            return false;
        }

        return hash_equals(\$_SESSION[self::TOKEN_KEY]['token'], \$token);
    }

    /**
     * Generate hidden input field HTML
     */
    public static function field(): string
    {
        \$token = htmlspecialchars(self::token(), ENT_QUOTES, 'UTF-8');
        return '<input type="hidden" name="_token" value="' . \$token . '">';
    }

    /**
     * Generate meta tag for AJAX requests
     */
    public static function meta(): string
    {
        \$token = htmlspecialchars(self::token(), ENT_QUOTES, 'UTF-8');
        return '<meta name="csrf-token" content="' . \$token . '">';
    }

    /**
     * Check if token has expired
     */
    private static function isExpired(): bool
    {
        if (!isset(\$_SESSION[self::TOKEN_KEY]['time'])) {
            return true;
        }
        return (time() - \$_SESSION[self::TOKEN_KEY]['time']) > self::TOKEN_LIFETIME;
    }
}
`
  },
  {
    path: 'app/helpers/functions.php',
    name: 'functions.php',
    language: 'php',
    description: 'Global helper functions used throughout the application',
    content: `<?php
declare(strict_types=1);

/**
 * Khybersoft - Global Helper Functions
 */

/**
 * Escape HTML entities
 */
function e(?string \$value): string
{
    return htmlspecialchars(\$value ?? '', ENT_QUOTES, 'UTF-8');
}

/**
 * Generate full URL
 */
function url(string \$path = ''): string
{
    return SITE_URL . '/' . ltrim(\$path, '/');
}

/**
 * Generate asset URL
 */
function asset(string \$path): string
{
    \$filePath = ASSET_PATH . '/' . ltrim(\$path, '/');
    \$version = file_exists(\$filePath) ? filemtime(\$filePath) : '';
    return ASSET_URL . '/' . ltrim(\$path, '/') . (\$version ? '?v=' . \$version : '');
}

/**
 * Generate upload URL
 */
function upload(string \$path): string
{
    return UPLOAD_URL . '/' . ltrim(\$path, '/');
}

/**
 * Convert string to URL-friendly slug
 */
function slugify(string \$text): string
{
    \$text = mb_strtolower(\$text);
    \$text = preg_replace('/[^a-z0-9\\s-]/', '', \$text);
    \$text = preg_replace('/[\\s-]+/', '-', \$text);
    return trim(\$text, '-');
}

/**
 * Format money
 */
function money(float \$amount, string \$currency = 'USD'): string
{
    \$symbols = [
        'USD' => '\$',
        'EUR' => '€',
        'GBP' => '£',
        'PKR' => 'Rs.',
        'INR' => '₹',
        'AED' => 'AED ',
    ];

    \$symbol = \$symbols[\$currency] ?? \$currency . ' ';
    return \$symbol . number_format(\$amount, 2);
}

/**
 * Set flash message
 */
function flash(string \$key, string \$message): void
{
    \$_SESSION['_flash'][\$key] = \$message;
}

/**
 * Get and clear flash message
 */
function get_flash(string \$key): ?string
{
    \$message = \$_SESSION['_flash'][\$key] ?? null;
    unset(\$_SESSION['_flash'][\$key]);
    return \$message;
}

/**
 * Check if flash message exists
 */
function has_flash(string \$key): bool
{
    return isset(\$_SESSION['_flash'][\$key]);
}

/**
 * Get old input value (for form repopulation)
 */
function old(string \$key, string \$default = ''): string
{
    \$value = \$_SESSION['_old_input'][\$key] ?? \$default;
    return e((string) \$value);
}

/**
 * Store input for old() retrieval
 */
function flash_input(): void
{
    \$_SESSION['_old_input'] = \$_POST;
}

/**
 * Clear old input
 */
function clear_old_input(): void
{
    unset(\$_SESSION['_old_input']);
}

/**
 * Get a site setting value
 */
function setting(string \$key, string \$default = ''): string
{
    static \$cache = [];

    if (isset(\$cache[\$key])) {
        return \$cache[\$key];
    }

    try {
        \$db = \\App\\Core\\Database::getInstance();
        \$result = \$db->fetch("SELECT value FROM settings WHERE \`key\` = ?", [\$key]);
        \$value = \$result ? \$result['value'] : \$default;
        \$cache[\$key] = \$value;
        return \$value;
    } catch (\\Throwable \$e) {
        return \$default;
    }
}

/**
 * Format date
 */
function format_date(?string \$date, string \$format = 'M d, Y'): string
{
    if (!\$date) {
        return '';
    }
    return date(\$format, strtotime(\$date));
}

/**
 * Format datetime
 */
function format_datetime(?string \$datetime, string \$format = 'M d, Y H:i'): string
{
    if (!\$datetime) {
        return '';
    }
    return date(\$format, strtotime(\$datetime));
}

/**
 * Time ago (relative)
 */
function time_ago(string \$datetime): string
{
    \$time = strtotime(\$datetime);
    \$diff = time() - \$time;

    if (\$diff < 60) return 'just now';
    if (\$diff < 3600) return floor(\$diff / 60) . ' min ago';
    if (\$diff < 86400) return floor(\$diff / 3600) . ' hours ago';
    if (\$diff < 604800) return floor(\$diff / 86400) . ' days ago';
    if (\$diff < 2592000) return floor(\$diff / 604800) . ' weeks ago';
    return date('M d, Y', \$time);
}

/**
 * Truncate text
 */
function str_limit(string \$text, int \$limit = 100, string \$end = '...'): string
{
    if (mb_strlen(\$text) <= \$limit) {
        return \$text;
    }
    return mb_substr(\$text, 0, \$limit) . \$end;
}

/**
 * Generate pagination HTML
 */
function pagination(array \$data, string \$baseUrl): string
{
    if (\$data['last_page'] <= 1) {
        return '';
    }

    \$html = '<nav class="flex items-center justify-center space-x-1 mt-8">';

    // Previous
    if (\$data['current_page'] > 1) {
        \$html .= '<a href="' . \$baseUrl . '?page=' . (\$data['current_page'] - 1) . '" class="px-3 py-2 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600">&laquo; Prev</a>';
    }

    // Pages
    for (\$i = 1; \$i <= \$data['last_page']; \$i++) {
        if (\$i === \$data['current_page']) {
            \$html .= '<span class="px-3 py-2 rounded-md bg-blue-600 text-white">' . \$i . '</span>';
        } else {
            \$html .= '<a href="' . \$baseUrl . '?page=' . \$i . '" class="px-3 py-2 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600">' . \$i . '</a>';
        }
    }

    // Next
    if (\$data['current_page'] < \$data['last_page']) {
        \$html .= '<a href="' . \$baseUrl . '?page=' . (\$data['current_page'] + 1) . '" class="px-3 py-2 rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600">Next &raquo;</a>';
    }

    \$html .= '</nav>';
    return \$html;
}

/**
 * Check if current URL matches
 */
function is_active(string \$path): bool
{
    \$current = parse_url(\$_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
    return \$current === \$path || str_starts_with(\$current ?? '', \$path);
}

/**
 * Get client IP
 */
function client_ip(): string
{
    return \$_SERVER['HTTP_X_FORWARDED_FOR']
        ?? \$_SERVER['HTTP_CLIENT_IP']
        ?? \$_SERVER['REMOTE_ADDR']
        ?? '0.0.0.0';
}

/**
 * Generate random string
 */
function random_string(int \$length = 32): string
{
    return bin2hex(random_bytes((int) ceil(\$length / 2)));
}

/**
 * Active class helper for navigation
 */
function nav_active(string ...\$paths): string
{
    \$current = parse_url(\$_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?? '/';
    foreach (\$paths as \$path) {
        if (\$current === \$path) {
            return 'active text-blue-400';
        }
    }
    return 'text-slate-300 hover:text-white';
}

/**
 * Dump and die (debug helper)
 */
function dd(mixed ...\$vars): never
{
    echo '<pre style="background:#1e293b;color:#e2e8f0;padding:1rem;border-radius:8px;overflow:auto;">';
    foreach (\$vars as \$var) {
        var_dump(\$var);
        echo "\\n---\\n";
    }
    echo '</pre>';
    exit;
}
`
  },
  {
    path: 'app/middleware/AuthMiddleware.php',
    name: 'AuthMiddleware.php',
    language: 'php',
    description: 'Authentication middleware - redirects guests to login',
    content: `<?php
declare(strict_types=1);

namespace App\\Middleware;

use App\\Core\\Auth;

/**
 * Auth Middleware - Requires authentication
 */
class AuthMiddleware
{
    public function handle(): bool
    {
        if (Auth::guest()) {
            flash('error', 'Please log in to continue.');
            \$_SESSION['intended_url'] = \$_SERVER['REQUEST_URI'];
            header('Location: ' . SITE_URL . '/admin/login');
            exit;
        }
        return true;
    }
}
`
  },
  {
    path: 'app/middleware/AdminMiddleware.php',
    name: 'AdminMiddleware.php',
    language: 'php',
    description: 'Admin middleware - requires admin role',
    content: `<?php
declare(strict_types=1);

namespace App\\Middleware;

use App\\Core\\Auth;

/**
 * Admin Middleware - Requires admin access
 */
class AdminMiddleware
{
    public function handle(): bool
    {
        if (Auth::guest()) {
            flash('error', 'Please log in to continue.');
            header('Location: ' . SITE_URL . '/admin/login');
            exit;
        }

        if (!Auth::isAdmin()) {
            http_response_code(403);
            echo 'Access denied. Admin privileges required.';
            exit;
        }

        return true;
    }
}
`
  },
  {
    path: 'app/middleware/PermissionMiddleware.php',
    name: 'PermissionMiddleware.php',
    language: 'php',
    description: 'Permission middleware - checks specific permission',
    content: `<?php
declare(strict_types=1);

namespace App\\Middleware;

use App\\Core\\Auth;

/**
 * Permission Middleware - Requires specific permission
 */
class PermissionMiddleware
{
    private string \$permission;

    public function __construct(string \$permission = '')
    {
        \$this->permission = \$permission;
    }

    public function handle(): bool
    {
        if (Auth::guest()) {
            flash('error', 'Please log in to continue.');
            header('Location: ' . SITE_URL . '/admin/login');
            exit;
        }

        if (\$this->permission && !Auth::can(\$this->permission)) {
            http_response_code(403);
            echo 'Access denied. Insufficient permissions.';
            exit;
        }

        return true;
    }
}
`
  },
  {
    path: 'app/middleware/GuestMiddleware.php',
    name: 'GuestMiddleware.php',
    language: 'php',
    description: 'Guest middleware - only allows non-authenticated users',
    content: `<?php
declare(strict_types=1);

namespace App\\Middleware;

use App\\Core\\Auth;

/**
 * Guest Middleware - Only for non-authenticated users
 */
class GuestMiddleware
{
    public function handle(): bool
    {
        if (Auth::check()) {
            header('Location: ' . SITE_URL . '/admin');
            exit;
        }
        return true;
    }
}
`
  },
  {
    path: 'app/controllers/front/HomeController.php',
    name: 'HomeController.php',
    language: 'php',
    description: 'Front-end home page controller',
    content: `<?php
declare(strict_types=1);

namespace App\\Controllers\\Front;

use App\\Core\\Controller;
use App\\Models\\Product;
use App\\Models\\Testimonial;
use App\\Models\\Service;
use App\\Models\\BlogPost;
use App\\Models\\Client;

/**
 * Home Controller - Landing page
 */
class HomeController extends Controller
{
    protected string \$layout = 'front';

    public function index(): void
    {
        \$productModel = new Product();
        \$testimonialModel = new Testimonial();
        \$serviceModel = new Service();
        \$blogModel = new BlogPost();
        \$clientModel = new Client();

        \$data = [
            'page_title' => setting('site_name') . ' - ' . setting('site_tagline'),
            'meta_desc' => 'Khybersoft - Innovative software solutions for modern businesses.',
            'featured_products' => \$productModel->where('is_featured', 1),
            'testimonials' => \$testimonialModel->where('status', 'published'),
            'services' => \$serviceModel->where('status', 'published'),
            'latest_posts' => \$blogModel->where('status', 'published'),
            'clients' => \$clientModel->where('status', 'active'),
        ];

        \$this->view('front.home.index', \$data);
    }

    public function about(): void
    {
        \$data = [
            'page_title' => 'About Us - ' . setting('site_name'),
            'meta_desc' => 'Learn about Khybersoft and our mission.',
        ];
        \$this->view('front.home.about', \$data);
    }

    public function contact(): void
    {
        \$data = [
            'page_title' => 'Contact Us - ' . setting('site_name'),
            'meta_desc' => 'Get in touch with Khybersoft.',
        ];
        \$this->view('front.home.contact', \$data);
    }

    public function submitContact(): void
    {
        if (!\$this->validateCsrf()) return;

        \$validator = \\App\\Core\\Validator::make(\$_POST, [
            'name' => 'required|min:2|max:100',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|phone',
            'subject' => 'required|min:3|max:255',
            'message' => 'required|min:10|max:5000',
        ]);

        if (!\$validator->validate()) {
            flash_input();
            flash('errors', json_encode(\$validator->errors()));
            \$this->redirectBack();
            return;
        }

        \$db = \\App\\Core\\Database::getInstance();
        \$db->insert('contact_messages', [
            'name' => \$this->input('name'),
            'email' => \$this->input('email'),
            'phone' => \$this->input('phone'),
            'subject' => \$this->input('subject'),
            'message' => \$this->input('message'),
            'ip' => client_ip(),
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        clear_old_input();
        \$this->redirectWith('/contact', 'success', 'Thank you! Your message has been sent successfully.');
    }
}
`
  },
  {
    path: 'app/controllers/front/ProductController.php',
    name: 'ProductController.php',
    language: 'php',
    description: 'Front-end products controller',
    content: `<?php
declare(strict_types=1);

namespace App\\Controllers\\Front;

use App\\Core\\Controller;
use App\\Core\\Validator;
use App\\Core\\Database;
use App\\Models\\Product;

/**
 * Product Controller - Product listing and detail pages
 */
class ProductController extends Controller
{
    protected string \$layout = 'front';
    private Product \$productModel;

    public function __construct()
    {
        parent::__construct();
        \$this->productModel = new Product();
    }

    /**
     * List all products
     */
    public function index(): void
    {
        \$page = max(1, (int) (\$_GET['page'] ?? 1));
        \$category = \$_GET['category'] ?? null;

        \$where = "status = 'published'";
        \$params = [];

        if (\$category) {
            \$where .= " AND category_id = (SELECT id FROM product_categories WHERE slug = ?)";
            \$params[] = \$category;
        }

        \$products = \$this->productModel->paginate(\$page, 12, \$where, \$params);

        \$data = [
            'page_title' => 'Our Products - ' . setting('site_name'),
            'products' => \$products['data'],
            'pagination' => \$products,
            'current_category' => \$category,
        ];

        \$this->view('front.products.index', \$data);
    }

    /**
     * Single product page
     */
    public function show(string \$slug): void
    {
        \$db = Database::getInstance();

        \$product = \$db->fetch(
            "SELECT p.*, pc.name as category_name, pc.slug as category_slug
             FROM products p
             LEFT JOIN product_categories pc ON p.category_id = pc.id
             WHERE p.slug = ? AND p.status = 'published' AND p.deleted_at IS NULL",
            [\$slug]
        );

        if (!\$product) {
            \$this->abort(404, 'Product not found.');
            return;
        }

        \$plans = \$db->fetchAll(
            "SELECT * FROM product_plans WHERE product_id = ? ORDER BY sort_order",
            [\$product['id']]
        );

        \$features = \$db->fetchAll(
            "SELECT * FROM product_features WHERE product_id = ? ORDER BY sort_order",
            [\$product['id']]
        );

        \$faqs = \$db->fetchAll(
            "SELECT * FROM product_faqs WHERE product_id = ? ORDER BY sort_order",
            [\$product['id']]
        );

        \$demos = \$db->fetchAll(
            "SELECT * FROM product_demos WHERE product_id = ? ORDER BY sort_order",
            [\$product['id']]
        );

        \$versions = \$db->fetchAll(
            "SELECT * FROM product_versions WHERE product_id = ? ORDER BY release_date DESC LIMIT 5",
            [\$product['id']]
        );

        \$data = [
            'page_title' => (\$product['meta_title'] ?: \$product['name']) . ' - ' . setting('site_name'),
            'meta_desc' => \$product['meta_desc'] ?: \$product['short_desc'],
            'product' => \$product,
            'plans' => \$plans,
            'features' => \$features,
            'faqs' => \$faqs,
            'demos' => \$demos,
            'versions' => \$versions,
        ];

        \$this->view('front.products.show', \$data);
    }

    /**
     * Submit product inquiry
     */
    public function inquire(string \$slug): void
    {
        if (!\$this->validateCsrf()) return;

        \$db = Database::getInstance();
        \$product = \$db->fetch("SELECT id FROM products WHERE slug = ?", [\$slug]);

        if (!\$product) {
            \$this->json(['error' => 'Product not found'], 404);
            return;
        }

        \$validator = Validator::make(\$_POST, [
            'name' => 'required|min:2|max:100',
            'email' => 'required|email',
            'phone' => 'nullable|phone',
            'company' => 'nullable|max:100',
            'message' => 'required|min:10|max:2000',
            'type' => 'required|in:demo,quote,support',
        ]);

        if (!\$validator->validate()) {
            if (\$_SERVER['HTTP_X_REQUESTED_WITH'] ?? '' === 'XMLHttpRequest') {
                \$this->json(['errors' => \$validator->errors()], 422);
            } else {
                flash_input();
                flash('errors', json_encode(\$validator->errors()));
                \$this->redirectBack();
            }
            return;
        }

        \$db->insert('product_inquiries', [
            'product_id' => \$product['id'],
            'name' => \$this->input('name'),
            'email' => \$this->input('email'),
            'phone' => \$this->input('phone'),
            'company' => \$this->input('company'),
            'message' => \$this->input('message'),
            'type' => \$this->input('type'),
            'ip' => client_ip(),
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        if (\$_SERVER['HTTP_X_REQUESTED_WITH'] ?? '' === 'XMLHttpRequest') {
            \$this->json(['success' => true, 'message' => 'Inquiry submitted successfully!']);
        } else {
            clear_old_input();
            \$this->redirectWith('/products/' . \$slug, 'success', 'Your inquiry has been submitted!');
        }
    }
}
`
  },
  {
    path: 'app/controllers/front/BlogController.php',
    name: 'BlogController.php',
    language: 'php',
    description: 'Front-end blog controller',
    content: `<?php
declare(strict_types=1);

namespace App\\Controllers\\Front;

use App\\Core\\Controller;
use App\\Core\\Database;
use App\\Core\\Validator;
use App\\Models\\BlogPost;

/**
 * Blog Controller
 */
class BlogController extends Controller
{
    protected string \$layout = 'front';

    public function index(): void
    {
        \$page = max(1, (int) (\$_GET['page'] ?? 1));
        \$category = \$_GET['category'] ?? null;
        \$search = \$_GET['search'] ?? null;

        \$db = Database::getInstance();

        \$where = "p.status = 'published' AND p.published_at <= NOW()";
        \$params = [];

        if (\$category) {
            \$where .= " AND c.slug = ?";
            \$params[] = \$category;
        }

        if (\$search) {
            \$where .= " AND (p.title LIKE ? OR p.excerpt LIKE ?)";
            \$params[] = "%{\$search}%";
            \$params[] = "%{\$search}%";
        }

        \$offset = (\$page - 1) * PER_PAGE;

        \$total = (int) \$db->fetchColumn(
            "SELECT COUNT(*) FROM blog_posts p
             LEFT JOIN blog_categories c ON p.category_id = c.id
             WHERE {\$where}",
            \$params
        );

        \$posts = \$db->fetchAll(
            "SELECT p.*, c.name as category_name, c.slug as category_slug, u.name as author_name
             FROM blog_posts p
             LEFT JOIN blog_categories c ON p.category_id = c.id
             LEFT JOIN users u ON p.author_id = u.id
             WHERE {\$where}
             ORDER BY p.published_at DESC
             LIMIT ? OFFSET ?",
            array_merge(\$params, [PER_PAGE, \$offset])
        );

        \$categories = \$db->fetchAll("SELECT * FROM blog_categories ORDER BY name");

        \$data = [
            'page_title' => 'Blog - ' . setting('site_name'),
            'posts' => \$posts,
            'categories' => \$categories,
            'current_category' => \$category,
            'search' => \$search,
            'pagination' => [
                'total' => \$total,
                'per_page' => PER_PAGE,
                'current_page' => \$page,
                'last_page' => (int) ceil(\$total / PER_PAGE),
            ],
        ];

        \$this->view('front.blog.index', \$data);
    }

    public function show(string \$slug): void
    {
        \$db = Database::getInstance();

        \$post = \$db->fetch(
            "SELECT p.*, c.name as category_name, c.slug as category_slug, u.name as author_name
             FROM blog_posts p
             LEFT JOIN blog_categories c ON p.category_id = c.id
             LEFT JOIN users u ON p.author_id = u.id
             WHERE p.slug = ? AND p.status = 'published' AND p.deleted_at IS NULL",
            [\$slug]
        );

        if (!\$post) {
            \$this->abort(404, 'Post not found.');
            return;
        }

        // Increment views
        \$db->query("UPDATE blog_posts SET views = views + 1 WHERE id = ?", [\$post['id']]);

        // Get tags
        \$tags = \$db->fetchAll(
            "SELECT t.* FROM blog_tags t
             INNER JOIN blog_post_tags pt ON pt.tag_id = t.id
             WHERE pt.post_id = ?",
            [\$post['id']]
        );

        // Get comments
        \$comments = \$db->fetchAll(
            "SELECT * FROM blog_comments WHERE post_id = ? AND status = 'approved' ORDER BY created_at ASC",
            [\$post['id']]
        );

        // Related posts
        \$related = \$db->fetchAll(
            "SELECT p.title, p.slug, p.featured_image, p.excerpt
             FROM blog_posts p
             WHERE p.category_id = ? AND p.id != ? AND p.status = 'published'
             ORDER BY p.published_at DESC LIMIT 3",
            [\$post['category_id'], \$post['id']]
        );

        \$data = [
            'page_title' => (\$post['meta_title'] ?: \$post['title']) . ' - Blog',
            'meta_desc' => \$post['meta_desc'] ?: str_limit(strip_tags(\$post['excerpt'] ?? ''), 160),
            'post' => \$post,
            'tags' => \$tags,
            'comments' => \$comments,
            'related' => \$related,
        ];

        \$this->view('front.blog.show', \$data);
    }

    public function submitComment(string \$slug): void
    {
        if (!\$this->validateCsrf()) return;

        \$db = Database::getInstance();
        \$post = \$db->fetch("SELECT id FROM blog_posts WHERE slug = ? AND status = 'published'", [\$slug]);

        if (!\$post) {
            \$this->redirectBack();
            return;
        }

        \$validator = Validator::make(\$_POST, [
            'name' => 'required|min:2|max:100',
            'email' => 'required|email',
            'message' => 'required|min:5|max:2000',
        ]);

        if (!\$validator->validate()) {
            flash_input();
            flash('comment_errors', json_encode(\$validator->errors()));
            \$this->redirect('/blog/' . \$slug);
            return;
        }

        \$db->insert('blog_comments', [
            'post_id' => \$post['id'],
            'name' => \$this->input('name'),
            'email' => \$this->input('email'),
            'message' => \$this->input('message'),
            'ip' => client_ip(),
            'status' => 'pending',
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        flash('success', 'Your comment is awaiting moderation.');
        \$this->redirect('/blog/' . \$slug);
    }
}
`
  },
  {
    path: 'app/controllers/admin/DashboardController.php',
    name: 'DashboardController.php',
    language: 'php',
    description: 'Admin dashboard controller',
    content: `<?php
declare(strict_types=1);

namespace App\\Controllers\\Admin;

use App\\Core\\Controller;
use App\\Core\\Database;

/**
 * Admin Dashboard Controller
 */
class DashboardController extends Controller
{
    protected string \$layout = 'admin';

    public function index(): void
    {
        \$db = Database::getInstance();

        \$stats = [
            'total_users' => (int) \$db->fetchColumn("SELECT COUNT(*) FROM users WHERE deleted_at IS NULL"),
            'total_products' => (int) \$db->fetchColumn("SELECT COUNT(*) FROM products WHERE deleted_at IS NULL"),
            'total_posts' => (int) \$db->fetchColumn("SELECT COUNT(*) FROM blog_posts WHERE deleted_at IS NULL"),
            'total_inquiries' => (int) \$db->fetchColumn("SELECT COUNT(*) FROM product_inquiries WHERE status = 'new'"),
            'total_messages' => (int) \$db->fetchColumn("SELECT COUNT(*) FROM contact_messages WHERE status = 'new'"),
            'total_subscribers' => (int) \$db->fetchColumn("SELECT COUNT(*) FROM newsletter_subscribers WHERE status = 'active'"),
        ];

        \$recentActivity = \$db->fetchAll(
            "SELECT al.*, u.name as user_name
             FROM activity_logs al
             LEFT JOIN users u ON al.user_id = u.id
             ORDER BY al.created_at DESC LIMIT 20"
        );

        \$recentInquiries = \$db->fetchAll(
            "SELECT pi.*, p.name as product_name
             FROM product_inquiries pi
             LEFT JOIN products p ON pi.product_id = p.id
             WHERE pi.status = 'new'
             ORDER BY pi.created_at DESC LIMIT 10"
        );

        \$data = [
            'page_title' => 'Dashboard - Admin',
            'stats' => \$stats,
            'recent_activity' => \$recentActivity,
            'recent_inquiries' => \$recentInquiries,
        ];

        \$this->view('admin.dashboard', \$data);
    }
}
`
  },
  {
    path: 'app/controllers/admin/AuthController.php',
    name: 'AuthController.php',
    language: 'php',
    description: 'Admin authentication controller',
    content: `<?php
declare(strict_types=1);

namespace App\\Controllers\\Admin;

use App\\Core\\Controller;
use App\\Core\\Auth;
use App\\Core\\Validator;

/**
 * Admin Auth Controller
 */
class AuthController extends Controller
{
    protected string \$layout = 'auth';

    public function showLogin(): void
    {
        if (Auth::check()) {
            \$this->redirect('/admin');
            return;
        }

        \$data = [
            'page_title' => 'Admin Login',
        ];
        \$this->view('admin.auth.login', \$data);
    }

    public function login(): void
    {
        if (!\$this->validateCsrf()) return;

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

        \$remember = (bool) \$this->input('remember');

        if (Auth::attempt(\$this->input('email'), \$this->input('password'), \$remember)) {
            clear_old_input();
            \$intended = \$_SESSION['intended_url'] ?? '/admin';
            unset(\$_SESSION['intended_url']);
            \$this->redirect(SITE_URL . \$intended);
        } else {
            flash_input();
            flash('error', 'Invalid email or password.');
            \$this->redirect('/admin/login');
        }
    }

    public function logout(): void
    {
        Auth::logout();
        \$this->redirect('/admin/login');
    }
}
`
  },
  {
    path: 'app/models/Product.php',
    name: 'Product.php',
    language: 'php',
    description: 'Product model with relationships',
    content: `<?php
declare(strict_types=1);

namespace App\\Models;

use App\\Core\\Model;

/**
 * Product Model
 */
class Product extends Model
{
    protected string \$table = 'products';
    protected bool \$softDelete = true;
    protected array \$fillable = [
        'category_id', 'name', 'slug', 'tagline', 'short_desc', 'full_desc',
        'features', 'screenshots', 'icon', 'hero_image', 'video_url',
        'demo_url', 'download_url', 'documentation_url', 'price_type',
        'price', 'price_currency', 'billing_cycle', 'is_featured',
        'status', 'sort_order', 'meta_title', 'meta_desc',
    ];
    protected array \$casts = [
        'features' => 'json',
        'screenshots' => 'json',
        'is_featured' => 'boolean',
        'price' => 'float',
    ];

    /**
     * Get product with category
     */
    public function withCategory(int \$id): ?array
    {
        return \$this->db->fetch(
            "SELECT p.*, pc.name as category_name, pc.slug as category_slug
             FROM products p
             LEFT JOIN product_categories pc ON p.category_id = pc.id
             WHERE p.id = ? AND p.deleted_at IS NULL",
            [\$id]
        ) ?: null;
    }

    /**
     * Get featured products
     */
    public function featured(int \$limit = 6): array
    {
        return \$this->db->fetchAll(
            "SELECT * FROM products WHERE is_featured = 1 AND status = 'published' AND deleted_at IS NULL ORDER BY sort_order LIMIT ?",
            [\$limit]
        );
    }

    /**
     * Get product plans
     */
    public function getPlans(int \$productId): array
    {
        return \$this->db->fetchAll(
            "SELECT * FROM product_plans WHERE product_id = ? ORDER BY sort_order",
            [\$productId]
        );
    }

    /**
     * Get product features
     */
    public function getFeatures(int \$productId): array
    {
        return \$this->db->fetchAll(
            "SELECT * FROM product_features WHERE product_id = ? ORDER BY sort_order",
            [\$productId]
        );
    }
}
`
  },
  {
    path: 'app/models/BlogPost.php',
    name: 'BlogPost.php',
    language: 'php',
    description: 'Blog Post model',
    content: `<?php
declare(strict_types=1);

namespace App\\Models;

use App\\Core\\Model;

/**
 * Blog Post Model
 */
class BlogPost extends Model
{
    protected string \$table = 'blog_posts';
    protected bool \$softDelete = true;
    protected array \$fillable = [
        'title', 'slug', 'excerpt', 'content', 'featured_image',
        'category_id', 'author_id', 'meta_title', 'meta_desc',
        'published_at', 'status',
    ];

    /**
     * Get published posts
     */
    public function published(int \$limit = 10): array
    {
        return \$this->db->fetchAll(
            "SELECT p.*, c.name as category_name, u.name as author_name
             FROM blog_posts p
             LEFT JOIN blog_categories c ON p.category_id = c.id
             LEFT JOIN users u ON p.author_id = u.id
             WHERE p.status = 'published' AND p.published_at <= NOW() AND p.deleted_at IS NULL
             ORDER BY p.published_at DESC
             LIMIT ?",
            [\$limit]
        );
    }

    /**
     * Get post with relationships
     */
    public function withRelations(int \$id): ?array
    {
        return \$this->db->fetch(
            "SELECT p.*, c.name as category_name, c.slug as category_slug, u.name as author_name, u.avatar as author_avatar
             FROM blog_posts p
             LEFT JOIN blog_categories c ON p.category_id = c.id
             LEFT JOIN users u ON p.author_id = u.id
             WHERE p.id = ? AND p.deleted_at IS NULL",
            [\$id]
        ) ?: null;
    }
}
`
  },
  {
    path: 'app/models/Testimonial.php',
    name: 'Testimonial.php',
    language: 'php',
    description: 'Testimonial model',
    content: `<?php
declare(strict_types=1);

namespace App\\Models;

use App\\Core\\Model;

class Testimonial extends Model
{
    protected string \$table = 'testimonials';
    protected array \$fillable = ['name', 'company', 'role', 'photo', 'message', 'rating', 'status', 'sort_order'];

    public function published(): array
    {
        return \$this->where('status', 'published');
    }
}
`
  },
  {
    path: 'app/models/Service.php',
    name: 'Service.php',
    language: 'php',
    description: 'Service model',
    content: `<?php
declare(strict_types=1);

namespace App\\Models;

use App\\Core\\Model;

class Service extends Model
{
    protected string \$table = 'services';
    protected array \$fillable = [
        'title', 'slug', 'icon', 'short_desc', 'full_desc',
        'features', 'price_from', 'price_currency', 'status', 'sort_order',
    ];
    protected array \$casts = ['features' => 'json', 'price_from' => 'float'];
}
`
  },
  {
    path: 'app/models/Client.php',
    name: 'Client.php',
    language: 'php',
    description: 'Client model',
    content: `<?php
declare(strict_types=1);

namespace App\\Models;

use App\\Core\\Model;

class Client extends Model
{
    protected string \$table = 'clients';
    protected array \$fillable = ['name', 'logo', 'website', 'description', 'category', 'project_url', 'sort_order', 'status'];
}
`
  },
  {
    path: 'routes/web.php',
    name: 'web.php',
    language: 'php',
    description: 'Route definitions for the entire application',
    content: `<?php
declare(strict_types=1);

/**
 * Khybersoft - Route Definitions
 * This file is loaded by the Router in index.php
 */

use App\\Core\\Router;

\$router = new Router();

// ============================================
// FRONT-END ROUTES
// ============================================

\$router->get('/', ['Front\\HomeController', 'index']);
\$router->get('/about', ['Front\\HomeController', 'about']);
\$router->get('/contact', ['Front\\HomeController', 'contact']);
\$router->post('/contact', ['Front\\HomeController', 'submitContact']);

// Products
\$router->get('/products', ['Front\\ProductController', 'index']);
\$router->get('/products/{slug}', ['Front\\ProductController', 'show']);
\$router->post('/products/{slug}/inquire', ['Front\\ProductController', 'inquire']);

// Blog
\$router->get('/blog', ['Front\\BlogController', 'index']);
\$router->get('/blog/{slug}', ['Front\\BlogController', 'show']);
\$router->post('/blog/{slug}/comment', ['Front\\BlogController', 'submitComment']);

// Services
\$router->get('/services', ['Front\\ServiceController', 'index']);
\$router->get('/services/{slug}', ['Front\\ServiceController', 'show']);

// Pages (catch-all for CMS pages)
\$router->get('/page/{slug}', ['Front\\PageController', 'show']);

// Newsletter
\$router->post('/newsletter/subscribe', ['Front\\NewsletterController', 'subscribe']);

// ============================================
// ADMIN ROUTES
// ============================================

\$router->group('/admin', function(Router \$router) {
    // Auth (guest only)
    \$router->get('/login', ['Admin\\AuthController', 'showLogin'], ['Guest']);
    \$router->post('/login', ['Admin\\AuthController', 'login'], ['Guest']);
    \$router->get('/logout', ['Admin\\AuthController', 'logout']);

    // Protected routes
    \$router->get('/', ['Admin\\DashboardController', 'index'], ['Admin']);

    // Products management
    \$router->get('/products', ['Admin\\ProductController', 'index'], ['Admin']);
    \$router->get('/products/create', ['Admin\\ProductController', 'create'], ['Admin']);
    \$router->post('/products', ['Admin\\ProductController', 'store'], ['Admin']);
    \$router->get('/products/{id}/edit', ['Admin\\ProductController', 'edit'], ['Admin']);
    \$router->post('/products/{id}', ['Admin\\ProductController', 'update'], ['Admin']);
    \$router->post('/products/{id}/delete', ['Admin\\ProductController', 'destroy'], ['Admin']);

    // Blog management
    \$router->get('/blog', ['Admin\\BlogController', 'index'], ['Admin']);
    \$router->get('/blog/create', ['Admin\\BlogController', 'create'], ['Admin']);
    \$router->post('/blog', ['Admin\\BlogController', 'store'], ['Admin']);
    \$router->get('/blog/{id}/edit', ['Admin\\BlogController', 'edit'], ['Admin']);
    \$router->post('/blog/{id}', ['Admin\\BlogController', 'update'], ['Admin']);
    \$router->post('/blog/{id}/delete', ['Admin\\BlogController', 'destroy'], ['Admin']);

    // Inquiries
    \$router->get('/inquiries', ['Admin\\InquiryController', 'index'], ['Admin']);
    \$router->get('/inquiries/{id}', ['Admin\\InquiryController', 'show'], ['Admin']);
    \$router->post('/inquiries/{id}/status', ['Admin\\InquiryController', 'updateStatus'], ['Admin']);

    // Messages
    \$router->get('/messages', ['Admin\\MessageController', 'index'], ['Admin']);
    \$router->get('/messages/{id}', ['Admin\\MessageController', 'show'], ['Admin']);

    // Settings
    \$router->get('/settings', ['Admin\\SettingsController', 'index'], ['Admin']);
    \$router->post('/settings', ['Admin\\SettingsController', 'update'], ['Admin']);

    // Users
    \$router->get('/users', ['Admin\\UserController', 'index'], ['Admin']);
    \$router->get('/users/create', ['Admin\\UserController', 'create'], ['Admin']);
    \$router->post('/users', ['Admin\\UserController', 'store'], ['Admin']);
    \$router->get('/users/{id}/edit', ['Admin\\UserController', 'edit'], ['Admin']);
    \$router->post('/users/{id}', ['Admin\\UserController', 'update'], ['Admin']);
    \$router->post('/users/{id}/delete', ['Admin\\UserController', 'destroy'], ['Admin']);

    // Media
    \$router->get('/media', ['Admin\\MediaController', 'index'], ['Admin']);
    \$router->post('/media/upload', ['Admin\\MediaController', 'upload'], ['Admin']);
    \$router->post('/media/{id}/delete', ['Admin\\MediaController', 'destroy'], ['Admin']);

    // Pages
    \$router->get('/pages', ['Admin\\PageController', 'index'], ['Admin']);
    \$router->get('/pages/create', ['Admin\\PageController', 'create'], ['Admin']);
    \$router->post('/pages', ['Admin\\PageController', 'store'], ['Admin']);
    \$router->get('/pages/{id}/edit', ['Admin\\PageController', 'edit'], ['Admin']);
    \$router->post('/pages/{id}', ['Admin\\PageController', 'update'], ['Admin']);
    \$router->post('/pages/{id}/delete', ['Admin\\PageController', 'destroy'], ['Admin']);
});
`
  },
  {
    path: '.env.example',
    name: '.env.example',
    language: 'ini',
    description: 'Environment variables template',
    content: `# Khybersoft Environment Configuration
# Copy this file to .env and update values

APP_ENV=development
APP_DEBUG=true

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=khybersoft_db
DB_USER=root
DB_PASS=

# Mail (SMTP)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@khybersoft.com
SMTP_FROM_NAME=Khybersoft

# Site
SITE_URL=https://khybersoft.com
SITE_NAME=Khybersoft
`
  },
];
