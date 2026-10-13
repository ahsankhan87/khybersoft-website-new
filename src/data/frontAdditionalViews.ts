export const frontAdditionalViews = [
  {
    path: 'app/views/front/home/about.php',
    name: 'about.php',
    language: 'php',
    module: 'About',
    type: 'view',
    description: 'About page with company story, mission, vision, values, team, and stats',
    content: `<?php
/**
 * About Page View
 * Company story, mission, vision, values, team grid, stats
 */
?>

<!-- Hero -->
<section class="pt-32 pb-16 relative overflow-hidden">
    <div class="absolute inset-0">
        <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl"></div>
        <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
    </div>

    <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center" data-aos="fade-up">
        <h1 class="font-display text-5xl lg:text-6xl font-bold text-white mb-6">
            About <span class="gradient-text">Khybersoft</span>
        </h1>
        <p class="text-xl text-slate-300 max-w-3xl mx-auto">
            Empowering businesses with innovative software solutions since 2016
        </p>
    </div>
</section>

<!-- Story Section -->
<section class="py-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
            <div data-aos="fade-right">
                <h2 class="font-display text-4xl font-bold text-white mb-6">Our Story</h2>
                <div class="space-y-4 text-lg text-slate-300 leading-relaxed">
                    <p>
                        Founded in 2016, Khybersoft started with a simple mission: to help businesses thrive in the digital age through powerful, intuitive software solutions.
                    </p>
                    <p>
                        What began as a small team of passionate developers has grown into a trusted partner for over 80 companies across 25+ countries. We've delivered 150+ successful projects, from custom ERP systems to comprehensive CRM platforms.
                    </p>
                    <p>
                        Our approach combines cutting-edge technology with deep industry knowledge. We don't just build software—we build solutions that transform how businesses operate, compete, and grow.
                    </p>
                </div>
            </div>
            <div class="relative" data-aos="fade-left">
                <div class="glass rounded-3xl p-8">
                    <div class="grid grid-cols-2 gap-6">
                        <div class="text-center">
                            <div class="font-display text-5xl font-bold gradient-text mb-2">150+</div>
                            <p class="text-slate-400">Projects Delivered</p>
                        </div>
                        <div class="text-center">
                            <div class="font-display text-5xl font-bold gradient-text mb-2">80+</div>
                            <p class="text-slate-400">Happy Clients</p>
                        </div>
                        <div class="text-center">
                            <div class="font-display text-5xl font-bold gradient-text mb-2">25+</div>
                            <p class="text-slate-400">Countries</p>
                        </div>
                        <div class="text-center">
                            <div class="font-display text-5xl font-bold gradient-text mb-2">8+</div>
                            <p class="text-slate-400">Years Experience</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Mission, Vision, Values -->
<section class="py-20 bg-navy-800/30">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid md:grid-cols-3 gap-8">
            <div class="glass rounded-2xl p-8 hover-lift" data-aos="fade-up">
                <div class="w-14 h-14 bg-gradient-to-br from-brand-500/20 to-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                    <span class="text-2xl">🎯</span>
                </div>
                <h3 class="font-display text-2xl font-bold text-white mb-4">Our Mission</h3>
                <p class="text-slate-400">
                    To empower businesses of all sizes with innovative, reliable, and scalable software solutions that drive growth, efficiency, and competitive advantage in the digital economy.
                </p>
            </div>

            <div class="glass rounded-2xl p-8 hover-lift" data-aos="fade-up" data-aos-delay="100">
                <div class="w-14 h-14 bg-gradient-to-br from-brand-500/20 to-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                    <span class="text-2xl">🔭</span>
                </div>
                <h3 class="font-display text-2xl font-bold text-white mb-4">Our Vision</h3>
                <p class="text-slate-400">
                    To be the global leader in business software innovation, recognized for transforming how companies operate and compete through technology that's powerful yet accessible.
                </p>
            </div>

            <div class="glass rounded-2xl p-8 hover-lift" data-aos="fade-up" data-aos-delay="200">
                <div class="w-14 h-14 bg-gradient-to-br from-brand-500/20 to-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                    <span class="text-2xl">💎</span>
                </div>
                <h3 class="font-display text-2xl font-bold text-white mb-4">Our Values</h3>
                <ul class="space-y-2 text-slate-400">
                    <li class="flex items-start gap-2">
                        <span class="text-brand-400 mt-1">✓</span>
                        <span>Innovation & Excellence</span>
                    </li>
                    <li class="flex items-start gap-2">
                        <span class="text-brand-400 mt-1">✓</span>
                        <span>Client-Centric Approach</span>
                    </li>
                    <li class="flex items-start gap-2">
                        <span class="text-brand-400 mt-1">✓</span>
                        <span>Integrity & Transparency</span>
                    </li>
                    <li class="flex items-start gap-2">
                        <span class="text-brand-400 mt-1">✓</span>
                        <span>Continuous Learning</span>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</section>

<!-- Team Section -->
<section class="py-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12" data-aos="fade-up">
            <h2 class="font-display text-4xl font-bold text-white mb-4">Meet Our Team</h2>
            <p class="text-xl text-slate-400">The talented people behind Khybersoft</p>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <?php
            $teamMembers = $team ?? [];
            if (empty($teamMembers)) {
                // Demo data if no team members in database
                $teamMembers = [
                    ['name' => 'Ahmad Khan', 'role' => 'CEO & Founder', 'photo' => null],
                    ['name' => 'Sarah Ahmed', 'role' => 'CTO', 'photo' => null],
                    ['name' => 'Ali Hassan', 'role' => 'Lead Developer', 'photo' => null],
                    ['name' => 'Fatima Zahra', 'role' => 'Design Lead', 'photo' => null],
                ];
            }
            
            foreach ($teamMembers as $i => $member):
            ?>
            <div class="glass rounded-2xl p-6 text-center hover-lift group" data-aos="fade-up" data-aos-delay="<?= $i * 100 ?>">
                <?php if (!empty($member['photo'])): ?>
                <img src="<?= upload($member['photo']) ?>" alt="<?= e($member['name']) ?>" class="w-24 h-24 rounded-full mx-auto mb-4 object-cover">
                <?php else: ?>
                <div class="w-24 h-24 rounded-full mx-auto mb-4 bg-gradient-to-br from-brand-500 to-blue-500 flex items-center justify-center text-white text-3xl font-bold">
                    <?= strtoupper(substr($member['name'], 0, 1)) ?>
                </div>
                <?php endif; ?>
                
                <h3 class="font-display text-xl font-bold text-white mb-1 group-hover:text-brand-400 transition-colors">
                    <?= e($member['name']) ?>
                </h3>
                <p class="text-brand-400 text-sm mb-3"><?= e($member['role']) ?></p>
                
                <?php if (!empty($member['bio'])): ?>
                <p class="text-slate-400 text-sm mb-4"><?= e(str_limit($member['bio'], 80)) ?></p>
                <?php endif; ?>

                <?php 
                $socialLinks = json_decode($member['social_links'] ?? '[]', true) ?: [];
                if (!empty($socialLinks)):
                ?>
                <div class="flex justify-center gap-2">
                    <?php foreach ($socialLinks as $social): ?>
                    <a href="<?= e($social['url']) ?>" target="_blank" class="w-8 h-8 bg-white/5 hover:bg-brand-600 rounded-lg flex items-center justify-center transition-colors">
                        <span class="text-xs"><?= e($social['platform']) ?></span>
                    </a>
                    <?php endforeach; ?>
                </div>
                <?php endif; ?>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<!-- Timeline -->
<section class="py-20 bg-navy-800/30">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12" data-aos="fade-up">
            <h2 class="font-display text-4xl font-bold text-white mb-4">Our Journey</h2>
        </div>

        <div class="space-y-8">
            <?php
            $milestones = [
                ['year' => '2016', 'title' => 'Company Founded', 'desc' => 'Khybersoft started with a vision to transform businesses through technology'],
                ['year' => '2018', 'title' => 'First Major Client', 'desc' => 'Delivered our first enterprise ERP system'],
                ['year' => '2020', 'title' => 'International Expansion', 'desc' => 'Expanded services to clients in 10+ countries'],
                ['year' => '2022', 'title' => 'Product Suite Launch', 'desc' => 'Launched comprehensive product suite including CRM, HRM, and LMS'],
                ['year' => '2024', 'title' => '150+ Projects', 'desc' => 'Reached milestone of 150+ successful project deliveries'],
            ];

            foreach ($milestones as $i => $milestone):
            ?>
            <div class="flex gap-6" data-aos="fade-up" data-aos-delay="<?= $i * 100 ?>">
                <div class="flex-shrink-0 w-20 text-right">
                    <span class="font-display text-2xl font-bold gradient-text"><?= $milestone['year'] ?></span>
                </div>
                <div class="relative flex-1 glass rounded-2xl p-6">
                    <div class="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-brand-500 rounded-full border-4 border-navy-900"></div>
                    <h3 class="font-display text-xl font-bold text-white mb-2"><?= e($milestone['title']) ?></h3>
                    <p class="text-slate-400"><?= e($milestone['desc']) ?></p>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<!-- CTA -->
<section class="py-20">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center" data-aos="fade-up">
        <h2 class="font-display text-4xl font-bold text-white mb-6">Ready to Work With Us?</h2>
        <p class="text-xl text-slate-400 mb-8">Let's build something amazing together</p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="<?= url('/contact') ?>" class="px-8 py-4 bg-gradient-to-r from-brand-600 to-blue-500 text-white font-semibold rounded-2xl hover:shadow-2xl hover:shadow-brand-500/30 transition-all">
                Contact Us
            </a>
            <a href="<?= url('/book-demo') ?>" class="px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-2xl hover:bg-white/10 transition-all">
                Book a Demo
            </a>
        </div>
    </div>
</section>
`
  },
  {
    path: 'app/views/front/home/services.php',
    name: 'services.php',
    language: 'php',
    module: 'Services',
    type: 'view',
    description: 'Services listing page with service cards and process steps',
    content: `<?php
/**
 * Services Listing Page
 * Service cards, process steps, CTA per service
 */
?>

<!-- Hero -->
<section class="pt-32 pb-16 relative overflow-hidden">
    <div class="absolute inset-0">
        <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl"></div>
        <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
    </div>

    <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center" data-aos="fade-up">
        <h1 class="font-display text-5xl lg:text-6xl font-bold text-white mb-6">
            Our <span class="gradient-text">Services</span>
        </h1>
        <p class="text-xl text-slate-300 max-w-3xl mx-auto">
            Comprehensive software solutions tailored to your business needs
        </p>
    </div>
</section>

<!-- Services Grid -->
<section class="py-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <?php foreach ($services ?? [] as $i => $service): ?>
            <div class="glass rounded-2xl overflow-hidden hover-lift group" data-aos="fade-up" data-aos-delay="<?= $i * 100 ?>">
                <?php if (!empty($service['icon'])): ?>
                <div class="aspect-video bg-gradient-to-br from-brand-500/10 to-blue-500/10 flex items-center justify-center">
                    <img src="<?= upload($service['icon']) ?>" alt="<?= e($service['title']) ?>" class="w-20 h-20 object-contain">
                </div>
                <?php endif; ?>
                
                <div class="p-6">
                    <h3 class="font-display text-2xl font-bold text-white mb-3 group-hover:text-brand-400 transition-colors">
                        <?= e($service['title']) ?>
                    </h3>
                    <p class="text-slate-400 mb-4"><?= e(str_limit($service['short_desc'] ?? '', 120)) ?></p>
                    
                    <?php if ($service['price_from']): ?>
                    <p class="text-brand-400 font-semibold mb-4">
                        Starting from <?= money((float)$service['price_from']) ?>
                    </p>
                    <?php endif; ?>

                    <a href="<?= url('/services/' . e($service['slug'])) ?>" class="inline-flex items-center gap-2 text-brand-400 hover:text-brand-300 font-medium">
                        Learn More
                        <svg class="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                        </svg>
                    </a>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<!-- Process Steps -->
<section class="py-20 bg-navy-800/30">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12" data-aos="fade-up">
            <h2 class="font-display text-4xl font-bold text-white mb-4">Our Process</h2>
            <p class="text-xl text-slate-400">How we bring your vision to life</p>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <?php
            $steps = [
                ['icon' => '💬', 'title' => 'Discovery', 'desc' => 'We understand your needs, goals, and challenges through in-depth consultation'],
                ['icon' => '📋', 'title' => 'Planning', 'desc' => 'Detailed project planning with timeline, milestones, and resource allocation'],
                ['icon' => '⚡', 'title' => 'Development', 'desc' => 'Agile development with regular updates and feedback loops'],
                ['icon' => '🚀', 'title' => 'Delivery', 'desc' => 'Thorough testing, deployment, and ongoing support'],
            ];

            foreach ($steps as $i => $step):
            ?>
            <div class="relative" data-aos="fade-up" data-aos-delay="<?= $i * 100 ?>">
                <div class="glass rounded-2xl p-6 h-full">
                    <div class="text-4xl mb-4"><?= $step['icon'] ?></div>
                    <div class="absolute top-4 right-4 w-8 h-8 bg-brand-500/20 rounded-full flex items-center justify-center text-brand-400 font-bold text-sm">
                        <?= $i + 1 ?>
                    </div>
                    <h3 class="font-display text-xl font-bold text-white mb-2"><?= e($step['title']) ?></h3>
                    <p class="text-slate-400 text-sm"><?= e($step['desc']) ?></p>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<!-- CTA -->
<section class="py-20">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center" data-aos="fade-up">
        <h2 class="font-display text-4xl font-bold text-white mb-6">Need a Custom Solution?</h2>
        <p class="text-xl text-slate-400 mb-8">Let's discuss how we can help transform your business</p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="<?= url('/get-quote') ?>" class="px-8 py-4 bg-gradient-to-r from-brand-600 to-blue-500 text-white font-semibold rounded-2xl hover:shadow-2xl hover:shadow-brand-500/30 transition-all">
                Get a Quote
            </a>
            <a href="<?= url('/contact') ?>" class="px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-2xl hover:bg-white/10 transition-all">
                Contact Us
            </a>
        </div>
    </div>
</section>
`
  },
  {
    path: 'app/views/front/blog/index.php',
    name: 'index.php',
    language: 'php',
    module: 'Blog',
    type: 'view',
    description: 'Blog listing page with grid, categories, tags, search, pagination',
    content: `<?php
/**
 * Blog Listing Page
 * Grid with categories, tags, search, pagination
 */
?>

<!-- Hero -->
<section class="pt-32 pb-16">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center" data-aos="fade-up">
        <h1 class="font-display text-5xl font-bold text-white mb-4">Our Blog</h1>
        <p class="text-xl text-slate-400">Insights, tips, and industry news</p>
    </div>
</section>

<!-- Filters -->
<section class="pb-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="glass rounded-2xl p-6" data-aos="fade-up">
            <form method="GET" action="<?= url('/blog') ?>" class="flex flex-wrap gap-4">
                <div class="flex-1 min-w-[200px]">
                    <input type="text" name="search" value="<?= e($search ?? '') ?>" placeholder="Search articles..."
                           class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500">
                </div>
                <select name="category" class="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-500">
                    <option value="">All Categories</option>
                    <?php foreach ($categories ?? [] as $cat): ?>
                    <option value="<?= e($cat['slug']) ?>" <?= ($current_category ?? '') === $cat['slug'] ? 'selected' : '' ?>>
                        <?= e($cat['name']) ?>
                    </option>
                    <?php endforeach; ?>
                </select>
                <button type="submit" class="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl transition-colors">
                    Search
                </button>
            </form>
        </div>
    </div>
</section>

<!-- Blog Grid -->
<section class="pb-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <?php foreach ($posts ?? [] as $i => $post): ?>
            <article class="glass rounded-2xl overflow-hidden hover-lift group" data-aos="fade-up" data-aos-delay="<?= $i * 100 ?>">
                <?php if (!empty($post['featured_image'])): ?>
                <div class="aspect-video overflow-hidden">
                    <img src="<?= upload($post['featured_image']) ?>" alt="<?= e($post['title']) ?>" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                </div>
                <?php endif; ?>
                
                <div class="p-6">
                    <div class="flex items-center gap-3 mb-3">
                        <span class="px-3 py-1 bg-brand-500/10 text-brand-300 text-xs font-medium rounded-full">
                            <?= e($post['category_name'] ?? 'Blog') ?>
                        </span>
                        <span class="text-xs text-slate-500"><?= format_date($post['published_at'] ?? $post['created_at']) ?></span>
                    </div>
                    
                    <h2 class="font-display text-xl font-bold text-white mb-2 group-hover:text-brand-400 transition-colors line-clamp-2">
                        <a href="<?= url('/blog/' . e($post['slug'])) ?>"><?= e($post['title']) ?></a>
                    </h2>
                    
                    <p class="text-slate-400 text-sm mb-4 line-clamp-3">
                        <?= e(str_limit(strip_tags($post['excerpt'] ?? ''), 120)) ?>
                    </p>
                    
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <?php if (!empty($post['author_avatar'])): ?>
                            <img src="<?= upload($post['author_avatar']) ?>" class="w-8 h-8 rounded-full" alt="">
                            <?php else: ?>
                            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                                <?= strtoupper(substr($post['author_name'] ?? 'A', 0, 1)) ?>
                            </div>
                            <?php endif; ?>
                            <span class="text-xs text-slate-400"><?= e($post['author_name'] ?? 'Admin') ?></span>
                        </div>
                        <a href="<?= url('/blog/' . e($post['slug'])) ?>" class="text-brand-400 hover:text-brand-300 text-sm font-medium inline-flex items-center gap-1">
                            Read More
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                            </svg>
                        </a>
                    </div>
                </div>
            </article>
            <?php endforeach; ?>
        </div>

        <?php if (empty($posts)): ?>
        <div class="text-center py-20">
            <p class="text-slate-400 text-lg">No posts found</p>
        </div>
        <?php endif; ?>

        <!-- Pagination -->
        <?php if (($pagination['last_page'] ?? 1) > 1): ?>
        <div class="flex justify-center gap-2 mt-12">
            <?php for ($i = 1; $i <= $pagination['last_page']; $i++): ?>
            <a href="?page=<?= $i ?>&search=<?= urlencode($search ?? '') ?>&category=<?= urlencode($current_category ?? '') ?>"
               class="px-4 py-2 rounded-xl text-sm font-medium transition-colors <?= $i === $pagination['current_page'] ? 'bg-brand-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10' ?>">
                <?= $i ?>
            </a>
            <?php endfor; ?>
        </div>
        <?php endif; ?>
    </div>
</section>

<!-- Popular Tags -->
<?php if (!empty($tags)): ?>
<section class="py-20 bg-navy-800/30">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="font-display text-3xl font-bold text-white mb-8" data-aos="fade-up">Popular Tags</h2>
        <div class="flex flex-wrap justify-center gap-3" data-aos="fade-up">
            <?php foreach ($tags as $tag): ?>
            <a href="<?= url('/blog?tag=' . e($tag['slug'])) ?>" class="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl transition-colors">
                #<?= e($tag['name']) ?> <span class="text-xs text-slate-500">(<?= $tag['count'] ?>)</span>
            </a>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>
`
  },
  {
    path: 'app/views/front/home/faq.php',
    name: 'faq.php',
    language: 'php',
    module: 'FAQ',
    type: 'view',
    description: 'FAQ page with categorized accordion',
    content: `<?php
/**
 * FAQ Page
 * Categorized accordion
 */
?>

<!-- Hero -->
<section class="pt-32 pb-16">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center" data-aos="fade-up">
        <h1 class="font-display text-5xl font-bold text-white mb-4">Frequently Asked Questions</h1>
        <p class="text-xl text-slate-400">Find answers to common questions</p>
    </div>
</section>

<!-- FAQ Accordion -->
<section class="pb-20">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <?php
        // Group FAQs by category
        $groupedFaqs = [];
        foreach ($faqs ?? [] as $faq) {
            $category = $faq['category'] ?? 'General';
            if (!isset($groupedFaqs[$category])) {
                $groupedFaqs[$category] = [];
            }
            $groupedFaqs[$category][] = $faq;
        }

        foreach ($groupedFaqs as $category => $faqs):
        ?>
        <div class="mb-12" data-aos="fade-up">
            <h2 class="font-display text-2xl font-bold text-white mb-6"><?= e($category) ?></h2>
            <div class="space-y-4">
                <?php foreach ($faqs as $i => $faq): ?>
                <div class="glass rounded-2xl overflow-hidden" x-data="{ open: false }">
                    <button @click="open = !open" class="w-full flex items-center justify-between p-6 text-left">
                        <span class="font-semibold text-white pr-4"><?= e($faq['question']) ?></span>
                        <svg :class="open ? 'rotate-180' : ''" class="w-5 h-5 text-brand-400 flex-shrink-0 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                    </button>
                    <div x-show="open" x-collapse class="px-6 pb-6">
                        <p class="text-slate-400"><?= nl2br(e($faq['answer'])) ?></p>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
        </div>
        <?php endforeach; ?>

        <?php if (empty($faqs)): ?>
        <div class="text-center py-20">
            <p class="text-slate-400 text-lg">No FAQs available yet</p>
        </div>
        <?php endif; ?>
    </div>
</section>

<!-- CTA -->
<section class="py-20 bg-navy-800/30">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center" data-aos="fade-up">
        <h2 class="font-display text-3xl font-bold text-white mb-4">Still Have Questions?</h2>
        <p class="text-xl text-slate-400 mb-8">We're here to help</p>
        <a href="<?= url('/contact') ?>" class="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-brand-600 to-blue-500 text-white font-semibold rounded-2xl hover:shadow-2xl hover:shadow-brand-500/30 transition-all">
            Contact Support
        </a>
    </div>
</section>
`
  },
  {
    path: 'app/views/errors/404.php',
    name: '404.php',
    language: 'php',
    module: 'Errors',
    type: 'view',
    description: '404 error page with branded design',
    content: `<?php
/**
 * 404 Error Page
 */
?>

<section class="min-h-screen flex items-center justify-center pt-20">
    <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center" data-aos="fade-up">
        <div class="mb-8">
            <div class="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-brand-500/20 to-blue-500/20 rounded-full mb-6">
                <span class="font-display text-6xl font-bold gradient-text">404</span>
            </div>
        </div>
        
        <h1 class="font-display text-4xl font-bold text-white mb-4">Page Not Found</h1>
        <p class="text-xl text-slate-400 mb-8">
            Sorry, we couldn't find the page you're looking for. It might have been moved or doesn't exist.
        </p>
        
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="<?= url('/') ?>" class="px-8 py-4 bg-gradient-to-r from-brand-600 to-blue-500 text-white font-semibold rounded-2xl hover:shadow-2xl hover:shadow-brand-500/30 transition-all">
                Go Home
            </a>
            <a href="<?= url('/contact') ?>" class="px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-2xl hover:bg-white/10 transition-all">
                Contact Support
            </a>
        </div>
    </div>
</section>
`
  },
  {
    path: 'app/views/errors/500.php',
    name: '500.php',
    language: 'php',
    module: 'Errors',
    type: 'view',
    description: '500 error page with branded design',
    content: `<?php
/**
 * 500 Error Page
 */
?>

<section class="min-h-screen flex items-center justify-center pt-20">
    <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center" data-aos="fade-up">
        <div class="mb-8">
            <div class="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full mb-6">
                <span class="font-display text-6xl font-bold text-red-400">500</span>
            </div>
        </div>
        
        <h1 class="font-display text-4xl font-bold text-white mb-4">Internal Server Error</h1>
        <p class="text-xl text-slate-400 mb-8">
            Something went wrong on our end. We're working to fix it. Please try again later.
        </p>
        
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="<?= url('/') ?>" class="px-8 py-4 bg-gradient-to-r from-brand-600 to-blue-500 text-white font-semibold rounded-2xl hover:shadow-2xl hover:shadow-brand-500/30 transition-all">
                Go Home
            </a>
            <button onclick="location.reload()" class="px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-2xl hover:bg-white/10 transition-all">
                Try Again
            </button>
        </div>
    </div>
</section>
`
  },
];
