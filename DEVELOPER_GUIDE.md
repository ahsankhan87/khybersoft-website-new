# Khybersoft Developer Guide

## 🏗️ Architecture Overview

Khybersoft is built on a custom PHP 8.2 MVC framework designed for performance, security, and maintainability.

### Core Principles
- **No heavy frameworks** - Lightweight custom MVC
- **Security first** - CSRF, XSS, SQL injection prevention
- **Type safety** - PHP 8.2 strict types and typed properties
- **Clean code** - PSR-12 coding standards
- **Modular design** - Easy to extend and maintain

---

## 📁 Project Structure

```
khybersoft/
├── app/                    # Application logic
│   ├── config/            # Configuration files
│   │   ├── config.php     # App constants
│   │   └── database.php   # DB configuration
│   ├── core/              # Core framework classes
│   │   ├── Database.php   # PDO singleton
│   │   ├── Router.php     # URL routing
│   │   ├── Controller.php # Base controller
│   │   ├── Model.php      # Base model
│   │   ├── Auth.php       # Authentication
│   │   ├── Validator.php  # Input validation
│   │   ├── CSRF.php       # CSRF protection
│   │   └── ...
│   ├── controllers/       # Request handlers
│   │   ├── admin/         # Admin controllers
│   │   └── front/         # Frontend controllers
│   ├── models/            # Data models
│   ├── views/             # View templates
│   │   ├── layouts/       # Layout templates
│   │   ├── admin/         # Admin views
│   │   ├── front/         # Frontend views
│   │   └── components/    # Reusable components
│   ├── helpers/           # Helper functions
│   └── middleware/        # Request middleware
├── public_html/           # Document root
│   ├── index.php          # Front controller
│   ├── .htaccess          # Apache config
│   ├── assets/            # CSS, JS, images
│   └── uploads/           # User uploads
├── routes/                # Route definitions
│   ├── web.php            # Frontend routes
│   └── admin.php          # Admin routes
├── storage/               # Storage directory
│   ├── logs/              # Log files
│   ├── cache/             # Cache files
│   └── backups/           # Backup files
├── cron/                  # Cron job scripts
├── install/               # Installation wizard
└── .env                   # Environment config
```

---

## 🔄 Request Lifecycle

### 1. Front Controller
All requests go through `public_html/index.php`:
```php
// Load configuration
require_once APP_PATH . '/config/config.php';

// Autoload classes
spl_autoload_register(function ($class) {
    // Load from app/core, app/controllers, etc.
});

// Start session
session_start([...]);

// Initialize CSRF
CSRF::init();

// Route request
$router = new Router();
$router->dispatch();
```

### 2. Routing
Routes are defined in `routes/web.php` and `routes/admin.php`:
```php
$router->get('/products', ['Front\ProductController', 'index']);
$router->get('/products/{slug}', ['Front\ProductController', 'show']);
$router->post('/products/{slug}/inquire', ['Front\ProductController', 'inquire']);
```

### 3. Middleware
Middleware runs before controller actions:
```php
// Admin routes require authentication
$router->group('/admin', function($router) {
    $router->get('/dashboard', ['Admin\DashboardController', 'index'], ['AdminAuth']);
}, ['AdminAuth']);
```

### 4. Controller
Controllers handle requests and return responses:
```php
class ProductController extends Controller
{
    public function index(): void
    {
        $products = $this->model()->paginate($page, $perPage, $where, $params);
        $this->view('front.products.index', ['products' => $products]);
    }
}
```

### 5. Model
Models interact with the database:
```php
class Product extends Model
{
    protected string $table = 'products';
    protected array $fillable = ['name', 'slug', 'price', ...];
    
    public function featured(): array
    {
        return $this->where('is_featured', 1);
    }
}
```

### 6. View
Views render HTML with PHP templates:
```php
<!-- app/views/front/products/index.php -->
<?php foreach ($products as $product): ?>
    <div class="product-card">
        <h3><?= e($product['name']) ?></h3>
        <p><?= e($product['short_desc']) ?></p>
    </div>
<?php endforeach; ?>
```

---

## 🎨 Creating a New Module

### Step 1: Create Model
```php
// app/models/Article.php
<?php
declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

class Article extends Model
{
    protected string $table = 'articles';
    protected bool $softDelete = true;
    protected array $fillable = [
        'title',
        'slug',
        'content',
        'author_id',
        'status',
    ];
    
    public function published(): array
    {
        return $this->where('status', 'published');
    }
    
    public function byAuthor(int $authorId): array
    {
        return $this->where('author_id', $authorId);
    }
}
```

### Step 2: Create Controller
```php
// app/controllers/admin/ArticleController.php
<?php
declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\AdminController;

class ArticleController extends AdminController
{
    protected string $modelClass = \App\Models\Article::class;
    protected string $viewPrefix = 'admin.articles';
    protected string $routePrefix = '/admin/articles';
    protected string $pageTitle = 'Articles';
    protected string $searchColumns = 'title,slug,content';
    protected array $filterable = ['status', 'author_id'];
    protected array $validationRules = [
        'title' => 'required|min:3|max:255',
        'slug' => 'nullable|slug|max:255',
        'content' => 'required',
        'status' => 'required|in:draft,published',
    ];
    
    protected function getUploadFields(): array
    {
        return ['featured_image'];
    }
}
```

### Step 3: Create Views
```php
<!-- app/views/admin/articles/index.php -->
<?php /** Articles Index */ ?>
<div class="space-y-6">
    <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Articles</h1>
        <a href="<?= url($route_prefix . '/create') ?>" 
           class="px-4 py-2 bg-blue-600 text-white rounded-lg">
            Create Article
        </a>
    </div>
    
    <!-- Use reusable table component -->
    <?php require APP_PATH . '/views/components/table.php'; ?>
</div>
```

```php
<!-- app/views/admin/articles/create.php -->
<?php /** Articles Create */ ?>
<div class="max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold mb-6">Create Article</h1>
    
    <form method="POST" action="<?= url($route_prefix) ?>" enctype="multipart/form-data">
        <?= \App\Core\CSRF::field() ?>
        
        <?= admin_input('title', 'Title', 'text', null, ['required']) ?>
        <?= admin_input('slug', 'Slug', 'text', null) ?>
        <?= admin_editor('content', 'Content') ?>
        <?= admin_file('featured_image', 'Featured Image') ?>
        <?= admin_select('status', 'Status', ['draft' => 'Draft', 'published' => 'Published'], 'draft') ?>
        
        <button type="submit" class="px-6 py-2 bg-blue-600 text-white rounded-lg">
            Create Article
        </button>
    </form>
</div>
```

### Step 4: Add Routes
```php
// routes/admin.php
$router->group('/admin', function($router) {
    // Articles
    $router->get('/articles', ['Admin\ArticleController', 'index'], ['AdminAuth']);
    $router->get('/articles/create', ['Admin\ArticleController', 'create'], ['AdminAuth']);
    $router->post('/articles', ['Admin\ArticleController', 'store'], ['AdminAuth']);
    $router->get('/articles/{id}/edit', ['Admin\ArticleController', 'edit'], ['AdminAuth']);
    $router->post('/articles/{id}', ['Admin\ArticleController', 'update'], ['AdminAuth']);
    $router->post('/articles/{id}/delete', ['Admin\ArticleController', 'destroy'], ['AdminAuth']);
});
```

### Step 5: Create Database Table
```sql
CREATE TABLE IF NOT EXISTS `articles` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL,
  `content` LONGTEXT NULL,
  `featured_image` VARCHAR(500) NULL,
  `author_id` INT UNSIGNED NOT NULL,
  `status` ENUM('draft','published') NOT NULL DEFAULT 'draft',
  `views` INT UNSIGNED NOT NULL DEFAULT 0,
  `deleted_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_articles_slug` (`slug`),
  INDEX `idx_articles_status` (`status`),
  INDEX `idx_articles_author` (`author_id`),
  FULLTEXT KEY `ft_articles` (`title`, `content`),
  CONSTRAINT `fk_articles_author` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 🧩 Creating UI Components

### Basic Component Structure
```php
// app/views/components/my-component.php
<?php
/**
 * My Component
 * 
 * Usage:
 * <?= component('my-component', ['prop1' => 'value1', 'prop2' => 'value2']) ?>
 */

function my_component(array $props = []): string
{
    $prop1 = $props['prop1'] ?? 'default';
    $prop2 = $props['prop2'] ?? null;
    $class = $props['class'] ?? '';
    
    $html = "<div class=\"my-component $class\">";
    $html .= "<p>" . e($prop1) . "</p>";
    
    if ($prop2) {
        $html .= "<span>" . e($prop2) . "</span>";
    }
    
    $html .= "</div>";
    
    return $html;
}
```

### Register Component
```php
// app/helpers/functions.php
if (!function_exists('component')) {
    function component(string $name, array $props = []): string
    {
        $components = [
            'button' => 'button',
            'card' => 'card',
            'my-component' => 'my_component',
        ];
        
        if (isset($components[$name])) {
            require_once APP_PATH . '/views/components/' . $components[$name] . '.php';
            return $components[$name]($props);
        }
        
        return '';
    }
}
```

### Use Component
```php
<!-- In any view -->
<?= component('my-component', [
    'prop1' => 'Hello World',
    'prop2' => 'Optional text',
    'class' => 'custom-class'
]) ?>
```

---

## 🔌 Adding a New Service

### Example: Adding a Payment Gateway

#### 1. Create Service Class
```php
// app/core/PaymentGateway.php
<?php
declare(strict_types=1);

namespace App\Core;

abstract class PaymentGateway
{
    protected array $config;
    
    public function __construct()
    {
        $this->config = $this->loadConfig();
    }
    
    abstract public function createPayment(array $data): array;
    abstract public function verifyPayment(string $transactionId): bool;
    abstract public function refund(string $transactionId): bool;
    
    protected function loadConfig(): array
    {
        return [
            'api_key' => setting('payment_api_key'),
            'secret' => setting('payment_secret'),
        ];
    }
}
```

#### 2. Implement Gateway
```php
// app/core/NewPaymentGateway.php
<?php
declare(strict_types=1);

namespace App\Core;

class NewPaymentGateway extends PaymentGateway
{
    public function createPayment(array $data): array
    {
        // API call to payment provider
        $response = $this->apiCall('/payments', [
            'amount' => $data['amount'],
            'currency' => $data['currency'],
            'description' => $data['description'],
        ]);
        
        return [
            'success' => true,
            'transaction_id' => $response['id'],
            'redirect_url' => $response['checkout_url'],
        ];
    }
    
    public function verifyPayment(string $transactionId): bool
    {
        $response = $this->apiCall("/payments/$transactionId");
        return $response['status'] === 'completed';
    }
    
    public function refund(string $transactionId): bool
    {
        $response = $this->apiCall("/payments/$transactionId/refund", 'POST');
        return $response['success'] ?? false;
    }
    
    private function apiCall(string $endpoint, array $data = []): array
    {
        // cURL implementation
        $ch = curl_init('https://api.paymentprovider.com' . $endpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $this->config['api_key'],
            'Content-Type: application/json',
        ]);
        
        if (!empty($data)) {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
        
        $response = curl_exec($ch);
        curl_close($ch);
        
        return json_decode($response, true);
    }
}
```

#### 3. Add Settings
```php
// In admin settings
INSERT INTO `settings` (`key`, `value`, `type`, `group`, `label`) VALUES
('new_payment_api_key', '', 'string', 'payment', 'New Payment API Key'),
('new_payment_secret', '', 'string', 'payment', 'New Payment Secret');
```

#### 4. Create Settings UI
```php
<!-- app/views/admin/settings/payment.php -->
<div class="space-y-4">
    <?= admin_input('new_payment_api_key', 'API Key', 'text', setting('new_payment_api_key')) ?>
    <?= admin_input('new_payment_secret', 'Secret Key', 'password', setting('new_payment_secret')) ?>
</div>
```

---

## 🧪 Testing

### Manual Testing Checklist

#### Authentication
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Rate limiting (5 attempts)
- [ ] Remember me functionality
- [ ] Logout
- [ ] Password reset flow
- [ ] 2FA verification

#### CRUD Operations
- [ ] Create new record
- [ ] Edit existing record
- [ ] Delete record (soft delete)
- [ ] Search functionality
- [ ] Filter by status
- [ ] Sort columns
- [ ] Pagination
- [ ] Bulk actions

#### File Uploads
- [ ] Upload single file
- [ ] Upload multiple files
- [ ] File type validation
- [ ] File size validation
- [ ] Image resize
- [ ] Delete uploaded file

#### Forms
- [ ] Required field validation
- [ ] Email validation
- [ ] URL validation
- [ ] CSRF protection
- [ ] Old input preservation
- [ ] Error messages display

#### Security
- [ ] XSS prevention (output escaping)
- [ ] SQL injection (prepared statements)
- [ ] CSRF tokens on all forms
- [ ] Session fixation (ID regeneration)
- [ ] Rate limiting on forms
- [ ] File upload validation

---

## 📝 Coding Standards

### PHP Standards (PSR-12)

#### File Structure
```php
<?php
declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Controller;
use App\Models\Product;

/**
 * Product Controller
 * Handles product CRUD operations
 */
class ProductController extends Controller
{
    // Class implementation
}
```

#### Naming Conventions
- **Classes**: PascalCase (`ProductController`)
- **Methods**: camelCase (`getProducts`)
- **Variables**: camelCase (`$productList`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_UPLOAD_SIZE`)
- **Database tables**: snake_case (`product_categories`)
- **URL slugs**: kebab-case (`product-categories`)

#### Type Declarations
```php
// Always use type declarations
public function find(int $id): ?array
{
    // Implementation
}

protected function validate(array $data, array $rules): bool
{
    // Implementation
}
```

#### Documentation
```php
/**
 * Get featured products
 * 
 * @param int $limit Maximum number of products to return
 * @return array List of featured products
 */
public function featured(int $limit = 6): array
{
    // Implementation
}
```

### JavaScript Standards

#### Alpine.js Components
```html
<div x-data="{ 
    open: false,
    items: [],
    async loadItems() {
        const response = await fetch('/api/items');
        this.items = await response.json();
    }
}">
    <button @click="open = !open">Toggle</button>
    <div x-show="open" x-transition>Content</div>
</div>
```

#### Event Handling
```javascript
// Use Alpine.js for reactivity
<div x-data="{ count: 0 }">
    <button @click="count++">Count: <span x-text="count"></span></button>
</div>

// Use vanilla JS for complex logic
<script>
document.addEventListener('DOMContentLoaded', () => {
    const element = document.querySelector('.my-element');
    element.addEventListener('click', (e) => {
        // Handle click
    });
});
</script>
```

### CSS Standards

#### TailwindCSS
```html
<!-- Use utility classes -->
<div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
    <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Title</h3>
    <p class="text-slate-600 dark:text-slate-400">Description</p>
</div>
```

#### Custom CSS (when needed)
```css
/* Use BEM naming */
.product-card {
    /* Block */
}

.product-card__title {
    /* Element */
}

.product-card--featured {
    /* Modifier */
}
```

---

## 🐛 Debugging

### Enable Debug Mode
```php
// .env
APP_DEBUG=true
APP_ENV=development
```

### View Errors
```php
// In development, errors are displayed
// In production, errors are logged to storage/logs/error.log
```

### Debug Variables
```php
// Use dd() helper (dump and die)
dd($variable);

// Or use error_log
error_log(print_r($variable, true));
```

### Database Queries
```php
// Enable query logging
$db = Database::getInstance();
$db->enableLogging(true);

// Execute queries
$products = $db->fetchAll("SELECT * FROM products");

// View logged queries
print_r($db->getQueryLog());
```

### Browser Console
```javascript
// JavaScript debugging
console.log('Data:', data);
console.error('Error:', error);
console.table(arrayOfObjects);
```

---

## 🚀 Performance Optimization

### Database Optimization
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_created ON products(created_at);

-- Use FULLTEXT for search
ALTER TABLE products ADD FULLTEXT INDEX ft_products (name, description);
```

### Caching
```php
// Cache expensive queries
$products = Cache::remember('featured_products', 3600, function() {
    return (new Product())->featured(10);
});

// Clear cache when data changes
Cache::forget('featured_products');
```

### Image Optimization
```php
// Images are automatically resized on upload
// Configure in config.php
define('MAX_UPLOAD_SIZE', 10 * 1024 * 1024); // 10MB
define('IMAGE_MAX_WIDTH', 1920);
define('IMAGE_MAX_HEIGHT', 1080);
```

### Asset Optimization
```php
// Use asset versioning for cache busting
<link rel="stylesheet" href="<?= asset('css/app.css') ?>">
// Outputs: /assets/css/app.css?v=1234567890

// Minify CSS/JS in production
// Use build tools or CDN
```

---

## 🔒 Security Best Practices

### Input Validation
```php
// Always validate user input
$validator = Validator::make($_POST, [
    'email' => 'required|email',
    'password' => 'required|min:8',
]);

if (!$validator->validate()) {
    // Handle errors
}
```

### Output Escaping
```php
// Always escape output
<h1><?= e($product['name']) ?></h1>

// For HTML content, use purified HTML
<div><?= $product['description'] ?></div> <!-- Already purified -->
```

### CSRF Protection
```php
// Always include CSRF token in forms
<form method="POST">
    <?= \App\Core\CSRF::field() ?>
    <!-- Form fields -->
</form>

// Verify in controller
if (!$this->validateCsrf()) {
    return;
}
```

### SQL Injection Prevention
```php
// Always use prepared statements
$user = $db->fetch(
    "SELECT * FROM users WHERE email = ?",
    [$email]
);

// Never concatenate user input
// BAD: "SELECT * FROM users WHERE email = '$email'"
```

### File Upload Security
```php
// Validate file type
$allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
if (!in_array($file['type'], $allowedTypes)) {
    throw new Exception('Invalid file type');
}

// Validate file size
if ($file['size'] > MAX_UPLOAD_SIZE) {
    throw new Exception('File too large');
}

// Generate unique filename
$filename = uniqid() . '.' . $extension;
```

---

## 📚 Resources

### PHP Documentation
- [PHP Manual](https://www.php.net/manual/)
- [PHP 8.2 Features](https://www.php.net/releases/8.2/en.php)

### Framework Documentation
- [PDO](https://www.php.net/manual/en/book.pdo.php)
- [Alpine.js](https://alpinejs.dev/)
- [TailwindCSS](https://tailwindcss.com/)

### Tools
- [PHPStan](https://phpstan.org/) - Static analysis
- [PHP-CS-Fixer](https://cs.symfony.com/) - Code style fixer
- [Xdebug](https://xdebug.org/) - Debugger

---

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes
4. Test thoroughly
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open Pull Request

### Code Review Checklist
- [ ] Code follows PSR-12 standards
- [ ] Type declarations used
- [ ] Documentation comments added
- [ ] Security best practices followed
- [ ] No hardcoded credentials
- [ ] Error handling implemented
- [ ] Tests pass

---

## 📞 Support

### Getting Help
1. Check this guide first
2. Review code comments
3. Search existing issues
4. Contact: dev@khybersoft.com

### Reporting Issues
When reporting bugs, include:
- PHP version
- MySQL version
- Error message
- Steps to reproduce
- Expected vs actual behavior

---

**Happy Coding!** 🚀

For business questions, see ADMIN_GUIDE.md
For installation issues, see INSTALL.md
For API integration, see API.md
