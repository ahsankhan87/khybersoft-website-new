import { CrudFile } from './crudBase';

export const crudSystemFiles: CrudFile[] = [
  // ==================== USERS ====================
  {
    path: 'app/controllers/admin/UserController.php', name: 'UserController.php', language: 'php', module: 'Users', type: 'controller',
    description: 'Users CRUD with role assignment, status, password reset',
    content: `<?php
declare(strict_types=1);
namespace App\\Controllers\\Admin;
use App\\Core\\AdminController;
use App\\Core\\Database;
use App\\Core\\Auth;

class UserController extends AdminController
{
    protected string \$modelClass = \\App\\Models\\User::class;
    protected string \$viewPrefix = 'admin.users';
    protected string \$routePrefix = '/admin/users';
    protected string \$pageTitle = 'Users';
    protected string \$searchColumns = 'name,email';
    protected array \$filterable = ['status', 'role_id'];
    protected array \$validationRules = [
        'name' => 'required|min:2|max:100',
        'email' => 'required|email|max:255',
        'role_id' => 'required|integer',
        'status' => 'required|in:active,inactive,banned',
        'password' => 'nullable|min:8|confirmed',
    ];

    public function create(): void
    {
        \$db = Database::getInstance();
        \$roles = \$db->fetchAll("SELECT id, name FROM roles ORDER BY name");
        \$this->view('admin.users.create', [
            'page_title' => 'Create User',
            'breadcrumbs' => [['label' => 'Users', 'url' => url(\$this->routePrefix)], ['label' => 'Create', 'url' => null]],
            'item' => [], 'roles' => \$roles, 'route_prefix' => \$this->routePrefix,
        ]);
    }

    public function store(): void
    {
        if (!\$this->validateCsrf()) return;
        \$validator = \\App\\Core\\Validator::make(\$_POST, array_merge(\$this->validationRules, ['email' => 'required|email|unique:users,email', 'password' => 'required|min:8|confirmed']));
        if (!\$validator->validate()) {
            flash_input(); flash('errors', json_encode(\$validator->errors()));
            flash('error', 'Please fix the errors.'); \$this->redirect(url(\$this->routePrefix . '/create')); return;
        }
        \$data = \$this->prepareData(\$_POST);
        \$data['password_hash'] = password_hash(\$data['password'], PASSWORD_BCRYPT, ['cost' => 12]);
        unset(\$data['password'], \$data['password_confirmation']);
        \$id = \$this->model()->create(\$data);
        \$this->logActivity('create', 'User', \$id);
        flash('success', 'User created!'); \$this->redirect(url(\$this->routePrefix));
    }

    public function edit(string \$id): void
    {
        \$item = \$this->model()->findOrFail((int) \$id);
        \$db = Database::getInstance();
        \$roles = \$db->fetchAll("SELECT id, name FROM roles ORDER BY name");
        \$this->view('admin.users.edit', [
            'page_title' => 'Edit User',
            'breadcrumbs' => [['label' => 'Users', 'url' => url(\$this->routePrefix)], ['label' => 'Edit', 'url' => null]],
            'item' => \$item, 'roles' => \$roles, 'route_prefix' => \$this->routePrefix,
        ]);
    }

    public function update(string \$id): void
    {
        if (!\$this->validateCsrf()) return;
        \$rules = \$this->validationRules;
        unset(\$rules['password']);
        \$rules['email'] = 'required|email|unique:users,email,' . \$id;
        \$validator = \\App\\Core\\Validator::make(\$_POST, \$rules);
        if (!\$validator->validate()) {
            flash_input(); flash('errors', json_encode(\$validator->errors()));
            \$this->redirect(url(\$this->routePrefix . '/' . \$id . '/edit')); return;
        }
        \$data = \$this->prepareData(\$_POST);
        // Update password if provided
        if (!empty(\$data['password'])) {
            \$data['password_hash'] = password_hash(\$data['password'], PASSWORD_BCRYPT, ['cost' => 12]);
            // Force logout - clear remember token
            \$data['remember_token'] = null;
        }
        unset(\$data['password'], \$data['password_confirmation']);
        \$this->model()->update((int) \$id, \$data);
        \$this->logActivity('update', 'User', (int) \$id);
        flash('success', 'User updated!'); \$this->redirect(url(\$this->routePrefix));
    }
}
`
  },
  {
    path: 'app/views/admin/users/index.php', name: 'index.php', language: 'php', module: 'Users', type: 'view-index',
    description: 'Users list with role badges and status',
    content: `<?php /** Users Index */ ?>
<div class="space-y-6">
    <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
        <a href="<?= url(\$route_prefix . '/create') ?>" class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg> Add User
        </a>
    </div>
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <table class="w-full text-sm">
            <thead><tr class="border-b border-gray-200 dark:border-slate-700">
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">User</th>
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Role</th>
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Status</th>
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Last Login</th>
                <th class="py-3 px-4 text-right font-medium text-gray-500 dark:text-slate-400">Actions</th>
            </tr></thead>
            <tbody>
                <?php foreach (\$items ?? [] as \$user): ?>
                <tr class="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td class="py-3 px-4">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium"><?= strtoupper(substr(\$user['name'], 0, 1)) ?></div>
                            <div><p class="font-medium text-gray-900 dark:text-white"><?= e(\$user['name']) ?></p><p class="text-xs text-gray-500"><?= e(\$user['email']) ?></p></div>
                        </div>
                    </td>
                    <td class="py-3 px-4"><span class="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded"><?= e(\$user['role_name'] ?? 'User') ?></span></td>
                    <td class="py-3 px-4"><?= admin_status_badge(\$user['status']) ?></td>
                    <td class="py-3 px-4 text-xs text-gray-500"><?= \$user['last_login'] ? time_ago(\$user['last_login']) : 'Never' ?></td>
                    <td class="py-3 px-4 text-right">
                        <a href="<?= url(\$route_prefix . '/' . \$user['id'] . '/edit') ?>" class="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></a>
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
    path: 'app/views/admin/users/create.php', name: 'create.php', language: 'php', module: 'Users', type: 'view-create',
    description: 'Create user form with role assignment',
    content: `<?php /** Users Create */ ?>
<div class="max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create User</h1>
    <form method="POST" action="<?= url(\$route_prefix) ?>">
        <?= \\App\\Core\\CSRF::field() ?>
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 space-y-4">
            <?= admin_input('name', 'Full Name', 'text', null, ['required']) ?>
            <?= admin_input('email', 'Email', 'email', null, ['required']) ?>
            <?= admin_select('role_id', 'Role', array_column(\$roles ?? [], 'name', 'id'), null, ['required']) ?>
            <?= admin_select('status', 'Status', ['active' => 'Active', 'inactive' => 'Inactive', 'banned' => 'Banned'], 'active') ?>
            <?= admin_input('password', 'Password', 'password', null, ['required', 'help' => 'Minimum 8 characters']) ?>
            <?= admin_input('password_confirmation', 'Confirm Password', 'password', null, ['required']) ?>
            <div class="flex gap-3 pt-4">
                <a href="<?= url(\$route_prefix) ?>" class="flex-1 px-4 py-2.5 text-center text-sm bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg">Cancel</a>
                <button type="submit" class="flex-1 px-4 py-2.5 text-center text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-500">Create User</button>
            </div>
        </div>
    </form>
</div>
`
  },
  {
    path: 'app/views/admin/users/edit.php', name: 'edit.php', language: 'php', module: 'Users', type: 'view-edit',
    description: 'Edit user with optional password change',
    content: `<?php /** Users Edit */ ?>
<div class="max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Edit User</h1>
    <form method="POST" action="<?= url(\$route_prefix . '/' . \$item['id']) ?>">
        <?= \\App\\Core\\CSRF::field() ?>
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 space-y-4">
            <?= admin_input('name', 'Full Name', 'text', \$item['name'] ?? '', ['required']) ?>
            <?= admin_input('email', 'Email', 'email', \$item['email'] ?? '', ['required']) ?>
            <?= admin_select('role_id', 'Role', array_column(\$roles ?? [], 'name', 'id'), \$item['role_id'] ?? '') ?>
            <?= admin_select('status', 'Status', ['active' => 'Active', 'inactive' => 'Inactive', 'banned' => 'Banned'], \$item['status'] ?? 'active') ?>
            <div class="border-t border-gray-200 dark:border-slate-700 pt-4">
                <p class="text-sm text-gray-500 dark:text-slate-400 mb-3">Leave password fields empty to keep current password</p>
                <?= admin_input('password', 'New Password', 'password', null, ['help' => 'Leave empty to keep current']) ?>
                <?= admin_input('password_confirmation', 'Confirm New Password', 'password') ?>
            </div>
            <div class="flex gap-3 pt-4">
                <a href="<?= url(\$route_prefix) ?>" class="flex-1 px-4 py-2.5 text-center text-sm bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg">Cancel</a>
                <button type="submit" class="flex-1 px-4 py-2.5 text-center text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-500">Update User</button>
            </div>
        </div>
    </form>
</div>
`
  },
  // ==================== ROLES & PERMISSIONS ====================
  {
    path: 'app/controllers/admin/RoleController.php', name: 'RoleController.php', language: 'php', module: 'Roles', type: 'controller',
    description: 'Roles & permissions matrix UI',
    content: `<?php
declare(strict_types=1);
namespace App\\Controllers\\Admin;
use App\\Core\\Controller;
use App\\Core\\Database;

class RoleController extends Controller
{
    protected string \$layout = 'admin.main';

    public function index(): void
    {
        \$db = Database::getInstance();
        \$roles = \$db->fetchAll("SELECT * FROM roles ORDER BY id");
        \$permissions = \$db->fetchAll("SELECT * FROM permissions ORDER BY \`group\`, name");

        // Get role-permission matrix
        \$rolePerms = [];
        foreach (\$roles as \$role) {
            \$perms = \$db->fetchAll("SELECT permission_id FROM role_permissions WHERE role_id = ?", [\$role['id']]);
            \$rolePerms[\$role['id']] = array_column(\$perms, 'permission_id');
        }

        // Group permissions
        \$grouped = [];
        foreach (\$permissions as \$perm) {
            \$grouped[\$perm['group']][] = \$perm;
        }

        \$this->view('admin.roles.index', [
            'page_title' => 'Roles & Permissions',
            'breadcrumbs' => [['label' => 'Roles & Permissions', 'url' => null]],
            'roles' => \$roles, 'permissions' => \$permissions,
            'rolePerms' => \$rolePerms, 'grouped' => \$grouped,
        ]);
    }

    public function store(): void
    {
        if (!\$this->validateCsrf()) return;
        \$db = Database::getInstance();
        \$name = trim(\$_POST['name'] ?? '');
        if (!\$name) { flash('error', 'Role name required.'); \$this->redirectBack(); return; }
        \$id = \$db->insert('roles', ['name' => \$name, 'slug' => slugify(\$name), 'created_at' => date('Y-m-d H:i:s')]);
        flash('success', 'Role created!'); \$this->redirect(url('/admin/roles'));
    }

    public function updatePermissions(string \$id): void
    {
        if (!\$this->validateCsrf()) return;
        \$db = Database::getInstance();
        \$permIds = \$_POST['permissions'] ?? [];
        \$db->delete('role_permissions', 'role_id = ?', [\$id]);
        foreach (\$permIds as \$permId) {
            \$db->insert('role_permissions', ['role_id' => (int) \$id, 'permission_id' => (int) \$permId]);
        }
        flash('success', 'Permissions updated!'); \$this->redirect(url('/admin/roles'));
    }
}
`
  },
  {
    path: 'app/views/admin/roles/index.php', name: 'index.php', language: 'php', module: 'Roles', type: 'view-index',
    description: 'Roles & permissions matrix with checkboxes',
    content: `<?php /** Roles & Permissions Matrix */ ?>
<div class="space-y-6">
    <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Roles & Permissions</h1>
        <button onclick="document.getElementById('add-role-modal').showModal()" class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg> Add Role
        </button>
    </div>

    <!-- Permissions Matrix -->
    <?php foreach (\$roles as \$role): ?>
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div class="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <div>
                <h3 class="font-semibold text-gray-900 dark:text-white"><?= e(\$role['name']) ?></h3>
                <p class="text-xs text-gray-500 font-mono"><?= e(\$role['slug']) ?></p>
            </div>
        </div>
        <form method="POST" action="<?= url('/admin/roles/' . \$role['id'] . '/permissions') ?>">
            <?= \\App\\Core\\CSRF::field() ?>
            <div class="p-4">
                <?php foreach (\$grouped as \$group => \$perms): ?>
                <div class="mb-4">
                    <h4 class="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400 mb-2"><?= e(ucfirst(\$group)) ?></h4>
                    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        <?php foreach (\$perms as \$perm): ?>
                        <label class="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-700/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700">
                            <input type="checkbox" name="permissions[]" value="<?= \$perm['id'] ?>"
                                   <?= in_array(\$perm['id'], \$rolePerms[\$role['id']] ?? []) ? 'checked' : '' ?>
                                   class="rounded text-blue-600 border-gray-300 dark:border-slate-600 focus:ring-blue-500">
                            <span class="text-sm text-gray-700 dark:text-slate-300"><?= e(\$perm['name']) ?></span>
                        </label>
                        <?php endforeach; ?>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
            <div class="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end">
                <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500">Save Permissions</button>
            </div>
        </form>
    </div>
    <?php endforeach; ?>
</div>

<dialog id="add-role-modal" class="backdrop:bg-black/50 rounded-xl p-0 max-w-md w-full">
    <form method="POST" action="<?= url('/admin/roles') ?>" class="p-6">
        <?= \\App\\Core\\CSRF::field() ?>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Role</h2>
        <?= admin_input('name', 'Role Name', 'text', null, ['required', 'placeholder' => 'e.g., Moderator']) ?>
        <div class="flex justify-end gap-3 mt-4">
            <button type="button" onclick="document.getElementById('add-role-modal').close()" class="px-4 py-2 text-sm bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg">Cancel</button>
            <button type="submit" class="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-500">Create</button>
        </div>
    </form>
</dialog>
`
  },
  // ==================== SETTINGS ====================
  {
    path: 'app/controllers/admin/SettingsController.php', name: 'SettingsController.php', language: 'php', module: 'Settings', type: 'controller',
    description: 'Tabbed settings: General, Contact, Social, SEO, Email, Payment, Integrations, Appearance',
    content: `<?php
declare(strict_types=1);
namespace App\\Controllers\\Admin;
use App\\Core\\Controller;
use App\\Core\\Database;

class SettingsController extends Controller
{
    protected string \$layout = 'admin.main';

    public function index(): void
    {
        \$db = Database::getInstance();
        \$settings = \$db->fetchAll("SELECT * FROM settings ORDER BY \`group\`, id");

        // Group settings
        \$grouped = [];
        foreach (\$settings as \$s) {
            \$grouped[\$s['group']][] = \$s;
        }

        \$tabs = [
            'general' => ['label' => 'General', 'icon' => 'settings'],
            'contact' => ['label' => 'Contact', 'icon' => 'mail'],
            'social' => ['label' => 'Social', 'icon' => 'share'],
            'seo' => ['label' => 'SEO', 'icon' => 'search'],
            'mail' => ['label' => 'Email', 'icon' => 'mail'],
            'payment' => ['label' => 'Payment', 'icon' => 'credit-card'],
            'integrations' => ['label' => 'Integrations', 'icon' => 'plug'],
            'appearance' => ['label' => 'Appearance', 'icon' => 'palette'],
        ];

        \$this->view('admin.settings.index', [
            'page_title' => 'Settings',
            'breadcrumbs' => [['label' => 'Settings', 'url' => null]],
            'settings' => \$grouped, 'tabs' => \$tabs,
        ]);
    }

    public function update(): void
    {
        if (!\$this->validateCsrf()) return;
        \$db = Database::getInstance();

        foreach (\$_POST as \$key => \$value) {
            if (\$key === '_token') continue;
            \$db->query(
                "UPDATE settings SET value = ?, updated_at = NOW() WHERE \`key\` = ?",
                [\$value, \$key]
            );
        }

        flash('success', 'Settings saved successfully!');
        \$this->redirect(url('/admin/settings'));
    }
}
`
  },
  {
    path: 'app/views/admin/settings/index.php', name: 'index.php', language: 'php', module: 'Settings', type: 'view-index',
    description: 'Tabbed settings interface with all configuration groups',
    content: `<?php /** Settings Tabbed View */ ?>
<div class="space-y-6" x-data="{ activeTab: 'general' }">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>

    <div class="flex flex-col lg:flex-row gap-6">
        <!-- Tabs Sidebar -->
        <div class="lg:w-56 flex-shrink-0">
            <nav class="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible">
                <?php foreach (\$tabs as \$key => \$tab): ?>
                <button @click="activeTab = '<?= \$key ?>'"
                        :class="activeTab === '<?= \$key ?>' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50'"
                        class="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap border border-transparent transition-colors">
                    <?= e(\$tab['label']) ?>
                </button>
                <?php endforeach; ?>
            </nav>
        </div>

        <!-- Tab Content -->
        <div class="flex-1">
            <form method="POST" action="<?= url('/admin/settings') ?>">
                <?= \\App\\Core\\CSRF::field() ?>

                <?php foreach (\$tabs as \$key => \$tab): ?>
                <div x-show="activeTab === '<?= \$key ?>'" class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4"><?= e(\$tab['label']) ?> Settings</h2>

                    <?php if (!empty(\$settings[\$key])): ?>
                    <div class="space-y-4">
                        <?php foreach (\$settings[\$key] as \$setting): ?>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                                <?= e(\$setting['label'] ?? ucfirst(str_replace('_', ' ', \$setting['key']))) ?>
                            </label>
                            <?php if (\$setting['type'] === 'boolean'): ?>
                            <label class="flex items-center gap-3 cursor-pointer">
                                <input type="hidden" name="<?= e(\$setting['key']) ?>" value="0">
                                <input type="checkbox" name="<?= e(\$setting['key']) ?>" value="1" <?= \$setting['value'] ? 'checked' : '' ?>
                                       class="w-10 h-5 bg-gray-200 dark:bg-slate-600 rounded-full appearance-none cursor-pointer checked:bg-blue-600 relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform checked:after:translate-x-5">
                                <span class="text-sm text-gray-600 dark:text-slate-400"><?= e(\$setting['description'] ?? '') ?></span>
                            </label>
                            <?php elseif (\$setting['type'] === 'json'): ?>
                            <textarea name="<?= e(\$setting['key']) ?>" rows="4"
                                      class="w-full px-3 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500"><?= e(\$setting['value'] ?? '') ?></textarea>
                            <?php else: ?>
                            <input type="<?= \$setting['type'] === 'integer' ? 'number' : 'text' ?>"
                                   name="<?= e(\$setting['key']) ?>" value="<?= e(\$setting['value'] ?? '') ?>"
                                   class="w-full px-3 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                            <?php endif; ?>
                            <?php if (\$setting['description']): ?>
                            <p class="mt-1 text-xs text-gray-500 dark:text-slate-400"><?= e(\$setting['description']) ?></p>
                            <?php endif; ?>
                        </div>
                        <?php endforeach; ?>
                    </div>
                    <?php else: ?>
                    <p class="text-sm text-gray-500 dark:text-slate-400">No settings in this group yet. Add them via the database.</p>
                    <?php endif; ?>
                </div>
                <?php endforeach; ?>

                <div class="mt-6 flex justify-end">
                    <button type="submit" class="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500">Save All Settings</button>
                </div>
            </form>
        </div>
    </div>
</div>
`
  },
  // ==================== ACTIVITY LOGS ====================
  {
    path: 'app/controllers/admin/ActivityLogController.php', name: 'ActivityLogController.php', language: 'php', module: 'Activity Logs', type: 'controller',
    description: 'Activity logs: filterable, searchable list',
    content: `<?php
declare(strict_types=1);
namespace App\\Controllers\\Admin;
use App\\Core\\Controller;
use App\\Core\\Database;

class ActivityLogController extends Controller
{
    protected string \$layout = 'admin.main';

    public function index(): void
    {
        \$db = Database::getInstance();
        \$page = max(1, (int) (\$_GET['page'] ?? 1));
        \$search = trim(\$_GET['search'] ?? '');
        \$action = \$_GET['action'] ?? '';
        \$user = \$_GET['user'] ?? '';

        \$where = '1=1';
        \$params = [];

        if (\$search) { \$where .= ' AND (al.description LIKE ? OR al.model LIKE ?)'; \$params[] = "%{\$search}%"; \$params[] = "%{\$search}%"; }
        if (\$action) { \$where .= ' AND al.action = ?'; \$params[] = \$action; }
        if (\$user) { \$where .= ' AND al.user_id = ?'; \$params[] = \$user; }

        \$total = (int) \$db->fetchColumn("SELECT COUNT(*) FROM activity_logs al WHERE {\$where}", \$params);
        \$perPage = 30;
        \$offset = (\$page - 1) * \$perPage;

        \$items = \$db->fetchAll(
            "SELECT al.*, u.name as user_name FROM activity_logs al LEFT JOIN users u ON al.user_id = u.id
             WHERE {\$where} ORDER BY al.created_at DESC LIMIT ? OFFSET ?",
            array_merge(\$params, [\$perPage, \$offset])
        );

        \$users = \$db->fetchAll("SELECT id, name FROM users ORDER BY name");
        \$actions = \$db->fetchAll("SELECT DISTINCT action FROM activity_logs ORDER BY action");

        \$this->view('admin.activity-logs.index', [
            'page_title' => 'Activity Logs',
            'breadcrumbs' => [['label' => 'Activity Logs', 'url' => null]],
            'items' => \$items,
            'pagination' => ['total' => \$total, 'per_page' => \$perPage, 'current_page' => \$page, 'last_page' => max(1, (int) ceil(\$total / \$perPage))],
            'search' => \$search, 'current_action' => \$action, 'current_user' => \$user,
            'users' => \$users, 'actions' => \$actions,
        ]);
    }
}
`
  },
  {
    path: 'app/views/admin/activity-logs/index.php', name: 'index.php', language: 'php', module: 'Activity Logs', type: 'view-index',
    description: 'Activity logs timeline view with filters',
    content: `<?php /** Activity Logs */ ?>
<div class="space-y-6">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Activity Logs</h1>

    <!-- Filters -->
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
        <form method="GET" class="flex flex-wrap items-center gap-3">
            <input type="text" name="search" value="<?= e(\$search) ?>" placeholder="Search..."
                   class="flex-1 min-w-[200px] px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
            <select name="action" onchange="this.form.submit()" class="px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm">
                <option value="">All Actions</option>
                <?php foreach (\$actions as \$a): ?>
                <option value="<?= e(\$a['action']) ?>" <?= \$current_action === \$a['action'] ? 'selected' : '' ?>><?= e(\$a['action']) ?></option>
                <?php endforeach; ?>
            </select>
            <select name="user" onchange="this.form.submit()" class="px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm">
                <option value="">All Users</option>
                <?php foreach (\$users as \$u): ?>
                <option value="<?= \$u['id'] ?>" <?= \$current_user == \$u['id'] ? 'selected' : '' ?>><?= e(\$u['name']) ?></option>
                <?php endforeach; ?>
            </select>
        </form>
    </div>

    <!-- Timeline -->
    <div class="space-y-2">
        <?php foreach (\$items as \$log): ?>
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 flex items-start gap-4">
            <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm text-gray-700 dark:text-slate-300">
                    <span class="font-medium text-gray-900 dark:text-white"><?= e(\$log['user_name'] ?? 'System') ?></span>
                    <span class="px-1.5 py-0.5 mx-1 text-xs bg-gray-100 dark:bg-slate-700 rounded"><?= e(\$log['action']) ?></span>
                    <?= e(\$log['description'] ?: (\$log['model'] ?? '')) ?>
                </p>
                <div class="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span><?= format_datetime(\$log['created_at']) ?></span>
                    <?php if (\$log['ip']): ?><span>IP: <?= e(\$log['ip']) ?></span><?php endif; ?>
                    <?php if (\$log['model']): ?><span class="font-mono"><?= e(\$log['model']) ?>#<?= \$log['model_id'] ?? '' ?></span><?php endif; ?>
                </div>
            </div>
        </div>
        <?php endforeach; ?>
    </div>

    <!-- Pagination -->
    <?php if (\$pagination['last_page'] > 1): ?>
    <div class="flex items-center justify-center gap-1">
        <?php for (\$i = 1; \$i <= \$pagination['last_page']; \$i++): ?>
        <a href="?page=<?= \$i ?>&search=<?= urlencode(\$search) ?>&action=<?= e(\$current_action) ?>&user=<?= e(\$current_user) ?>"
           class="px-3 py-1.5 text-sm rounded-lg <?= \$i === \$pagination['current_page'] ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200' ?>"><?= \$i ?></a>
        <?php endfor; ?>
    </div>
    <?php endif; ?>
</div>
`
  },
  // ==================== REDIRECTS ====================
  {
    path: 'app/controllers/admin/RedirectController.php', name: 'RedirectController.php', language: 'php', module: 'Redirects', type: 'controller',
    description: 'URL redirects CRUD: from/to/status code',
    content: `<?php
declare(strict_types=1);
namespace App\\Controllers\\Admin;
use App\\Core\\AdminController;

class RedirectController extends AdminController
{
    protected string \$modelClass = \\App\\Core\\Model::class;
    protected string \$viewPrefix = 'admin.redirects';
    protected string \$routePrefix = '/admin/redirects';
    protected string \$pageTitle = 'Redirects';
    protected string \$searchColumns = 'from_url,to_url';
    protected array \$validationRules = [
        'from_url' => 'required|max:500',
        'to_url' => 'required|max:500',
        'status_code' => 'required|integer|in:301,302',
    ];

    protected function model(): \\App\\Core\\Model
    {
        return new class extends \\App\\Core\\Model {
            protected string \$table = 'redirects';
            protected array \$fillable = ['from_url', 'to_url', 'status_code', 'is_active'];
        };
    }
}
`
  },
  {
    path: 'app/views/admin/redirects/index.php', name: 'index.php', language: 'php', module: 'Redirects', type: 'view-index',
    description: 'Redirects list with inline create',
    content: `<?php /** Redirects Index */ ?>
<div class="space-y-6">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">URL Redirects</h1>

    <!-- Add Redirect -->
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
        <form method="POST" action="<?= url(\$route_prefix) ?>" class="flex flex-wrap items-end gap-3">
            <?= \\App\\Core\\CSRF::field() ?>
            <div class="flex-1 min-w-[200px]">
                <label class="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">From URL</label>
                <input type="text" name="from_url" required placeholder="/old-page" class="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500">
            </div>
            <div class="flex-1 min-w-[200px]">
                <label class="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">To URL</label>
                <input type="text" name="to_url" required placeholder="/new-page" class="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Status</label>
                <select name="status_code" class="px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm">
                    <option value="301">301 (Permanent)</option>
                    <option value="302">302 (Temporary)</option>
                </select>
            </div>
            <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500">Add Redirect</button>
        </form>
    </div>

    <!-- List -->
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <table class="w-full text-sm">
            <thead><tr class="border-b border-gray-200 dark:border-slate-700">
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">From</th>
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">To</th>
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Code</th>
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Hits</th>
                <th class="py-3 px-4 text-right font-medium text-gray-500 dark:text-slate-400">Actions</th>
            </tr></thead>
            <tbody>
                <?php foreach (\$items ?? [] as \$item): ?>
                <tr class="border-b border-gray-100 dark:border-slate-700/50">
                    <td class="py-3 px-4 font-mono text-xs text-red-500"><?= e(\$item['from_url']) ?></td>
                    <td class="py-3 px-4 font-mono text-xs text-green-500"><?= e(\$item['to_url']) ?></td>
                    <td class="py-3 px-4"><span class="px-2 py-0.5 text-xs bg-gray-100 dark:bg-slate-700 rounded"><?= \$item['status_code'] ?></span></td>
                    <td class="py-3 px-4 text-gray-500"><?= \$item['hits'] ?? 0 ?></td>
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
`
  },
];
