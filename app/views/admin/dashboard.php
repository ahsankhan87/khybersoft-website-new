<div class="space-y-6">
    <h1 class="text-3xl font-bold">Dashboard</h1>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 class="text-sm text-slate-400 mb-2">Welcome</h3>
            <p class="text-2xl font-bold"><?= e($user['name'] ?? 'Admin') ?></p>
        </div>
        
        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 class="text-sm text-slate-400 mb-2">Role</h3>
            <p class="text-2xl font-bold"><?= e($user['role_name'] ?? 'Admin') ?></p>
        </div>
        
        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 class="text-sm text-slate-400 mb-2">Last Login</h3>
            <p class="text-2xl font-bold"><?= $user['last_login'] ? time_ago($user['last_login']) : 'Never' ?></p>
        </div>
    </div>

    <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 class="text-xl font-semibold mb-4">Quick Links</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a href="<?= url('/admin/products') ?>" class="p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors text-center">
                Products
            </a>
            <a href="<?= url('/admin/blog') ?>" class="p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors text-center">
                Blog
            </a>
            <a href="<?= url('/admin/users') ?>" class="p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors text-center">
                Users
            </a>
            <a href="<?= url('/admin/settings') ?>" class="p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors text-center">
                Settings
            </a>
        </div>
    </div>
</div>
