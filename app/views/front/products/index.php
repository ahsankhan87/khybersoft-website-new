<section class="py-20">
    <div class="max-w-7xl mx-auto px-4">
        <h1 class="font-display text-5xl font-bold mb-6">Our Products</h1>
        <p class="text-xl text-slate-400 mb-12">Discover our software solutions</p>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <?php foreach ($products as $product): ?>
            <a href="<?= url('/products/' . e($product['slug'])) ?>" class="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-blue-500 transition-colors">
                <h3 class="text-xl font-semibold mb-2"><?= e($product['name']) ?></h3>
                <p class="text-slate-400 mb-4"><?= e(str_limit($product['short_desc'] ?? '', 100)) ?></p>
                <div class="text-blue-400 font-semibold">
                    <?php if ($product['price']): ?>
                        <?= money((float)$product['price'], $product['price_currency'] ?? 'USD') ?>
                    <?php else: ?>
                        Contact for pricing
                    <?php endif; ?>
                </div>
            </a>
            <?php endforeach; ?>
        </div>

        <?php if (empty($products)): ?>
        <div class="text-center py-12 text-slate-500">
            No products available yet.
        </div>
        <?php endif; ?>
    </div>
</section>
