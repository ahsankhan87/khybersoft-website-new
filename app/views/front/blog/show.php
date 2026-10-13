<section class="py-20">
    <div class="max-w-4xl mx-auto px-4">
        <a href="<?= url('/blog') ?>" class="text-blue-400 hover:underline mb-6 inline-block">← Back to Blog</a>
        
        <?php if ($post['featured_image']): ?>
        <div class="aspect-video overflow-hidden rounded-xl mb-8">
            <img src="<?= upload($post['featured_image']) ?>" alt="<?= e($post['title']) ?>" class="w-full h-full object-cover">
        </div>
        <?php endif; ?>

        <h1 class="font-display text-5xl font-bold mb-4"><?= e($post['title']) ?></h1>
        
        <div class="text-sm text-slate-500 mb-8">
            Published on <?= format_date($post['created_at']) ?>
        </div>

        <div class="bg-slate-800 rounded-xl p-8 border border-slate-700">
            <div class="text-slate-300 space-y-4 prose prose-invert max-w-none">
                <?= $post['content'] ?>
            </div>
        </div>
    </div>
</section>
