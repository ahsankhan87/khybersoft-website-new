<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e($page_title ?? 'Khybersoft') ?></title>
    <?= \App\Core\CSRF::meta() ?>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; }
        .font-display { font-family: 'Sora', sans-serif; }
    </style>
</head>
<body class="bg-slate-900 text-white">
    <nav class="bg-slate-800 border-b border-slate-700">
        <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <a href="<?= url('/') ?>" class="text-xl font-bold">Khybersoft</a>
            <div class="flex gap-6">
                <a href="<?= url('/') ?>" class="hover:text-blue-400">Home</a>
                <a href="<?= url('/products') ?>" class="hover:text-blue-400">Products</a>
                <a href="<?= url('/blog') ?>" class="hover:text-blue-400">Blog</a>
                <a href="<?= url('/about') ?>" class="hover:text-blue-400">About</a>
                <a href="<?= url('/contact') ?>" class="hover:text-blue-400">Contact</a>
            </div>
        </div>
    </nav>

    <main>
        <?= $_view_content_ ?? '' ?>
    </main>

    <footer class="bg-slate-800 border-t border-slate-700 mt-20 py-8">
        <div class="max-w-7xl mx-auto px-4 text-center text-slate-400">
            <p>&copy; <?= date('Y') ?> Khybersoft. All rights reserved.</p>
        </div>
    </footer>
</body>
</html>
