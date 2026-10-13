import { CrudFile } from './crudBase';

export const crudProductsFiles: CrudFile[] = [
  // ==================== PRODUCTS MODULE ====================
  {
    path: 'app/models/Product.php', name: 'Product.php', language: 'php', module: 'Products', type: 'model',
    description: 'Product model with relationships to plans, features, demos, versions, FAQs',
    content: `<?php
declare(strict_types=1);
namespace App\\Models;
use App\\Core\\Model;
use App\\Core\\Database;

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
    protected array \$casts = ['features' => 'json', 'screenshots' => 'json', 'is_featured' => 'boolean', 'price' => 'float'];

    public function getPlans(int \$productId): array
    {
        return Database::getInstance()->fetchAll(
            "SELECT * FROM product_plans WHERE product_id = ? ORDER BY sort_order", [\$productId]
        );
    }

    public function savePlans(int \$productId, array \$plans): void
    {
        \$db = Database::getInstance();
        \$db->delete('product_plans', 'product_id = ?', [\$productId]);
        foreach (\$plans as \$i => \$plan) {
            \$db->insert('product_plans', [
                'product_id' => \$productId,
                'name' => \$plan['name'] ?? '',
                'price' => \$plan['price'] ?? 0,
                'billing_cycle' => \$plan['billing_cycle'] ?? 'lifetime',
                'features' => json_encode(\$plan['features'] ?? []),
                'is_popular' => \$plan['is_popular'] ?? 0,
                'sort_order' => \$i,
            ]);
        }
    }

    public function getFeatures(int \$productId): array
    {
        return Database::getInstance()->fetchAll(
            "SELECT * FROM product_features WHERE product_id = ? ORDER BY sort_order", [\$productId]
        );
    }

    public function saveFeatures(int \$productId, array \$features): void
    {
        \$db = Database::getInstance();
        \$db->delete('product_features', 'product_id = ?', [\$productId]);
        foreach (\$features as \$i => \$feat) {
            \$db->insert('product_features', [
                'product_id' => \$productId,
                'title' => \$feat['title'] ?? '',
                'description' => \$feat['description'] ?? '',
                'icon' => \$feat['icon'] ?? '',
                'sort_order' => \$i,
            ]);
        }
    }

    public function getDemos(int \$productId): array
    {
        return Database::getInstance()->fetchAll(
            "SELECT * FROM product_demos WHERE product_id = ? ORDER BY sort_order", [\$productId]
        );
    }

    public function getVersions(int \$productId): array
    {
        return Database::getInstance()->fetchAll(
            "SELECT * FROM product_versions WHERE product_id = ? ORDER BY release_date DESC", [\$productId]
        );
    }

    public function getFaqs(int \$productId): array
    {
        return Database::getInstance()->fetchAll(
            "SELECT * FROM product_faqs WHERE product_id = ? ORDER BY sort_order", [\$productId]
        );
    }
}
`
  },
  {
    path: 'app/controllers/admin/ProductController.php', name: 'ProductController.php', language: 'php', module: 'Products', type: 'controller',
    description: 'Products CRUD with repeater fields, multi-upload screenshots, drag-drop sortable',
    content: `<?php
declare(strict_types=1);
namespace App\\Controllers\\Admin;
use App\\Core\\AdminController;
use App\\Core\\Database;

class ProductController extends AdminController
{
    protected string \$modelClass = \\App\\Models\\Product::class;
    protected string \$viewPrefix = 'admin.products';
    protected string \$routePrefix = '/admin/products';
    protected string \$pageTitle = 'Products';
    protected string \$searchColumns = 'name,slug,tagline,short_desc';
    protected array \$filterable = ['status', 'category_id', 'price_type', 'is_featured'];
    protected array \$validationRules = [
        'name' => 'required|min:2|max:255',
        'slug' => 'nullable|slug|max:255',
        'tagline' => 'nullable|max:255',
        'short_desc' => 'nullable|max:500',
        'full_desc' => 'required',
        'category_id' => 'nullable|integer',
        'price_type' => 'required|in:one_time,subscription,custom,free',
        'price' => 'nullable|numeric',
        'status' => 'required|in:draft,published,archived',
        'meta_title' => 'nullable|max:255',
        'meta_desc' => 'nullable|max:500',
    ];

    protected function getUploadFields(): array { return ['icon', 'hero_image']; }

    public function index(): void
    {
        \$page = max(1, (int) (\$_GET['page'] ?? 1));
        \$search = trim(\$_GET['search'] ?? '');
        \$filters = \$_GET['filter'] ?? [];

        \$where = 'p.deleted_at IS NULL';
        \$params = [];

        if (\$search) {
            \$where .= ' AND (p.name LIKE ? OR p.tagline LIKE ?)';
            \$params[] = "%{\$search}%";
            \$params[] = "%{\$search}%";
        }
        if (!empty(\$filters['status'])) { \$where .= ' AND p.status = ?'; \$params[] = \$filters['status']; }
        if (!empty(\$filters['category_id'])) { \$where .= ' AND p.category_id = ?'; \$params[] = \$filters['category_id']; }

        \$db = Database::getInstance();
        \$total = (int) \$db->fetchColumn("SELECT COUNT(*) FROM products p WHERE {\$where}", \$params);
        \$offset = (\$page - 1) * \$this->perPage;

        \$items = \$db->fetchAll(
            "SELECT p.*, pc.name as category_name,
                    (SELECT COUNT(*) FROM product_inquiries pi WHERE pi.product_id = p.id) as inquiry_count
             FROM products p LEFT JOIN product_categories pc ON p.category_id = pc.id
             WHERE {\$where} ORDER BY p.sort_order, p.created_at DESC LIMIT ? OFFSET ?",
            array_merge(\$params, [\$this->perPage, \$offset])
        );

        \$categories = \$db->fetchAll("SELECT id, name FROM product_categories ORDER BY name");

        \$this->view('admin.products.index', [
            'page_title' => 'Products',
            'breadcrumbs' => [['label' => 'Products', 'url' => null]],
            'items' => \$items,
            'pagination' => ['total' => \$total, 'per_page' => \$this->perPage, 'current_page' => \$page, 'last_page' => max(1, (int) ceil(\$total / \$this->perPage)), 'from' => \$offset + 1, 'to' => min(\$offset + \$this->perPage, \$total)],
            'search' => \$search, 'sort' => 'created_at', 'direction' => 'desc',
            'filters' => \$filters, 'categories' => \$categories,
            'route_prefix' => \$this->routePrefix,
        ]);
    }

    public function create(): void
    {
        \$db = Database::getInstance();
        \$categories = \$db->fetchAll("SELECT id, name FROM product_categories ORDER BY sort_order");
        \$this->view('admin.products.create', [
            'page_title' => 'Create Product',
            'breadcrumbs' => [['label' => 'Products', 'url' => url(\$this->routePrefix)], ['label' => 'Create', 'url' => null]],
            'item' => [], 'categories' => \$categories, 'route_prefix' => \$this->routePrefix,
        ]);
    }

    public function store(): void
    {
        if (!\$this->validateCsrf()) return;

        \$validator = \\App\\Core\\Validator::make(\$_POST, \$this->validationRules);
        if (!\$validator->validate()) {
            flash_input();
            flash('errors', json_encode(\$validator->errors()));
            flash('error', 'Please fix the validation errors.');
            \$this->redirect(url(\$this->routePrefix . '/create'));
            return;
        }

        \$data = \$this->prepareData(\$_POST);
        \$data['slug'] = \$data['slug'] ?? slugify(\$data['name']);
        \$data = \$this->handleUploads(\$data);

        // Handle screenshots (multi-upload)
        if (!empty(\$_FILES['screenshots']) && is_array(\$_FILES['screenshots']['name'])) {
            \$screenshotPaths = [];
            for (\$i = 0; \$i < count(\$_FILES['screenshots']['name']); \$i++) {
                if (\$_FILES['screenshots']['error'][\$i] === UPLOAD_ERR_OK) {
                    \$file = ['name' => \$_FILES['screenshots']['name'][\$i], 'type' => \$_FILES['screenshots']['type'][\$i], 'tmp_name' => \$_FILES['screenshots']['tmp_name'][\$i], 'size' => \$_FILES['screenshots']['size'][\$i]];
                    \$path = \$this->uploadFile(\$file, 'screenshots');
                    if (\$path) \$screenshotPaths[] = \$path;
                }
            }
            \$data['screenshots'] = json_encode(\$screenshotPaths);
        }

        \$productId = \$this->model()->create(\$data);

        // Save features repeater
        if (!empty(\$_POST['features']) && is_array(\$_POST['features'])) {
            \$model = new \\App\\Models\\Product();
            \$model->saveFeatures(\$productId, \$_POST['features']);
        }

        // Save plans repeater
        if (!empty(\$_POST['plans']) && is_array(\$_POST['plans'])) {
            \$model = new \\App\\Models\\Product();
            \$model->savePlans(\$productId, \$_POST['plans']);
        }

        \$this->logActivity('create', 'Product', \$productId);
        clear_old_input();
        flash('success', 'Product created successfully!');
        \$this->redirect(url(\$this->routePrefix));
    }

    public function edit(string \$id): void
    {
        \$item = \$this->model()->findOrFail((int) \$id);
        \$db = Database::getInstance();
        \$categories = \$db->fetchAll("SELECT id, name FROM product_categories ORDER BY sort_order");
        \$model = new \\App\\Models\\Product();

        \$this->view('admin.products.edit', [
            'page_title' => 'Edit Product',
            'breadcrumbs' => [['label' => 'Products', 'url' => url(\$this->routePrefix)], ['label' => 'Edit', 'url' => null]],
            'item' => \$item,
            'categories' => \$categories,
            'features' => \$model->getFeatures((int) \$id),
            'plans' => \$model->getPlans((int) \$id),
            'demos' => \$model->getDemos((int) \$id),
            'versions' => \$model->getVersions((int) \$id),
            'faqs' => \$model->getFaqs((int) \$id),
            'route_prefix' => \$this->routePrefix,
        ]);
    }

    public function update(string \$id): void
    {
        if (!\$this->validateCsrf()) return;

        \$validator = \\App\\Core\\Validator::make(\$_POST, \$this->validationRules);
        if (!\$validator->validate()) {
            flash_input();
            flash('errors', json_encode(\$validator->errors()));
            \$this->redirect(url(\$this->routePrefix . '/' . \$id . '/edit'));
            return;
        }

        \$data = \$this->prepareData(\$_POST);
        \$data = \$this->handleUploads(\$data);

        // Handle screenshots
        if (!empty(\$_FILES['screenshots']) && is_array(\$_FILES['screenshots']['name'])) {
            \$screenshotPaths = json_decode(\$data['screenshots'] ?? '[]', true) ?: [];
            for (\$i = 0; \$i < count(\$_FILES['screenshots']['name']); \$i++) {
                if (\$_FILES['screenshots']['error'][\$i] === UPLOAD_ERR_OK) {
                    \$file = ['name' => \$_FILES['screenshots']['name'][\$i], 'type' => \$_FILES['screenshots']['type'][\$i], 'tmp_name' => \$_FILES['screenshots']['tmp_name'][\$i], 'size' => \$_FILES['screenshots']['size'][\$i]];
                    \$path = \$this->uploadFile(\$file, 'screenshots');
                    if (\$path) \$screenshotPaths[] = \$path;
                }
            }
            \$data['screenshots'] = json_encode(\$screenshotPaths);
        }

        \$this->model()->update((int) \$id, \$data);

        // Save features
        if (isset(\$_POST['features'])) {
            \$model = new \\App\\Models\\Product();
            \$model->saveFeatures((int) \$id, \$_POST['features'] ?? []);
        }

        // Save plans
        if (isset(\$_POST['plans'])) {
            \$model = new \\App\\Models\\Product();
            \$model->savePlans((int) \$id, \$_POST['plans'] ?? []);
        }

        \$this->logActivity('update', 'Product', (int) \$id);
        flash('success', 'Product updated!');
        \$this->redirect(url(\$this->routePrefix));
    }
}
`
  },
  {
    path: 'app/views/admin/products/index.php', name: 'index.php', language: 'php', module: 'Products', type: 'view-index',
    description: 'Products list with category filter, inquiry count, featured badge',
    content: `<?php /** Products Index */ ?>
<div class="space-y-6">
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
            <p class="text-sm text-gray-500 dark:text-slate-400 mt-1">Manage your software products</p>
        </div>
        <a href="<?= url(\$route_prefix . '/create') ?>" class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Add Product
        </a>
    </div>

    <!-- Filters -->
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
        <form method="GET" class="flex flex-wrap items-center gap-3">
            <div class="relative flex-1 min-w-[200px]">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                <input type="text" name="search" value="<?= e(\$search) ?>" placeholder="Search products..."
                       class="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
            </div>
            <select name="filter[category_id]" onchange="this.form.submit()" class="px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm">
                <option value="">All Categories</option>
                <?php foreach (\$categories as \$cat): ?>
                <option value="<?= \$cat['id'] ?>" <?= ((string)(\$filters['category_id'] ?? '')) === (string)\$cat['id'] ? 'selected' : '' ?>><?= e(\$cat['name']) ?></option>
                <?php endforeach; ?>
            </select>
            <select name="filter[status]" onchange="this.form.submit()" class="px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm">
                <option value="">All Status</option>
                <option value="draft" <?= (\$filters['status'] ?? '') === 'draft' ? 'selected' : '' ?>>Draft</option>
                <option value="published" <?= (\$filters['status'] ?? '') === 'published' ? 'selected' : '' ?>>Published</option>
            </select>
        </form>
    </div>

    <!-- Products Grid/List -->
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <table class="w-full text-sm">
            <thead><tr class="border-b border-gray-200 dark:border-slate-700">
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Product</th>
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Category</th>
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Price</th>
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Inquiries</th>
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Status</th>
                <th class="py-3 px-4 text-right font-medium text-gray-500 dark:text-slate-400">Actions</th>
            </tr></thead>
            <tbody>
                <?php if (empty(\$items)): ?>
                <tr><td colspan="6" class="py-12 text-center text-gray-400">No products found</td></tr>
                <?php else: ?>
                <?php foreach (\$items as \$product): ?>
                <tr class="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td class="py-3 px-4">
                        <div class="flex items-center gap-3">
                            <?php if (!empty(\$product['icon'])): ?>
                            <img src="<?= upload(\$product['icon']) ?>" class="w-10 h-10 rounded-lg object-cover" alt="">
                            <?php else: ?>
                            <div class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                            </div>
                            <?php endif; ?>
                            <div>
                                <div class="flex items-center gap-2">
                                    <a href="<?= url('/products/' . e(\$product['slug'])) ?>" target="_blank" class="font-medium text-gray-900 dark:text-white hover:text-blue-600"><?= e(\$product['name']) ?></a>
                                    <?php if (\$product['is_featured']): ?>
                                    <span class="px-1.5 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded">Featured</span>
                                    <?php endif; ?>
                                </div>
                                <p class="text-xs text-gray-500 dark:text-slate-400 mt-0.5"><?= e(str_limit(\$product['tagline'] ?? '', 50)) ?></p>
                            </div>
                        </div>
                    </td>
                    <td class="py-3 px-4"><span class="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded"><?= e(\$product['category_name'] ?? 'None') ?></span></td>
                    <td class="py-3 px-4">
                        <?php if (\$product['price_type'] === 'free'): ?>
                            <span class="text-green-600 font-medium">Free</span>
                        <?php else: ?>
                            <span class="text-gray-700 dark:text-slate-300"><?= money((float)(\$product['price'] ?? 0), \$product['price_currency'] ?? 'USD') ?></span>
                            <span class="text-xs text-gray-400">/ <?= \$product['billing_cycle'] ?? 'custom' ?></span>
                        <?php endif; ?>
                    </td>
                    <td class="py-3 px-4">
                        <a href="<?= url('/admin/inquiries?filter[product_id]=' . \$product['id']) ?>" class="text-blue-600 hover:underline font-medium"><?= \$product['inquiry_count'] ?? 0 ?></a>
                    </td>
                    <td class="py-3 px-4"><?= admin_status_badge(\$product['status']) ?></td>
                    <td class="py-3 px-4 text-right">
                        <div class="flex items-center justify-end gap-1">
                            <a href="<?= url(\$route_prefix . '/' . \$product['id'] . '/edit') ?>" class="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></a>
                            <form method="POST" action="<?= url(\$route_prefix . '/' . \$product['id'] . '/delete') ?>" onsubmit="return confirm('Delete this product?')" class="inline"><?= \\App\\Core\\CSRF::field() ?><button class="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button></form>
                        </div>
                    </td>
                </tr>
                <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>
`
  },
  {
    path: 'app/views/admin/products/create.php', name: 'create.php', language: 'php', module: 'Products', type: 'view-create',
    description: 'Create product with all fields: repeater features, multi-upload screenshots, pricing, SEO',
    content: `<?php /** Products Create View - with Alpine.js repeaters and SortableJS */ ?>
<div class="max-w-5xl mx-auto" x-data="{
    features: [],
    plans: [],
    screenshots: [],
    addFeature() { this.features.push({icon: '', title: '', description: ''}); },
    removeFeature(i) { this.features.splice(i, 1); },
    addPlan() { this.plans.push({name: '', price: 0, billing_cycle: 'lifetime', features: '', is_popular: 0}); },
    removePlan(i) { this.plans.splice(i, 1); },
}">
    <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Create Product</h1>
    </div>

    <form method="POST" action="<?= url(\$route_prefix) ?>" enctype="multipart/form-data">
        <?= \\App\\Core\\CSRF::field() ?>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Main Content (2 cols) -->
            <div class="lg:col-span-2 space-y-6">
                <!-- Basic Info -->
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h3>
                    <?= admin_input('name', 'Product Name', 'text', null, ['required', 'placeholder' => 'e.g., ERP Suite Pro']) ?>
                    <?= admin_input('tagline', 'Tagline', 'text', null, ['placeholder' => 'Short catchy tagline']) ?>
                    <?= admin_input('slug', 'Slug', 'text', null, ['placeholder' => 'auto-generated']) ?>
                    <?= admin_textarea('short_desc', 'Short Description', null, ['rows' => 2, 'placeholder' => 'Brief description for listings...']) ?>
                    <?= admin_editor('full_desc', 'Full Description') ?>
                </div>

                <!-- Features Repeater -->
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Features</h3>
                        <button type="button" @click="addFeature()" class="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100">+ Add Feature</button>
                    </div>
                    <div id="features-list" class="space-y-3">
                        <template x-for="(feature, index) in features" :key="index">
                            <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600 sortable-item">
                                <div class="cursor-grab pt-2 text-gray-400 hover:text-gray-600 drag-handle">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/></svg>
                                </div>
                                <div class="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <input type="text" :name="'features['+index+'][icon]'" x-model="feature.icon" placeholder="Icon (emoji/class)" class="px-2 py-1.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm">
                                    <input type="text" :name="'features['+index+'][title]'" x-model="feature.title" placeholder="Feature title" required class="px-2 py-1.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm">
                                    <input type="text" :name="'features['+index+'][description]'" x-model="feature.description" placeholder="Description" class="px-2 py-1.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm">
                                </div>
                                <button type="button" @click="removeFeature(index)" class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                </button>
                            </div>
                        </template>
                        <div x-show="features.length === 0" class="text-center py-6 text-gray-400 text-sm">No features added yet. Click "Add Feature" to start.</div>
                    </div>
                </div>

                <!-- Pricing Plans Repeater -->
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Pricing Plans</h3>
                        <button type="button" @click="addPlan()" class="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100">+ Add Plan</button>
                    </div>
                    <div class="space-y-3">
                        <template x-for="(plan, index) in plans" :key="index">
                            <div class="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
                                <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-2">
                                    <input type="text" :name="'plans['+index+'][name]'" x-model="plan.name" placeholder="Plan name" required class="px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm">
                                    <input type="number" :name="'plans['+index+'][price]'" x-model="plan.price" placeholder="Price" step="0.01" class="px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm">
                                    <select :name="'plans['+index+'][billing_cycle]'" x-model="plan.billing_cycle" class="px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm">
                                        <option value="monthly">Monthly</option>
                                        <option value="yearly">Yearly</option>
                                        <option value="lifetime">Lifetime</option>
                                    </select>
                                    <label class="flex items-center gap-2 text-sm">
                                        <input type="checkbox" :name="'plans['+index+'][is_popular]'" :value="plan.is_popular ? 1 : 0" x-model="plan.is_popular" class="rounded text-blue-600">
                                        Popular
                                    </label>
                                </div>
                                <textarea :name="'plans['+index+'][features]'" x-model="plan.features" placeholder="Features (one per line)" rows="2" class="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm resize-y"></textarea>
                                <button type="button" @click="removePlan(index)" class="mt-2 text-xs text-red-500 hover:text-red-700">Remove plan</button>
                            </div>
                        </template>
                    </div>
                </div>

                <!-- Screenshots Multi-Upload -->
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Screenshots</h3>
                    <div class="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-6 text-center">
                        <input type="file" name="screenshots[]" multiple accept="image/*" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">
                        <p class="text-xs text-gray-400 mt-2">Upload multiple screenshots. They will be sortable after upload.</p>
                    </div>
                </div>

                <!-- SEO -->
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">SEO</h3>
                    <?= admin_input('meta_title', 'Meta Title', 'text', null, ['placeholder' => 'Override SEO title']) ?>
                    <?= admin_textarea('meta_desc', 'Meta Description', null, ['rows' => 2]) ?>
                </div>
            </div>

            <!-- Sidebar -->
            <div class="space-y-6">
                <!-- Publish Settings -->
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Publish</h3>
                    <?= admin_select('status', 'Status', ['draft' => 'Draft', 'published' => 'Published', 'archived' => 'Archived'], 'draft') ?>
                    <?= admin_select('category_id', 'Category', array_column(\$categories ?? [], 'name', 'id'), null, ['placeholder' => 'Select category...']) ?>
                    <?= admin_toggle('is_featured', 'Featured Product') ?>
                    <?= admin_input('sort_order', 'Sort Order', 'number', '0') ?>
                </div>

                <!-- Pricing -->
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Pricing</h3>
                    <?= admin_select('price_type', 'Price Type', ['one_time' => 'One Time', 'subscription' => 'Subscription', 'custom' => 'Custom/Contact', 'free' => 'Free'], 'custom') ?>
                    <?= admin_input('price', 'Price', 'number', '0', ['placeholder' => '0.00']) ?>
                    <?= admin_select('price_currency', 'Currency', ['USD' => 'USD', 'EUR' => 'EUR', 'GBP' => 'GBP', 'PKR' => 'PKR'], 'USD') ?>
                    <?= admin_select('billing_cycle', 'Billing Cycle', ['monthly' => 'Monthly', 'yearly' => 'Yearly', 'lifetime' => 'Lifetime']) ?>
                </div>

                <!-- Media -->
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Media</h3>
                    <?= admin_file('icon', 'Product Icon', null, ['accept' => 'image/*']) ?>
                    <?= admin_file('hero_image', 'Hero Image', null, ['accept' => 'image/*']) ?>
                </div>

                <!-- URLs -->
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Links</h3>
                    <?= admin_input('demo_url', 'Demo URL', 'url', null, ['placeholder' => 'https://...']) ?>
                    <?= admin_input('download_url', 'Download URL', 'url', null) ?>
                    <?= admin_input('documentation_url', 'Documentation URL', 'url', null) ?>
                    <?= admin_input('video_url', 'Video URL', 'url', null, ['placeholder' => 'YouTube embed URL']) ?>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-3">
                    <a href="<?= url(\$route_prefix) ?>" class="flex-1 px-4 py-2.5 text-center text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 rounded-lg">Cancel</a>
                    <button type="submit" class="flex-1 px-4 py-2.5 text-center text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500">Create Product</button>
                </div>
            </div>
        </div>
    </form>

    <!-- SortableJS for drag-drop -->
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>
    <script>
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize sortable for features
        const featuresList = document.getElementById('features-list');
        if (featuresList) {
            new Sortable(featuresList, {
                handle: '.drag-handle',
                animation: 150,
                ghostClass: 'opacity-30',
            });
        }
    });
    </script>
</div>
`
  },
  {
    path: 'app/views/admin/products/edit.php', name: 'edit.php', language: 'php', module: 'Products', type: 'view-edit',
    description: 'Edit product with all fields pre-filled, existing features/plans loaded',
    content: `<?php /** Products Edit View */ ?>
<div class="max-w-5xl mx-auto" x-data="{
    features: <?= json_encode(\$features ?? []) ?>,
    plans: <?= json_encode(\$plans ?? []) ?>,
    addFeature() { this.features.push({icon: '', title: '', description: ''}); },
    removeFeature(i) { this.features.splice(i, 1); },
    addPlan() { this.plans.push({name: '', price: 0, billing_cycle: 'lifetime', features: '', is_popular: 0}); },
    removePlan(i) { this.plans.splice(i, 1); },
}">
    <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Edit Product</h1>
        <p class="text-sm text-gray-500 mt-1"><?= e(\$item['name'] ?? '') ?></p>
    </div>

    <form method="POST" action="<?= url(\$route_prefix . '/' . \$item['id']) ?>" enctype="multipart/form-data">
        <?= \\App\\Core\\CSRF::field() ?>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 space-y-6">
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h3>
                    <?= admin_input('name', 'Product Name', 'text', \$item['name'] ?? '', ['required']) ?>
                    <?= admin_input('tagline', 'Tagline', 'text', \$item['tagline'] ?? '') ?>
                    <?= admin_input('slug', 'Slug', 'text', \$item['slug'] ?? '') ?>
                    <?= admin_textarea('short_desc', 'Short Description', \$item['short_desc'] ?? '', ['rows' => 2]) ?>
                    <?= admin_editor('full_desc', 'Full Description', \$item['full_desc'] ?? '') ?>
                </div>

                <!-- Features Repeater (pre-filled) -->
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Features</h3>
                        <button type="button" @click="addFeature()" class="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100">+ Add</button>
                    </div>
                    <div id="features-list" class="space-y-3">
                        <template x-for="(feature, index) in features" :key="index">
                            <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600 sortable-item">
                                <div class="cursor-grab pt-2 text-gray-400 drag-handle"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/></svg></div>
                                <div class="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <input type="text" :name="'features['+index+'][icon]'" x-model="feature.icon" placeholder="Icon" class="px-2 py-1.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm">
                                    <input type="text" :name="'features['+index+'][title]'" x-model="feature.title" placeholder="Title" class="px-2 py-1.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm">
                                    <input type="text" :name="'features['+index+'][description]'" x-model="feature.description" placeholder="Description" class="px-2 py-1.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded text-sm">
                                </div>
                                <button type="button" @click="removeFeature(index)" class="p-1.5 text-red-400 hover:text-red-600"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                            </div>
                        </template>
                    </div>
                </div>

                <!-- Plans Repeater (pre-filled) -->
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Pricing Plans</h3>
                        <button type="button" @click="addPlan()" class="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100">+ Add Plan</button>
                    </div>
                    <div class="space-y-3">
                        <template x-for="(plan, index) in plans" :key="index">
                            <div class="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
                                <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-2">
                                    <input type="text" :name="'plans['+index+'][name]'" x-model="plan.name" placeholder="Plan name" class="px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm">
                                    <input type="number" :name="'plans['+index+'][price]'" x-model="plan.price" step="0.01" class="px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm">
                                    <select :name="'plans['+index+'][billing_cycle]'" x-model="plan.billing_cycle" class="px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm">
                                        <option value="monthly">Monthly</option><option value="yearly">Yearly</option><option value="lifetime">Lifetime</option>
                                    </select>
                                    <label class="flex items-center gap-2 text-sm"><input type="checkbox" :name="'plans['+index+'][is_popular]'" x-model="plan.is_popular" class="rounded text-blue-600"> Popular</label>
                                </div>
                                <textarea :name="'plans['+index+'][features]'" x-model="plan.features" placeholder="Features (one per line)" rows="2" class="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm"></textarea>
                                <button type="button" @click="removePlan(index)" class="mt-2 text-xs text-red-500">Remove</button>
                            </div>
                        </template>
                    </div>
                </div>

                <!-- Screenshots -->
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Screenshots</h3>
                    <?php
                    \$existingScreenshots = json_decode(\$item['screenshots'] ?? '[]', true) ?: [];
                    if (\$existingScreenshots):
                    ?>
                    <div class="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4" id="screenshots-sortable">
                        <?php foreach (\$existingScreenshots as \$ss): ?>
                        <div class="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-slate-600">
                            <img src="<?= upload(\$ss) ?>" class="w-full aspect-video object-cover" alt="">
                        </div>
                        <?php endforeach; ?>
                    </div>
                    <?php endif; ?>
                    <input type="file" name="screenshots[]" multiple accept="image/*" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">
                    <p class="text-xs text-gray-400 mt-2">Add more screenshots (existing ones preserved)</p>
                </div>

                <!-- SEO -->
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">SEO</h3>
                    <?= admin_input('meta_title', 'Meta Title', 'text', \$item['meta_title'] ?? '') ?>
                    <?= admin_textarea('meta_desc', 'Meta Description', \$item['meta_desc'] ?? '', ['rows' => 2]) ?>
                </div>
            </div>

            <!-- Sidebar -->
            <div class="space-y-6">
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <?= admin_select('status', 'Status', ['draft' => 'Draft', 'published' => 'Published', 'archived' => 'Archived'], \$item['status'] ?? 'draft') ?>
                    <?= admin_select('category_id', 'Category', array_column(\$categories ?? [], 'name', 'id'), \$item['category_id'] ?? '') ?>
                    <?= admin_toggle('is_featured', 'Featured Product', \$item['is_featured'] ?? 0) ?>
                    <?= admin_input('sort_order', 'Sort Order', 'number', \$item['sort_order'] ?? '0') ?>
                </div>
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <?= admin_select('price_type', 'Price Type', ['one_time' => 'One Time', 'subscription' => 'Subscription', 'custom' => 'Custom', 'free' => 'Free'], \$item['price_type'] ?? 'custom') ?>
                    <?= admin_input('price', 'Price', 'number', \$item['price'] ?? '0') ?>
                    <?= admin_select('price_currency', 'Currency', ['USD' => 'USD', 'EUR' => 'EUR', 'GBP' => 'GBP', 'PKR' => 'PKR'], \$item['price_currency'] ?? 'USD') ?>
                </div>
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <?= admin_file('icon', 'Product Icon', \$item['icon'] ?? null, ['accept' => 'image/*']) ?>
                    <?= admin_file('hero_image', 'Hero Image', \$item['hero_image'] ?? null, ['accept' => 'image/*']) ?>
                </div>
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <?= admin_input('demo_url', 'Demo URL', 'url', \$item['demo_url'] ?? '') ?>
                    <?= admin_input('download_url', 'Download URL', 'url', \$item['download_url'] ?? '') ?>
                    <?= admin_input('documentation_url', 'Docs URL', 'url', \$item['documentation_url'] ?? '') ?>
                    <?= admin_input('video_url', 'Video URL', 'url', \$item['video_url'] ?? '') ?>
                </div>
                <div class="flex items-center gap-3">
                    <a href="<?= url(\$route_prefix) ?>" class="flex-1 px-4 py-2.5 text-center text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 rounded-lg">Cancel</a>
                    <button type="submit" class="flex-1 px-4 py-2.5 text-center text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500">Update</button>
                </div>
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-red-200 dark:border-red-900/50 p-4">
                    <form method="POST" action="<?= url(\$route_prefix . '/' . \$item['id'] . '/delete') ?>" onsubmit="return confirm('Delete this product?')">
                        <?= \\App\\Core\\CSRF::field() ?>
                        <button type="submit" class="w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100">Delete Product</button>
                    </form>
                </div>
            </div>
        </div>
    </form>

    <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>
    <script>
    document.addEventListener('DOMContentLoaded', () => {
        const el = document.getElementById('features-list');
        if (el) new Sortable(el, { handle: '.drag-handle', animation: 150, ghostClass: 'opacity-30' });
        const ss = document.getElementById('screenshots-sortable');
        if (ss) new Sortable(ss, { animation: 150, ghostClass: 'opacity-30' });
    });
    </script>
</div>
`
  },
  // ==================== PRODUCT INQUIRIES ====================
  {
    path: 'app/controllers/admin/InquiryController.php', name: 'InquiryController.php', language: 'php', module: 'Inquiries', type: 'controller',
    description: 'Product inquiries: list, filter, view detail, status change, CSV export',
    content: `<?php
declare(strict_types=1);
namespace App\\Controllers\\Admin;
use App\\Core\\Controller;
use App\\Core\\Database;

class InquiryController extends Controller
{
    protected string \$layout = 'admin.main';

    public function index(): void
    {
        \$db = Database::getInstance();
        \$page = max(1, (int) (\$_GET['page'] ?? 1));
        \$filters = \$_GET['filter'] ?? [];
        \$search = trim(\$_GET['search'] ?? '');

        \$where = '1=1';
        \$params = [];

        if (!empty(\$filters['status'])) { \$where .= ' AND pi.status = ?'; \$params[] = \$filters['status']; }
        if (!empty(\$filters['type'])) { \$where .= ' AND pi.type = ?'; \$params[] = \$filters['type']; }
        if (!empty(\$filters['product_id'])) { \$where .= ' AND pi.product_id = ?'; \$params[] = \$filters['product_id']; }
        if (\$search) { \$where .= ' AND (pi.name LIKE ? OR pi.email LIKE ? OR pi.company LIKE ?)'; \$params = array_merge(\$params, ["%{\$search}%", "%{\$search}%", "%{\$search}%"]); }

        \$total = (int) \$db->fetchColumn("SELECT COUNT(*) FROM product_inquiries pi WHERE {\$where}", \$params);
        \$perPage = 20;
        \$offset = (\$page - 1) * \$perPage;

        \$items = \$db->fetchAll(
            "SELECT pi.*, p.name as product_name FROM product_inquiries pi
             LEFT JOIN products p ON pi.product_id = p.id
             WHERE {\$where} ORDER BY pi.created_at DESC LIMIT ? OFFSET ?",
            array_merge(\$params, [\$perPage, \$offset])
        );

        \$products = \$db->fetchAll("SELECT id, name FROM products WHERE deleted_at IS NULL ORDER BY name");

        \$this->view('admin.inquiries.index', [
            'page_title' => 'Product Inquiries',
            'breadcrumbs' => [['label' => 'Inquiries', 'url' => null]],
            'items' => \$items,
            'pagination' => ['total' => \$total, 'per_page' => \$perPage, 'current_page' => \$page, 'last_page' => max(1, (int) ceil(\$total / \$perPage)), 'from' => \$offset + 1, 'to' => min(\$offset + \$perPage, \$total)],
            'search' => \$search, 'filters' => \$filters, 'products' => \$products,
        ]);
    }

    public function show(string \$id): void
    {
        \$db = Database::getInstance();
        \$inquiry = \$db->fetch(
            "SELECT pi.*, p.name as product_name FROM product_inquiries pi
             LEFT JOIN products p ON pi.product_id = p.id WHERE pi.id = ?", [\$id]
        );
        if (!\$inquiry) { flash('error', 'Inquiry not found.'); \$this->redirect(url('/admin/inquiries')); return; }

        // Mark as read
        if (\$inquiry['status'] === 'new') {
            \$db->update('product_inquiries', ['status' => 'in_progress'], 'id = ?', [\$id]);
        }

        \$this->view('admin.inquiries.show', [
            'page_title' => 'Inquiry Detail',
            'breadcrumbs' => [['label' => 'Inquiries', 'url' => url('/admin/inquiries')], ['label' => '#' . \$id, 'url' => null]],
            'inquiry' => \$inquiry,
        ]);
    }

    public function updateStatus(string \$id): void
    {
        if (!\$this->validateCsrf()) return;
        \$status = \$_POST['status'] ?? '';
        \$allowed = ['new', 'in_progress', 'resolved', 'closed'];
        if (!in_array(\$status, \$allowed)) { flash('error', 'Invalid status.'); \$this->redirectBack(); return; }

        Database::getInstance()->update('product_inquiries', ['status' => \$status, 'updated_at' => date('Y-m-d H:i:s')], 'id = ?', [\$id]);
        flash('success', 'Status updated.');
        \$this->redirectBack();
    }

    public function export(): void
    {
        \$db = Database::getInstance();
        \$items = \$db->fetchAll("SELECT pi.*, p.name as product_name FROM product_inquiries pi LEFT JOIN products p ON pi.product_id = p.id ORDER BY pi.created_at DESC");

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="inquiries_' . date('Y-m-d') . '.csv"');
        \$output = fopen('php://output', 'w');
        fprintf(\$output, chr(0xEF) . chr(0xBB) . chr(0xBF));
        fputcsv(\$output, ['ID', 'Name', 'Email', 'Phone', 'Company', 'Product', 'Type', 'Status', 'Message', 'Date']);
        foreach (\$items as \$item) {
            fputcsv(\$output, [\$item['id'], \$item['name'], \$item['email'], \$item['phone'], \$item['company'], \$item['product_name'], \$item['type'], \$item['status'], \$item['message'], \$item['created_at']]);
        }
        fclose(\$output);
        exit;
    }
}
`
  },
  {
    path: 'app/views/admin/inquiries/index.php', name: 'index.php', language: 'php', module: 'Inquiries', type: 'view-index',
    description: 'Inquiries list with filters by type/status/product, CSV export button',
    content: `<?php /** Inquiries Index */ ?>
<div class="space-y-6">
    <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Product Inquiries</h1>
        <a href="<?= url('/admin/inquiries/export') ?>" class="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Export CSV
        </a>
    </div>

    <!-- Filters -->
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
        <form method="GET" class="flex flex-wrap items-center gap-3">
            <input type="text" name="search" value="<?= e(\$search) ?>" placeholder="Search name, email, company..."
                   class="flex-1 min-w-[200px] px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
            <select name="filter[status]" onchange="this.form.submit()" class="px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm">
                <option value="">All Status</option>
                <?php foreach (['new', 'in_progress', 'resolved', 'closed'] as \$s): ?>
                <option value="<?= \$s ?>" <?= (\$filters['status'] ?? '') === \$s ? 'selected' : '' ?>><?= ucfirst(str_replace('_', ' ', \$s)) ?></option>
                <?php endforeach; ?>
            </select>
            <select name="filter[type]" onchange="this.form.submit()" class="px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm">
                <option value="">All Types</option>
                <?php foreach (['demo', 'quote', 'support'] as \$t): ?>
                <option value="<?= \$t ?>" <?= (\$filters['type'] ?? '') === \$t ? 'selected' : '' ?>><?= ucfirst(\$t) ?></option>
                <?php endforeach; ?>
            </select>
            <select name="filter[product_id]" onchange="this.form.submit()" class="px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm">
                <option value="">All Products</option>
                <?php foreach (\$products as \$p): ?>
                <option value="<?= \$p['id'] ?>" <?= ((string)(\$filters['product_id'] ?? '')) === (string)\$p['id'] ? 'selected' : '' ?>><?= e(\$p['name']) ?></option>
                <?php endforeach; ?>
            </select>
        </form>
    </div>

    <!-- Table -->
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <table class="w-full text-sm">
            <thead><tr class="border-b border-gray-200 dark:border-slate-700">
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Contact</th>
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Product</th>
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Type</th>
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Status</th>
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Date</th>
                <th class="py-3 px-4 text-right font-medium text-gray-500 dark:text-slate-400">Actions</th>
            </tr></thead>
            <tbody>
                <?php foreach (\$items as \$inq): ?>
                <tr class="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td class="py-3 px-4">
                        <div class="font-medium text-gray-900 dark:text-white"><?= e(\$inq['name']) ?></div>
                        <div class="text-xs text-gray-500"><?= e(\$inq['email']) ?> <?= \$inq['company'] ? '• ' . e(\$inq['company']) : '' ?></div>
                    </td>
                    <td class="py-3 px-4 text-gray-600 dark:text-slate-300"><?= e(\$inq['product_name'] ?? 'N/A') ?></td>
                    <td class="py-3 px-4"><span class="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded"><?= e(ucfirst(\$inq['type'])) ?></span></td>
                    <td class="py-3 px-4"><?= admin_status_badge(\$inq['status']) ?></td>
                    <td class="py-3 px-4 text-xs text-gray-500"><?= time_ago(\$inq['created_at']) ?></td>
                    <td class="py-3 px-4 text-right">
                        <a href="<?= url('/admin/inquiries/' . \$inq['id']) ?>" class="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20" title="View">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        </a>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
`
  },
  {
    path: 'app/views/admin/inquiries/show.php', name: 'show.php', language: 'php', module: 'Inquiries', type: 'view-edit',
    description: 'Inquiry detail view with status change and contact info',
    content: `<?php /** Inquiry Detail View */ ?>
<div class="max-w-3xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Inquiry #<?= \$inquiry['id'] ?></h1>
            <p class="text-sm text-gray-500 mt-1"><?= e(\$inquiry['product_name'] ?? '') ?> • <?= time_ago(\$inquiry['created_at']) ?></p>
        </div>
        <a href="<?= url('/admin/inquiries') ?>" class="text-sm text-blue-600 hover:underline">← Back to list</a>
    </div>

    <!-- Status -->
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <form method="POST" action="<?= url('/admin/inquiries/' . \$inquiry['id'] . '/status') ?>" class="flex items-center gap-4">
            <?= \\App\\Core\\CSRF::field() ?>
            <label class="text-sm font-medium text-gray-700 dark:text-slate-300">Status:</label>
            <select name="status" class="px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm">
                <?php foreach (['new', 'in_progress', 'resolved', 'closed'] as \$s): ?>
                <option value="<?= \$s ?>" <?= \$inquiry['status'] === \$s ? 'selected' : '' ?>><?= ucfirst(str_replace('_', ' ', \$s)) ?></option>
                <?php endforeach; ?>
            </select>
            <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500">Update</button>
        </form>
    </div>

    <!-- Contact Info -->
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><span class="text-xs text-gray-500 dark:text-slate-400">Name</span><p class="font-medium text-gray-900 dark:text-white"><?= e(\$inquiry['name']) ?></p></div>
            <div><span class="text-xs text-gray-500 dark:text-slate-400">Email</span><p class="font-medium"><a href="mailto:<?= e(\$inquiry['email']) ?>" class="text-blue-600 hover:underline"><?= e(\$inquiry['email']) ?></a></p></div>
            <div><span class="text-xs text-gray-500 dark:text-slate-400">Phone</span><p class="font-medium text-gray-900 dark:text-white"><?= e(\$inquiry['phone'] ?? 'N/A') ?></p></div>
            <div><span class="text-xs text-gray-500 dark:text-slate-400">Company</span><p class="font-medium text-gray-900 dark:text-white"><?= e(\$inquiry['company'] ?? 'N/A') ?></p></div>
            <div><span class="text-xs text-gray-500 dark:text-slate-400">Type</span><p class="font-medium text-gray-900 dark:text-white"><?= e(ucfirst(\$inquiry['type'])) ?></p></div>
            <div><span class="text-xs text-gray-500 dark:text-slate-400">IP Address</span><p class="font-mono text-xs text-gray-500"><?= e(\$inquiry['ip'] ?? '') ?></p></div>
        </div>
    </div>

    <!-- Message -->
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Message</h3>
        <p class="text-gray-700 dark:text-slate-300 whitespace-pre-wrap"><?= e(\$inquiry['message'] ?? '') ?></p>
    </div>
</div>
`
  },
];
