import { CrudFile } from './crudBase';

export const crudContentFiles: CrudFile[] = [
  // ==================== PAGES MODULE ====================
  {
    path: 'app/models/Page.php', name: 'Page.php', language: 'php', module: 'Pages', type: 'model',
    description: 'Page model with soft delete, fillable fields, and scope methods',
    content: `<?php
declare(strict_types=1);
namespace App\\Models;
use App\\Core\\Model;

class Page extends Model
{
    protected string \$table = 'pages';
    protected bool \$softDelete = true;
    protected array \$fillable = [
        'title', 'slug', 'content', 'meta_title', 'meta_desc',
        'og_image', 'template', 'status', 'sort_order',
    ];

    public function published(): array
    {
        return \$this->db->fetchAll(
            "SELECT * FROM pages WHERE status = 'published' AND deleted_at IS NULL ORDER BY sort_order, title"
        );
    }

    public function findBySlug(string \$slug): ?array
    {
        return \$this->findBy('slug', \$slug);
    }
}
`
  },
  {
    path: 'app/controllers/admin/PageController.php', name: 'PageController.php', language: 'php', module: 'Pages', type: 'controller',
    description: 'Pages CRUD controller with slug auto-generation, template selector, SEO fields',
    content: `<?php
declare(strict_types=1);
namespace App\\Controllers\\Admin;
use App\\Core\\AdminController;

class PageController extends AdminController
{
    protected string \$modelClass = \\App\\Models\\Page::class;
    protected string \$viewPrefix = 'admin.pages';
    protected string \$routePrefix = '/admin/pages';
    protected string \$pageTitle = 'Pages';
    protected string \$searchColumns = 'title,slug,content';
    protected array \$filterable = ['status', 'template'];
    protected array \$validationRules = [
        'title' => 'required|min:2|max:255',
        'slug' => 'nullable|slug|max:255',
        'content' => 'required',
        'template' => 'required|in:default,full-width,sidebar,landing,contact',
        'status' => 'required|in:draft,published,archived',
        'meta_title' => 'nullable|max:255',
        'meta_desc' => 'nullable|max:500',
    ];

    public function index(): void
    {
        \$page = max(1, (int) (\$_GET['page'] ?? 1));
        \$search = trim(\$_GET['search'] ?? '');
        \$sort = \$_GET['sort'] ?? 'sort_order';
        \$direction = \$_GET['dir'] ?? 'asc';
        \$filters = \$_GET['filter'] ?? [];

        \$where = '1=1 AND deleted_at IS NULL';
        \$params = [];

        if (\$search) {
            \$where .= ' AND (title LIKE ? OR slug LIKE ?)';
            \$params[] = "%{\$search}%";
            \$params[] = "%{\$search}%";
        }
        if (!empty(\$filters['status'])) {
            \$where .= ' AND status = ?';
            \$params[] = \$filters['status'];
        }
        if (!empty(\$filters['template'])) {
            \$where .= ' AND template = ?';
            \$params[] = \$filters['template'];
        }

        \$result = \$this->model()->paginate(\$page, \$this->perPage, \$where, \$params, "\`{\$sort}\` {\$direction}");

        \$columns = [
            ['key' => 'title', 'label' => 'Title', 'sortable' => true, 'render' => fn(\$item) => '
                <div>
                    <a href="' . url('/page/' . e(\$item['slug'])) . '" target="_blank" class="font-medium text-gray-900 dark:text-white hover:text-blue-600">' . e(\$item['title']) . '</a>
                    <p class="text-xs text-gray-500 dark:text-slate-400">/' . e(\$item['slug']) . '</p>
                </div>
            '],
            ['key' => 'template', 'label' => 'Template', 'sortable' => true, 'render' => fn(\$item) => '<span class="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">' . e(ucfirst(\$item['template'])) . '</span>'],
            ['key' => 'status', 'label' => 'Status', 'sortable' => true, 'render' => fn(\$item) => admin_status_badge(\$item['status'])],
            ['key' => 'sort_order', 'label' => 'Order', 'sortable' => true],
            ['key' => 'updated_at', 'label' => 'Updated', 'sortable' => true, 'render' => fn(\$item) => '<span class="text-xs text-gray-500">' . format_date(\$item['updated_at'] ?? \$item['created_at']) . '</span>'],
        ];

        \$this->view('admin.pages.index', [
            'page_title' => 'Pages',
            'breadcrumbs' => [['label' => 'Pages', 'url' => null]],
            'items' => \$result['data'],
            'pagination' => \$result,
            'search' => \$search, 'sort' => \$sort, 'direction' => \$direction,
            'filters' => \$filters, 'columns' => \$columns,
            'route_prefix' => \$this->routePrefix,
            'filterable' => \$this->filterable,
            'bulkActions' => ['delete' => 'Delete', 'publish' => 'Publish', 'unpublish' => 'Draft'],
        ]);
    }
}
`
  },
  {
    path: 'app/views/admin/pages/index.php', name: 'index.php', language: 'php', module: 'Pages', type: 'view-index',
    description: 'Pages list view with search, filters, sortable columns, bulk actions',
    content: `<?php /** Pages Index View */ ?>
<div class="space-y-6">
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white"><?= e(\$page_title) ?></h1>
            <p class="text-sm text-gray-500 dark:text-slate-400 mt-1">Manage your website pages</p>
        </div>
        <a href="<?= url(\$route_prefix . '/create') ?>" class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Create Page
        </a>
    </div>
    <?php require APP_PATH . '/views/components/table.php'; ?>
</div>
`
  },
  {
    path: 'app/views/admin/pages/create.php', name: 'create.php', language: 'php', module: 'Pages', type: 'view-create',
    description: 'Create page form with title, slug auto-gen, TinyMCE editor, template selector, SEO fields',
    content: `<?php /** Pages Create View */ ?>
<div class="max-w-4xl mx-auto">
    <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Create Page</h1>
        <p class="text-sm text-gray-500 dark:text-slate-400 mt-1">Add a new page to your website</p>
    </div>

    <form method="POST" action="<?= url(\$route_prefix) ?>" enctype="multipart/form-data" x-data="{ slug: '', autoSlug: true }">
        <?= \\App\\Core\\CSRF::field() ?>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Main Content -->
            <div class="lg:col-span-2 space-y-6">
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <?= admin_input('title', 'Page Title', 'text', null, ['required', 'placeholder' => 'Enter page title...']) ?>

                    <div class="mb-4" x-data="{ slug: '' }">
                        <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Slug</label>
                        <div class="flex items-center gap-2">
                            <span class="text-sm text-gray-500 dark:text-slate-400">/page/</span>
                            <input type="text" name="slug" x-model="slug"
                                   @input="autoSlug = false"
                                   placeholder="auto-generated-from-title"
                                   class="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                        </div>
                        <p class="mt-1 text-xs text-gray-500">Leave empty to auto-generate from title</p>
                    </div>

                    <?= admin_editor('content', 'Page Content') ?>
                </div>

                <!-- SEO Section -->
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">SEO Settings</h3>
                    <?= admin_input('meta_title', 'Meta Title', 'text', null, ['placeholder' => 'SEO title (leave empty for page title)', 'help' => 'Recommended: 50-60 characters']) ?>
                    <?= admin_textarea('meta_desc', 'Meta Description', null, ['rows' => 3, 'placeholder' => 'Brief description for search engines...']) ?>
                </div>
            </div>

            <!-- Sidebar -->
            <div class="space-y-6">
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Publish</h3>
                    <?= admin_select('status', 'Status', ['draft' => 'Draft', 'published' => 'Published', 'archived' => 'Archived'], 'draft') ?>
                    <?= admin_select('template', 'Template', [
                        'default' => 'Default', 'full-width' => 'Full Width',
                        'sidebar' => 'With Sidebar', 'landing' => 'Landing Page', 'contact' => 'Contact Page',
                    ], 'default') ?>
                    <?= admin_input('sort_order', 'Sort Order', 'number', '0') ?>

                    <div class="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                        <a href="<?= url(\$route_prefix) ?>" class="flex-1 px-4 py-2.5 text-center text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200">Cancel</a>
                        <button type="submit" class="flex-1 px-4 py-2.5 text-center text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500">Create Page</button>
                    </div>
                </div>
            </div>
        </div>
    </form>

    <script>
    // Auto-slug from title
    document.querySelector('[name="title"]')?.addEventListener('input', function() {
        const slugInput = document.querySelector('[name="slug"]');
        if (slugInput && !slugInput._userEdited) {
            slugInput.value = this.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        }
    });
    document.querySelector('[name="slug"]')?.addEventListener('input', function() { this._userEdited = true; });
    </script>
</div>
`
  },
  {
    path: 'app/views/admin/pages/edit.php', name: 'edit.php', language: 'php', module: 'Pages', type: 'view-edit',
    description: 'Edit page form - same layout as create with pre-filled values',
    content: `<?php /** Pages Edit View */ ?>
<div class="max-w-4xl mx-auto">
    <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Edit Page</h1>
        <p class="text-sm text-gray-500 dark:text-slate-400 mt-1">Editing: <?= e(\$item['title']) ?></p>
    </div>

    <form method="POST" action="<?= url(\$route_prefix . '/' . \$item['id']) ?>" enctype="multipart/form-data">
        <?= \\App\\Core\\CSRF::field() ?>
        <input type="hidden" name="_method" value="POST">

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 space-y-6">
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <?= admin_input('title', 'Page Title', 'text', \$item['title'] ?? '', ['required']) ?>
                    <?= admin_input('slug', 'Slug', 'text', \$item['slug'] ?? '') ?>
                    <?= admin_editor('content', 'Page Content', \$item['content'] ?? '') ?>
                </div>
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">SEO Settings</h3>
                    <?= admin_input('meta_title', 'Meta Title', 'text', \$item['meta_title'] ?? '') ?>
                    <?= admin_textarea('meta_desc', 'Meta Description', \$item['meta_desc'] ?? '', ['rows' => 3]) ?>
                </div>
            </div>
            <div class="space-y-6">
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Publish</h3>
                    <?= admin_select('status', 'Status', ['draft' => 'Draft', 'published' => 'Published', 'archived' => 'Archived'], \$item['status'] ?? 'draft') ?>
                    <?= admin_select('template', 'Template', ['default' => 'Default', 'full-width' => 'Full Width', 'sidebar' => 'With Sidebar', 'landing' => 'Landing Page', 'contact' => 'Contact Page'], \$item['template'] ?? 'default') ?>
                    <?= admin_input('sort_order', 'Sort Order', 'number', \$item['sort_order'] ?? '0') ?>
                    <div class="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                        <a href="<?= url(\$route_prefix) ?>" class="flex-1 px-4 py-2.5 text-center text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200">Cancel</a>
                        <button type="submit" class="flex-1 px-4 py-2.5 text-center text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500">Update Page</button>
                    </div>
                </div>
                <!-- Delete -->
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-red-200 dark:border-red-900/50 p-6">
                    <h3 class="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">Danger Zone</h3>
                    <p class="text-xs text-gray-500 dark:text-slate-400 mb-3">Once deleted, this page can be restored from trash.</p>
                    <form method="POST" action="<?= url(\$route_prefix . '/' . \$item['id'] . '/delete') ?>" onsubmit="return confirm('Delete this page?')">
                        <?= \\App\\Core\\CSRF::field() ?>
                        <button type="submit" class="w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30">Delete Page</button>
                    </form>
                </div>
            </div>
        </div>
    </form>
</div>
`
  },
  // ==================== BLOG POSTS MODULE ====================
  {
    path: 'app/models/BlogPost.php', name: 'BlogPost.php', language: 'php', module: 'Blog', type: 'model',
    description: 'Blog post model with categories, tags, and scheduled publishing',
    content: `<?php
declare(strict_types=1);
namespace App\\Models;
use App\\Core\\Model;

class BlogPost extends Model
{
    protected string \$table = 'blog_posts';
    protected bool \$softDelete = true;
    protected array \$fillable = [
        'title', 'slug', 'excerpt', 'content', 'featured_image',
        'category_id', 'author_id', 'meta_title', 'meta_desc',
        'published_at', 'status',
    ];

    public function withCategory(): array
    {
        return \$this->db->fetchAll(
            "SELECT p.*, c.name as category_name FROM blog_posts p
             LEFT JOIN blog_categories c ON p.category_id = c.id
             WHERE p.deleted_at IS NULL ORDER BY p.created_at DESC"
        );
    }

    public function getTags(int \$postId): array
    {
        return \$this->db->fetchAll(
            "SELECT t.* FROM blog_tags t INNER JOIN blog_post_tags pt ON pt.tag_id = t.id WHERE pt.post_id = ?",
            [\$postId]
        );
    }

    public function setTags(int \$postId, array \$tagIds): void
    {
        \$this->db->delete('blog_post_tags', 'post_id = ?', [\$postId]);
        foreach (\$tagIds as \$tagId) {
            \$this->db->insert('blog_post_tags', ['post_id' => \$postId, 'tag_id' => (int) \$tagId]);
        }
    }

    public function calculateReadTime(string \$content): int
    {
        \$wordCount = str_word_count(strip_tags(\$content));
        return max(1, (int) ceil(\$wordCount / 200));
    }
}
`
  },
  {
    path: 'app/controllers/admin/BlogController.php', name: 'BlogController.php', language: 'php', module: 'Blog', type: 'controller',
    description: 'Blog posts CRUD with categories, tags multi-select, featured image, scheduled publishing, read time',
    content: `<?php
declare(strict_types=1);
namespace App\\Controllers\\Admin;
use App\\Core\\AdminController;
use App\\Core\\Database;
use App\\Core\\Auth;

class BlogController extends AdminController
{
    protected string \$modelClass = \\App\\Models\\BlogPost::class;
    protected string \$viewPrefix = 'admin.blog';
    protected string \$routePrefix = '/admin/blog';
    protected string \$pageTitle = 'Blog Posts';
    protected string \$searchColumns = 'title,slug,excerpt';
    protected array \$filterable = ['status', 'category_id'];
    protected array \$validationRules = [
        'title' => 'required|min:3|max:255',
        'excerpt' => 'nullable|max:500',
        'content' => 'required',
        'category_id' => 'nullable|integer',
        'status' => 'required|in:draft,published,archived',
        'published_at' => 'nullable',
        'meta_title' => 'nullable|max:255',
        'meta_desc' => 'nullable|max:500',
    ];

    protected function getUploadFields(): array { return ['featured_image']; }

    public function index(): void
    {
        \$page = max(1, (int) (\$_GET['page'] ?? 1));
        \$search = trim(\$_GET['search'] ?? '');
        \$filters = \$_GET['filter'] ?? [];

        \$where = 'p.deleted_at IS NULL';
        \$params = [];

        if (\$search) {
            \$where .= ' AND (p.title LIKE ? OR p.excerpt LIKE ?)';
            \$params[] = "%{\$search}%";
            \$params[] = "%{\$search}%";
        }
        if (!empty(\$filters['status'])) {
            \$where .= ' AND p.status = ?';
            \$params[] = \$filters['status'];
        }
        if (!empty(\$filters['category_id'])) {
            \$where .= ' AND p.category_id = ?';
            \$params[] = \$filters['category_id'];
        }

        \$db = Database::getInstance();
        \$total = (int) \$db->fetchColumn("SELECT COUNT(*) FROM blog_posts p WHERE {\$where}", \$params);
        \$offset = (\$page - 1) * \$this->perPage;

        \$items = \$db->fetchAll(
            "SELECT p.*, c.name as category_name, u.name as author_name
             FROM blog_posts p
             LEFT JOIN blog_categories c ON p.category_id = c.id
             LEFT JOIN users u ON p.author_id = u.id
             WHERE {\$where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?",
            array_merge(\$params, [\$this->perPage, \$offset])
        );

        \$categories = \$db->fetchAll("SELECT id, name FROM blog_categories ORDER BY name");

        \$this->view('admin.blog.index', [
            'page_title' => 'Blog Posts',
            'breadcrumbs' => [['label' => 'Blog Posts', 'url' => null]],
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
        \$categories = \$db->fetchAll("SELECT id, name FROM blog_categories ORDER BY name");
        \$tags = \$db->fetchAll("SELECT id, name FROM blog_tags ORDER BY name");

        \$this->view('admin.blog.create', [
            'page_title' => 'Create Blog Post',
            'breadcrumbs' => [['label' => 'Blog Posts', 'url' => url(\$this->routePrefix)], ['label' => 'Create', 'url' => null]],
            'categories' => \$categories, 'tags' => \$tags,
            'item' => [], 'route_prefix' => \$this->routePrefix,
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
        \$data['slug'] = \$data['slug'] ?? slugify(\$data['title']);
        \$data['author_id'] = Auth::id();

        // Auto-calculate read time
        \$postModel = new \\App\\Models\\BlogPost();
        \$data['read_time'] = \$postModel->calculateReadTime(\$data['content'] ?? '');

        // Handle featured image
        \$data = \$this->handleUploads(\$data);

        // Set published_at
        if (\$data['status'] === 'published' && empty(\$data['published_at'])) {
            \$data['published_at'] = date('Y-m-d H:i:s');
        }

        \$postId = \$this->model()->create(\$data);

        // Handle tags
        if (!empty(\$_POST['tags']) && is_array(\$_POST['tags'])) {
            \$postModel->setTags(\$postId, \$_POST['tags']);
        }

        \$this->logActivity('create', 'Blog Post', \$postId);
        clear_old_input();
        flash('success', 'Blog post created successfully!');
        \$this->redirect(url(\$this->routePrefix));
    }

    public function edit(string \$id): void
    {
        \$item = \$this->model()->findOrFail((int) \$id);
        \$db = Database::getInstance();
        \$categories = \$db->fetchAll("SELECT id, name FROM blog_categories ORDER BY name");
        \$tags = \$db->fetchAll("SELECT id, name FROM blog_tags ORDER BY name");
        \$postTags = \$this->model()->getTags((int) \$id);
        \$postTagIds = array_column(\$postTags, 'id');

        \$this->view('admin.blog.edit', [
            'page_title' => 'Edit Blog Post',
            'breadcrumbs' => [['label' => 'Blog Posts', 'url' => url(\$this->routePrefix)], ['label' => 'Edit', 'url' => null]],
            'item' => \$item, 'categories' => \$categories, 'tags' => \$tags,
            'postTagIds' => \$postTagIds, 'route_prefix' => \$this->routePrefix,
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

        \$postModel = new \\App\\Models\\BlogPost();
        \$data['read_time'] = \$postModel->calculateReadTime(\$data['content'] ?? '');

        if (\$data['status'] === 'published') {
            \$existing = \$this->model()->find((int) \$id);
            if (empty(\$existing['published_at'])) {
                \$data['published_at'] = date('Y-m-d H:i:s');
            }
        }

        \$this->model()->update((int) \$id, \$data);

        if (isset(\$_POST['tags'])) {
            \$postModel->setTags((int) \$id, \$_POST['tags'] ?? []);
        }

        \$this->logActivity('update', 'Blog Post', (int) \$id);
        flash('success', 'Blog post updated!');
        \$this->redirect(url(\$this->routePrefix));
    }
}
`
  },
  {
    path: 'app/views/admin/blog/index.php', name: 'index.php', language: 'php', module: 'Blog', type: 'view-index',
    description: 'Blog posts list with category filter, status badges, author info',
    content: `<?php /** Blog Posts Index */ ?>
<div class="space-y-6">
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Blog Posts</h1>
            <p class="text-sm text-gray-500 dark:text-slate-400 mt-1">Manage your blog content</p>
        </div>
        <a href="<?= url(\$route_prefix . '/create') ?>" class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            New Post
        </a>
    </div>

    <!-- Filters -->
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
        <form method="GET" class="flex flex-wrap items-center gap-3">
            <div class="relative flex-1 min-w-[200px]">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                <input type="text" name="search" value="<?= e(\$search) ?>" placeholder="Search posts..."
                       class="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
            </div>
            <select name="filter[status]" onchange="this.form.submit()" class="px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm">
                <option value="">All Status</option>
                <option value="draft" <?= (\$filters['status'] ?? '') === 'draft' ? 'selected' : '' ?>>Draft</option>
                <option value="published" <?= (\$filters['status'] ?? '') === 'published' ? 'selected' : '' ?>>Published</option>
                <option value="archived" <?= (\$filters['status'] ?? '') === 'archived' ? 'selected' : '' ?>>Archived</option>
            </select>
            <select name="filter[category_id]" onchange="this.form.submit()" class="px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm">
                <option value="">All Categories</option>
                <?php foreach (\$categories as \$cat): ?>
                <option value="<?= \$cat['id'] ?>" <?= ((string)(\$filters['category_id'] ?? '')) === (string)\$cat['id'] ? 'selected' : '' ?>><?= e(\$cat['name']) ?></option>
                <?php endforeach; ?>
            </select>
        </form>
    </div>

    <!-- Posts Table -->
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <table class="w-full text-sm">
            <thead>
                <tr class="border-b border-gray-200 dark:border-slate-700">
                    <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Post</th>
                    <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Category</th>
                    <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Author</th>
                    <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Status</th>
                    <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Date</th>
                    <th class="py-3 px-4 text-right font-medium text-gray-500 dark:text-slate-400">Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php if (empty(\$items)): ?>
                <tr><td colspan="6" class="py-12 text-center text-gray-400">No posts found</td></tr>
                <?php else: ?>
                <?php foreach (\$items as \$post): ?>
                <tr class="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td class="py-3 px-4">
                        <div class="flex items-center gap-3">
                            <?php if (!empty(\$post['featured_image'])): ?>
                            <img src="<?= upload(\$post['featured_image']) ?>" class="w-12 h-12 rounded-lg object-cover flex-shrink-0" alt="">
                            <?php endif; ?>
                            <div>
                                <a href="<?= url('/blog/' . e(\$post['slug'])) ?>" target="_blank" class="font-medium text-gray-900 dark:text-white hover:text-blue-600"><?= e(str_limit(\$post['title'], 50)) ?></a>
                                <p class="text-xs text-gray-500 dark:text-slate-400 mt-0.5"><?= e(str_limit(strip_tags(\$post['excerpt'] ?? ''), 60)) ?></p>
                            </div>
                        </div>
                    </td>
                    <td class="py-3 px-4"><span class="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded"><?= e(\$post['category_name'] ?? 'Uncategorized') ?></span></td>
                    <td class="py-3 px-4 text-gray-600 dark:text-slate-300"><?= e(\$post['author_name'] ?? 'Unknown') ?></td>
                    <td class="py-3 px-4"><?= admin_status_badge(\$post['status']) ?></td>
                    <td class="py-3 px-4 text-xs text-gray-500"><?= format_date(\$post['published_at'] ?? \$post['created_at']) ?></td>
                    <td class="py-3 px-4 text-right">
                        <div class="flex items-center justify-end gap-1">
                            <a href="<?= url(\$route_prefix . '/' . \$post['id'] . '/edit') ?>" class="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></a>
                            <form method="POST" action="<?= url(\$route_prefix . '/' . \$post['id'] . '/delete') ?>" onsubmit="return confirm('Delete?')" class="inline"><?= \\App\\Core\\CSRF::field() ?><button class="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button></form>
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
    path: 'app/views/admin/blog/create.php', name: 'create.php', language: 'php', module: 'Blog', type: 'view-create',
    description: 'Create blog post with category, tags multi-select, featured image, TinyMCE, scheduled publishing',
    content: `<?php /** Blog Create View */ ?>
<div class="max-w-5xl mx-auto">
    <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Create Blog Post</h1>
    </div>

    <form method="POST" action="<?= url(\$route_prefix) ?>" enctype="multipart/form-data">
        <?= \\App\\Core\\CSRF::field() ?>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 space-y-6">
                <!-- Main -->
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <?= admin_input('title', 'Post Title', 'text', null, ['required', 'placeholder' => 'Enter post title...']) ?>
                    <?= admin_input('slug', 'Slug', 'text', null, ['placeholder' => 'auto-generated-from-title']) ?>
                    <?= admin_textarea('excerpt', 'Excerpt', null, ['rows' => 3, 'placeholder' => 'Brief summary for listings...']) ?>
                    <?= admin_editor('content', 'Content') ?>
                </div>
                <!-- SEO -->
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">SEO</h3>
                    <?= admin_input('meta_title', 'Meta Title', 'text', null, ['placeholder' => 'Override SEO title']) ?>
                    <?= admin_textarea('meta_desc', 'Meta Description', null, ['rows' => 2]) ?>
                </div>
            </div>

            <div class="space-y-6">
                <!-- Publish -->
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Publish</h3>
                    <?= admin_select('status', 'Status', ['draft' => 'Draft', 'published' => 'Published', 'archived' => 'Archived'], 'draft') ?>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Publish Date</label>
                        <input type="datetime-local" name="published_at" value="<?= date('Y-m-d\\TH:i') ?>"
                               class="w-full px-3 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                        <p class="mt-1 text-xs text-gray-500">Leave empty for immediate publish</p>
                    </div>
                </div>

                <!-- Category & Tags -->
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Category & Tags</h3>
                    <?= admin_select('category_id', 'Category', array_column(\$categories ?? [], 'name', 'id'), null, ['placeholder' => 'Select category...']) ?>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Tags</label>
                        <div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
                            <?php foreach (\$tags ?? [] as \$tag): ?>
                            <label class="inline-flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-600 rounded-md text-xs cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-200 dark:border-slate-500">
                                <input type="checkbox" name="tags[]" value="<?= \$tag['id'] ?>" class="rounded text-blue-600">
                                <?= e(\$tag['name']) ?>
                            </label>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </div>

                <!-- Featured Image -->
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Featured Image</h3>
                    <?= admin_file('featured_image', 'Upload Image', null, ['accept' => 'image/*']) ?>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-3">
                    <a href="<?= url(\$route_prefix) ?>" class="flex-1 px-4 py-2.5 text-center text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 rounded-lg">Cancel</a>
                    <button type="submit" class="flex-1 px-4 py-2.5 text-center text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500">Create Post</button>
                </div>
            </div>
        </div>
    </form>
</div>
`
  },
  {
    path: 'app/views/admin/blog/edit.php', name: 'edit.php', language: 'php', module: 'Blog', type: 'view-edit',
    description: 'Edit blog post with all fields pre-filled',
    content: `<?php /** Blog Edit View */ ?>
<div class="max-w-5xl mx-auto">
    <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Edit Post</h1>
        <p class="text-sm text-gray-500 mt-1"><?= e(\$item['title'] ?? '') ?></p>
    </div>
    <form method="POST" action="<?= url(\$route_prefix . '/' . \$item['id']) ?>" enctype="multipart/form-data">
        <?= \\App\\Core\\CSRF::field() ?>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 space-y-6">
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <?= admin_input('title', 'Post Title', 'text', \$item['title'] ?? '', ['required']) ?>
                    <?= admin_input('slug', 'Slug', 'text', \$item['slug'] ?? '') ?>
                    <?= admin_textarea('excerpt', 'Excerpt', \$item['excerpt'] ?? '', ['rows' => 3]) ?>
                    <?= admin_editor('content', 'Content', \$item['content'] ?? '') ?>
                </div>
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">SEO</h3>
                    <?= admin_input('meta_title', 'Meta Title', 'text', \$item['meta_title'] ?? '') ?>
                    <?= admin_textarea('meta_desc', 'Meta Description', \$item['meta_desc'] ?? '', ['rows' => 2]) ?>
                </div>
            </div>
            <div class="space-y-6">
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <?= admin_select('status', 'Status', ['draft' => 'Draft', 'published' => 'Published', 'archived' => 'Archived'], \$item['status'] ?? 'draft') ?>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Publish Date</label>
                        <input type="datetime-local" name="published_at" value="<?= \$item['published_at'] ? date('Y-m-d\\TH:i', strtotime(\$item['published_at'])) : '' ?>"
                               class="w-full px-3 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                    </div>
                </div>
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <?= admin_select('category_id', 'Category', array_column(\$categories ?? [], 'name', 'id'), \$item['category_id'] ?? '') ?>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Tags</label>
                        <div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
                            <?php foreach (\$tags ?? [] as \$tag): ?>
                            <label class="inline-flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-600 rounded-md text-xs cursor-pointer border border-gray-200 dark:border-slate-500">
                                <input type="checkbox" name="tags[]" value="<?= \$tag['id'] ?>" <?= in_array(\$tag['id'], \$postTagIds ?? []) ? 'checked' : '' ?> class="rounded text-blue-600">
                                <?= e(\$tag['name']) ?>
                            </label>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </div>
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <?= admin_file('featured_image', 'Featured Image', \$item['featured_image'] ?? null, ['accept' => 'image/*']) ?>
                </div>
                <div class="flex items-center gap-3">
                    <a href="<?= url(\$route_prefix) ?>" class="flex-1 px-4 py-2.5 text-center text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 rounded-lg">Cancel</a>
                    <button type="submit" class="flex-1 px-4 py-2.5 text-center text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500">Update Post</button>
                </div>
            </div>
        </div>
    </form>
</div>
`
  },
  // ==================== BLOG CATEGORIES & TAGS ====================
  {
    path: 'app/controllers/admin/BlogCategoryController.php', name: 'BlogCategoryController.php', language: 'php', module: 'Blog Categories', type: 'controller',
    description: 'Simple CRUD for blog categories',
    content: `<?php
declare(strict_types=1);
namespace App\\Controllers\\Admin;
use App\\Core\\AdminController;

class BlogCategoryController extends AdminController
{
    protected string \$modelClass = \\App\\Core\\Model::class;
    protected string \$viewPrefix = 'admin.blog-categories';
    protected string \$routePrefix = '/admin/blog-categories';
    protected string \$pageTitle = 'Blog Categories';
    protected string \$searchColumns = 'name,slug';
    protected array \$validationRules = [
        'name' => 'required|min:2|max:100',
        'slug' => 'nullable|slug|max:100',
        'description' => 'nullable|max:500',
    ];

    protected function model(): \\App\\Core\\Model
    {
        \$m = new class extends \\App\\Core\\Model {
            protected string \$table = 'blog_categories';
            protected array \$fillable = ['name', 'slug', 'description', 'parent_id', 'sort_order'];
        };
        return \$m;
    }
}
`
  },
  {
    path: 'app/views/admin/blog-categories/index.php', name: 'index.php', language: 'php', module: 'Blog Categories', type: 'view-index',
    description: 'Blog categories list view',
    content: `<?php /** Blog Categories Index */ ?>
<div class="space-y-6">
    <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Blog Categories</h1>
        <button onclick="document.getElementById('create-modal').showModal()" class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Add Category
        </button>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <table class="w-full text-sm">
            <thead><tr class="border-b border-gray-200 dark:border-slate-700">
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Name</th>
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Slug</th>
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Posts</th>
                <th class="py-3 px-4 text-right font-medium text-gray-500 dark:text-slate-400">Actions</th>
            </tr></thead>
            <tbody>
                <?php foreach (\$items ?? [] as \$item): ?>
                <tr class="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td class="py-3 px-4 font-medium text-gray-900 dark:text-white"><?= e(\$item['name']) ?></td>
                    <td class="py-3 px-4 text-gray-500 dark:text-slate-400 font-mono text-xs">/<?= e(\$item['slug']) ?></td>
                    <td class="py-3 px-4 text-gray-500"><?= \$item['post_count'] ?? 0 ?></td>
                    <td class="py-3 px-4 text-right">
                        <form method="POST" action="<?= url(\$route_prefix . '/' . \$item['id'] . '/delete') ?>" onsubmit="return confirm('Delete?')" class="inline"><?= \\App\\Core\\CSRF::field() ?>
                        <button class="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button></form>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<!-- Create Modal -->
<dialog id="create-modal" class="backdrop:bg-black/50 rounded-xl p-0 max-w-md w-full">
    <form method="POST" action="<?= url(\$route_prefix) ?>" class="p-6">
        <?= \\App\\Core\\CSRF::field() ?>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Category</h2>
        <?= admin_input('name', 'Name', 'text', null, ['required', 'placeholder' => 'Category name']) ?>
        <?= admin_input('slug', 'Slug', 'text', null, ['placeholder' => 'auto-generated']) ?>
        <?= admin_textarea('description', 'Description', null, ['rows' => 2]) ?>
        <div class="flex justify-end gap-3 mt-4">
            <button type="button" onclick="document.getElementById('create-modal').close()" class="px-4 py-2 text-sm text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 rounded-lg">Cancel</button>
            <button type="submit" class="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-500">Create</button>
        </div>
    </form>
</dialog>
`
  },
  // ==================== COMMENTS MODULE ====================
  {
    path: 'app/controllers/admin/CommentController.php', name: 'CommentController.php', language: 'php', module: 'Comments', type: 'controller',
    description: 'Comments management: list, approve/reject/spam, reply, delete',
    content: `<?php
declare(strict_types=1);
namespace App\\Controllers\\Admin;
use App\\Core\\Controller;
use App\\Core\\Database;

class CommentController extends Controller
{
    protected string \$layout = 'admin.main';

    public function index(): void
    {
        \$db = Database::getInstance();
        \$status = \$_GET['status'] ?? '';
        \$where = '1=1';
        \$params = [];

        if (\$status) {
            \$where .= ' AND c.status = ?';
            \$params[] = \$status;
        }

        \$comments = \$db->fetchAll(
            "SELECT c.*, p.title as post_title
             FROM blog_comments c
             LEFT JOIN blog_posts p ON c.post_id = p.id
             WHERE {\$where} ORDER BY c.created_at DESC LIMIT 50",
            \$params
        );

        \$counts = [
            'all' => (int) \$db->fetchColumn("SELECT COUNT(*) FROM blog_comments"),
            'pending' => (int) \$db->fetchColumn("SELECT COUNT(*) FROM blog_comments WHERE status = 'pending'"),
            'approved' => (int) \$db->fetchColumn("SELECT COUNT(*) FROM blog_comments WHERE status = 'approved'"),
            'spam' => (int) \$db->fetchColumn("SELECT COUNT(*) FROM blog_comments WHERE status = 'spam'"),
        ];

        \$this->view('admin.comments.index', [
            'page_title' => 'Comments',
            'breadcrumbs' => [['label' => 'Comments', 'url' => null]],
            'comments' => \$comments, 'counts' => \$counts, 'current_status' => \$status,
        ]);
    }

    public function approve(string \$id): void
    {
        if (!\$this->validateCsrf()) return;
        Database::getInstance()->update('blog_comments', ['status' => 'approved'], 'id = ?', [\$id]);
        flash('success', 'Comment approved.');
        \$this->redirectBack();
    }

    public function reject(string \$id): void
    {
        if (!\$this->validateCsrf()) return;
        Database::getInstance()->update('blog_comments', ['status' => 'spam'], 'id = ?', [\$id]);
        flash('success', 'Comment marked as spam.');
        \$this->redirectBack();
    }

    public function destroy(string \$id): void
    {
        if (!\$this->validateCsrf()) return;
        Database::getInstance()->delete('blog_comments', 'id = ?', [\$id]);
        flash('success', 'Comment deleted.');
        \$this->redirectBack();
    }
}
`
  },
  {
    path: 'app/views/admin/comments/index.php', name: 'index.php', language: 'php', module: 'Comments', type: 'view-index',
    description: 'Comments list with approve/reject/spam actions and status filter tabs',
    content: `<?php /** Comments Index */ ?>
<div class="space-y-6">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Comments</h1>

    <!-- Status Tabs -->
    <div class="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-1">
        <a href="<?= url('/admin/comments') ?>" class="px-4 py-2 rounded-lg text-sm font-medium <?= !\$current_status ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400' ?>">
            All (<?= \$counts['all'] ?>)
        </a>
        <a href="<?= url('/admin/comments?status=pending') ?>" class="px-4 py-2 rounded-lg text-sm font-medium <?= \$current_status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400' ?>">
            Pending (<?= \$counts['pending'] ?>)
        </a>
        <a href="<?= url('/admin/comments?status=approved') ?>" class="px-4 py-2 rounded-lg text-sm font-medium <?= \$current_status === 'approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400' ?>">
            Approved (<?= \$counts['approved'] ?>)
        </a>
        <a href="<?= url('/admin/comments?status=spam') ?>" class="px-4 py-2 rounded-lg text-sm font-medium <?= \$current_status === 'spam' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400' ?>">
            Spam (<?= \$counts['spam'] ?>)
        </a>
    </div>

    <!-- Comments List -->
    <div class="space-y-3">
        <?php if (empty(\$comments)): ?>
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-12 text-center text-gray-400">No comments found</div>
        <?php else: ?>
        <?php foreach (\$comments as \$comment): ?>
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
            <div class="flex items-start justify-between gap-4">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="font-medium text-gray-900 dark:text-white"><?= e(\$comment['name']) ?></span>
                        <span class="text-xs text-gray-500"><?= e(\$comment['email']) ?></span>
                        <?= admin_status_badge(\$comment['status']) ?>
                    </div>
                    <p class="text-sm text-gray-600 dark:text-slate-300 mb-2"><?= e(\$comment['message']) ?></p>
                    <div class="flex items-center gap-3 text-xs text-gray-400">
                        <span>On: <a href="<?= url('/blog/' . (\$comment['post_slug'] ?? '')) ?>" class="text-blue-500 hover:underline"><?= e(\$comment['post_title'] ?? 'Unknown post') ?></a></span>
                        <span><?= time_ago(\$comment['created_at']) ?></span>
                        <span>IP: <?= e(\$comment['ip'] ?? '') ?></span>
                    </div>
                </div>
                <div class="flex items-center gap-1 flex-shrink-0">
                    <?php if (\$comment['status'] !== 'approved'): ?>
                    <form method="POST" action="<?= url('/admin/comments/' . \$comment['id'] . '/approve') ?>" class="inline"><?= \\App\\Core\\CSRF::field() ?>
                    <button class="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg" title="Approve"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg></button></form>
                    <?php endif; ?>
                    <?php if (\$comment['status'] !== 'spam'): ?>
                    <form method="POST" action="<?= url('/admin/comments/' . \$comment['id'] . '/reject') ?>" class="inline"><?= \\App\\Core\\CSRF::field() ?>
                    <button class="p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg" title="Mark Spam"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg></button></form>
                    <?php endif; ?>
                    <form method="POST" action="<?= url('/admin/comments/' . \$comment['id'] . '/delete') ?>" onsubmit="return confirm('Delete?')" class="inline"><?= \\App\\Core\\CSRF::field() ?>
                    <button class="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Delete"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button></form>
                </div>
            </div>
        </div>
        <?php endforeach; ?>
        <?php endif; ?>
    </div>
</div>
`
  },
  // ==================== MEDIA LIBRARY MODULE ====================
  {
    path: 'app/controllers/admin/MediaController.php', name: 'MediaController.php', language: 'php', module: 'Media', type: 'controller',
    description: 'Media library: grid view, drag-drop upload, image resize, copy URL, delete',
    content: `<?php
declare(strict_types=1);
namespace App\\Controllers\\Admin;
use App\\Core\\Controller;
use App\\Core\\Database;
use App\\Core\\Auth;

class MediaController extends Controller
{
    protected string \$layout = 'admin.main';

    public function index(): void
    {
        \$db = Database::getInstance();
        \$page = max(1, (int) (\$_GET['page'] ?? 1));
        \$type = \$_GET['type'] ?? '';
        \$search = \$_GET['search'] ?? '';

        \$where = '1=1';
        \$params = [];

        if (\$type) {
            \$where .= ' AND mime LIKE ?';
            \$params[] = \$type . '%';
        }
        if (\$search) {
            \$where .= ' AND (original_name LIKE ? OR alt_text LIKE ?)';
            \$params[] = "%{\$search}%";
            \$params[] = "%{\$search}%";
        }

        \$total = (int) \$db->fetchColumn("SELECT COUNT(*) FROM media WHERE {\$where}", \$params);
        \$perPage = 24;
        \$offset = (\$page - 1) * \$perPage;

        \$items = \$db->fetchAll(
            "SELECT * FROM media WHERE {\$where} ORDER BY created_at DESC LIMIT ? OFFSET ?",
            array_merge(\$params, [\$perPage, \$offset])
        );

        \$this->view('admin.media.index', [
            'page_title' => 'Media Library',
            'breadcrumbs' => [['label' => 'Media Library', 'url' => null]],
            'items' => \$items,
            'total' => \$total,
            'page' => \$page,
            'perPage' => \$perPage,
            'lastPage' => max(1, (int) ceil(\$total / \$perPage)),
            'type' => \$type,
            'search' => \$search,
        ]);
    }

    public function upload(): void
    {
        if (!\$this->validateCsrf()) {
            \$this->json(['error' => 'Invalid token'], 403);
            return;
        }

        \$files = \$_FILES['files'] ?? null;
        if (!\$files || empty(\$files['name'][0])) {
            \$this->json(['error' => 'No files uploaded'], 400);
            return;
        }

        \$db = Database::getInstance();
        \$uploaded = [];

        for (\$i = 0; \$i < count(\$files['name']); \$i++) {
            if (\$files['error'][\$i] !== UPLOAD_ERR_OK) continue;

            \$file = [
                'name' => \$files['name'][\$i],
                'type' => \$files['type'][\$i],
                'tmp_name' => \$files['tmp_name'][\$i],
                'size' => \$files['size'][\$i],
            ];

            // Validate
            \$allowed = array_merge(ALLOWED_IMAGE_TYPES, ALLOWED_DOC_TYPES);
            if (!in_array(\$file['type'], \$allowed)) continue;
            if (\$file['size'] > MAX_UPLOAD_SIZE) continue;

            // Generate path
            \$ext = pathinfo(\$file['name'], PATHINFO_EXTENSION);
            \$filename = uniqid('media_') . '.' . \$ext;
            \$subDir = date('Y/m');
            \$uploadDir = UPLOAD_PATH . '/' . \$subDir;

            if (!is_dir(\$uploadDir)) mkdir(\$uploadDir, 0755, true);

            \$destination = \$uploadDir . '/' . \$filename;

            if (move_uploaded_file(\$file['tmp_name'], \$destination)) {
                // Resize images
                if (str_starts_with(\$file['type'], 'image/') && \$file['type'] !== 'image/svg+xml') {
                    \$this->resizeImage(\$destination, 1920, 1920);
                }

                // Get dimensions for images
                \$width = \$height = null;
                if (str_starts_with(\$file['type'], 'image/') && \$file['type'] !== 'image/svg+xml') {
                    [\$width, \$height] = @getimagesize(\$destination) ?: [null, null];
                }

                \$id = \$db->insert('media', [
                    'filename' => \$filename,
                    'original_name' => \$file['name'],
                    'path' => \$subDir . '/' . \$filename,
                    'mime' => \$file['type'],
                    'size' => \$file['size'],
                    'width' => \$width,
                    'height' => \$height,
                    'uploaded_by' => Auth::id(),
                    'created_at' => date('Y-m-d H:i:s'),
                ]);

                \$uploaded[] = [
                    'id' => \$id,
                    'url' => upload(\$subDir . '/' . \$filename),
                    'name' => \$file['name'],
                    'mime' => \$file['type'],
                    'size' => \$file['size'],
                ];
            }
        }

        // Handle AJAX vs regular
        if ((\$_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'XMLHttpRequest') {
            \$this->json(['success' => true, 'files' => \$uploaded]);
        } else {
            flash('success', count(\$uploaded) . ' file(s) uploaded successfully!');
            \$this->redirect(url('/admin/media'));
        }
    }

    public function destroy(string \$id): void
    {
        if (!\$this->validateCsrf()) return;
        \$db = Database::getInstance();
        \$media = \$db->fetch("SELECT * FROM media WHERE id = ?", [\$id]);

        if (\$media) {
            // Delete physical file
            \$filePath = UPLOAD_PATH . '/' . \$media['path'];
            if (file_exists(\$filePath)) {
                @unlink(\$filePath);
            }
            \$db->delete('media', 'id = ?', [\$id]);
        }

        if ((\$_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'XMLHttpRequest') {
            \$this->json(['success' => true]);
        } else {
            flash('success', 'File deleted.');
            \$this->redirect(url('/admin/media'));
        }
    }

    /**
     * Resize image using GD library
     */
    private function resizeImage(string \$path, int \$maxWidth, int \$maxHeight): void
    {
        [\$origWidth, \$origHeight, \$type] = @getimagesize(\$path);
        if (!\$origWidth || !\$origHeight) return;

        if (\$origWidth <= \$maxWidth && \$origHeight <= \$maxHeight) return;

        \$ratio = min(\$maxWidth / \$origWidth, \$maxHeight / \$origHeight);
        \$newWidth = (int) round(\$origWidth * \$ratio);
        \$newHeight = (int) round(\$origHeight * \$ratio);

        \$src = match(\$type) {
            IMAGETYPE_JPEG => @imagecreatefromjpeg(\$path),
            IMAGETYPE_PNG => @imagecreatefrompng(\$path),
            IMAGETYPE_GIF => @imagecreatefromgif(\$path),
            IMAGETYPE_WEBP => @imagecreatefromwebp(\$path),
            default => null,
        };

        if (!\$src) return;

        \$dst = imagecreatetruecolor(\$newWidth, \$newHeight);

        // Preserve transparency for PNG/GIF/WebP
        if (\$type === IMAGETYPE_PNG || \$type === IMAGETYPE_WEBP) {
            imagealphablending(\$dst, false);
            imagesavealpha(\$dst, true);
        }

        imagecopyresampled(\$dst, \$src, 0, 0, 0, 0, \$newWidth, \$newHeight, \$origWidth, \$origHeight);

        match(\$type) {
            IMAGETYPE_JPEG => imagejpeg(\$dst, \$path, 85),
            IMAGETYPE_PNG => imagepng(\$dst, \$path, 8),
            IMAGETYPE_GIF => imagegif(\$dst, \$path),
            IMAGETYPE_WEBP => imagewebp(\$dst, \$path, 85),
            default => null,
        };

        imagedestroy(\$src);
        imagedestroy(\$dst);
    }
}
`
  },
  {
    path: 'app/views/admin/media/index.php', name: 'index.php', language: 'php', module: 'Media', type: 'view-index',
    description: 'Media library grid view with drag-drop upload, copy URL, delete',
    content: `<?php /** Media Library Index */ ?>
<div class="space-y-6" x-data="{ uploading: false, progress: 0 }">
    <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Media Library</h1>
        <span class="text-sm text-gray-500 dark:text-slate-400"><?= \$total ?> files</span>
    </div>

    <!-- Upload Area -->
    <form method="POST" action="<?= url('/admin/media/upload') ?>" enctype="multipart/form-data"
          x-data="{ dragOver: false }"
          @dragover.prevent="dragOver = true" @dragleave.prevent="dragOver = false"
          @drop.prevent="dragOver = false; \\$refs.fileInput.files = \\$event.dataTransfer.files; \\$refs.fileInput.dispatchEvent(new Event('change'))">
        <?= \\App\\Core\\CSRF::field() ?>
        <div :class="dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-slate-600'"
             class="border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer"
             @click="\\$refs.fileInput.click()">
            <input type="file" name="files[]" multiple accept="image/*,application/pdf,.zip" ref="fileInput" class="hidden"
                   @change="if(\\$event.target.files.length) \\$el.closest('form').submit()">
            <svg class="w-10 h-10 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
            <p class="text-sm text-gray-600 dark:text-slate-300 font-medium">Drag & drop files here, or click to browse</p>
            <p class="text-xs text-gray-400 mt-1">Images, PDFs, ZIP files • Max <?= MAX_UPLOAD_SIZE / 1024 / 1024 ?>MB per file</p>
        </div>
    </form>

    <!-- Filters -->
    <div class="flex items-center gap-3">
        <form method="GET" class="flex items-center gap-2 flex-1">
            <input type="text" name="search" value="<?= e(\$search) ?>" placeholder="Search files..."
                   class="flex-1 max-w-xs px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
            <select name="type" onchange="this.form.submit()" class="px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm">
                <option value="">All Types</option>
                <option value="image" <?= \$type === 'image' ? 'selected' : '' ?>>Images</option>
                <option value="application/pdf" <?= \$type === 'application/pdf' ? 'selected' : '' ?>>PDFs</option>
            </select>
        </form>
    </div>

    <!-- Media Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <?php foreach (\$items as \$media): ?>
        <div class="group relative bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow"
             x-data="{ copied: false }">
            <div class="aspect-square bg-gray-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                <?php if (str_starts_with(\$media['mime'], 'image/')): ?>
                <img src="<?= upload(\$media['path']) ?>" alt="<?= e(\$media['alt_text'] ?? \$media['original_name']) ?>"
                     class="w-full h-full object-cover group-hover:scale-105 transition-transform">
                <?php else: ?>
                <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <?php endif; ?>
            </div>
            <!-- Overlay Actions -->
            <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button @click="navigator.clipboard.writeText('<?= upload(\$media['path']) ?>'); copied = true; setTimeout(() => copied = false, 2000)"
                        class="p-2 bg-white/90 rounded-lg text-gray-700 hover:bg-white" title="Copy URL">
                    <svg x-show="!copied" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                    <svg x-show="copied" class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                </button>
                <form method="POST" action="<?= url('/admin/media/' . \$media['id'] . '/delete') ?>" onsubmit="return confirm('Delete?')">
                    <?= \\App\\Core\\CSRF::field() ?>
                    <button class="p-2 bg-white/90 rounded-lg text-red-600 hover:bg-white" title="Delete">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </form>
            </div>
            <div class="p-2">
                <p class="text-xs text-gray-600 dark:text-slate-300 truncate" title="<?= e(\$media['original_name']) ?>"><?= e(\$media['original_name']) ?></p>
                <p class="text-xs text-gray-400"><?= number_format(\$media['size'] / 1024, 1) ?> KB</p>
            </div>
        </div>
        <?php endforeach; ?>
    </div>

    <?php if (empty(\$items)): ?>
    <div class="text-center py-12 text-gray-400">No media files found</div>
    <?php endif; ?>
</div>
`
  },
];
