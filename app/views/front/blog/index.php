<section class="py-20">
    <div class="max-w-7xl mx-auto px-4">
        <h1 class="font-display text-5xl font-bold mb-6">Blog</h1>
        <p class="text-xl text-slate-400 mb-12">Latest news and insights</p>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <?php foreach ($posts as $post): ?>
            <a href="<?= url('/blog/' . e($post['slug'])) ?>" class="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-blue-500 transition-colors">
                <?php if ($post['featured_image']): ?>
                <div class="aspect-video overflow-hidden">
                    <img src="<?= upload($post['featured_image']) ?>" alt="<?= e($post['title']) ?>" class="w-full h-full object-cover">
                </div>
                <?php endif; ?>
                <div class="p-6">
                    <h3 class="text-xl font-semibold mb-2"><?= e($post['title']) ?></h3>
                    <p class="text-slate-400 text-sm mb-4"><?= e(str_limit($post['excerpt'] ?? '', 100)) ?></p>
                    <div class="text-xs text-slate-500"><?= format_date($post['created_at']) ?></div>
                </div>
            </a>
            <?php endforeach; ?>
        </div>

        <?php if (empty($posts)): ?>
        <div class="text-center py-12 text-slate-500">
            No blog posts available yet.
        </div>
        <?php endif; ?>
    </div>
</section>
