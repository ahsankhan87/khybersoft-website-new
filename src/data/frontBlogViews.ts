export const frontBlogViews = [
  {
    path: 'app/views/front/blog/show.php',
    name: 'show.php',
    language: 'php',
    module: 'Blog',
    type: 'view',
    description: 'Blog post detail with TOC sidebar, reading progress, comments, related posts',
    content: `<?php
/**
 * Blog Post Detail View
 * Content, Author, Share, Related, Comments, TOC Sidebar, Reading Progress
 */
\$toc = \$toc ?? [];
?>

<!-- Reading Progress Bar -->
<div id="reading-progress" class="fixed top-0 left-0 h-1 bg-gradient-to-r from-brand-500 to-blue-500 z-50 transition-all" style="width: 0%"></div>

<!-- Article Hero -->
<section class="pt-32 pb-12">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div data-aos="fade-up">
            <!-- Category & Date -->
            <div class="flex items-center gap-4 mb-6">
                <a href="<?= url('/blog?category=' . e(\$post['category_slug'] ?? '')) ?>" class="px-4 py-1.5 bg-brand-500/10 border border-brand-500/20 text-brand-300 text-sm font-medium rounded-full hover:bg-brand-500/20 transition-colors">
                    <?= e(\$post['category_name'] ?? 'Blog') ?>
                </a>
                <span class="text-slate-400 text-sm"><?= format_date(\$post['published_at'] ?? \$post['created_at']) ?></span>
                <span class="text-slate-500 text-sm">•</span>
                <span class="text-slate-400 text-sm"><?= \$post['views'] ?? 0 ?> views</span>
            </div>

            <!-- Title -->
            <h1 class="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                <?= e(\$post['title']) ?>
            </h1>

            <!-- Author -->
            <div class="flex items-center gap-4 mb-8">
                <?php if (!empty(\$post['author_avatar'])): ?>
                <img src="<?= upload(\$post['author_avatar']) ?>" alt="<?= e(\$post['author_name']) ?>" class="w-12 h-12 rounded-full object-cover">
                <?php else: ?>
                <div class="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-blue-500 flex items-center justify-center text-white font-bold">
                    <?= strtoupper(substr(\$post['author_name'] ?? 'A', 0, 1)) ?>
                </div>
                <?php endif; ?>
                <div>
                    <p class="font-semibold text-white"><?= e(\$post['author_name'] ?? 'Admin') ?></p>
                    <p class="text-sm text-slate-400">Author</p>
                </div>
            </div>
        </div>

        <!-- Featured Image -->
        <?php if (!empty(\$post['featured_image'])): ?>
        <div class="rounded-2xl overflow-hidden mb-12" data-aos="fade-up">
            <img src="<?= upload(\$post['featured_image']) ?>" alt="<?= e(\$post['title']) ?>" class="w-full">
        </div>
        <?php endif; ?>
    </div>
</section>

<!-- Article Content with TOC -->
<section class="pb-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid lg:grid-cols-4 gap-12">
            <!-- Main Content -->
            <article class="lg:col-span-3 prose prose-invert max-w-none" data-aos="fade-up">
                <div class="text-lg text-slate-300 leading-relaxed space-y-6">
                    <?php
                    // Add IDs to headings for TOC
                    \$content = \$post['content'] ?? '';
                    foreach (\$toc as \$item) {
                        \$content = str_replace(
                            '<h' . \$item['level'] . '>' . \$item['text'] . '</h' . \$item['level'] . '>',
                            '<h' . \$item['level'] . ' id="' . \$item['id'] . '">' . \$item['text'] . '</h' . \$item['level'] . '>',
                            \$content
                        );
                    }
                    echo \$content;
                    ?>
                </div>

                <!-- Tags -->
                <?php if (!empty(\$tags)): ?>
                <div class="mt-12 pt-8 border-t border-white/10">
                    <div class="flex flex-wrap gap-2">
                        <?php foreach (\$tags as \$tag): ?>
                        <a href="<?= url('/blog?tag=' . e(\$tag['slug'])) ?>" class="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-sm rounded-xl transition-colors">
                            #<?= e(\$tag['name']) ?>
                        </a>
                        <?php endforeach; ?>
                    </div>
                </div>
                <?php endif; ?>

                <!-- Share Buttons -->
                <div class="mt-8 pt-8 border-t border-white/10">
                    <p class="text-sm text-slate-400 mb-4">Share this article:</p>
                    <div class="flex gap-3">
                        <a href="https://twitter.com/intent/tweet?url=<?= urlencode(url('/blog/' . e(\$post['slug']))) ?>&text=<?= urlencode(\$post['title']) ?>" target="_blank" class="w-10 h-10 bg-white/5 hover:bg-blue-500 border border-white/10 rounded-xl flex items-center justify-center transition-colors">
                            <svg class="w-5 h-5 text-slate-400 hover:text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/></svg>
                        </a>
                        <a href="https://www.facebook.com/sharer/sharer.php?u=<?= urlencode(url('/blog/' . e(\$post['slug']))) ?>" target="_blank" class="w-10 h-10 bg-white/5 hover:bg-blue-600 border border-white/10 rounded-xl flex items-center justify-center transition-colors">
                            <svg class="w-5 h-5 text-slate-400 hover:text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
                        </a>
                        <a href="https://www.linkedin.com/shareArticle?mini=true&url=<?= urlencode(url('/blog/' . e(\$post['slug']))) ?>&title=<?= urlencode(\$post['title']) ?>" target="_blank" class="w-10 h-10 bg-white/5 hover:bg-blue-700 border border-white/10 rounded-xl flex items-center justify-center transition-colors">
                            <svg class="w-5 h-5 text-slate-400 hover:text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/></svg>
                        </a>
                        <button onclick="navigator.clipboard.writeText(window.location.href); this.innerHTML = '✓ Copied!'; setTimeout(() => this.innerHTML = '🔗', 2000)" class="w-10 h-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center transition-colors text-slate-400">
                            🔗
                        </button>
                    </div>
                </div>
            </article>

            <!-- TOC Sidebar -->
            <?php if (!empty(\$toc)): ?>
            <aside class="hidden lg:block">
                <div class="sticky top-24 glass rounded-2xl p-6">
                    <h3 class="font-semibold text-white mb-4">Table of Contents</h3>
                    <nav class="space-y-2">
                        <?php foreach (\$toc as \$item): ?>
                        <a href="#<?= \$item['id'] ?>" class="block text-sm text-slate-400 hover:text-brand-400 transition-colors <?= \$item['level'] === 3 ? 'pl-4' : '' ?>">
                            <?= e(\$item['text']) ?>
                        </a>
                        <?php endforeach; ?>
                    </nav>
                </div>
            </aside>
            <?php endif; ?>
        </div>
    </div>
</section>

<!-- Related Posts -->
<?php if (!empty(\$related)): ?>
<section class="py-20 bg-navy-800/30">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="font-display text-3xl font-bold text-white mb-8 text-center" data-aos="fade-up">Related Articles</h2>

        <div class="grid md:grid-cols-3 gap-8">
            <?php foreach (\$related as \$rel): ?>
            <a href="<?= url('/blog/' . e(\$rel['slug'])) ?>" class="glass rounded-2xl overflow-hidden hover-lift group" data-aos="fade-up">
                <?php if (!empty(\$rel['featured_image'])): ?>
                <div class="aspect-video overflow-hidden">
                    <img src="<?= upload(\$rel['featured_image']) ?>" alt="<?= e(\$rel['title']) ?>" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                </div>
                <?php endif; ?>
                <div class="p-6">
                    <h3 class="font-display text-xl font-bold text-white mb-2 group-hover:text-brand-400 transition-colors line-clamp-2"><?= e(\$rel['title']) ?></h3>
                    <p class="text-slate-400 text-sm line-clamp-2"><?= e(str_limit(strip_tags(\$rel['excerpt'] ?? ''), 100)) ?></p>
                </div>
            </a>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<!-- Comments Section -->
<section class="py-20">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="font-display text-3xl font-bold text-white mb-8" data-aos="fade-up">Comments (<?= count(\$comments ?? []) ?>)</h2>

        <!-- Comment Form -->
        <div class="glass rounded-2xl p-8 mb-12" data-aos="fade-up">
            <h3 class="text-xl font-semibold text-white mb-6">Leave a Comment</h3>
            <form method="POST" action="<?= url('/blog/' . e(\$post['slug']) . '/comment') ?>">
                <?= \\App\\Core\\CSRF::field() ?>
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
                <div class="mb-6">
                    <label class="block text-sm font-medium text-slate-300 mb-2">Comment *</label>
                    <textarea name="message" rows="4" required class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none"></textarea>
                </div>
                <button type="submit" class="px-8 py-3 bg-gradient-to-r from-brand-600 to-blue-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-brand-500/30 transition-all">Post Comment</button>
                <p class="text-xs text-slate-500 mt-3">Comments are moderated and will appear after approval.</p>
            </form>
        </div>

        <!-- Comments List -->
        <?php if (!empty(\$comments)): ?>
        <div class="space-y-6">
            <?php foreach (\$comments as \$comment): ?>
            <div class="glass rounded-2xl p-6" data-aos="fade-up">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        <?= strtoupper(substr(\$comment['name'], 0, 1)) ?>
                    </div>
                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-2">
                            <span class="font-semibold text-white"><?= e(\$comment['name']) ?></span>
                            <span class="text-sm text-slate-500"><?= time_ago(\$comment['created_at']) ?></span>
                        </div>
                        <p class="text-slate-300"><?= nl2br(e(\$comment['message'])) ?></p>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
        <?php else: ?>
        <div class="text-center py-12 text-slate-500">
            <p>No comments yet. Be the first to comment!</p>
        </div>
        <?php endif; ?>
    </div>
</section>

<script>
// Reading progress bar
window.addEventListener('scroll', () => {
    const bar = document.getElementById('reading-progress');
    if (bar) {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = (scrollTop / docHeight) * 100;
        bar.style.width = progress + '%';
    }
});
</script>
`
  },
  {
    path: 'app/views/front/home/contact.php',
    name: 'contact.php',
    language: 'php',
    module: 'Contact',
    type: 'view',
    description: 'Contact page with form, map, and contact cards',
    content: `<?php
/**
 * Contact Page View
 * Form + Google Map + Contact Cards
 */
?>

<!-- Hero -->
<section class="pt-32 pb-16">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center" data-aos="fade-up">
        <h1 class="font-display text-5xl font-bold text-white mb-4">Get In Touch</h1>
        <p class="text-xl text-slate-400 max-w-2xl mx-auto">Have a question or ready to start your project? We're here to help.</p>
    </div>
</section>

<!-- Contact Cards -->
<section class="pb-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid md:grid-cols-3 gap-8 mb-16">
            <?php
            \$contactCards = [
                ['icon' => '📧', 'title' => 'Email Us', 'desc' => setting('site_email'), 'link' => 'mailto:' . setting('site_email')],
                ['icon' => '📞', 'title' => 'Call Us', 'desc' => setting('site_phone'), 'link' => 'tel:' . setting('site_phone')],
                ['icon' => '📍', 'title' => 'Visit Us', 'desc' => setting('site_address'), 'link' => '#'],
            ];
            foreach (\$contactCards as \$card):
            ?>
            <a href="<?= e(\$card['link']) ?>" class="glass rounded-2xl p-8 text-center hover-lift group" data-aos="fade-up">
                <div class="text-4xl mb-4"><?= \$card['icon'] ?></div>
                <h3 class="font-display text-xl font-bold text-white mb-2 group-hover:text-brand-400 transition-colors"><?= \$card['title'] ?></h3>
                <p class="text-slate-400"><?= e(\$card['desc']) ?></p>
            </a>
            <?php endforeach; ?>
        </div>

        <div class="grid lg:grid-cols-2 gap-12">
            <!-- Contact Form -->
            <div class="glass rounded-2xl p-8" data-aos="fade-right">
                <h2 class="font-display text-3xl font-bold text-white mb-6">Send Us a Message</h2>
                <form method="POST" action="<?= url('/contact') ?>">
                    <?= \\App\\Core\\CSRF::field() ?>
                    <div class="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-300 mb-2">Name *</label>
                            <input type="text" name="name" required value="<?= old('name') ?>" class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-300 mb-2">Email *</label>
                            <input type="email" name="email" required value="<?= old('email') ?>" class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500">
                        </div>
                    </div>
                    <div class="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                            <input type="tel" name="phone" value="<?= old('phone') ?>" class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-300 mb-2">Subject *</label>
                            <input type="text" name="subject" required value="<?= old('subject') ?>" class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500">
                        </div>
                    </div>
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-slate-300 mb-2">Message *</label>
                        <textarea name="message" rows="6" required class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none"><?= old('message') ?></textarea>
                    </div>
                    <button type="submit" class="w-full px-8 py-4 bg-gradient-to-r from-brand-600 to-blue-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-brand-500/30 transition-all">Send Message</button>
                </form>
            </div>

            <!-- Google Map -->
            <div class="glass rounded-2xl overflow-hidden h-[500px]" data-aos="fade-left">
                <?php if (setting('google_maps_embed')): ?>
                <iframe src="<?= e(setting('google_maps_embed')) ?>" class="w-full h-full" style="border:0;" allowfullscreen="" loading="lazy"></iframe>
                <?php else: ?>
                <div class="w-full h-full flex items-center justify-center text-slate-500">
                    <p>Map will appear here when configured</p>
                </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
</section>
`
  },
];
