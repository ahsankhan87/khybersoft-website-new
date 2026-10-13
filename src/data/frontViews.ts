export const frontViewFiles = [
  {
    path: 'app/views/front/home/index.php',
    name: 'index.php',
    language: 'php',
    module: 'Homepage',
    type: 'view',
    description: 'Homepage with hero, products, testimonials, blog, CTA sections',
    content: `<?php
/**
 * Homepage View
 * Hero, Trust Bar, Products, Features, Stats, Services, Testimonials, Blog, CTA
 */
?>

<!-- Hero Section -->
<section class="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
    <!-- Animated Background -->
    <div class="absolute inset-0">
        <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style="animation-delay: 2s;"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-600/10 rounded-full blur-3xl"></div>
    </div>

    <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
            <!-- Left Content -->
            <div class="text-center lg:text-left" data-aos="fade-right">
                <div class="inline-flex items-center gap-2 px-4 py-2 bg-brand-500/10 border border-brand-500/20 rounded-full text-brand-300 text-sm font-medium mb-6">
                    <span class="w-2 h-2 bg-brand-400 rounded-full animate-pulse"></span>
                    Trusted by 80+ Companies Worldwide
                </div>

                <h1 class="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                    Transform Your<br>
                    <span class="gradient-text">Business</span> With<br>
                    Smart Software
                </h1>

                <p class="text-xl text-slate-300 mb-8 max-w-xl mx-auto lg:mx-0">
                    Powerful ERP, CRM, HRM, and LMS solutions designed to streamline your operations and accelerate growth.
                </p>

                <div class="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                    <a href="<?= url('/products') ?>" class="group px-8 py-4 bg-gradient-to-r from-brand-600 to-blue-500 text-white font-semibold rounded-2xl hover:shadow-2xl hover:shadow-brand-500/30 transition-all inline-flex items-center justify-center gap-2">
                        Explore Products
                        <svg class="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                    </a>
                    <a href="<?= url('/book-demo') ?>" class="px-8 py-4 bg-white/5 backdrop-blur-sm border border-white/10 text-white font-semibold rounded-2xl hover:bg-white/10 transition-all inline-flex items-center justify-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/></svg>
                        Book Free Demo
                    </a>
                </div>

                <!-- Floating Badges -->
                <div class="flex items-center gap-6 mt-12 justify-center lg:justify-start">
                    <div class="flex -space-x-3">
                        <?php for (\$i = 1; \$i <= 4; \$i++): ?>
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-blue-500 border-2 border-navy-900 flex items-center justify-center text-white text-xs font-bold">
                            <?= \$i ?>
                        </div>
                        <?php endfor; ?>
                    </div>
                    <div class="text-left">
                        <div class="flex items-center gap-1 text-amber-400">
                            <?php for (\$i = 0; \$i < 5; \$i++): ?>
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                            <?php endfor; ?>
                        </div>
                        <p class="text-sm text-slate-400">4.9/5 from 200+ reviews</p>
                    </div>
                </div>
            </div>

            <!-- Right: Product Mockup -->
            <div class="relative" data-aos="fade-left" data-aos-delay="200">
                <div class="relative glass rounded-3xl p-8 shadow-2xl">
                    <!-- Dashboard Mockup -->
                    <div class="bg-navy-800 rounded-2xl p-6 space-y-4">
                        <div class="flex items-center justify-between mb-6">
                            <div class="flex items-center gap-2">
                                <div class="w-3 h-3 rounded-full bg-red-500"></div>
                                <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div class="w-3 h-3 rounded-full bg-green-500"></div>
                            </div>
                            <div class="text-xs text-slate-500 font-mono">dashboard.khybersoft.com</div>
                        </div>

                        <!-- Stats Cards -->
                        <div class="grid grid-cols-3 gap-3 mb-4">
                            <?php foreach ([['Revenue', '\$48.2K', '+12%'], ['Users', '2,847', '+8%'], ['Orders', '1,234', '+15%']] as [\$label, \$value, \$change]): ?>
                            <div class="bg-white/5 rounded-xl p-3">
                                <p class="text-xs text-slate-400 mb-1"><?= \$label ?></p>
                                <p class="text-lg font-bold text-white"><?= \$value ?></p>
                                <p class="text-xs text-green-400"><?= \$change ?></p>
                            </div>
                            <?php endforeach; ?>
                        </div>

                        <!-- Chart Placeholder -->
                        <div class="bg-white/5 rounded-xl p-4 h-32 flex items-end justify-between gap-2">
                            <?php foreach ([40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88] as \$h): ?>
                            <div class="flex-1 bg-gradient-to-t from-brand-500 to-blue-400 rounded-t opacity-80" style="height: <?= \$h ?>%"></div>
                            <?php endforeach; ?>
                        </div>
                    </div>

                    <!-- Floating Elements -->
                    <div class="absolute -top-4 -right-4 bg-green-500 text-white px-4 py-2 rounded-xl shadow-lg animate-bounce text-sm font-semibold">
                        ✓ Live Demo Available
                    </div>
                    <div class="absolute -bottom-4 -left-4 bg-brand-600 text-white px-4 py-2 rounded-xl shadow-lg text-sm font-semibold">
                        🚀 150+ Projects Delivered
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Trust Bar - Client Logos -->
<section class="py-12 border-y border-white/10 bg-navy-800/50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p class="text-center text-sm text-slate-400 mb-8">Trusted by leading companies worldwide</p>
        <div class="relative overflow-hidden">
            <div class="flex animate-marquee">
                <?php foreach (array_merge(\$clients ?? [], \$clients ?? []) as \$client): ?>
                <div class="flex-shrink-0 mx-8">
                    <?php if (!empty(\$client['logo'])): ?>
                    <img src="<?= upload(\$client['logo']) ?>" alt="<?= e(\$client['name']) ?>" class="h-12 opacity-50 hover:opacity-100 transition-opacity grayscale hover:grayscale-0">
                    <?php else: ?>
                    <div class="h-12 px-6 flex items-center text-slate-400 font-semibold text-lg"><?= e(\$client['name']) ?></div>
                    <?php endif; ?>
                </div>
                <?php endforeach; ?>
            </div>
        </div>
    </div>
</section>

<!-- Product Categories -->
<section class="py-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12" data-aos="fade-up">
            <h2 class="font-display text-4xl font-bold text-white mb-4">Our Product Suite</h2>
            <p class="text-xl text-slate-400 max-w-2xl mx-auto">Comprehensive solutions for every aspect of your business</p>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <?php foreach (\$product_categories ?? [] as \$cat): ?>
            <a href="<?= url('/products?category=' . e(\$cat['slug'])) ?>" class="group glass rounded-2xl p-6 hover-lift" data-aos="fade-up" data-aos-delay="<?= loop_delay() ?>">
                <div class="w-14 h-14 bg-gradient-to-br from-brand-500/20 to-blue-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <?php if (!empty(\$cat['icon'])): ?>
                    <span class="text-2xl"><?= e(\$cat['icon']) ?></span>
                    <?php else: ?>
                    <svg class="w-7 h-7 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                    <?php endif; ?>
                </div>
                <h3 class="font-semibold text-white mb-2 group-hover:text-brand-400 transition-colors"><?= e(\$cat['name']) ?></h3>
                <p class="text-sm text-slate-400"><?= e(str_limit(\$cat['description'] ?? '', 60)) ?></p>
            </a>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<!-- Featured Products -->
<section class="py-20 bg-navy-800/30">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12" data-aos="fade-up">
            <h2 class="font-display text-4xl font-bold text-white mb-4">Featured Products</h2>
            <p class="text-xl text-slate-400">Our most popular solutions</p>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <?php foreach (\$featured_products ?? [] as \$product): ?>
            <div class="glass rounded-2xl overflow-hidden hover-lift group" data-aos="fade-up" data-aos-delay="<?= loop_delay() ?>">
                <?php if (!empty(\$product['hero_image'])): ?>
                <div class="aspect-video overflow-hidden">
                    <img src="<?= upload(\$product['hero_image']) ?>" alt="<?= e(\$product['name']) ?>" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                </div>
                <?php endif; ?>
                <div class="p-6">
                    <div class="flex items-center gap-2 mb-3">
                        <span class="px-3 py-1 bg-brand-500/10 text-brand-300 text-xs font-medium rounded-full"><?= e(\$product['category_name'] ?? 'Software') ?></span>
                        <?php if (\$product['price_type'] === 'free'): ?>
                        <span class="px-3 py-1 bg-green-500/10 text-green-300 text-xs font-medium rounded-full">Free</span>
                        <?php endif; ?>
                    </div>
                    <h3 class="font-display text-xl font-bold text-white mb-2 group-hover:text-brand-400 transition-colors"><?= e(\$product['name']) ?></h3>
                    <p class="text-slate-400 text-sm mb-4"><?= e(str_limit(\$product['short_desc'] ?? '', 100)) ?></p>

                    <div class="flex items-center gap-3">
                        <a href="<?= url('/products/' . e(\$product['slug'])) ?>" class="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-xl text-center transition-colors">Learn More</a>
                        <?php if (\$product['demo_url']): ?>
                        <a href="<?= e(\$product['demo_url']) ?>" target="_blank" class="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-xl transition-colors">Demo</a>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>

        <div class="text-center mt-12">
            <a href="<?= url('/products') ?>" class="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl transition-colors">
                View All Products
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
            </a>
        </div>
    </div>
</section>

<!-- Why Khybersoft -->
<section class="py-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12" data-aos="fade-up">
            <h2 class="font-display text-4xl font-bold text-white mb-4">Why Choose Khybersoft?</h2>
            <p class="text-xl text-slate-400">Built for performance, designed for success</p>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <?php
            \$features = [
                ['icon' => '⚡', 'title' => 'Lightning Fast', 'desc' => 'Optimized for speed and performance'],
                ['icon' => '🔒', 'title' => 'Enterprise Security', 'desc' => 'Bank-level encryption and compliance'],
                ['icon' => '📱', 'title' => 'Mobile Ready', 'desc' => 'Fully responsive on all devices'],
                ['icon' => '🎨', 'title' => 'Customizable', 'desc' => 'Tailor to your exact needs'],
                ['icon' => '🤝', 'title' => '24/7 Support', 'desc' => 'Dedicated support team always ready'],
                ['icon' => '🚀', 'title' => 'Scalable', 'desc' => 'Grows with your business'],
            ];
            foreach (\$features as \$i => \$feat):
            ?>
            <div class="glass rounded-2xl p-6 hover-lift" data-aos="fade-up" data-aos-delay="<?= \$i * 100 ?>">
                <div class="text-4xl mb-4"><?= \$feat['icon'] ?></div>
                <h3 class="font-display text-xl font-bold text-white mb-2"><?= \$feat['title'] ?></h3>
                <p class="text-slate-400"><?= \$feat['desc'] ?></p>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<!-- Stats Counter -->
<section class="py-20 bg-gradient-to-r from-brand-600/10 to-blue-600/10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <?php foreach (\$stats ?? [] as \$stat): ?>
            <div class="text-center" data-aos="zoom-in">
                <div class="font-display text-5xl font-bold gradient-text mb-2"><?= e(\$stat['value']) ?></div>
                <p class="text-slate-400"><?= e(\$stat['label']) ?></p>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<!-- Services Preview -->
<section class="py-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12" data-aos="fade-up">
            <h2 class="font-display text-4xl font-bold text-white mb-4">Our Services</h2>
            <p class="text-xl text-slate-400">Beyond software - complete business solutions</p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
            <?php foreach (\$services ?? [] as \$service): ?>
            <div class="glass rounded-2xl p-8 hover-lift" data-aos="fade-up" data-aos-delay="<?= loop_delay() ?>">
                <?php if (!empty(\$service['icon'])): ?>
                <img src="<?= upload(\$service['icon']) ?>" alt="" class="w-16 h-16 mb-4">
                <?php endif; ?>
                <h3 class="font-display text-2xl font-bold text-white mb-3"><?= e(\$service['title']) ?></h3>
                <p class="text-slate-400 mb-6"><?= e(str_limit(\$service['short_desc'] ?? '', 120)) ?></p>
                <a href="<?= url('/services/' . e(\$service['slug'])) ?>" class="inline-flex items-center gap-2 text-brand-400 hover:text-brand-300 font-medium">
                    Learn More <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                </a>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<!-- Testimonials Slider -->
<section class="py-20 bg-navy-800/30">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12" data-aos="fade-up">
            <h2 class="font-display text-4xl font-bold text-white mb-4">What Our Clients Say</h2>
            <p class="text-xl text-slate-400">Trusted by businesses worldwide</p>
        </div>

        <div class="grid md:grid-cols-3 gap-8" x-data="{ current: 0 }" x-init="setInterval(() => current = (current + 1) % <?= count(\$testimonials ?? [1]) ?>, 5000)">
            <?php foreach (\$testimonials ?? [] as \$i => \$testimonial): ?>
            <div x-show="current === <?= \$i ?>" x-transition class="glass rounded-2xl p-8">
                <div class="flex items-center gap-1 mb-4">
                    <?php for (\$s = 0; \$s < (\$testimonial['rating'] ?? 5); \$s++): ?>
                    <svg class="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    <?php endfor; ?>
                </div>
                <p class="text-slate-300 mb-6 italic">"<?= e(\$testimonial['message']) ?>"</p>
                <div class="flex items-center gap-3">
                    <?php if (!empty(\$testimonial['photo'])): ?>
                    <img src="<?= upload(\$testimonial['photo']) ?>" class="w-12 h-12 rounded-full object-cover" alt="">
                    <?php endif; ?>
                    <div>
                        <p class="font-semibold text-white"><?= e(\$testimonial['name']) ?></p>
                        <p class="text-sm text-slate-400"><?= e((\$testimonial['role'] ?? '') . (\$testimonial['company'] ? ' at ' . \$testimonial['company'] : '')) ?></p>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<!-- Latest Blog Posts -->
<section class="py-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12" data-aos="fade-up">
            <h2 class="font-display text-4xl font-bold text-white mb-4">Latest from Our Blog</h2>
            <p class="text-xl text-slate-400">Insights, tips, and industry news</p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
            <?php foreach (\$latest_posts ?? [] as \$post): ?>
            <article class="glass rounded-2xl overflow-hidden hover-lift group" data-aos="fade-up" data-aos-delay="<?= loop_delay() ?>">
                <?php if (!empty(\$post['featured_image'])): ?>
                <div class="aspect-video overflow-hidden">
                    <img src="<?= upload(\$post['featured_image']) ?>" alt="<?= e(\$post['title']) ?>" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                </div>
                <?php endif; ?>
                <div class="p-6">
                    <div class="flex items-center gap-2 mb-3">
                        <span class="px-3 py-1 bg-brand-500/10 text-brand-300 text-xs font-medium rounded-full"><?= e(\$post['category_name'] ?? 'Blog') ?></span>
                        <span class="text-xs text-slate-500"><?= format_date(\$post['published_at']) ?></span>
                    </div>
                    <h3 class="font-display text-xl font-bold text-white mb-2 group-hover:text-brand-400 transition-colors line-clamp-2">
                        <a href="<?= url('/blog/' . e(\$post['slug'])) ?>"><?= e(\$post['title']) ?></a>
                    </h3>
                    <p class="text-slate-400 text-sm mb-4 line-clamp-2"><?= e(str_limit(strip_tags(\$post['excerpt'] ?? ''), 100)) ?></p>
                    <a href="<?= url('/blog/' . e(\$post['slug'])) ?>" class="text-brand-400 hover:text-brand-300 text-sm font-medium inline-flex items-center gap-1">
                        Read More <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                    </a>
                </div>
            </article>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<!-- Newsletter CTA -->
<section class="py-20 bg-gradient-to-r from-brand-600 to-blue-600">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center" data-aos="zoom-in">
        <h2 class="font-display text-4xl font-bold text-white mb-4">Stay Updated</h2>
        <p class="text-xl text-white/80 mb-8">Get the latest news, product updates, and exclusive offers</p>
        <form method="POST" action="<?= url('/newsletter/subscribe') ?>" class="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <?= \\App\\Core\\CSRF::field() ?>
            <input type="email" name="email" placeholder="Enter your email" required class="flex-1 px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-white/40">
            <button type="submit" class="px-8 py-4 bg-white text-brand-600 font-semibold rounded-2xl hover:bg-white/90 transition-colors">Subscribe</button>
        </form>
    </div>
</section>

<!-- Final CTA -->
<section class="py-20">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center" data-aos="fade-up">
        <h2 class="font-display text-5xl font-bold text-white mb-6">Ready to Transform Your Business?</h2>
        <p class="text-xl text-slate-400 mb-8">Join 80+ companies already using Khybersoft solutions</p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="<?= url('/book-demo') ?>" class="px-8 py-4 bg-gradient-to-r from-brand-600 to-blue-500 text-white font-semibold rounded-2xl hover:shadow-2xl hover:shadow-brand-500/30 transition-all">Book Free Demo</a>
            <a href="<?= url('/contact') ?>" class="px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-2xl hover:bg-white/10 transition-all">Contact Sales</a>
        </div>
    </div>
</section>

<?php
// Helper function for AOS delay
if (!function_exists('loop_delay')) {
    function loop_delay(): int {
        static \$i = 0;
        return (\$i++ % 3) * 100;
    }
}
?>
`
  },
];
