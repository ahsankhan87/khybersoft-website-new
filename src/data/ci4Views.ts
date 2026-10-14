export interface CI4File {
  path: string;
  name: string;
  language: string;
  content: string;
  description: string;
  category: string;
}

export const ci4ViewsFrontend: CI4File[] = [
  {
    path: 'app/Views/frontend/home/index.php',
    name: 'index.php',
    language: 'php',
    category: 'Frontend Views',
    description: 'Homepage view',
    content: `<?= $this->extend('frontend/layout') ?>
<?= $this->section('content') ?>

<!-- Hero Section -->
<section class="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
    <div class="absolute inset-0">
        <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style="animation-delay: 2s;"></div>
    </div>

    <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
            <div class="text-center lg:text-left" data-aos="fade-right">
                <div class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-300 text-sm font-medium mb-6">
                    <span class="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span>
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
                    <a href="<?= base_url('products') ?>" class="group px-8 py-4 bg-gradient-to-r from-indigo-600 to-blue-500 text-white font-semibold rounded-2xl hover:shadow-2xl hover:shadow-indigo-500/30 transition-all inline-flex items-center justify-center gap-2">
                        Explore Products
                        <svg class="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                    </a>
                    <a href="<?= base_url('contact') ?>" class="px-8 py-4 bg-white/5 backdrop-blur-sm border border-white/10 text-white font-semibold rounded-2xl hover:bg-white/10 transition-all inline-flex items-center justify-center gap-2">
                        Contact Us
                    </a>
                </div>
            </div>

            <div class="relative" data-aos="fade-left" data-aos-delay="200">
                <div class="relative glass rounded-3xl p-8 shadow-2xl">
                    <div class="bg-slate-800 rounded-2xl p-6 space-y-4">
                        <div class="flex items-center justify-between mb-6">
                            <div class="flex items-center gap-2">
                                <div class="w-3 h-3 rounded-full bg-red-500"></div>
                                <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div class="w-3 h-3 rounded-full bg-green-500"></div>
                            </div>
                            <div class="text-xs text-slate-500 font-mono">dashboard.khybersoft.com</div>
                        </div>

                        <div class="grid grid-cols-3 gap-3 mb-4">
                            <div class="bg-white/5 rounded-xl p-3">
                                <p class="text-xs text-slate-400 mb-1">Revenue</p>
                                <p class="text-lg font-bold text-white">$48.2K</p>
                                <p class="text-xs text-green-400">+12%</p>
                            </div>
                            <div class="bg-white/5 rounded-xl p-3">
                                <p class="text-xs text-slate-400 mb-1">Users</p>
                                <p class="text-lg font-bold text-white">2,847</p>
                                <p class="text-xs text-green-400">+8%</p>
                            </div>
                            <div class="bg-white/5 rounded-xl p-3">
                                <p class="text-xs text-slate-400 mb-1">Orders</p>
                                <p class="text-lg font-bold text-white">1,234</p>
                                <p class="text-xs text-green-400">+15%</p>
                            </div>
                        </div>

                        <div class="bg-white/5 rounded-xl p-4 h-32 flex items-end justify-between gap-2">
                            <?php foreach ([40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88] as $h): ?>
                            <div class="flex-1 bg-gradient-to-t from-indigo-500 to-blue-400 rounded-t opacity-80" style="height: <?= $h ?>%"></div>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Featured Products -->
<?php if (!empty($featured_products)): ?>
<section class="py-20 bg-slate-800/30">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12" data-aos="fade-up">
            <h2 class="font-display text-4xl font-bold text-white mb-4">Featured Products</h2>
            <p class="text-xl text-slate-400">Our most popular solutions</p>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <?php foreach ($featured_products as $product): ?>
            <div class="glass rounded-2xl overflow-hidden hover-lift group" data-aos="fade-up">
                <?php if (!empty($product['hero_image'])): ?>
                <div class="aspect-video overflow-hidden">
                    <img src="<?= base_url('uploads/' . $product['hero_image']) ?>" alt="<?= esc($product['name']) ?>" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                </div>
                <?php endif; ?>
                <div class="p-6">
                    <div class="flex items-center gap-2 mb-3">
                        <span class="px-3 py-1 bg-indigo-500/10 text-indigo-300 text-xs font-medium rounded-full"><?= esc($product['category_name'] ?? 'Software') ?></span>
                        <?php if ($product['price_type'] === 'free'): ?>
                        <span class="px-3 py-1 bg-green-500/10 text-green-300 text-xs font-medium rounded-full">Free</span>
                        <?php endif; ?>
                    </div>
                    <h3 class="font-display text-xl font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors"><?= esc($product['name']) ?></h3>
                    <p class="text-slate-400 text-sm mb-4"><?= esc(character_limiter($product['short_desc'] ?? '', 100)) ?></p>

                    <div class="flex items-center gap-3">
                        <a href="<?= base_url('products/' . $product['slug']) ?>" class="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl text-center transition-colors">Learn More</a>
                        <?php if (!empty($product['demo_url'])): ?>
                        <a href="<?= esc($product['demo_url']) ?>" target="_blank" class="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-xl transition-colors">Demo</a>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<!-- Stats Section -->
<section class="py-20 bg-gradient-to-r from-indigo-600/10 to-blue-600/10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <?php foreach ($stats as $stat): ?>
            <div class="text-center" data-aos="zoom-in">
                <div class="font-display text-5xl font-bold gradient-text mb-2"><?= esc($stat['value']) ?></div>
                <p class="text-slate-400"><?= esc($stat['label']) ?></p>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<!-- Testimonials -->
<?php if (!empty($testimonials)): ?>
<section class="py-20 bg-slate-800/30">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12" data-aos="fade-up">
            <h2 class="font-display text-4xl font-bold text-white mb-4">What Our Clients Say</h2>
            <p class="text-xl text-slate-400">Trusted by businesses worldwide</p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
            <?php foreach (array_slice($testimonials, 0, 3) as $testimonial): ?>
            <div class="glass rounded-2xl p-8" data-aos="fade-up">
                <div class="flex items-center gap-1 mb-4">
                    <?php for ($i = 0; $i < ($testimonial['rating'] ?? 5); $i++): ?>
                    <svg class="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    <?php endfor; ?>
                </div>
                <p class="text-slate-300 mb-6 italic">"<?= esc($testimonial['message']) ?>"</p>
                <div class="flex items-center gap-3">
                    <?php if (!empty($testimonial['photo'])): ?>
                    <img src="<?= base_url('uploads/' . $testimonial['photo']) ?>" class="w-12 h-12 rounded-full object-cover" alt="">
                    <?php endif; ?>
                    <div>
                        <p class="font-semibold text-white"><?= esc($testimonial['name']) ?></p>
                        <p class="text-sm text-slate-400"><?= esc(($testimonial['role'] ?? '') . ($testimonial['company'] ? ' at ' . $testimonial['company'] : '')) ?></p>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<!-- Latest Blog Posts -->
<?php if (!empty($latest_posts)): ?>
<section class="py-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12" data-aos="fade-up">
            <h2 class="font-display text-4xl font-bold text-white mb-4">Latest from Our Blog</h2>
            <p class="text-xl text-slate-400">Insights, tips, and industry news</p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
            <?php foreach ($latest_posts as $post): ?>
            <article class="glass rounded-2xl overflow-hidden hover-lift group" data-aos="fade-up">
                <?php if (!empty($post['featured_image'])): ?>
                <div class="aspect-video overflow-hidden">
                    <img src="<?= base_url('uploads/' . $post['featured_image']) ?>" alt="<?= esc($post['title']) ?>" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                </div>
                <?php endif; ?>
                <div class="p-6">
                    <div class="flex items-center gap-2 mb-3">
                        <span class="px-3 py-1 bg-indigo-500/10 text-indigo-300 text-xs font-medium rounded-full"><?= esc($post['category_name'] ?? 'Blog') ?></span>
                        <span class="text-xs text-slate-500"><?= date('M d, Y', strtotime($post['published_at'] ?? $post['created_at'])) ?></span>
                    </div>
                    <h3 class="font-display text-xl font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors line-clamp-2">
                        <a href="<?= base_url('blog/' . $post['slug']) ?>"><?= esc($post['title']) ?></a>
                    </h3>
                    <p class="text-slate-400 text-sm mb-4 line-clamp-2"><?= esc(character_limiter(strip_tags($post['excerpt'] ?? ''), 100)) ?></p>
                    <a href="<?= base_url('blog/' . $post['slug']) ?>" class="text-indigo-400 hover:text-indigo-300 text-sm font-medium inline-flex items-center gap-1">
                        Read More <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                    </a>
                </div>
            </article>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<!-- CTA Section -->
<section class="py-20 bg-gradient-to-r from-indigo-600 to-blue-600">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center" data-aos="zoom-in">
        <h2 class="font-display text-4xl font-bold text-white mb-4">Stay Updated</h2>
        <p class="text-xl text-white/80 mb-8">Get the latest news, product updates, and exclusive offers</p>
        <form method="POST" action="<?= base_url('newsletter/subscribe') ?>" class="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <?= csrf_field() ?>
            <input type="email" name="email" placeholder="Enter your email" required class="flex-1 px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-white/40">
            <button type="submit" class="px-8 py-4 bg-white text-indigo-600 font-semibold rounded-2xl hover:bg-white/90 transition-colors">Subscribe</button>
        </form>
    </div>
</section>

<?= $this->endSection() ?>
`
  },
];

export const ci4ViewsAdmin: CI4File[] = [
  {
    path: 'app/Views/admin/dashboard.php',
    name: 'dashboard.php',
    language: 'php',
    category: 'Admin Views',
    description: 'Admin dashboard view',
    content: `<?= $this->extend('admin/layout') ?>
<?= $this->section('content') ?>

<div class="space-y-6">
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p class="text-sm text-gray-500 dark:text-slate-400 mt-1">Welcome back, <?= esc($user['name'] ?? 'Admin') ?>.</p>
        </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow">
            <div class="flex items-start justify-between">
                <div>
                    <p class="text-sm font-medium text-gray-500 dark:text-slate-400">Total Products</p>
                    <p class="text-3xl font-bold text-gray-900 dark:text-white mt-1"><?= number_format($stats['total_products']) ?></p>
                    <p class="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">+12% from last week</p>
                </div>
                <div class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                </div>
            </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow">
            <div class="flex items-start justify-between">
                <div>
                    <p class="text-sm font-medium text-gray-500 dark:text-slate-400">Inquiries Today</p>
                    <p class="text-3xl font-bold text-gray-900 dark:text-white mt-1"><?= number_format($stats['inquiries_today']) ?></p>
                    <p class="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">+5% from yesterday</p>
                </div>
                <div class="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                </div>
            </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow">
            <div class="flex items-start justify-between">
                <div>
                    <p class="text-sm font-medium text-gray-500 dark:text-slate-400">Blog Posts</p>
                    <p class="text-3xl font-bold text-gray-900 dark:text-white mt-1"><?= number_format($stats['blog_posts']) ?></p>
                    <p class="text-xs text-purple-600 dark:text-purple-400 mt-1 font-medium">+3 new this week</p>
                </div>
                <div class="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <svg class="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>
                </div>
            </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow">
            <div class="flex items-start justify-between">
                <div>
                    <p class="text-sm font-medium text-gray-500 dark:text-slate-400">Subscribers</p>
                    <p class="text-3xl font-bold text-gray-900 dark:text-white mt-1"><?= number_format($stats['subscribers']) ?></p>
                    <p class="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">+8% this month</p>
                </div>
                <div class="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <svg class="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                </div>
            </div>
        </div>
    </div>

    <!-- Recent Inquiries -->
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
        <div class="p-5 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Recent Inquiries</h2>
            <a href="<?= base_url('admin/inquiries') ?>" class="text-sm text-blue-600 dark:text-blue-400 hover:underline">View all</a>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead>
                    <tr class="border-b border-gray-200 dark:border-slate-700">
                        <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Name</th>
                        <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Product</th>
                        <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Status</th>
                        <th class="py-3 px-4 text-left font-medium text-gray-500 dark:text-slate-400">Date</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($recent_inquiries)): ?>
                    <tr><td colspan="4" class="py-8 text-center text-gray-400">No inquiries yet</td></tr>
                    <?php else: ?>
                    <?php foreach (array_slice($recent_inquiries, 0, 8) as $inq): ?>
                    <tr class="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                        <td class="py-3 px-4">
                            <div class="font-medium text-gray-900 dark:text-white"><?= esc($inq['name']) ?></div>
                            <div class="text-xs text-gray-500"><?= esc($inq['email']) ?></div>
                        </td>
                        <td class="py-3 px-4 text-gray-600 dark:text-slate-300"><?= esc($inq['product_name'] ?? 'N/A') ?></td>
                        <td class="py-3 px-4">
                            <select onchange="updateInquiryStatus(<?= $inq['id'] ?>, this.value)" class="text-xs rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-300 px-2 py-1">
                                <?php foreach (['new', 'in_progress', 'resolved', 'closed'] as $s): ?>
                                <option value="<?= $s ?>" <?= $inq['status'] === $s ? 'selected' : '' ?>><?= ucfirst(str_replace('_', ' ', $s)) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </td>
                        <td class="py-3 px-4 text-gray-500 text-xs"><?= date('M d, Y', strtotime($inq['created_at'])) ?></td>
                    </tr>
                    <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Recent Activity -->
    <div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
        <div class="p-5 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
            <a href="<?= base_url('admin/activity-logs') ?>" class="text-sm text-blue-600 dark:text-blue-400 hover:underline">View all</a>
        </div>
        <div class="p-5 space-y-4 max-h-80 overflow-y-auto">
            <?php if (empty($recent_activity)): ?>
            <p class="text-sm text-gray-400 text-center py-4">No activity yet</p>
            <?php else: ?>
            <?php foreach (array_slice($recent_activity, 0, 10) as $activity): ?>
            <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <svg class="w-4 h-4 text-gray-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-700 dark:text-slate-300">
                        <span class="font-medium"><?= esc($activity['user_name'] ?? 'System') ?></span>
                        <?= esc($activity['description'] ?: $activity['action']) ?>
                    </p>
                    <p class="text-xs text-gray-400 mt-0.5"><?= date('M d, Y H:i', strtotime($activity['created_at'])) ?></p>
                </div>
            </div>
            <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </div>
</div>

<script>
function updateInquiryStatus(id, status) {
    fetch('<?= base_url('admin/dashboard/update-inquiry-status') ?>', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
        },
        body: new URLSearchParams({ id: id, status: status })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            // Show success notification
            alert('Status updated successfully');
        }
    })
    .catch(err => console.error('Status update failed:', err));
}
</script>

<?= $this->endSection() ?>
`
  },
  {
    path: 'app/Views/admin/auth/login.php',
    name: 'login.php',
    language: 'php',
    category: 'Admin Views',
    description: 'Admin login view',
    content: `<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= esc($title ?? 'Admin Login') ?> - <?= setting('site_name', 'Khybersoft') ?></title>
    <meta name="csrf-token" content="<?= csrf_hash() ?>">
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', system-ui, sans-serif; }
        .glass { background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.08); }
        .glass-input { background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(71, 85, 105, 0.5); transition: all 0.2s; }
        .glass-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); outline: none; }
        .gradient-bg { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%); }
        .animate-float { animation: float 6s ease-in-out infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
        .glow { box-shadow: 0 0 40px rgba(59, 130, 246, 0.15), 0 0 80px rgba(139, 92, 246, 0.08); }
    </style>
</head>
<body class="h-full gradient-bg overflow-hidden">
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
        <div class="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float"></div>
        <div class="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" style="animation-delay: -3s;"></div>
    </div>

    <div class="min-h-full flex items-center justify-center px-4 py-12 relative z-10">
        <div class="w-full max-w-md">
            <div class="text-center mb-8">
                <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25 mb-4">
                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                    </svg>
                </div>
                <h1 class="text-2xl font-bold text-white">Welcome back</h1>
                <p class="text-slate-400 mt-1">Sign in to <?= setting('site_name', 'Khybersoft') ?> Admin</p>
            </div>

            <div class="glass rounded-2xl p-8 glow">
                <?php if (session()->getFlashdata('error')): ?>
                <div class="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3" x-data="{ show: true }" x-show="show">
                    <svg class="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <p class="text-sm text-red-300"><?= esc(session()->getFlashdata('error')) ?></p>
                    <button @click="show = false" class="ml-auto text-red-400 hover:text-red-300">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
                <?php endif; ?>

                <?php if (session()->getFlashdata('success')): ?>
                <div class="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-start gap-3">
                    <svg class="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <p class="text-sm text-green-300"><?= esc(session()->getFlashdata('success')) ?></p>
                </div>
                <?php endif; ?>

                <form method="POST" action="<?= base_url('admin/login') ?>" x-data="{ loading: false }" @submit="loading = true">
                    <?= csrf_field() ?>

                    <div class="mb-5">
                        <label for="email" class="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                        <div class="relative">
                            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                                </svg>
                            </div>
                            <input type="email" id="email" name="email" value="<?= old('email') ?>" required autocomplete="email" autofocus placeholder="admin@khybersoft.com" class="glass-input w-full pl-11 pr-4 py-3 rounded-xl text-white placeholder-slate-500 text-sm">
                        </div>
                    </div>

                    <div class="mb-5">
                        <div class="flex items-center justify-between mb-2">
                            <label for="password" class="block text-sm font-medium text-slate-300">Password</label>
                            <a href="<?= base_url('admin/forgot-password') ?>" class="text-xs text-blue-400 hover:text-blue-300 transition-colors">Forgot password?</a>
                        </div>
                        <div class="relative" x-data="{ show: false }">
                            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                                </svg>
                            </div>
                            <input :type="show ? 'text' : 'password'" id="password" name="password" required autocomplete="current-password" placeholder="••••••••" class="glass-input w-full pl-11 pr-12 py-3 rounded-xl text-white placeholder-slate-500 text-sm">
                            <button type="button" @click="show = !show" class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300">
                                <svg x-show="!show" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                <svg x-show="show" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                            </button>
                        </div>
                    </div>

                    <div class="flex items-center mb-6">
                        <input type="checkbox" id="remember" name="remember" value="1" class="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0">
                        <label for="remember" class="ml-2.5 text-sm text-slate-400">Remember me for 30 days</label>
                    </div>

                    <button type="submit" :disabled="loading" class="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25">
                        <span x-show="!loading" class="flex items-center justify-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg>
                            Sign In
                        </span>
                        <span x-show="loading" class="flex items-center justify-center gap-2">
                            <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Signing in...
                        </span>
                    </button>
                </form>
            </div>

            <div class="text-center mt-8">
                <p class="text-xs text-slate-500">&copy; <?= date('Y') ?> <?= setting('site_name', 'Khybersoft') ?>. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
`
  },
];
