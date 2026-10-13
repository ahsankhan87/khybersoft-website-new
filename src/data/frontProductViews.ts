export const frontProductViews = [
  {
    path: 'app/views/front/products/show.php',
    name: 'show.php',
    language: 'php',
    module: 'Products',
    type: 'view',
    description: 'Product detail page with hero, screenshots, features, pricing, demos, FAQ, inquiry form',
    content: `<?php
/**
 * Product Detail View
 * Hero, Screenshots Carousel, Features, Pricing Plans, Demos, Tutorials, FAQ, Inquiry Form, Related Products
 */
\$screenshots = \$screenshots ?? [];
?>

<!-- Product Hero -->
<section class="relative pt-32 pb-20 overflow-hidden">
    <div class="absolute inset-0">
        <div class="absolute top-1/3 left-1/4 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl"></div>
        <div class="absolute bottom-1/3 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
    </div>

    <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
            <div data-aos="fade-right">
                <div class="inline-flex items-center gap-2 px-4 py-2 bg-brand-500/10 border border-brand-500/20 rounded-full text-brand-300 text-sm font-medium mb-6">
                    <span><?= e(\$product['category_name'] ?? 'Software') ?></span>
                </div>

                <h1 class="font-display text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                    <?= e(\$product['name']) ?>
                </h1>

                <?php if (\$product['tagline']): ?>
                <p class="text-2xl text-slate-300 mb-6"><?= e(\$product['tagline']) ?></p>
                <?php endif; ?>

                <p class="text-lg text-slate-400 mb-8"><?= e(\$product['short_desc'] ?? '') ?></p>

                <!-- CTAs -->
                <div class="flex flex-wrap gap-4 mb-8">
                    <?php if (\$product['demo_url']): ?>
                    <a href="<?= e(\$product['demo_url']) ?>" target="_blank" class="group px-8 py-4 bg-gradient-to-r from-brand-600 to-blue-500 text-white font-semibold rounded-2xl hover:shadow-2xl hover:shadow-brand-500/30 transition-all inline-flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/></svg>
                        Live Demo
                    </a>
                    <?php endif; ?>

                    <?php if (\$product['download_url']): ?>
                    <a href="<?= e(\$product['download_url']) ?>" class="px-8 py-4 bg-white/5 backdrop-blur-sm border border-white/10 text-white font-semibold rounded-2xl hover:bg-white/10 transition-all inline-flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                        Download
                    </a>
                    <?php endif; ?>

                    <?php if (\$product['price_type'] !== 'free' && \$product['price']): ?>
                    <a href="#pricing" class="px-8 py-4 bg-white/5 backdrop-blur-sm border border-white/10 text-white font-semibold rounded-2xl hover:bg-white/10 transition-all inline-flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <?= money((float)\$product['price'], \$product['price_currency'] ?? 'USD') ?>
                    </a>
                    <?php endif; ?>

                    <?php if (\$product['video_url']): ?>
                    <a href="<?= e(\$product['video_url']) ?>" target="_blank" class="px-8 py-4 bg-white/5 backdrop-blur-sm border border-white/10 text-white font-semibold rounded-2xl hover:bg-white/10 transition-all inline-flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                        Watch Video
                    </a>
                    <?php endif; ?>
                </div>

                <!-- Quick Stats -->
                <div class="flex items-center gap-6 text-sm text-slate-400">
                    <?php if (\$product['price_type'] === 'free'): ?>
                    <span class="flex items-center gap-2"><span class="w-2 h-2 bg-green-400 rounded-full"></span> Free</span>
                    <?php else: ?>
                    <span class="flex items-center gap-2"><span class="w-2 h-2 bg-brand-400 rounded-full"></span> <?= ucfirst(\$product['price_type'] ?? 'Custom') ?></span>
                    <?php endif; ?>
                    <?php if (\$product['documentation_url']): ?>
                    <a href="<?= e(\$product['documentation_url']) ?>" class="hover:text-white transition-colors">📚 Documentation</a>
                    <?php endif; ?>
                </div>
            </div>

            <!-- Product Image/Video -->
            <div class="relative" data-aos="fade-left" data-aos-delay="200">
                <?php if (\$product['video_url']): ?>
                <div class="glass rounded-3xl overflow-hidden aspect-video">
                    <iframe src="<?= e(\$product['video_url']) ?>" class="w-full h-full" allowfullscreen></iframe>
                </div>
                <?php elseif (\$product['hero_image']): ?>
                <div class="glass rounded-3xl overflow-hidden">
                    <img src="<?= upload(\$product['hero_image']) ?>" alt="<?= e(\$product['name']) ?>" class="w-full">
                </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
</section>

<!-- Screenshots Carousel -->
<?php if (!empty(\$screenshots)): ?>
<section class="py-20 bg-navy-800/30">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="font-display text-3xl font-bold text-white mb-8 text-center" data-aos="fade-up">Product Screenshots</h2>

        <div class="relative" x-data="{ current: 0, total: <?= count(\$screenshots) ?> }">
            <div class="overflow-hidden rounded-2xl">
                <div class="flex transition-transform duration-500" :style="'transform: translateX(-' + (current * 100) + '%)'">
                    <?php foreach (\$screenshots as \$i => \$screenshot): ?>
                    <div class="w-full flex-shrink-0">
                        <img src="<?= upload(\$screenshot) ?>" alt="Screenshot <?= \$i + 1 ?>" class="w-full rounded-2xl">
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>

            <!-- Navigation -->
            <button @click="current = (current - 1 + total) % total" class="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <button @click="current = (current + 1) % total" class="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </button>

            <!-- Dots -->
            <div class="flex justify-center gap-2 mt-6">
                <?php foreach (\$screenshots as \$i => \$screenshot): ?>
                <button @click="current = <?= \$i ?>" :class="current === <?= \$i ?> ? 'bg-brand-500' : 'bg-white/20'" class="w-2 h-2 rounded-full transition-colors"></button>
                <?php endforeach; ?>
            </div>
        </div>
    </div>
</section>
<?php endif; ?>

<!-- Features Grid -->
<?php if (!empty(\$features)): ?>
<section class="py-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12" data-aos="fade-up">
            <h2 class="font-display text-4xl font-bold text-white mb-4">Powerful Features</h2>
            <p class="text-xl text-slate-400">Everything you need to succeed</p>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <?php foreach (\$features as \$i => \$feature): ?>
            <div class="glass rounded-2xl p-6 hover-lift" data-aos="fade-up" data-aos-delay="<?= \$i * 100 ?>">
                <?php if (!empty(\$feature['icon'])): ?>
                <div class="w-14 h-14 bg-gradient-to-br from-brand-500/20 to-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                    <span class="text-2xl"><?= e(\$feature['icon']) ?></span>
                </div>
                <?php endif; ?>
                <h3 class="font-display text-xl font-bold text-white mb-2"><?= e(\$feature['title']) ?></h3>
                <p class="text-slate-400"><?= e(\$feature['description'] ?? '') ?></p>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<!-- Pricing Plans -->
<?php if (!empty(\$plans)): ?>
<section id="pricing" class="py-20 bg-navy-800/30">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12" data-aos="fade-up">
            <h2 class="font-display text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
            <p class="text-xl text-slate-400">Choose the plan that fits your needs</p>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <?php foreach (\$plans as \$i => \$plan):
                \$planFeatures = json_decode(\$plan['features'] ?? '[]', true) ?: [];
            ?>
            <div class="glass rounded-2xl p-8 hover-lift relative <?= \$plan['is_popular'] ? 'border-2 border-brand-500' : '' ?>" data-aos="fade-up" data-aos-delay="<?= \$i * 100 ?>">
                <?php if (\$plan['is_popular']): ?>
                <div class="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-brand-600 to-blue-500 text-white text-sm font-semibold rounded-full">Most Popular</div>
                <?php endif; ?>

                <h3 class="font-display text-2xl font-bold text-white mb-2"><?= e(\$plan['name']) ?></h3>
                <div class="mb-6">
                    <span class="font-display text-5xl font-bold text-white"><?= money((float)\$plan['price'], \$product['price_currency'] ?? 'USD') ?></span>
                    <span class="text-slate-400">/ <?= \$plan['billing_cycle'] ?? 'lifetime' ?></span>
                </div>

                <ul class="space-y-3 mb-8">
                    <?php foreach (\$planFeatures as \$feat): ?>
                    <li class="flex items-start gap-3 text-slate-300">
                        <svg class="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                        <span><?= e(\$feat) ?></span>
                    </li>
                    <?php endforeach; ?>
                </ul>

                <a href="<?= url('/book-demo') ?>" class="block w-full px-6 py-3 text-center font-semibold rounded-xl transition-colors <?= \$plan['is_popular'] ? 'bg-gradient-to-r from-brand-600 to-blue-500 text-white hover:shadow-lg hover:shadow-brand-500/30' : 'bg-white/5 border border-white/10 text-white hover:bg-white/10' ?>">
                    Get Started
                </a>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<!-- Demo Videos -->
<?php if (!empty(\$demos)): ?>
<section class="py-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12" data-aos="fade-up">
            <h2 class="font-display text-4xl font-bold text-white mb-4">See It In Action</h2>
            <p class="text-xl text-slate-400">Watch demo videos and tutorials</p>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <?php foreach (\$demos as \$demo): ?>
            <div class="glass rounded-2xl overflow-hidden hover-lift" data-aos="fade-up">
                <?php if (\$demo['type'] === 'video'): ?>
                <div class="aspect-video">
                    <iframe src="<?= e(\$demo['url']) ?>" class="w-full h-full" allowfullscreen></iframe>
                </div>
                <?php else: ?>
                <div class="aspect-video bg-navy-800 flex items-center justify-center">
                    <img src="<?= upload(\$demo['thumbnail'] ?? '') ?>" alt="<?= e(\$demo['title']) ?>" class="w-full h-full object-cover">
                </div>
                <?php endif; ?>
                <div class="p-6">
                    <h3 class="font-display text-xl font-bold text-white mb-2"><?= e(\$demo['title']) ?></h3>
                    <p class="text-sm text-slate-400"><?= e(ucfirst(\$demo['type'])) ?> Demo</p>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<!-- Tutorials -->
<?php if (!empty(\$tutorials)): ?>
<section class="py-20 bg-navy-800/30">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12" data-aos="fade-up">
            <h2 class="font-display text-4xl font-bold text-white mb-4">Learn & Master</h2>
            <p class="text-xl text-slate-400">Tutorials and guides for this product</p>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <?php foreach (\$tutorials as \$tutorial): ?>
            <a href="<?= url('/tutorials/' . e(\$tutorial['slug'])) ?>" class="glass rounded-2xl overflow-hidden hover-lift group" data-aos="fade-up">
                <?php if (!empty(\$tutorial['thumbnail'])): ?>
                <div class="aspect-video overflow-hidden">
                    <img src="<?= upload(\$tutorial['thumbnail']) ?>" alt="<?= e(\$tutorial['title']) ?>" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                </div>
                <?php endif; ?>
                <div class="p-6">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="px-2 py-1 bg-brand-500/10 text-brand-300 text-xs rounded"><?= e(ucfirst(\$tutorial['difficulty'] ?? 'beginner')) ?></span>
                        <?php if (\$tutorial['duration']): ?>
                        <span class="text-xs text-slate-500"><?= e(\$tutorial['duration']) ?></span>
                        <?php endif; ?>
                    </div>
                    <h3 class="font-display text-lg font-bold text-white group-hover:text-brand-400 transition-colors"><?= e(\$tutorial['title']) ?></h3>
                </div>
            </a>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<!-- FAQ -->
<?php if (!empty(\$faqs)): ?>
<section class="py-20">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12" data-aos="fade-up">
            <h2 class="font-display text-4xl font-bold text-white mb-4">Frequently Asked Questions</h2>
        </div>

        <div class="space-y-4">
            <?php foreach (\$faqs as \$faq): ?>
            <div class="glass rounded-2xl overflow-hidden" x-data="{ open: false }" data-aos="fade-up">
                <button @click="open = !open" class="w-full flex items-center justify-between p-6 text-left">
                    <span class="font-semibold text-white pr-4"><?= e(\$faq['question']) ?></span>
                    <svg :class="open ? 'rotate-180' : ''" class="w-5 h-5 text-brand-400 flex-shrink-0 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                </button>
                <div x-show="open" x-collapse class="px-6 pb-6">
                    <p class="text-slate-400"><?= nl2br(e(\$faq['answer'])) ?></p>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<!-- Inquiry Form -->
<section class="py-20 bg-navy-800/30">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12" data-aos="fade-up">
            <h2 class="font-display text-4xl font-bold text-white mb-4">Get Started Today</h2>
            <p class="text-xl text-slate-400">Book a demo or request a quote</p>
        </div>

        <div class="glass rounded-2xl p-8" x-data="{ tab: 'demo' }" data-aos="fade-up">
            <!-- Tabs -->
            <div class="flex gap-2 mb-8">
                <button @click="tab = 'demo'" :class="tab === 'demo' ? 'bg-brand-600 text-white' : 'bg-white/5 text-slate-400'" class="flex-1 px-6 py-3 rounded-xl font-medium transition-colors">Book Demo</button>
                <button @click="tab = 'quote'" :class="tab === 'quote' ? 'bg-brand-600 text-white' : 'bg-white/5 text-slate-400'" class="flex-1 px-6 py-3 rounded-xl font-medium transition-colors">Get Quote</button>
            </div>

            <form method="POST" action="<?= url('/products/' . e(\$product['slug']) . '/inquire') ?>">
                <?= \\App\\Core\\CSRF::field() ?>
                <input type="hidden" name="type" :value="tab">

                <div class="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-300 mb-2">Name *</label>
                        <input type="text" name="name" required class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-300 mb-2">Email *</label>
                        <input type="email" name="email" required class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500">
                    </div>
                </div>

                <div class="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                        <input type="tel" name="phone" class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-300 mb-2">Company</label>
                        <input type="text" name="company" class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500">
                    </div>
                </div>

                <div class="mb-6">
                    <label class="block text-sm font-medium text-slate-300 mb-2">Message *</label>
                    <textarea name="message" rows="4" required class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none"></textarea>
                </div>

                <button type="submit" class="w-full px-8 py-4 bg-gradient-to-r from-brand-600 to-blue-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-brand-500/30 transition-all">
                    <span x-text="tab === 'demo' ? 'Book Demo' : 'Request Quote'"></span>
                </button>
            </form>
        </div>
    </div>
</section>

<!-- Related Products -->
<?php if (!empty(\$related)): ?>
<section class="py-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="font-display text-3xl font-bold text-white mb-8 text-center" data-aos="fade-up">Related Products</h2>

        <div class="grid md:grid-cols-3 gap-8">
            <?php foreach (\$related as \$rel): ?>
            <a href="<?= url('/products/' . e(\$rel['slug'])) ?>" class="glass rounded-2xl overflow-hidden hover-lift group" data-aos="fade-up">
                <?php if (!empty(\$rel['hero_image'])): ?>
                <div class="aspect-video overflow-hidden">
                    <img src="<?= upload(\$rel['hero_image']) ?>" alt="<?= e(\$rel['name']) ?>" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                </div>
                <?php endif; ?>
                <div class="p-6">
                    <h3 class="font-display text-xl font-bold text-white mb-2 group-hover:text-brand-400 transition-colors"><?= e(\$rel['name']) ?></h3>
                    <p class="text-slate-400 text-sm"><?= e(str_limit(\$rel['short_desc'] ?? '', 80)) ?></p>
                </div>
            </a>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<!-- Sticky CTA on Scroll -->
<div class="fixed bottom-0 left-0 right-0 bg-navy-900/95 backdrop-blur-xl border-t border-white/10 py-4 px-4 sm:px-6 lg:px-8 z-40 transform translate-y-full transition-transform" id="sticky-cta">
    <div class="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div class="flex-1">
            <h3 class="font-display text-lg font-bold text-white"><?= e(\$product['name']) ?></h3>
            <?php if (\$product['price']): ?>
            <p class="text-sm text-slate-400">Starting at <?= money((float)\$product['price'], \$product['price_currency'] ?? 'USD') ?></p>
            <?php endif; ?>
        </div>
        <div class="flex gap-3">
            <?php if (\$product['demo_url']): ?>
            <a href="<?= e(\$product['demo_url']) ?>" target="_blank" class="px-6 py-2.5 bg-white/5 border border-white/10 text-white font-medium rounded-xl hover:bg-white/10 transition-colors">Demo</a>
            <?php endif; ?>
            <a href="#pricing" class="px-6 py-2.5 bg-gradient-to-r from-brand-600 to-blue-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-brand-500/30 transition-all">Get Started</a>
        </div>
    </div>
</div>

<script>
// Show sticky CTA after scrolling past hero
const stickyCta = document.getElementById('sticky-cta');
const heroSection = document.querySelector('section');
if (stickyCta && heroSection) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > heroSection.offsetHeight) {
            stickyCta.classList.remove('translate-y-full');
        } else {
            stickyCta.classList.add('translate-y-full');
        }
    });
}
</script>
`
  },
];
