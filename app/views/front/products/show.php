<section class="py-20">
    <div class="max-w-4xl mx-auto px-4">
        <a href="<?= url('/products') ?>" class="text-blue-400 hover:underline mb-6 inline-block">← Back to Products</a>
        
        <h1 class="font-display text-5xl font-bold mb-4"><?= e($product['name']) ?></h1>
        
        <?php if ($product['tagline']): ?>
        <p class="text-xl text-slate-400 mb-6"><?= e($product['tagline']) ?></p>
        <?php endif; ?>

        <div class="bg-slate-800 rounded-xl p-8 border border-slate-700 mb-8">
            <h2 class="text-2xl font-semibold mb-4">Description</h2>
            <div class="text-slate-300 space-y-4">
                <?= $product['full_desc'] ?? e($product['short_desc'] ?? '') ?>
            </div>
        </div>

        <div class="bg-slate-800 rounded-xl p-8 border border-slate-700">
            <h2 class="text-2xl font-semibold mb-4">Pricing</h2>
            <div class="text-3xl font-bold text-blue-400 mb-2">
                <?php if ($product['price']): ?>
                    <?= money((float)$product['price'], $product['price_currency'] ?? 'USD') ?>
                    <?php if ($product['billing_cycle']): ?>
                        <span class="text-lg text-slate-400">/ <?= e($product['billing_cycle']) ?></span>
                    <?php endif; ?>
                <?php else: ?>
                    Contact for pricing
                <?php endif; ?>
            </div>
            
            <?php if ($product['demo_url']): ?>
            <a href="<?= e($product['demo_url']) ?>" target="_blank" class="inline-block mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl">
                View Demo
            </a>
            <?php endif; ?>
        </div>
    </div>
</section>
