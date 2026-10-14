export interface CI4File {
  path: string;
  name: string;
  language: string;
  content: string;
  description: string;
  category: string;
}

export const ci4Config: CI4File[] = [
  {
    path: 'app/Config/Routes.php',
    name: 'Routes.php',
    language: 'php',
    category: 'Config',
    description: 'Route definitions for all frontend and admin routes',
    content: `<?php

namespace Config;

use CodeIgniter\\Router\\RouteCollection;

/**
 * @var RouteCollection $routes
 */

// Frontend Routes
$routes->get('/', 'Home::index');
$routes->get('/about', 'Home::about');
$routes->get('/contact', 'Home::contact');
$routes->post('/contact', 'Home::submitContact');
$routes->get('/faq', 'Home::faq');
$routes->get('/privacy-policy', 'Home::privacy');
$routes->get('/terms', 'Home::terms');

// Products
$routes->get('/products', 'Products::index');
$routes->get('/products/(:segment)', 'Products::show/$1');
$routes->post('/products/(:segment)/inquire', 'Products::inquire/$1');

// Blog
$routes->get('/blog', 'Blog::index');
$routes->get('/blog/(:segment)', 'Blog::show/$1');
$routes->post('/blog/(:segment)/comment', 'Blog::submitComment/$1');

// Services
$routes->get('/services', 'Services::index');
$routes->get('/services/(:segment)', 'Services::show/$1');

// Tutorials
$routes->get('/tutorials', 'Tutorials::index');
$routes->get('/tutorials/(:segment)', 'Tutorials::show/$1');

// Search
$routes->get('/search', 'Search::index');
$routes->get('/search/live', 'Search::live');

// Newsletter
$routes->post('/newsletter/subscribe', 'Newsletter::subscribe');
$routes->get('/newsletter/verify', 'Newsletter::verify');
$routes->get('/newsletter/unsubscribe', 'Newsletter::unsubscribe');

// Admin Routes
$routes->group('admin', ['namespace' => 'App\\Controllers\\Admin'], function($routes) {
    // Auth
    $routes->get('login', 'Auth::login');
    $routes->post('login', 'Auth::attemptLogin');
    $routes->get('logout', 'Auth::logout');
    $routes->get('forgot-password', 'Auth::forgotPassword');
    $routes->post('forgot-password', 'Auth::sendResetLink');
    $routes->get('reset-password', 'Auth::resetPassword');
    $routes->post('reset-password', 'Auth::updatePassword');

    // Dashboard
    $routes->get('/', 'Dashboard::index');
    $routes->post('dashboard/update-inquiry-status', 'Dashboard::updateInquiryStatus');
    $routes->get('api/stats', 'Dashboard::statsApi');

    // Pages
    $routes->get('pages', 'Pages::index');
    $routes->get('pages/create', 'Pages::create');
    $routes->post('pages', 'Pages::store');
    $routes->get('pages/(:num)/edit', 'Pages::edit/$1');
    $routes->post('pages/(:num)', 'Pages::update/$1');
    $routes->post('pages/(:num)/delete', 'Pages::delete/$1');
    $routes->post('pages/bulk', 'Pages::bulkAction');

    // Blog Posts
    $routes->get('blog', 'BlogPosts::index');
    $routes->get('blog/create', 'BlogPosts::create');
    $routes->post('blog', 'BlogPosts::store');
    $routes->get('blog/(:num)/edit', 'BlogPosts::edit/$1');
    $routes->post('blog/(:num)', 'BlogPosts::update/$1');
    $routes->post('blog/(:num)/delete', 'BlogPosts::delete/$1');

    // Blog Categories
    $routes->get('blog-categories', 'BlogCategories::index');
    $routes->post('blog-categories', 'BlogCategories::store');
    $routes->post('blog-categories/(:num)/delete', 'BlogCategories::delete/$1');

    // Comments
    $routes->get('comments', 'Comments::index');
    $routes->post('comments/(:num)/approve', 'Comments::approve/$1');
    $routes->post('comments/(:num)/reject', 'Comments::reject/$1');
    $routes->post('comments/(:num)/delete', 'Comments::delete/$1');

    // Media
    $routes->get('media', 'Media::index');
    $routes->post('media/upload', 'Media::upload');
    $routes->post('media/(:num)/delete', 'Media::delete/$1');

    // Products
    $routes->get('products', 'Products::index');
    $routes->get('products/create', 'Products::create');
    $routes->post('products', 'Products::store');
    $routes->get('products/(:num)/edit', 'Products::edit/$1');
    $routes->post('products/(:num)', 'Products::update/$1');
    $routes->post('products/(:num)/delete', 'Products::delete/$1');

    // Product Categories
    $routes->get('product-categories', 'ProductCategories::index');
    $routes->post('product-categories', 'ProductCategories::store');
    $routes->post('product-categories/(:num)/delete', 'ProductCategories::delete/$1');

    // Users
    $routes->get('users', 'Users::index');
    $routes->get('users/create', 'Users::create');
    $routes->post('users', 'Users::store');
    $routes->get('users/(:num)/edit', 'Users::edit/$1');
    $routes->post('users/(:num)', 'Users::update/$1');
    $routes->post('users/(:num)/delete', 'Users::delete/$1');

    // Roles & Permissions
    $routes->get('roles', 'Roles::index');
    $routes->post('roles', 'Roles::store');
    $routes->post('roles/(:num)/permissions', 'Roles::updatePermissions/$1');

    // Settings
    $routes->get('settings', 'Settings::index');
    $routes->post('settings', 'Settings::update');

    // Activity Logs
    $routes->get('activity-logs', 'ActivityLogs::index');

    // Spam Center
    $routes->get('spam', 'Spam::index');
    $routes->post('spam/mark', 'Spam::markSubmission');
    $routes->post('spam/block-ip', 'Spam::blockIP');
    $routes->post('spam/keyword', 'Spam::manageKeyword');
    $routes->post('spam/disposable', 'Spam::manageDisposable');
    $routes->get('spam/test', 'Spam::test');
    $routes->post('spam/run-test', 'Spam::runTest');

    // Inquiries
    $routes->get('inquiries', 'Inquiries::index');
    $routes->get('inquiries/(:num)', 'Inquiries::show/$1');
    $routes->post('inquiries/(:num)/status', 'Inquiries::updateStatus/$1');
    $routes->get('inquiries/export', 'Inquiries::export');

    // Messages
    $routes->get('messages', 'Messages::index');
    $routes->get('messages/(:num)', 'Messages::show/$1');
    $routes->post('messages/(:num)/status', 'Messages::updateStatus/$1');

    // Testimonials
    $routes->get('testimonials', 'Testimonials::index');
    $routes->get('testimonials/create', 'Testimonials::create');
    $routes->post('testimonials', 'Testimonials::store');
    $routes->get('testimonials/(:num)/edit', 'Testimonials::edit/$1');
    $routes->post('testimonials/(:num)', 'Testimonials::update/$1');
    $routes->post('testimonials/(:num)/delete', 'Testimonials::delete/$1');

    // Team
    $routes->get('team', 'Team::index');
    $routes->get('team/create', 'Team::create');
    $routes->post('team', 'Team::store');
    $routes->get('team/(:num)/edit', 'Team::edit/$1');
    $routes->post('team/(:num)', 'Team::update/$1');
    $routes->post('team/(:num)/delete', 'Team::delete/$1');

    // Clients
    $routes->get('clients', 'Clients::index');
    $routes->post('clients', 'Clients::store');
    $routes->post('clients/(:num)/delete', 'Clients::delete/$1');

    // FAQs
    $routes->get('faqs', 'Faqs::index');
    $routes->post('faqs', 'Faqs::store');
    $routes->post('faqs/(:num)/delete', 'Faqs::delete/$1');

    // Newsletter
    $routes->get('newsletter', 'Newsletter::index');
    $routes->post('newsletter/export', 'Newsletter::export');

    // Services
    $routes->get('services', 'Services::index');
    $routes->get('services/create', 'Services::create');
    $routes->post('services', 'Services::store');
    $routes->get('services/(:num)/edit', 'Services::edit/$1');
    $routes->post('services/(:num)', 'Services::update/$1');
    $routes->post('services/(:num)/delete', 'Services::delete/$1');

    // Tutorials
    $routes->get('tutorials', 'Tutorials::index');
    $routes->get('tutorials/create', 'Tutorials::create');
    $routes->post('tutorials', 'Tutorials::store');
    $routes->get('tutorials/(:num)/edit', 'Tutorials::edit/$1');
    $routes->post('tutorials/(:num)', 'Tutorials::update/$1');
    $routes->post('tutorials/(:num)/delete', 'Tutorials::delete/$1');

    // Redirects
    $routes->get('redirects', 'Redirects::index');
    $routes->post('redirects', 'Redirects::store');
    $routes->post('redirects/(:num)/delete', 'Redirects::delete/$1');

    // Backup
    $routes->get('backup', 'Backup::index');
    $routes->post('backup/create', 'Backup::create');
    $routes->get('backup/download/(:segment)', 'Backup::download/$1');
});

// Sitemap & Robots
$routes->get('sitemap.xml', 'Sitemap::index');
$routes->get('robots.txt', 'Sitemap::robots');
`
  },
  {
    path: 'app/Config/Database.php',
    name: 'Database.php',
    language: 'php',
    category: 'Config',
    description: 'Database configuration',
    content: `<?php

namespace Config;

use CodeIgniter\\Database\\Config;

/**
 * Database Configuration
 */
class Database extends Config
{
    /**
     * The directory that holds the framework migrations.
     */
    public array $migrations = [
        'table'      => 'migrations',
        'timestamp'  => true,
    ];

    /**
     * The directory used to store external connection files.
     */
    public string $filesPath = '';

    /**
     * The default database connection.
     */
    public array $default = [
        'DSN'          => '',
        'hostname'     => env('DB_HOST', 'localhost'),
        'username'     => env('DB_USER', 'root'),
        'password'     => env('DB_PASS', ''),
        'database'     => env('DB_NAME', 'khybersoft_db'),
        'DBDriver'     => 'MySQLi',
        'DBPrefix'     => '',
        'pConnect'     => false,
        'DBDebug'      => env('CI_ENVIRONMENT', 'production') !== 'production',
        'charset'      => 'utf8mb4',
        'DBCollat'     => 'utf8mb4_unicode_ci',
        'swapPre'      => '',
        'encrypt'      => false,
        'compress'     => false,
        'strictOn'     => false,
        'failover'     => [],
        'port'         => env('DB_PORT', 3306),
        'numberConnect' => false,
        'foreignKeys'  => true,
        'busyTimeout'  => 1000,
    ];

    /**
     * This database connection is used when running PHPUnit database tests.
     */
    public array $tests = [
        'DSN'         => '',
        'hostname'    => '127.0.0.1',
        'username'    => '',
        'password'    => '',
        'database'    => ':memory:',
        'DBDriver'    => 'SQLite3',
        'DBPrefix'    => 'db_',
        'pConnect'    => false,
        'DBDebug'     => true,
        'charset'     => 'utf8',
        'DBCollat'    => 'utf8_general_ci',
        'swapPre'     => '',
        'encrypt'     => false,
        'compress'    => false,
        'strictOn'    => false,
        'failover'    => [],
        'port'        => 3306,
        'foreignKeys' => true,
        'busyTimeout' => 1000,
    ];

    public function __construct()
    {
        parent::__construct();

        // Ensure that we always set the database group to 'tests' when
        // we are currently running tests to ensure that this is a safe operation.
        if (ENVIRONMENT === 'testing') {
            $this->defaultGroup = 'tests';
        }
    }
}
`
  },
  {
    path: 'app/Config/Email.php',
    name: 'Email.php',
    language: 'php',
    category: 'Config',
    description: 'Email configuration for SMTP',
    content: `<?php

namespace Config;

use CodeIgniter\\Config\\BaseConfig;

class Email extends BaseConfig
{
    public string $fromEmail  = '';
    public string $fromName   = '';
    public string $recipients = '';

    /**
     * The "user agent"
     */
    public string $userAgent = 'CodeIgniter';

    /**
     * The mail sending protocol: mail, sendmail, smtp
     */
    public string $protocol = 'smtp';

    /**
     * The server path to Sendmail.
     */
    public string $mailPath = '/usr/sbin/sendmail';

    /**
     * SMTP Server Hostname
     */
    public string $SMTPHost = '';

    /**
     * SMTP Username
     */
    public string $SMTPUser = '';

    /**
     * SMTP Password
     */
    public string $SMTPPass = '';

    /**
     * SMTP Port
     */
    public int $SMTPPort = 587;

    /**
     * SMTP Timeout (in seconds)
     */
    public int $SMTPTimeout = 5;

    /**
     * Enable persistent SMTP connections
     */
    public bool $SMTPKeepAlive = false;

    /**
     * SMTP Encryption.
     *
     * @var string '', 'tls' or 'ssl'. TLS's only available if PHP 5.6+ is used.
     */
    public string $SMTPCrypto = 'tls';

    /**
     * Enable word-wrap
     */
    public bool $wordWrap = true;

    /**
     * Character count to wrap at
     */
    public int $wrapChars = 76;

    /**
     * Type of mail, either 'text' or 'html'
     */
    public string $mailType = 'html';

    /**
     * Character set (utf-8, iso-8859-1, etc.)
     */
    public string $charset = 'UTF-8';

    /**
     * Whether to validate the email address
     */
    public bool $validate = false;

    /**
     * Email Priority. 1 = highest. 5 = lowest. 3 = normal
     */
    public int $priority = 3;

    /**
     * Newline character. (Use "\\r\\n" to comply with RFC 822)
     */
    public string $CRLF = "\\r\\n";

    /**
     * Newline character. (Use "\\r\\n" to comply with RFC 822)
     */
    public string $newline = "\\r\\n";

    /**
     * Enable BCC Batch Mode.
     */
    public bool $BCCBatchMode = false;

    /**
     * Number of emails in each BCC batch
     */
    public int $BCCBatchSize = 200;

    /**
     * Enable notify message from server
     */
    public bool $DSN = false;

    public function __construct()
    {
        parent::__construct();

        // Load from environment/settings
        $this->fromEmail = env('SMTP_FROM', 'noreply@khybersoft.com');
        $this->fromName = env('SMTP_FROM_NAME', 'Khybersoft');
        $this->SMTPHost = env('SMTP_HOST', '');
        $this->SMTPUser = env('SMTP_USER', '');
        $this->SMTPPass = env('SMTP_PASS', '');
        $this->SMTPPort = (int) env('SMTP_PORT', 587);
        $this->SMTPCrypto = env('SMTP_ENCRYPTION', 'tls');
    }
}
`
  },
  {
    path: 'app/Config/Filters.php',
    name: 'Filters.php',
    language: 'php',
    category: 'Config',
    description: 'Request filters for authentication and security',
    content: `<?php

namespace Config;

use CodeIgniter\\Config\\Filters as BaseFilters;

class Filters extends BaseFilters
{
    /**
     * Configures aliases for Filter classes to
     * make reading things nicer and simpler.
     *
     * @var array<string, class-string|list<class-string>>
     */
    public array $aliases = [
        'csrf'          => \\CodeIgniter\\Filters\\CSRF::class,
        'toolbar'       => \\CodeIgniter\\Filters\\DebugToolbar::class,
        'honeypot'      => \\CodeIgniter\\Filters\\Honeypot::class,
        'invalidchars'  => \\CodeIgniter\\Filters\\InvalidChars::class,
        'secureheaders' => \\CodeIgniter\\Filters\\SecureHeaders::class,
        'cors'          => \\CodeIgniter\\Filters\\CORS::class,
        'forcehttps'    => \\CodeIgniter\\Filters\\ForceHTTPS::class,
        'pagecache'     => \\CodeIgniter\\Filters\\PageCache::class,
        'performance'   => \\CodeIgniter\\Filters\\PerformanceFilter::class,
    ];

    /**
     * List of special required filters.
     *
     * @var list<array{alias: string, args: array<string, mixed>}>
     */
    public array $required = [
        'before' => [
            'forcehttps',
            'pagecache',
            'performance',
        ],
        'after'  => [
            'pagecache',
            'performance',
        ],
    ];

    /**
     * List of filter aliases that are always
     * applied before and after every request.
     *
     * @var array<string, array{before: list<string>, after: list<string>}>
     */
    public array $globals = [
        'before' => [
            'honeypot',
            'csrf' => ['except' => ['admin/spam/run-test']],
        ],
        'after' => [
            'toolbar',
        ],
    ];

    /**
     * List of filter aliases that works on a
     * particular HTTP method (GET, POST, etc.).
     *
     * @var array<string, list<string>>
     */
    public array $methods = [
        'post' => ['csrf', 'honeypot'],
        'put'  => ['csrf'],
        'patch' => ['csrf'],
        'delete' => ['csrf'],
    ];

    /**
     * List of filter aliases that should run on any
     * before or after URI patterns.
     *
     * @var array<string, array{before: list<string>, after: list<string>}>
     */
    public array $filters = [
        'adminAuth' => [
            'before' => ['admin/*'],
        ],
    ];
}
`
  },
];
