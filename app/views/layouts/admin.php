<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e($page_title ?? 'Admin') ?></title>
    <?= \App\Core\CSRF::meta() ?>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; }
    </style>
</head>
<body class="bg-slate-900 text-white">
    <nav class="bg-slate-800 border-b border-slate-700">
        <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <a href="<?= url('/admin') ?>" class="text-xl font-bold">Khybersoft Admin</a>
            <div class="flex gap-4 items-center">
                <span class="text-sm text-slate-400"><?= e($user['name'] ?? 'Admin') ?></span>
                <a href="<?= url('/admin/logout') ?>" class="text-sm text-red-400 hover:text-red-300">Logout</a>
            </div>
        </div>
    </nav>

    <main class="max-w-7xl mx-auto px-4 py-8">
        <?= $_view_content_ ?? '' ?>
    </main>
</body>
</html>
