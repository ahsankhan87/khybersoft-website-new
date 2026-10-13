<div class="max-w-md w-full px-6">
    <div class="text-center mb-8">
        <h1 class="text-3xl font-bold mb-2">Admin Login</h1>
        <p class="text-slate-400">Sign in to your account</p>
    </div>

    <?php if ($error = get_flash('error')): ?>
    <div class="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300">
        <?= e($error) ?>
    </div>
    <?php endif; ?>

    <form method="POST" action="<?= url('/admin/login') ?>" class="space-y-6">
        <?= \App\Core\CSRF::field() ?>

        <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">Email</label>
            <input type="email" name="email" required value="<?= old('email') ?>"
                   class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500">
        </div>

        <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <input type="password" name="password" required
                   class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500">
        </div>

        <div class="flex items-center">
            <input type="checkbox" name="remember" id="remember" value="1"
                   class="w-4 h-4 bg-slate-800 border-slate-700 rounded">
            <label for="remember" class="ml-2 text-sm text-slate-300">Remember me</label>
        </div>

        <button type="submit" class="w-full px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors">
            Sign In
        </button>
    </form>
</div>
