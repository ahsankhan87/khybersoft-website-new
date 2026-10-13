export interface CrudFile {
  path: string;
  name: string;
  language: string;
  content: string;
  description: string;
  module: string;
  type: 'controller' | 'model' | 'view-index' | 'view-create' | 'view-edit' | 'base';
}

export const crudBaseFiles: CrudFile[] = [
  {
    path: 'app/core/AdminController.php',
    name: 'AdminController.php',
    language: 'php',
    module: 'Core',
    type: 'base',
    description: 'Base admin CRUD controller with reusable index/create/store/edit/update/destroy/bulk methods',
    content: `<?php
declare(strict_types=1);

namespace App\\Core;

/**
 * AdminController - Base CRUD controller for all admin modules
 * Provides reusable methods: index, create, store, edit, update, destroy, bulk actions
 * All admin controllers extend this class
 */
abstract class AdminController extends Controller
{
    protected string \$layout = 'admin.main';
    protected string \$modelClass = '';
    protected string \$viewPrefix = '';
    protected string \$routePrefix = '';
    protected string \$pageTitle = '';
    protected string \$searchColumns = '';
    protected array \$filterable = [];
    protected array \$sortable = ['created_at' => 'desc'];
    protected int \$perPage = ADMIN_PER_PAGE;
    protected array \$validationRules = [];
    protected array \$validationMessages = [];

    /**
     * Get model instance
     */
    protected function model(): Model
    {
        return new \$this->modelClass();
    }

    /**
     * List all records with pagination, search, filters, sorting
     */
    public function index(): void
    {
        \$page = max(1, (int) (\$_GET['page'] ?? 1));
        \$search = trim(\$_GET['search'] ?? '');
        \$sort = \$_GET['sort'] ?? 'created_at';
        \$direction = \$_GET['dir'] ?? 'desc';
        \$filters = \$_GET['filter'] ?? [];

        // Build WHERE clause
        \$where = '1=1';
        \$params = [];

        // Search
        if (\$search && \$this->searchColumns) {
            \$searchCols = explode(',', \$this->searchColumns);
            \$searchConditions = [];
            foreach (\$searchCols as \$col) {
                \$col = trim(\$col);
                \$searchConditions[] = "\`{\$col}\` LIKE ?";
                \$params[] = "%{\$search}%";
            }
            \$where .= ' AND (' . implode(' OR ', \$searchConditions) . ')';
        }

        // Filters
        foreach (\$this->filterable as \$filterCol) {
            if (!empty(\$filters[\$filterCol])) {
                \$where .= " AND \`{\$filterCol}\` = ?";
                \$params[] = \$filters[\$filterCol];
            }
        }

        // Sorting
        \$allowedSorts = array_keys(\$this->sortable);
        if (!in_array(\$sort, \$allowedSorts)) {
            \$sort = 'created_at';
        }
        \$direction = strtolower(\$direction) === 'asc' ? 'ASC' : 'DESC';
        \$orderBy = "\`{\$sort}\` {\$direction}";

        // Paginate
        \$result = \$this->model()->paginate(\$page, \$this->perPage, \$where, \$params, \$orderBy);

        \$this->view(\$this->viewPrefix . '.index', [
            'page_title' => \$this->pageTitle,
            'breadcrumbs' => [
                ['label' => \$this->pageTitle, 'url' => null],
            ],
            'items' => \$result['data'],
            'pagination' => \$result,
            'search' => \$search,
            'sort' => \$sort,
            'direction' => \$direction,
            'filters' => \$filters,
            'route_prefix' => \$this->routePrefix,
        ]);
    }

    /**
     * Show create form
     */
    public function create(): void
    {
        \$this->view(\$this->viewPrefix . '.create', [
            'page_title' => 'Create ' . \$this->pageTitle,
            'breadcrumbs' => [
                ['label' => \$this->pageTitle, 'url' => url(\$this->routePrefix)],
                ['label' => 'Create', 'url' => null],
            ],
            'item' => [],
            'route_prefix' => \$this->routePrefix,
        ]);
    }

    /**
     * Store new record
     */
    public function store(): void
    {
        if (!\$this->validateCsrf()) return;

        // Validate
        \$validator = Validator::make(\$_POST, \$this->validationRules, \$this->validationMessages);
        if (!\$validator->validate()) {
            flash_input();
            flash('errors', json_encode(\$validator->errors()));
            flash('error', 'Please fix the validation errors below.');
            \$this->redirect(url(\$this->routePrefix . '/create'));
            return;
        }

        // Prepare data
        \$data = \$this->prepareData(\$_POST);

        // Auto-generate slug if needed
        if (isset(\$data['name']) && !isset(\$data['slug'])) {
            \$data['slug'] = slugify(\$data['name']);
        }

        // Handle file uploads
        \$data = \$this->handleUploads(\$data);

        // Create
        \$id = \$this->model()->create(\$data);

        // Log activity
        \$this->logActivity('create', \$this->pageTitle, \$id, null, \$data);

        clear_old_input();
        flash('success', ucfirst(\$this->pageTitle) . ' created successfully!');
        \$this->redirect(url(\$this->routePrefix));
    }

    /**
     * Show edit form
     */
    public function edit(string \$id): void
    {
        \$item = \$this->model()->findOrFail((int) \$id);

        \$this->view(\$this->viewPrefix . '.edit', [
            'page_title' => 'Edit ' . \$this->pageTitle,
            'breadcrumbs' => [
                ['label' => \$this->pageTitle, 'url' => url(\$this->routePrefix)],
                ['label' => 'Edit', 'url' => null],
            ],
            'item' => \$item,
            'route_prefix' => \$this->routePrefix,
        ]);
    }

    /**
     * Update record
     */
    public function update(string \$id): void
    {
        if (!\$this->validateCsrf()) return;

        \$model = \$this->model();
        \$oldData = \$model->findOrFail((int) \$id);

        // Validate
        \$rules = \$this->validationRules;
        // Make slug unique except current record
        foreach (\$rules as \$field => \$rule) {
            if (str_contains(\$rule, 'unique:')) {
                \$rules[\$field] = str_replace(
                    'unique:',
                    'unique:' . \$model->getTable() . ',' . \$field . ',' . \$id . ':',
                    \$rule
                );
            }
        }

        \$validator = Validator::make(\$_POST, \$rules, \$this->validationMessages);
        if (!\$validator->validate()) {
            flash_input();
            flash('errors', json_encode(\$validator->errors()));
            flash('error', 'Please fix the validation errors below.');
            \$this->redirect(url(\$this->routePrefix . '/' . \$id . '/edit'));
            return;
        }

        // Prepare data
        \$data = \$this->prepareData(\$_POST);

        // Auto-regenerate slug if name changed
        if (isset(\$data['name']) && !isset(\$data['slug']) && \$data['name'] !== (\$oldData['name'] ?? '')) {
            \$data['slug'] = slugify(\$data['name']);
        }

        // Handle file uploads
        \$data = \$this->handleUploads(\$data);

        // Update
        \$model->update((int) \$id, \$data);

        // Log activity
        \$this->logActivity('update', \$this->pageTitle, (int) \$id, \$oldData, \$data);

        clear_old_input();
        flash('success', ucfirst(\$this->pageTitle) . ' updated successfully!');
        \$this->redirect(url(\$this->routePrefix));
    }

    /**
     * Soft delete record
     */
    public function destroy(string \$id): void
    {
        if (!\$this->validateCsrf()) return;

        \$model = \$this->model();
        \$oldData = \$model->find((int) \$id);

        if (!\$oldData) {
            flash('error', 'Record not found.');
            \$this->redirect(url(\$this->routePrefix));
            return;
        }

        \$model->delete((int) \$id);

        // Log activity
        \$this->logActivity('delete', \$this->pageTitle, (int) \$id, \$oldData, null);

        flash('success', ucfirst(\$this->pageTitle) . ' deleted successfully!');
        \$this->redirect(url(\$this->routePrefix));
    }

    /**
     * Bulk actions (delete, publish, unpublish)
     */
    public function bulkAction(): void
    {
        if (!\$this->validateCsrf()) return;

        \$action = \$this->input('bulk_action');
        \$ids = \$_POST['ids'] ?? [];

        if (empty(\$ids) || !is_array(\$ids)) {
            flash('error', 'Please select at least one item.');
            \$this->redirect(url(\$this->routePrefix));
            return;
        }

        \$model = \$this->model();
        \$count = 0;

        foreach (\$ids as \$id) {
            \$id = (int) \$id;
            switch (\$action) {
                case 'delete':
                    if (\$model->delete(\$id)) \$count++;
                    break;
                case 'publish':
                    if (\$model->update(\$id, ['status' => 'published'])) \$count++;
                    break;
                case 'unpublish':
                    if (\$model->update(\$id, ['status' => 'draft'])) \$count++;
                    break;
                case 'activate':
                    if (\$model->update(\$id, ['status' => 'active'])) \$count++;
                    break;
                case 'deactivate':
                    if (\$model->update(\$id, ['status' => 'inactive'])) \$count++;
                    break;
            }
        }

        \$this->logActivity('bulk_' . \$action, \$this->pageTitle, null, null, ['ids' => \$ids, 'count' => \$count]);

        flash('success', "{\$count} item(s) {\$action}d successfully!");
        \$this->redirect(url(\$this->routePrefix));
    }

    /**
     * Prepare data before save - override in child controllers
     */
    protected function prepareData(array \$data): array
    {
        // Remove CSRF token and _method
        unset(\$data['_token'], \$data['_method']);

        // Handle JSON fields
        foreach (\$data as \$key => \$value) {
            if (is_array(\$value)) {
                \$data[\$key] = json_encode(\$value);
            }
        }

        // Handle checkboxes (unchecked = 0)
        foreach (['is_featured', 'status'] as \$boolField) {
            if (!isset(\$data[\$boolField]) && in_array(\$boolField, array_keys(\$this->validationRules) ?: [])) {
                \$data[\$boolField] = 0;
            }
        }

        return \$data;
    }

    /**
     * Handle file uploads
     */
    protected function handleUploads(array \$data): array
    {
        \$uploadFields = \$this->getUploadFields();

        foreach (\$uploadFields as \$field) {
            if (isset(\$_FILES[\$field]) && \$_FILES[\$field]['error'] === UPLOAD_ERR_OK) {
                \$file = \$_FILES[\$field];
                \$path = \$this->uploadFile(\$file, \$field);
                if (\$path) {
                    \$data[\$field] = \$path;
                }
            }
        }

        return \$data;
    }

    /**
     * Upload a single file
     */
    protected function uploadFile(array \$file, string \$field): ?string
    {
        \$allowedTypes = array_merge(ALLOWED_IMAGE_TYPES, ALLOWED_DOC_TYPES);
        \$mime = \$file['type'];

        if (!in_array(\$mime, \$allowedTypes)) {
            flash('error', "Invalid file type for {\$field}.");
            return null;
        }

        if (\$file['size'] > MAX_UPLOAD_SIZE) {
            flash('error', "File too large for {\$field}. Max " . (MAX_UPLOAD_SIZE / 1024 / 1024) . "MB.");
            return null;
        }

        // Generate unique filename
        \$ext = pathinfo(\$file['name'], PATHINFO_EXTENSION);
        \$filename = uniqid(\$field . '_') . '.' . \$ext;
        \$subDir = date('Y/m');
        \$uploadDir = UPLOAD_PATH . '/' . \$subDir;

        if (!is_dir(\$uploadDir)) {
            mkdir(\$uploadDir, 0755, true);
        }

        \$destination = \$uploadDir . '/' . \$filename;

        if (move_uploaded_file(\$file['tmp_name'], \$destination)) {
            // Save to media table
            \$db = Database::getInstance();
            \$db->insert('media', [
                'filename' => \$filename,
                'original_name' => \$file['name'],
                'path' => \$subDir . '/' . \$filename,
                'mime' => \$mime,
                'size' => \$file['size'],
                'uploaded_by' => Auth::id(),
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            return \$subDir . '/' . \$filename;
        }

        return null;
    }

    /**
     * Get upload fields - override in child controllers
     */
    protected function getUploadFields(): array
    {
        return [];
    }

    /**
     * Log activity
     */
    protected function logActivity(string \$action, string \$model, ?int \$modelId = null, ?array \$oldValues = null, ?array \$newValues = null): void
    {
        try {
            \$db = Database::getInstance();
            \$db->insert('activity_logs', [
                'user_id' => Auth::id(),
                'action' => \$action,
                'model' => \$model,
                'model_id' => \$modelId,
                'old_values' => \$oldValues ? json_encode(\$oldValues) : null,
                'new_values' => \$newValues ? json_encode(\$newValues) : null,
                'ip' => client_ip(),
                'user_agent' => \$_SERVER['HTTP_USER_AGENT'] ?? '',
                'created_at' => date('Y-m-d H:i:s'),
            ]);
        } catch (\\Throwable \$e) {
            error_log('Activity log failed: ' . \$e->getMessage());
        }
    }

    /**
     * Export data as CSV
     */
    protected function exportCsv(array \$items, array \$columns, string \$filename): void
    {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . \$filename . '"');

        \$output = fopen('php://output', 'w');

        // UTF-8 BOM for Excel
        fprintf(\$output, chr(0xEF) . chr(0xBB) . chr(0xBF));

        // Headers
        fputcsv(\$output, \$columns);

        // Data
        foreach (\$items as \$item) {
            \$row = [];
            foreach (\$columns as \$col) {
                \$row[] = \$item[\$col] ?? '';
            }
            fputcsv(\$output, \$row);
        }

        fclose(\$output);
        exit;
    }
}
`
  },
  {
    path: 'app/views/components/table.php',
    name: 'table.php',
    language: 'php',
    module: 'Components',
    type: 'view-index',
    description: 'Reusable DataTables-style table component with search, sort, filters, bulk actions',
    content: `<?php
/**
 * Reusable Admin Table Component
 * Usage: Include this partial in index views with required variables
 *
 * Required: \$items, \$pagination, \$search, \$sort, \$direction, \$route_prefix, \$columns, \$pageTitle
 * Optional: \$filters, \$filterable, \$bulkActions, \$searchColumns
 */

\$columns = \$columns ?? [];
\$bulkActions = \$bulkActions ?? ['delete' => 'Delete', 'publish' => 'Publish', 'unpublish' => 'Draft'];
\$filterable = \$filterable ?? [];
\$searchColumns = \$searchColumns ?? '';
?>

<div x-data="{
    selectAll: false,
    selected: [],
    search: '<?= e(\$search) ?>',
    init() {
        // Sync checkboxes
        this.\\$watch('selectAll', val => {
            if (val) {
                this.selected = [...document.querySelectorAll('.row-checkbox')].map(cb => cb.value);
            } else {
                this.selected = [];
            }
        });
    }
}">
    <!-- Toolbar -->
    <div class="bg-white dark:bg-slate-800 rounded-t-xl border border-gray-200 dark:border-slate-700 p-4">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <!-- Search -->
            <form method="GET" action="<?= url(\$route_prefix) ?>" class="flex items-center gap-2 flex-1">
                <div class="relative flex-1 max-w-md">
                    <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <input type="text" name="search" value="<?= e(\$search) ?>" placeholder="Search..."
                           class="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                </div>

                <!-- Filters -->
                <?php foreach (\$filterable as \$filter): ?>
                <select name="filter[<?= \$filter ?>]" onchange="this.form.submit()"
                        class="px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm">
                    <option value="">All <?= ucfirst(str_replace('_', ' ', \$filter)) ?></option>
                    <?php
                    \$filterValues = \\App\\Core\\Database::getInstance()->fetchAll(
                        "SELECT DISTINCT \`{\$filter}\` FROM " . (new \$this->modelClass())->getTable() . " WHERE \`{\$filter}\` IS NOT NULL ORDER BY \`{\$filter}\`"
                    );
                    foreach (\$filterValues as \$fv):
                    ?>
                    <option value="<?= e(\$fv[\$filter]) ?>" <?= (\$filters[\$filter] ?? '') === \$fv[\$filter] ? 'selected' : '' ?>>
                        <?= e(ucfirst(\$fv[\$filter])) ?>
                    </option>
                    <?php endforeach; ?>
                </select>
                <?php endforeach; ?>

                <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500">Search</button>
                <?php if (\$search): ?>
                <a href="<?= url(\$route_prefix) ?>" class="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-slate-400">Clear</a>
                <?php endif; ?>
            </form>

            <!-- Actions -->
            <div class="flex items-center gap-2">
                <a href="<?= url(\$route_prefix . '/create') ?>"
                   class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                    Add New
                </a>
            </div>
        </div>

        <!-- Bulk Actions Bar -->
        <div x-show="selected.length > 0" x-cloak
             class="mt-3 flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <span class="text-sm text-blue-700 dark:text-blue-300 font-medium" x-text="selected.length + ' selected'"></span>
            <form method="POST" action="<?= url(\$route_prefix . '/bulk') ?>" class="flex items-center gap-2">
                <?= \\App\\Core\\CSRF::field() ?>
                <template x-for="id in selected" :key="id">
                    <input type="hidden" name="ids[]" :value="id">
                </template>
                <select name="bulk_action" class="px-3 py-1.5 bg-white dark:bg-slate-700 border border-blue-300 dark:border-slate-600 rounded-lg text-sm">
                    <?php foreach (\$bulkActions as \$value => \$label): ?>
                    <option value="<?= \$value ?>"><?= e(\$label) ?></option>
                    <?php endforeach; ?>
                </select>
                <button type="submit" class="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500">Apply</button>
            </form>
        </div>
    </div>

    <!-- Table -->
    <div class="bg-white dark:bg-slate-800 border-x border-gray-200 dark:border-slate-700 overflow-x-auto">
        <table class="w-full text-sm">
            <thead>
                <tr class="border-b border-gray-200 dark:border-slate-700">
                    <th class="py-3 px-4 text-left w-10">
                        <input type="checkbox" x-model="selectAll"
                               class="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500">
                    </th>
                    <?php foreach (\$columns as \$col): ?>
                    <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">
                        <?php if (!empty(\$col['sortable'])): ?>
                        <a href="<?= url(\$route_prefix) ?>?sort=<?= \$col['key'] ?>&dir=<?= (\$sort === \$col['key'] && \$direction === 'ASC') ? 'desc' : 'asc' ?>&search=<?= urlencode(\$search) ?>"
                           class="flex items-center gap-1 hover:text-gray-700 dark:hover:text-white">
                            <?= e(\$col['label']) ?>
                            <?php if (\$sort === \$col['key']): ?>
                            <svg class="w-3 h-3 <?= \$direction === 'ASC' ? '' : 'rotate-180' ?>" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
                            </svg>
                            <?php endif; ?>
                        </a>
                        <?php else: ?>
                        <?= e(\$col['label']) ?>
                        <?php endif; ?>
                    </th>
                    <?php endforeach; ?>
                    <th class="py-3 px-4 text-right font-medium text-gray-500 dark:text-slate-400">Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php if (empty(\$items)): ?>
                <tr>
                    <td colspan="<?= count(\$columns) + 2 ?>" class="py-12 text-center text-gray-400 dark:text-slate-500">
                        <svg class="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                        </svg>
                        No records found
                    </td>
                </tr>
                <?php else: ?>
                <?php foreach (\$items as \$item): ?>
                <tr class="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td class="py-3 px-4">
                        <input type="checkbox" value="<?= \$item['id'] ?>" x-model="selected"
                               class="row-checkbox w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500">
                    </td>
                    <?php foreach (\$columns as \$col): ?>
                    <td class="py-3 px-4">
                        <?php
                        \$value = \$item[\$col['key']] ?? '';
                        if (isset(\$col['render'])) {
                            echo \$col['render'](\$item, \$value);
                        } else {
                            echo '<span class="text-gray-700 dark:text-slate-300">' . e(is_string(\$value) ? str_limit(\$value, 50) : \$value) . '</span>';
                        }
                        ?>
                    </td>
                    <?php endforeach; ?>
                    <td class="py-3 px-4 text-right">
                        <div class="flex items-center justify-end gap-1">
                            <a href="<?= url(\$route_prefix . '/' . \$item['id'] . '/edit') ?>"
                               class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Edit">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </a>
                            <form method="POST" action="<?= url(\$route_prefix . '/' . \$item['id'] . '/delete') ?>"
                                  onsubmit="return confirm('Are you sure you want to delete this item?')" class="inline">
                                <?= \\App\\Core\\CSRF::field() ?>
                                <button type="submit" class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                            </form>
                        </div>
                    </td>
                </tr>
                <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>

    <!-- Pagination -->
    <?php if (\$pagination['last_page'] > 1): ?>
    <div class="bg-white dark:bg-slate-800 rounded-b-xl border border-gray-200 dark:border-slate-700 p-4 flex items-center justify-between">
        <p class="text-sm text-gray-500 dark:text-slate-400">
            Showing <?= \$pagination['from'] ?> to <?= \$pagination['to'] ?> of <?= \$pagination['total'] ?> results
        </p>
        <div class="flex items-center gap-1">
            <?php if (\$pagination['current_page'] > 1): ?>
            <a href="<?= url(\$route_prefix) ?>?page=<?= \$pagination['current_page'] - 1 ?>&search=<?= urlencode(\$search) ?>&sort=<?= \$sort ?>&dir=<?= \$direction ?>"
               class="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600">
                ← Prev
            </a>
            <?php endif; ?>

            <?php
            \$start = max(1, \$pagination['current_page'] - 2);
            \$end = min(\$pagination['last_page'], \$pagination['current_page'] + 2);
            ?>
            <?php for (\$i = \$start; \$i <= \$end; \$i++): ?>
            <a href="<?= url(\$route_prefix) ?>?page=<?= \$i ?>&search=<?= urlencode(\$search) ?>&sort=<?= \$sort ?>&dir=<?= \$direction ?>"
               class="px-3 py-1.5 text-sm rounded-lg <?= \$i === \$pagination['current_page'] ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600' ?>">
                <?= \$i ?>
            </a>
            <?php endfor; ?>

            <?php if (\$pagination['current_page'] < \$pagination['last_page']): ?>
            <a href="<?= url(\$route_prefix) ?>?page=<?= \$pagination['current_page'] + 1 ?>&search=<?= urlencode(\$search) ?>&sort=<?= \$sort ?>&dir=<?= \$direction ?>"
               class="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600">
                Next →
            </a>
            <?php endif; ?>
        </div>
    </div>
    <?php endif; ?>
</div>
`
  },
  {
    path: 'app/views/components/form-fields.php',
    name: 'form-fields.php',
    language: 'php',
    module: 'Components',
    type: 'view-create',
    description: 'Reusable form field components (text, textarea, select, file, toggle, etc.)',
    content: `<?php
/**
 * Reusable Form Field Components
 * Include this file to use helper functions for consistent form fields
 */

/**
 * Text input field
 */
function admin_input(string \$name, string \$label, string \$type = 'text', mixed \$value = null, array \$attrs = []): string
{
    \$val = old(\$name, (string) (\$value ?? ''));
    \$required = in_array('required', \$attrs) ? 'required' : '';
    \$placeholder = \$attrs['placeholder'] ?? '';
    \$id = \$attrs['id'] ?? \$name;
    \$help = \$attrs['help'] ?? '';

    return '
    <div class="mb-4">
        <label for="' . e(\$id) . '" class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">' . e(\$label) . '</label>
        <input type="' . e(\$type) . '" id="' . e(\$id) . '" name="' . e(\$name) . '" value="' . e(\$val) . '"
               placeholder="' . e(\$placeholder) . '" ' . \$required . '
               class="w-full px-3 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors">
        ' . (\$help ? '<p class="mt-1 text-xs text-gray-500 dark:text-slate-400">' . e(\$help) . '</p>' : '') . '
    </div>';
}

/**
 * Textarea field
 */
function admin_textarea(string \$name, string \$label, mixed \$value = null, array \$attrs = []): string
{
    \$val = old(\$name, (string) (\$value ?? ''));
    \$rows = \$attrs['rows'] ?? 4;
    \$required = in_array('required', \$attrs) ? 'required' : '';
    \$id = \$attrs['id'] ?? \$name;

    return '
    <div class="mb-4">
        <label for="' . e(\$id) . '" class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">' . e(\$label) . '</label>
        <textarea id="' . e(\$id) . '" name="' . e(\$name) . '" rows="' . \$rows . '" ' . \$required . '
                  class="w-full px-3 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-y">' . e(\$val) . '</textarea>
    </div>';
}

/**
 * Rich text editor (TinyMCE)
 */
function admin_editor(string \$name, string \$label, mixed \$value = null, array \$attrs = []): string
{
    \$val = old(\$name, (string) (\$value ?? ''));
    \$id = \$attrs['id'] ?? \$name;
    \$height = \$attrs['height'] ?? 400;

    return '
    <div class="mb-4">
        <label for="' . e(\$id) . '" class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">' . e(\$label) . '</label>
        <textarea id="' . e(\$id) . '" name="' . e(\$name) . '" class="tinymce-editor">' . e(\$val) . '</textarea>
    </div>
    <script src="https://cdn.tiny.cloud/1/no-api-key/tinymce/6/tinymce.min.js" referrerpolicy="origin"></script>
    <script>
    tinymce.init({
        selector: "#' . \$id . '",
        height: ' . \$height . ',
        menubar: false,
        plugins: "advlist autolink lists link image charmap preview anchor searchlists visualblocks code fullscreen insertdatetime media table code help wordcount",
        toolbar: "undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media | removeformat code | fullscreen",
        content_style: "body { font-family: Inter, system-ui, sans-serif; font-size: 14px; }",
        images_upload_url: "' . url("admin/media/upload") . '",
        automatic_uploads: true,
        branding: false,
        promotion: false,
    });
    </script>';
}

/**
 * Select field
 */
function admin_select(string \$name, string \$label, array \$options, mixed \$value = null, array \$attrs = []): string
{
    \$val = old(\$name, (string) (\$value ?? ''));
    \$required = in_array('required', \$attrs) ? 'required' : '';
    \$placeholder = \$attrs['placeholder'] ?? 'Select...';
    \$id = \$attrs['id'] ?? \$name;

    \$html = '
    <div class="mb-4">
        <label for="' . e(\$id) . '" class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">' . e(\$label) . '</label>
        <select id="' . e(\$id) . '" name="' . e(\$name) . '" ' . \$required . '
                class="w-full px-3 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors">
            <option value="">' . e(\$placeholder) . '</option>';

    foreach (\$options as \$optVal => \$optLabel) {
        \$selected = ((string) \$optVal === (string) \$val) ? 'selected' : '';
        \$html .= '<option value="' . e((string) \$optVal) . '" ' . \$selected . '>' . e(\$optLabel) . '</option>';
    }

    \$html .= '
        </select>
    </div>';

    return \$html;
}

/**
 * File upload field
 */
function admin_file(string \$name, string \$label, ?string \$currentValue = null, array \$attrs = []): string
{
    \$accept = \$attrs['accept'] ?? 'image/*';
    \$id = \$attrs['id'] ?? \$name;
    \$previewUrl = \$currentValue ? upload(\$currentValue) : '';

    return '
    <div class="mb-4" x-data="{ preview: \'' . e(\$previewUrl) . '\' }">
        <label for="' . e(\$id) . '" class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">' . e(\$label) . '</label>
        <div class="flex items-center gap-4">
            <div x-show="preview" class="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-600 flex-shrink-0">
                <img :src="preview" class="w-full h-full object-cover" alt="Preview">
            </div>
            <div class="flex-1">
                <input type="file" id="' . e(\$id) . '" name="' . e(\$name) . '" accept="' . e(\$accept) . '"
                       @change="preview = URL.createObjectURL(\\$event.target.files[0])"
                       class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-slate-700 dark:file:text-slate-300">
                ' . (\$currentValue ? '<p class="mt-1 text-xs text-gray-500 dark:text-slate-400">Current: ' . e(basename(\$currentValue)) . '</p>' : '') . '
            </div>
        </div>
    </div>';
}

/**
 * Toggle/Switch field
 */
function admin_toggle(string \$name, string \$label, mixed \$value = null, array \$attrs = []): string
{
    \$val = old(\$name, (string) (\$value ?? '0'));
    \$checked = \$val == '1' || \$val === 'on' ? 'checked' : '';

    return '
    <div class="mb-4">
        <label class="flex items-center gap-3 cursor-pointer">
            <input type="hidden" name="' . e(\$name) . '" value="0">
            <input type="checkbox" name="' . e(\$name) . '" value="1" ' . \$checked . '
                   class="w-10 h-5 bg-gray-200 dark:bg-slate-600 rounded-full appearance-none cursor-pointer transition-colors relative
                          checked:bg-blue-600 after:content-[\\'\\'] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform
                          checked:after:translate-x-5">
            <span class="text-sm font-medium text-gray-700 dark:text-slate-300">' . e(\$label) . '</span>
        </label>
    </div>';
}

/**
 * Status badge
 */
function admin_status_badge(string \$status): string
{
    \$colors = [
        'published' => 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        'draft' => 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300',
        'active' => 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        'inactive' => 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300',
        'new' => 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        'in_progress' => 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        'resolved' => 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        'closed' => 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300',
        'pending' => 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        'approved' => 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        'spam' => 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        'banned' => 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    ];

    \$class = \$colors[\$status] ?? 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300';
    return '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ' . \$class . '">' . e(ucfirst(str_replace('_', ' ', \$status))) . '</span>';
}
`
  },
];
