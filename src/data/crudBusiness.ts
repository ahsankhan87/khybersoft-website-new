import { CrudFile } from './crudBase';

export const crudBusinessFiles: CrudFile[] = [
  // ==================== SERVICES ====================
  {
    path: 'app/controllers/admin/ServiceController.php', name: 'ServiceController.php', language: 'php', module: 'Services', type: 'controller',
    description: 'Services CRUD with icon, features repeater, price_from',
    content: `<?php
declare(strict_types=1);
namespace App\\Controllers\\Admin;
use App\\Core\\AdminController;

class ServiceController extends AdminController
{
    protected string \$modelClass = \\App\\Models\\Service::class;
    protected string \$viewPrefix = 'admin.services';
    protected string \$routePrefix = '/admin/services';
    protected string \$pageTitle = 'Services';
    protected string \$searchColumns = 'title,slug,short_desc';
    protected array \$filterable = ['status'];
    protected array \$validationRules = [
        'title' => 'required|min:2|max:255',
        'slug' => 'nullable|slug|max:255',
        'short_desc' => 'nullable|max:500',
        'full_desc' => 'nullable',
        'price_from' => 'nullable|numeric',
        'status' => 'required|in:draft,published',
    ];
    protected function getUploadFields(): array { return ['icon']; }
}
`
  },
  {
    path: 'app/views/admin/services/index.php', name: 'index.php', language: 'php', module: 'Services', type: 'view-index',
    description: 'Services list view',
    content: `<?php /** Services Index */ ?>
<div class="space-y-6">
    <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Services</h1>
        <a href="<?= url(\$route_prefix . '/create') ?>" class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg> Add Service
        </a>
    </div>
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <table class="w-full text-sm">
            <thead><tr class="border-b border-gray-200 dark:border-slate-700">
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Service</th>
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Price From</th>
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Status</th>
                <th class="py-3 px-4 text-right font-medium text-gray-500 dark:text-slate-400">Actions</th>
            </tr></thead>
            <tbody>
                <?php foreach (\$items ?? [] as \$item): ?>
                <tr class="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td class="py-3 px-4">
                        <div class="flex items-center gap-3">
                            <?php if (!empty(\$item['icon'])): ?><img src="<?= upload(\$item['icon']) ?>" class="w-8 h-8 rounded" alt=""><?php endif; ?>
                            <div><span class="font-medium text-gray-900 dark:text-white"><?= e(\$item['title']) ?></span><p class="text-xs text-gray-500"><?= e(str_limit(\$item['short_desc'] ?? '', 60)) ?></p></div>
                        </div>
                    </td>
                    <td class="py-3 px-4 text-gray-600 dark:text-slate-300"><?= \$item['price_from'] ? money((float)\$item['price_from']) : 'Custom' ?></td>
                    <td class="py-3 px-4"><?= admin_status_badge(\$item['status']) ?></td>
                    <td class="py-3 px-4 text-right">
                        <a href="<?= url(\$route_prefix . '/' . \$item['id'] . '/edit') ?>" class="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></a>
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
    path: 'app/views/admin/services/create.php', name: 'create.php', language: 'php', module: 'Services', type: 'view-create',
    description: 'Create service form with features repeater',
    content: `<?php /** Services Create */ ?>
<div class="max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create Service</h1>
    <form method="POST" action="<?= url(\$route_prefix) ?>" enctype="multipart/form-data" x-data="{ features: [] }">
        <?= \\App\\Core\\CSRF::field() ?>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 space-y-6">
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <?= admin_input('title', 'Service Title', 'text', null, ['required']) ?>
                    <?= admin_input('slug', 'Slug', 'text', null) ?>
                    <?= admin_textarea('short_desc', 'Short Description', null, ['rows' => 2]) ?>
                    <?= admin_editor('full_desc', 'Full Description') ?>
                </div>
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Features</h3>
                        <button type="button" @click="features.push({title:'',desc:''})" class="px-3 py-1.5 text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg">+ Add</button>
                    </div>
                    <template x-for="(f, i) in features" :key="i">
                        <div class="flex gap-2 mb-2">
                            <input type="text" :name="'features['+i+'][title]'" x-model="f.title" placeholder="Feature title" class="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm">
                            <input type="text" :name="'features['+i+'][desc]'" x-model="f.desc" placeholder="Description" class="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm">
                            <button type="button" @click="features.splice(i,1)" class="p-2 text-red-400 hover:text-red-600"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                        </div>
                    </template>
                </div>
            </div>
            <div class="space-y-6">
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <?= admin_select('status', 'Status', ['draft' => 'Draft', 'published' => 'Published'], 'draft') ?>
                    <?= admin_input('price_from', 'Price From', 'number', null, ['placeholder' => '0.00']) ?>
                    <?= admin_file('icon', 'Service Icon', null, ['accept' => 'image/*']) ?>
                </div>
                <div class="flex gap-3">
                    <a href="<?= url(\$route_prefix) ?>" class="flex-1 px-4 py-2.5 text-center text-sm bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg">Cancel</a>
                    <button type="submit" class="flex-1 px-4 py-2.5 text-center text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-500">Create</button>
                </div>
            </div>
        </div>
    </form>
</div>
`
  },
  {
    path: 'app/views/admin/services/edit.php', name: 'edit.php', language: 'php', module: 'Services', type: 'view-edit',
    description: 'Edit service form',
    content: `<?php /** Services Edit */ ?>
<div class="max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Edit Service</h1>
    <form method="POST" action="<?= url(\$route_prefix . '/' . \$item['id']) ?>" enctype="multipart/form-data">
        <?= \\App\\Core\\CSRF::field() ?>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 space-y-6">
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <?= admin_input('title', 'Title', 'text', \$item['title'] ?? '', ['required']) ?>
                    <?= admin_input('slug', 'Slug', 'text', \$item['slug'] ?? '') ?>
                    <?= admin_textarea('short_desc', 'Short Description', \$item['short_desc'] ?? '', ['rows' => 2]) ?>
                    <?= admin_editor('full_desc', 'Full Description', \$item['full_desc'] ?? '') ?>
                </div>
            </div>
            <div class="space-y-6">
                <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                    <?= admin_select('status', 'Status', ['draft' => 'Draft', 'published' => 'Published'], \$item['status'] ?? 'draft') ?>
                    <?= admin_input('price_from', 'Price From', 'number', \$item['price_from'] ?? '') ?>
                    <?= admin_file('icon', 'Icon', \$item['icon'] ?? null, ['accept' => 'image/*']) ?>
                </div>
                <div class="flex gap-3">
                    <a href="<?= url(\$route_prefix) ?>" class="flex-1 px-4 py-2.5 text-center text-sm bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg">Cancel</a>
                    <button type="submit" class="flex-1 px-4 py-2.5 text-center text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-500">Update</button>
                </div>
            </div>
        </div>
    </form>
</div>
`
  },
  // ==================== TESTIMONIALS ====================
  {
    path: 'app/controllers/admin/TestimonialController.php', name: 'TestimonialController.php', language: 'php', module: 'Testimonials', type: 'controller',
    description: 'Testimonials CRUD with photo, star rating, video URL',
    content: `<?php
declare(strict_types=1);
namespace App\\Controllers\\Admin;
use App\\Core\\AdminController;

class TestimonialController extends AdminController
{
    protected string \$modelClass = \\App\\Models\\Testimonial::class;
    protected string \$viewPrefix = 'admin.testimonials';
    protected string \$routePrefix = '/admin/testimonials';
    protected string \$pageTitle = 'Testimonials';
    protected string \$searchColumns = 'name,company,message';
    protected array \$validationRules = [
        'name' => 'required|min:2|max:100',
        'company' => 'nullable|max:100',
        'role' => 'nullable|max:100',
        'message' => 'required|min:10|max:2000',
        'rating' => 'required|integer|min:1|max:5',
        'status' => 'required|in:draft,published',
    ];
    protected function getUploadFields(): array { return ['photo']; }
}
`
  },
  {
    path: 'app/views/admin/testimonials/index.php', name: 'index.php', language: 'php', module: 'Testimonials', type: 'view-index',
    description: 'Testimonials list with star ratings and photos',
    content: `<?php /** Testimonials Index */ ?>
<div class="space-y-6">
    <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Testimonials</h1>
        <a href="<?= url(\$route_prefix . '/create') ?>" class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg> Add Testimonial
        </a>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <?php foreach (\$items ?? [] as \$item): ?>
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
            <div class="flex items-start gap-3 mb-3">
                <?php if (!empty(\$item['photo'])): ?>
                <img src="<?= upload(\$item['photo']) ?>" class="w-12 h-12 rounded-full object-cover" alt="">
                <?php else: ?>
                <div class="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold"><?= strtoupper(substr(\$item['name'], 0, 1)) ?></div>
                <?php endif; ?>
                <div>
                    <p class="font-medium text-gray-900 dark:text-white"><?= e(\$item['name']) ?></p>
                    <p class="text-xs text-gray-500"><?= e((\$item['role'] ?? '') . (\$item['company'] ? ' at ' . \$item['company'] : '')) ?></p>
                </div>
            </div>
            <div class="flex items-center gap-0.5 mb-2">
                <?php for (\$i = 1; \$i <= 5; \$i++): ?>
                <svg class="w-4 h-4 <?= \$i <= (\$item['rating'] ?? 5) ? 'text-amber-400' : 'text-gray-300 dark:text-slate-600' ?>" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                <?php endfor; ?>
            </div>
            <p class="text-sm text-gray-600 dark:text-slate-300 italic">"<?= e(str_limit(\$item['message'], 120)) ?>"</p>
            <div class="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                <?= admin_status_badge(\$item['status']) ?>
                <div class="flex gap-1">
                    <a href="<?= url(\$route_prefix . '/' . \$item['id'] . '/edit') ?>" class="p-1 text-gray-400 hover:text-blue-600"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></a>
                </div>
            </div>
        </div>
        <?php endforeach; ?>
    </div>
</div>
`
  },
  {
    path: 'app/views/admin/testimonials/create.php', name: 'create.php', language: 'php', module: 'Testimonials', type: 'view-create',
    description: 'Create testimonial with photo, star rating selector',
    content: `<?php /** Testimonials Create */ ?>
<div class="max-w-3xl mx-auto">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Add Testimonial</h1>
    <form method="POST" action="<?= url(\$route_prefix) ?>" enctype="multipart/form-data" x-data="{ rating: 5, hoverRating: 0 }">
        <?= \\App\\Core\\CSRF::field() ?>
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <?= admin_input('name', 'Name', 'text', null, ['required']) ?>
                <?= admin_input('company', 'Company', 'text', null) ?>
                <?= admin_input('role', 'Role/Position', 'text', null) ?>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Rating</label>
                    <input type="hidden" name="rating" :value="rating">
                    <div class="flex gap-1">
                        <template x-for="i in 5">
                            <button type="button" @click="rating = i" @mouseenter="hoverRating = i" @mouseleave="hoverRating = 0"
                                    class="focus:outline-none">
                                <svg class="w-7 h-7" :class="(hoverRating || rating) >= i ? 'text-amber-400' : 'text-gray-300 dark:text-slate-600'" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                            </button>
                        </template>
                    </div>
                </div>
            </div>
            <?= admin_textarea('message', 'Testimonial Message', null, ['rows' => 4, 'required', 'placeholder' => 'What did they say about your product/service?']) ?>
            <?= admin_file('photo', 'Photo', null, ['accept' => 'image/*']) ?>
            <?= admin_input('video_url', 'Video URL (optional)', 'url', null, ['placeholder' => 'YouTube/Vimeo URL']) ?>
            <?= admin_select('status', 'Status', ['draft' => 'Draft', 'published' => 'Published'], 'draft') ?>
            <div class="flex gap-3 pt-4">
                <a href="<?= url(\$route_prefix) ?>" class="flex-1 px-4 py-2.5 text-center text-sm bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg">Cancel</a>
                <button type="submit" class="flex-1 px-4 py-2.5 text-center text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-500">Create</button>
            </div>
        </div>
    </form>
</div>
`
  },
  {
    path: 'app/views/admin/testimonials/edit.php', name: 'edit.php', language: 'php', module: 'Testimonials', type: 'view-edit',
    description: 'Edit testimonial',
    content: `<?php /** Testimonials Edit */ ?>
<div class="max-w-3xl mx-auto">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Edit Testimonial</h1>
    <form method="POST" action="<?= url(\$route_prefix . '/' . \$item['id']) ?>" enctype="multipart/form-data" x-data="{ rating: <?= (int)(\$item['rating'] ?? 5) ?>, hoverRating: 0 }">
        <?= \\App\\Core\\CSRF::field() ?>
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <?= admin_input('name', 'Name', 'text', \$item['name'] ?? '', ['required']) ?>
                <?= admin_input('company', 'Company', 'text', \$item['company'] ?? '') ?>
                <?= admin_input('role', 'Role', 'text', \$item['role'] ?? '') ?>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Rating</label>
                    <input type="hidden" name="rating" :value="rating">
                    <div class="flex gap-1">
                        <template x-for="i in 5">
                            <button type="button" @click="rating = i" @mouseenter="hoverRating = i" @mouseleave="hoverRating = 0" class="focus:outline-none">
                                <svg class="w-7 h-7" :class="(hoverRating || rating) >= i ? 'text-amber-400' : 'text-gray-300 dark:text-slate-600'" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                            </button>
                        </template>
                    </div>
                </div>
            </div>
            <?= admin_textarea('message', 'Message', \$item['message'] ?? '', ['rows' => 4, 'required']) ?>
            <?= admin_file('photo', 'Photo', \$item['photo'] ?? null, ['accept' => 'image/*']) ?>
            <?= admin_input('video_url', 'Video URL', 'url', \$item['video_url'] ?? '') ?>
            <?= admin_select('status', 'Status', ['draft' => 'Draft', 'published' => 'Published'], \$item['status'] ?? 'draft') ?>
            <div class="flex gap-3 pt-4">
                <a href="<?= url(\$route_prefix) ?>" class="flex-1 px-4 py-2.5 text-center text-sm bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg">Cancel</a>
                <button type="submit" class="flex-1 px-4 py-2.5 text-center text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-500">Update</button>
            </div>
        </div>
    </form>
</div>
`
  },
  // ==================== TEAM MEMBERS ====================
  {
    path: 'app/controllers/admin/TeamController.php', name: 'TeamController.php', language: 'php', module: 'Team', type: 'controller',
    description: 'Team members CRUD with social links repeater',
    content: `<?php
declare(strict_types=1);
namespace App\\Controllers\\Admin;
use App\\Core\\AdminController;

class TeamController extends AdminController
{
    protected string \$modelClass = \\App\\Models\\TeamMember::class;
    protected string \$viewPrefix = 'admin.team';
    protected string \$routePrefix = '/admin/team';
    protected string \$pageTitle = 'Team Members';
    protected string \$searchColumns = 'name,role';
    protected array \$validationRules = [
        'name' => 'required|min:2|max:100',
        'role' => 'required|min:2|max:100',
        'bio' => 'nullable|max:1000',
        'status' => 'required|in:active,inactive',
    ];
    protected function getUploadFields(): array { return ['photo']; }

    protected function prepareData(array \$data): array
    {
        \$data = parent::prepareData(\$data);
        // Handle social links repeater
        if (isset(\$data['social']) && is_array(\$data['social'])) {
            \$links = [];
            foreach (\$data['social'] as \$s) {
                if (!empty(\$s['platform']) && !empty(\$s['url'])) {
                    \$links[] = \$s;
                }
            }
            \$data['social_links'] = json_encode(\$links);
            unset(\$data['social']);
        }
        return \$data;
    }
}
`
  },
  {
    path: 'app/views/admin/team/index.php', name: 'index.php', language: 'php', module: 'Team', type: 'view-index',
    description: 'Team members list',
    content: `<?php /** Team Index */ ?>
<div class="space-y-6">
    <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Team Members</h1>
        <a href="<?= url(\$route_prefix . '/create') ?>" class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg> Add Member
        </a>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <?php foreach (\$items ?? [] as \$item): ?>
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 text-center">
            <?php if (!empty(\$item['photo'])): ?>
            <img src="<?= upload(\$item['photo']) ?>" class="w-20 h-20 rounded-full object-cover mx-auto mb-3" alt="">
            <?php else: ?>
            <div class="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3 text-2xl font-bold text-blue-600"><?= strtoupper(substr(\$item['name'], 0, 1)) ?></div>
            <?php endif; ?>
            <h3 class="font-semibold text-gray-900 dark:text-white"><?= e(\$item['name']) ?></h3>
            <p class="text-sm text-blue-600"><?= e(\$item['role']) ?></p>
            <p class="text-xs text-gray-500 mt-1"><?= e(str_limit(\$item['bio'] ?? '', 80)) ?></p>
            <div class="flex items-center justify-center gap-2 mt-3">
                <?= admin_status_badge(\$item['status'] ?? 'active') ?>
                <a href="<?= url(\$route_prefix . '/' . \$item['id'] . '/edit') ?>" class="p-1 text-gray-400 hover:text-blue-600"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></a>
            </div>
        </div>
        <?php endforeach; ?>
    </div>
</div>
`
  },
  {
    path: 'app/views/admin/team/create.php', name: 'create.php', language: 'php', module: 'Team', type: 'view-create',
    description: 'Create team member with social links repeater',
    content: `<?php /** Team Create */ ?>
<div class="max-w-3xl mx-auto">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Add Team Member</h1>
    <form method="POST" action="<?= url(\$route_prefix) ?>" enctype="multipart/form-data" x-data="{ socials: [] }">
        <?= \\App\\Core\\CSRF::field() ?>
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <?= admin_input('name', 'Full Name', 'text', null, ['required']) ?>
                <?= admin_input('role', 'Role/Position', 'text', null, ['required']) ?>
            </div>
            <?= admin_textarea('bio', 'Bio', null, ['rows' => 3]) ?>
            <?= admin_file('photo', 'Photo', null, ['accept' => 'image/*']) ?>
            <!-- Social Links Repeater -->
            <div>
                <div class="flex items-center justify-between mb-2">
                    <label class="text-sm font-medium text-gray-700 dark:text-slate-300">Social Links</label>
                    <button type="button" @click="socials.push({platform:'',url:''})" class="px-3 py-1 text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded">+ Add</button>
                </div>
                <template x-for="(s, i) in socials" :key="i">
                    <div class="flex gap-2 mb-2">
                        <select :name="'social['+i+'][platform]'" x-model="s.platform" class="px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm">
                            <option value="">Platform</option>
                            <option value="twitter">Twitter</option><option value="linkedin">LinkedIn</option>
                            <option value="github">GitHub</option><option value="facebook">Facebook</option>
                        </select>
                        <input type="url" :name="'social['+i+'][url]'" x-model="s.url" placeholder="URL" class="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm">
                        <button type="button" @click="socials.splice(i,1)" class="p-2 text-red-400 hover:text-red-600"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                    </div>
                </template>
            </div>
            <?= admin_select('status', 'Status', ['active' => 'Active', 'inactive' => 'Inactive'], 'active') ?>
            <div class="flex gap-3 pt-4">
                <a href="<?= url(\$route_prefix) ?>" class="flex-1 px-4 py-2.5 text-center text-sm bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg">Cancel</a>
                <button type="submit" class="flex-1 px-4 py-2.5 text-center text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-500">Create</button>
            </div>
        </div>
    </form>
</div>
`
  },
  {
    path: 'app/views/admin/team/edit.php', name: 'edit.php', language: 'php', module: 'Team', type: 'view-edit',
    description: 'Edit team member',
    content: `<?php /** Team Edit */ ?>
<div class="max-w-3xl mx-auto">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Edit Team Member</h1>
    <?php \$socialLinks = json_decode(\$item['social_links'] ?? '[]', true) ?: []; ?>
    <form method="POST" action="<?= url(\$route_prefix . '/' . \$item['id']) ?>" enctype="multipart/form-data" x-data="{ socials: <?= json_encode(\$socialLinks) ?> }">
        <?= \\App\\Core\\CSRF::field() ?>
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <?= admin_input('name', 'Name', 'text', \$item['name'] ?? '', ['required']) ?>
                <?= admin_input('role', 'Role', 'text', \$item['role'] ?? '', ['required']) ?>
            </div>
            <?= admin_textarea('bio', 'Bio', \$item['bio'] ?? '', ['rows' => 3]) ?>
            <?= admin_file('photo', 'Photo', \$item['photo'] ?? null, ['accept' => 'image/*']) ?>
            <div>
                <div class="flex items-center justify-between mb-2">
                    <label class="text-sm font-medium text-gray-700 dark:text-slate-300">Social Links</label>
                    <button type="button" @click="socials.push({platform:'',url:''})" class="px-3 py-1 text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded">+ Add</button>
                </div>
                <template x-for="(s, i) in socials" :key="i">
                    <div class="flex gap-2 mb-2">
                        <select :name="'social['+i+'][platform]'" x-model="s.platform" class="px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm">
                            <option value="">Platform</option><option value="twitter">Twitter</option><option value="linkedin">LinkedIn</option><option value="github">GitHub</option><option value="facebook">Facebook</option>
                        </select>
                        <input type="url" :name="'social['+i+'][url]'" x-model="s.url" placeholder="URL" class="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm">
                        <button type="button" @click="socials.splice(i,1)" class="p-2 text-red-400"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                    </div>
                </template>
            </div>
            <?= admin_select('status', 'Status', ['active' => 'Active', 'inactive' => 'Inactive'], \$item['status'] ?? 'active') ?>
            <div class="flex gap-3 pt-4">
                <a href="<?= url(\$route_prefix) ?>" class="flex-1 px-4 py-2.5 text-center text-sm bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg">Cancel</a>
                <button type="submit" class="flex-1 px-4 py-2.5 text-center text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-500">Update</button>
            </div>
        </div>
    </form>
</div>
`
  },
  // ==================== FAQS ====================
  {
    path: 'app/controllers/admin/FaqController.php', name: 'FaqController.php', language: 'php', module: 'FAQs', type: 'controller',
    description: 'FAQs CRUD with category and sortable',
    content: `<?php
declare(strict_types=1);
namespace App\\Controllers\\Admin;
use App\\Core\\AdminController;

class FaqController extends AdminController
{
    protected string \$modelClass = \\App\\Core\\Model::class;
    protected string \$viewPrefix = 'admin.faqs';
    protected string \$routePrefix = '/admin/faqs';
    protected string \$pageTitle = 'FAQs';
    protected string \$searchColumns = 'question,answer';
    protected array \$filterable = ['category', 'status'];
    protected array \$validationRules = [
        'question' => 'required|min:5|max:500',
        'answer' => 'required|min:10',
        'category' => 'nullable|max:100',
        'sort_order' => 'nullable|integer',
        'status' => 'required|in:active,inactive',
    ];

    protected function model(): \\App\\Core\\Model
    {
        return new class extends \\App\\Core\\Model {
            protected string \$table = 'faqs';
            protected array \$fillable = ['question', 'answer', 'category', 'sort_order', 'status'];
        };
    }
}
`
  },
  {
    path: 'app/views/admin/faqs/index.php', name: 'index.php', language: 'php', module: 'FAQs', type: 'view-index',
    description: 'FAQs list with accordion display',
    content: `<?php /** FAQs Index */ ?>
<div class="space-y-6">
    <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">FAQs</h1>
        <a href="<?= url(\$route_prefix . '/create') ?>" class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg> Add FAQ
        </a>
    </div>
    <div class="space-y-2">
        <?php foreach (\$items ?? [] as \$item): ?>
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700" x-data="{ open: false }">
            <button @click="open = !open" class="w-full flex items-center justify-between p-4 text-left">
                <div class="flex items-center gap-3">
                    <span class="text-xs px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded"><?= e(\$item['category'] ?? 'General') ?></span>
                    <span class="font-medium text-gray-900 dark:text-white"><?= e(\$item['question']) ?></span>
                </div>
                <div class="flex items-center gap-2">
                    <?= admin_status_badge(\$item['status'] ?? 'active') ?>
                    <svg :class="open ? 'rotate-180' : ''" class="w-5 h-5 text-gray-400 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                </div>
            </button>
            <div x-show="open" x-collapse class="px-4 pb-4">
                <p class="text-sm text-gray-600 dark:text-slate-300"><?= nl2br(e(\$item['answer'])) ?></p>
                <div class="mt-2 flex gap-2">
                    <a href="<?= url(\$route_prefix . '/' . \$item['id'] . '/edit') ?>" class="text-xs text-blue-600 hover:underline">Edit</a>
                </div>
            </div>
        </div>
        <?php endforeach; ?>
    </div>
</div>
`
  },
  {
    path: 'app/views/admin/faqs/create.php', name: 'create.php', language: 'php', module: 'FAQs', type: 'view-create',
    description: 'Create FAQ',
    content: `<?php /** FAQ Create */ ?>
<div class="max-w-3xl mx-auto">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Add FAQ</h1>
    <form method="POST" action="<?= url(\$route_prefix) ?>">
        <?= \\App\\Core\\CSRF::field() ?>
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 space-y-4">
            <?= admin_input('question', 'Question', 'text', null, ['required', 'placeholder' => 'Frequently asked question...']) ?>
            <?= admin_textarea('answer', 'Answer', null, ['rows' => 5, 'required']) ?>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <?= admin_input('category', 'Category', 'text', null, ['placeholder' => 'e.g., General, Billing']) ?>
                <?= admin_input('sort_order', 'Sort Order', 'number', '0') ?>
                <?= admin_select('status', 'Status', ['active' => 'Active', 'inactive' => 'Inactive'], 'active') ?>
            </div>
            <div class="flex gap-3 pt-4">
                <a href="<?= url(\$route_prefix) ?>" class="flex-1 px-4 py-2.5 text-center text-sm bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg">Cancel</a>
                <button type="submit" class="flex-1 px-4 py-2.5 text-center text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-500">Create</button>
            </div>
        </div>
    </form>
</div>
`
  },
  {
    path: 'app/views/admin/faqs/edit.php', name: 'edit.php', language: 'php', module: 'FAQs', type: 'view-edit',
    description: 'Edit FAQ',
    content: `<?php /** FAQ Edit */ ?>
<div class="max-w-3xl mx-auto">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Edit FAQ</h1>
    <form method="POST" action="<?= url(\$route_prefix . '/' . \$item['id']) ?>">
        <?= \\App\\Core\\CSRF::field() ?>
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 space-y-4">
            <?= admin_input('question', 'Question', 'text', \$item['question'] ?? '', ['required']) ?>
            <?= admin_textarea('answer', 'Answer', \$item['answer'] ?? '', ['rows' => 5, 'required']) ?>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <?= admin_input('category', 'Category', 'text', \$item['category'] ?? '') ?>
                <?= admin_input('sort_order', 'Sort Order', 'number', \$item['sort_order'] ?? '0') ?>
                <?= admin_select('status', 'Status', ['active' => 'Active', 'inactive' => 'Inactive'], \$item['status'] ?? 'active') ?>
            </div>
            <div class="flex gap-3 pt-4">
                <a href="<?= url(\$route_prefix) ?>" class="flex-1 px-4 py-2.5 text-center text-sm bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg">Cancel</a>
                <button type="submit" class="flex-1 px-4 py-2.5 text-center text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-500">Update</button>
            </div>
        </div>
    </form>
</div>
`
  },
  // ==================== CONTACT MESSAGES ====================
  {
    path: 'app/controllers/admin/MessageController.php', name: 'MessageController.php', language: 'php', module: 'Messages', type: 'controller',
    description: 'Contact messages: list, view, mark read, reply via email',
    content: `<?php
declare(strict_types=1);
namespace App\\Controllers\\Admin;
use App\\Core\\Controller;
use App\\Core\\Database;

class MessageController extends Controller
{
    protected string \$layout = 'admin.main';

    public function index(): void
    {
        \$db = Database::getInstance();
        \$status = \$_GET['status'] ?? '';
        \$where = '1=1';
        \$params = [];
        if (\$status) { \$where .= ' AND status = ?'; \$params[] = \$status; }

        \$items = \$db->fetchAll("SELECT * FROM contact_messages WHERE {\$where} ORDER BY created_at DESC LIMIT 50", \$params);

        \$this->view('admin.messages.index', [
            'page_title' => 'Contact Messages',
            'breadcrumbs' => [['label' => 'Messages', 'url' => null]],
            'items' => \$items, 'current_status' => \$status,
            'counts' => [
                'all' => (int) \$db->fetchColumn("SELECT COUNT(*) FROM contact_messages"),
                'new' => (int) \$db->fetchColumn("SELECT COUNT(*) FROM contact_messages WHERE status = 'new'"),
            ],
        ]);
    }

    public function show(string \$id): void
    {
        \$db = Database::getInstance();
        \$msg = \$db->fetch("SELECT * FROM contact_messages WHERE id = ?", [\$id]);
        if (!\$msg) { flash('error', 'Message not found.'); \$this->redirect(url('/admin/messages')); return; }
        if (\$msg['status'] === 'new') { \$db->update('contact_messages', ['status' => 'read'], 'id = ?', [\$id]); }
        \$this->view('admin.messages.show', [
            'page_title' => 'Message Detail',
            'breadcrumbs' => [['label' => 'Messages', 'url' => url('/admin/messages')], ['label' => '#' . \$id, 'url' => null]],
            'msg' => \$msg,
        ]);
    }

    public function updateStatus(string \$id): void
    {
        if (!\$this->validateCsrf()) return;
        Database::getInstance()->update('contact_messages', ['status' => \$_POST['status'] ?? 'read'], 'id = ?', [\$id]);
        flash('success', 'Status updated.');
        \$this->redirectBack();
    }
}
`
  },
  {
    path: 'app/views/admin/messages/index.php', name: 'index.php', language: 'php', module: 'Messages', type: 'view-index',
    description: 'Contact messages list',
    content: `<?php /** Messages Index */ ?>
<div class="space-y-6">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Contact Messages</h1>
    <div class="flex gap-2">
        <a href="<?= url('/admin/messages') ?>" class="px-3 py-1.5 rounded-lg text-sm <?= !\$current_status ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300' ?>">All (<?= \$counts['all'] ?>)</a>
        <a href="<?= url('/admin/messages?status=new') ?>" class="px-3 py-1.5 rounded-lg text-sm <?= \$current_status === 'new' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300' ?>">New (<?= \$counts['new'] ?>)</a>
    </div>
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <table class="w-full text-sm">
            <thead><tr class="border-b border-gray-200 dark:border-slate-700">
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">From</th>
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Subject</th>
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Status</th>
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Date</th>
            </tr></thead>
            <tbody>
                <?php foreach (\$items as \$msg): ?>
                <tr class="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 <?= \$msg['status'] === 'new' ? 'font-semibold' : '' ?>">
                    <td class="py-3 px-4"><span class="text-gray-900 dark:text-white"><?= e(\$msg['name']) ?></span><br><span class="text-xs text-gray-500"><?= e(\$msg['email']) ?></span></td>
                    <td class="py-3 px-4"><a href="<?= url('/admin/messages/' . \$msg['id']) ?>" class="text-gray-700 dark:text-slate-300 hover:text-blue-600"><?= e(\$msg['subject']) ?></a></td>
                    <td class="py-3 px-4"><?= admin_status_badge(\$msg['status']) ?></td>
                    <td class="py-3 px-4 text-xs text-gray-500"><?= time_ago(\$msg['created_at']) ?></td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
`
  },
  {
    path: 'app/views/admin/messages/show.php', name: 'show.php', language: 'php', module: 'Messages', type: 'view-edit',
    description: 'Message detail with reply option',
    content: `<?php /** Message Detail */ ?>
<div class="max-w-3xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white"><?= e(\$msg['subject']) ?></h1>
        <a href="<?= url('/admin/messages') ?>" class="text-sm text-blue-600 hover:underline">← Back</a>
    </div>
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <div class="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200 dark:border-slate-700">
            <div><span class="text-xs text-gray-500">From</span><p class="font-medium text-gray-900 dark:text-white"><?= e(\$msg['name']) ?></p></div>
            <div><span class="text-xs text-gray-500">Email</span><p><a href="mailto:<?= e(\$msg['email']) ?>" class="text-blue-600"><?= e(\$msg['email']) ?></a></p></div>
            <div><span class="text-xs text-gray-500">Phone</span><p class="text-gray-900 dark:text-white"><?= e(\$msg['phone'] ?? 'N/A') ?></p></div>
            <div><span class="text-xs text-gray-500">Date</span><p class="text-gray-900 dark:text-white"><?= format_datetime(\$msg['created_at']) ?></p></div>
        </div>
        <div class="text-gray-700 dark:text-slate-300 whitespace-pre-wrap"><?= e(\$msg['message']) ?></div>
    </div>
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <form method="POST" action="<?= url('/admin/messages/' . \$msg['id'] . '/status') ?>" class="flex items-center gap-3">
            <?= \\App\\Core\\CSRF::field() ?>
            <label class="text-sm text-gray-700 dark:text-slate-300">Status:</label>
            <select name="status" class="px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm">
                <?php foreach (['new', 'read', 'replied', 'closed'] as \$s): ?>
                <option value="<?= \$s ?>" <?= \$msg['status'] === \$s ? 'selected' : '' ?>><?= ucfirst(\$s) ?></option>
                <?php endforeach; ?>
            </select>
            <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500">Update</button>
            <a href="mailto:<?= e(\$msg['email']) ?>?subject=Re: <?= urlencode(\$msg['subject']) ?>" class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-500">Reply via Email</a>
        </form>
    </div>
</div>
`
  },
  // ==================== NEWSLETTER ====================
  {
    path: 'app/controllers/admin/NewsletterController.php', name: 'NewsletterController.php', language: 'php', module: 'Newsletter', type: 'controller',
    description: 'Newsletter subscribers: list, export CSV, send bulk email',
    content: `<?php
declare(strict_types=1);
namespace App\\Controllers\\Admin;
use App\\Core\\Controller;
use App\\Core\\Database;

class NewsletterController extends Controller
{
    protected string \$layout = 'admin.main';

    public function index(): void
    {
        \$db = Database::getInstance();
        \$items = \$db->fetchAll("SELECT * FROM newsletter_subscribers ORDER BY subscribed_at DESC LIMIT 100");
        \$total = (int) \$db->fetchColumn("SELECT COUNT(*) FROM newsletter_subscribers WHERE status = 'active'");
        \$verified = (int) \$db->fetchColumn("SELECT COUNT(*) FROM newsletter_subscribers WHERE verified = 1");

        \$this->view('admin.newsletter.index', [
            'page_title' => 'Newsletter Subscribers',
            'breadcrumbs' => [['label' => 'Newsletter', 'url' => null]],
            'items' => \$items, 'total' => \$total, 'verified' => \$verified,
        ]);
    }

    public function export(): void
    {
        \$db = Database::getInstance();
        \$items = \$db->fetchAll("SELECT email, status, verified, subscribed_at FROM newsletter_subscribers WHERE status = 'active' ORDER BY subscribed_at DESC");

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="subscribers_' . date('Y-m-d') . '.csv"');
        \$output = fopen('php://output', 'w');
        fprintf(\$output, chr(0xEF) . chr(0xBB) . chr(0xBF));
        fputcsv(\$output, ['Email', 'Status', 'Verified', 'Subscribed At']);
        foreach (\$items as \$item) { fputcsv(\$output, \$item); }
        fclose(\$output);
        exit;
    }
}
`
  },
  {
    path: 'app/views/admin/newsletter/index.php', name: 'index.php', language: 'php', module: 'Newsletter', type: 'view-index',
    description: 'Newsletter subscribers list with export',
    content: `<?php /** Newsletter Index */ ?>
<div class="space-y-6">
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Newsletter Subscribers</h1>
            <p class="text-sm text-gray-500 mt-1"><?= \$total ?> active subscribers • <?= \$verified ?> verified</p>
        </div>
        <a href="<?= url('/admin/newsletter/export') ?>" class="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Export CSV
        </a>
    </div>
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <table class="w-full text-sm">
            <thead><tr class="border-b border-gray-200 dark:border-slate-700">
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Email</th>
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Status</th>
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Verified</th>
                <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Subscribed</th>
            </tr></thead>
            <tbody>
                <?php foreach (\$items as \$sub): ?>
                <tr class="border-b border-gray-100 dark:border-slate-700/50">
                    <td class="py-3 px-4 text-gray-900 dark:text-white"><?= e(\$sub['email']) ?></td>
                    <td class="py-3 px-4"><?= admin_status_badge(\$sub['status']) ?></td>
                    <td class="py-3 px-4"><?= \$sub['verified'] ? '<span class="text-green-500">✓</span>' : '<span class="text-gray-400">✗</span>' ?></td>
                    <td class="py-3 px-4 text-xs text-gray-500"><?= format_date(\$sub['subscribed_at']) ?></td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
`
  },
];
