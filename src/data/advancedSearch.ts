export interface AdvFile {
  path: string;
  name: string;
  language: string;
  content: string;
  description: string;
  feature: string;
}

export const advancedSearchFiles: AdvFile[] = [
  {
    path: 'app/core/Search.php',
    name: 'Search.php',
    language: 'php',
    feature: 'Search',
    description: 'Global search engine with MySQL FULLTEXT, AJAX live results, scoring',
    content: `<?php
declare(strict_types=1);

namespace App\\Core;

/**
 * Global Search Engine
 * Full-text search across products, blog, tutorials, pages
 * Supports AJAX live results and relevance scoring
 */
class Search
{
    private Database \$db;
    private array \$searchableTables = [
        'products' => [
            'columns' => ['name', 'tagline', 'short_desc', 'full_desc'],
            'index' => 'ft_products',
            'url_prefix' => '/products/',
            'slug_column' => 'slug',
            'type' => 'product',
            'weight' => 10,
        ],
        'blog_posts' => [
            'columns' => ['title', 'excerpt', 'content'],
            'index' => 'ft_blog_posts',
            'url_prefix' => '/blog/',
            'slug_column' => 'slug',
            'type' => 'blog',
            'weight' => 8,
        ],
        'tutorials' => [
            'columns' => ['title', 'description'],
            'index' => 'ft_tutorials',
            'url_prefix' => '/tutorials/',
            'slug_column' => 'slug',
            'type' => 'tutorial',
            'weight' => 6,
        ],
        'pages' => [
            'columns' => ['title', 'content'],
            'index' => 'ft_pages',
            'url_prefix' => '/page/',
            'slug_column' => 'slug',
            'type' => 'page',
            'weight' => 4,
        ],
        'services' => [
            'columns' => ['title', 'short_desc', 'full_desc'],
            'index' => 'ft_services',
            'url_prefix' => '/services/',
            'slug_column' => 'slug',
            'type' => 'service',
            'weight' => 5,
        ],
    ];

    public function __construct()
    {
        \$this->db = Database::getInstance();
    }

    /**
     * Perform global search across all content types
     */
    public function search(string \$query, int \$limit = 20, string \$type = ''): array
    {
        \$query = trim(\$query);
        if (strlen(\$query) < 2) return [];

        \$results = [];
        \$escapedQuery = \$this->escapeFulltext(\$query);

        foreach (\$this->searchableTables as \$table => \$config) {
            if (\$type && \$config['type'] !== \$type) continue;

            // Build FULLTEXT query
            \$columns = implode(', ', array_map(fn(\$c) => "\`{\$c}\`", \$config['columns']));

            // Check if FULLTEXT index exists, fallback to LIKE
            \$useFulltext = \$this->hasFulltextIndex(\$table, \$config['index']);

            if (\$useFulltext) {
                \$sql = "SELECT *, MATCH({\$columns}) AGAINST(? IN BOOLEAN MODE) as relevance
                         FROM \`{\$table}\`
                         WHERE MATCH({\$columns}) AGAINST(? IN BOOLEAN MODE)";
                \$params = [\$escapedQuery, \$escapedQuery];

                // Add status filter for published content
                if (\$table !== 'pages') {
                    \$sql .= " AND status = 'published'";
                } else {
                    \$sql .= " AND status = 'published' AND deleted_at IS NULL";
                }

                if (in_array(\$table, ['products', 'blog_posts', 'pages'])) {
                    \$sql .= " AND deleted_at IS NULL";
                }

                \$sql .= " ORDER BY relevance DESC LIMIT ?";
                \$params[] = \$limit;
            } else {
                // Fallback to LIKE search
                \$likeConditions = [];
                \$params = [];
                foreach (\$config['columns'] as \$col) {
                    \$likeConditions[] = "\`{\$col}\` LIKE ?";
                    \$params[] = "%{\$query}%";
                }

                \$sql = "SELECT *, 1 as relevance FROM \`{\$table}\` WHERE (" . implode(' OR ', \$likeConditions) . ")";

                if (\$table !== 'pages') {
                    \$sql .= " AND status = 'published'";
                } else {
                    \$sql .= " AND status = 'published' AND deleted_at IS NULL";
                }

                if (in_array(\$table, ['products', 'blog_posts', 'pages'])) {
                    \$sql .= " AND deleted_at IS NULL";
                }

                \$sql .= " LIMIT ?";
                \$params[] = \$limit;
            }

            try {
                \$rows = \$this->db->fetchAll(\$sql, \$params);

                foreach (\$rows as \$row) {
                    \$results[] = [
                        'id' => \$row['id'],
                        'title' => \$row['name'] ?? \$row['title'] ?? '',
                        'description' => str_limit(strip_tags(\$row['short_desc'] ?? \$row['excerpt'] ?? \$row['description'] ?? \$row['content'] ?? ''), 150),
                        'url' => SITE_URL . \$config['url_prefix'] . (\$row[\$config['slug_column']] ?? \$row['id']),
                        'type' => \$config['type'],
                        'type_label' => ucfirst(\$config['type']),
                        'relevance' => (float) (\$row['relevance'] ?? 1) * \$config['weight'],
                        'image' => \$row['hero_image'] ?? \$row['featured_image'] ?? \$row['icon'] ?? null,
                        'created_at' => \$row['created_at'] ?? null,
                    ];
                }
            } catch (\\Throwable \$e) {
                error_log('Search error on ' . \$table . ': ' . \$e->getMessage());
            }
        }

        // Sort by weighted relevance
        usort(\$results, fn(\$a, \$b) => \$b['relevance'] <=> \$a['relevance']);

        return array_slice(\$results, 0, \$limit);
    }

    /**
     * AJAX live search (returns top 5 results per type)
     */
    public function liveSearch(string \$query): array
    {
        \$allResults = \$this->search(\$query, 50);

        // Group by type
        \$grouped = [];
        foreach (\$allResults as \$result) {
            \$type = \$result['type'];
            if (!isset(\$grouped[\$type])) {
                \$grouped[\$type] = [];
            }
            if (count(\$grouped[\$type]) < 5) {
                \$grouped[\$type][] = \$result;
            }
        }

        return [
            'query' => \$query,
            'total' => count(\$allResults),
            'groups' => \$grouped,
            'all_url' => SITE_URL . '/search?q=' . urlencode(\$query),
        ];
    }

    /**
     * Log search query for analytics
     */
    public function logSearch(string \$query, int \$resultCount): void
    {
        try {
            \$this->db->insert('search_logs', [
                'query' => \$query,
                'result_count' => \$resultCount,
                'ip' => client_ip(),
                'user_agent' => \$_SERVER['HTTP_USER_AGENT'] ?? '',
                'user_id' => Auth::id(),
                'created_at' => date('Y-m-d H:i:s'),
            ]);
        } catch (\\Throwable \$e) {
            // Silently fail
        }
    }

    /**
     * Get popular search terms
     */
    public function popularTerms(int \$limit = 10): array
    {
        return \$this->db->fetchAll(
            "SELECT query, COUNT(*) as search_count
             FROM search_logs
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             GROUP BY query
             ORDER BY search_count DESC
             LIMIT ?",
            [\$limit]
        );
    }

    /**
     * Escape special FULLTEXT characters
     */
    private function escapeFulltext(string \$query): string
    {
        // Convert to boolean mode query
        \$words = preg_split('/\\s+/', \$query);
        \$escaped = [];
        foreach (\$words as \$word) {
            \$word = trim(\$word, '+-><()~*""@');
            if (strlen(\$word) >= 2) {
                \$escaped[] = '+' . \$word . '*';
            }
        }
        return implode(' ', \$escaped);
    }

    /**
     * Check if FULLTEXT index exists
     */
    private function hasFulltextIndex(string \$table, string \$indexName): bool
    {
        try {
            \$result = \$this->db->fetch(
                "SELECT 1 FROM information_schema.statistics
                 WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?
                 LIMIT 1",
                [\$table, \$indexName]
            );
            return \$result !== false;
        } catch (\\Throwable \$e) {
            return false;
        }
    }
}
`
  },
  {
    path: 'app/controllers/front/SearchController.php',
    name: 'SearchController.php',
    language: 'php',
    feature: 'Search',
    description: 'Search controller with AJAX live search and full results page',
    content: `<?php
declare(strict_types=1);

namespace App\\Controllers\\Front;

use App\\Core\\Controller;
use App\\Core\\Search;

/**
 * Search Controller
 * Handles both full page search and AJAX live search
 */
class SearchController extends Controller
{
    protected string \$layout = 'front';
    private Search \$searchEngine;

    public function __construct()
    {
        parent::__construct();
        \$this->searchEngine = new Search();
    }

    /**
     * Full search results page
     */
    public function index(): void
    {
        \$query = trim(\$_GET['q'] ?? '');
        \$type = \$_GET['type'] ?? '';
        \$page = max(1, (int) (\$_GET['page'] ?? 1));

        if (strlen(\$query) < 2) {
            \$this->view('front.search.index', [
                'page_title' => 'Search',
                'query' => '',
                'results' => [],
                'total' => 0,
                'type' => '',
            ]);
            return;
        }

        \$results = \$this->searchEngine->search(\$query, 50, \$type);
        \$this->searchEngine->logSearch(\$query, count(\$results));

        // Group by type for filters
        \$typeCounts = [];
        foreach (\$results as \$r) {
            \$t = \$r['type'];
            \$typeCounts[\$t] = (\$typeCounts[\$t] ?? 0) + 1;
        }

        \$this->view('front.search.index', [
            'page_title' => 'Search results for: ' . e(\$query),
            'query' => \$query,
            'results' => \$results,
            'total' => count(\$results),
            'type' => \$type,
            'type_counts' => \$typeCounts,
        ]);
    }

    /**
     * AJAX live search endpoint
     */
    public function live(): void
    {
        \$query = trim(\$_GET['q'] ?? '');

        if (strlen(\$query) < 2) {
            \$this->json(['query' => \$query, 'total' => 0, 'groups' => []]);
            return;
        }

        \$results = \$this->searchEngine->liveSearch(\$query);
        \$this->json(\$results);
    }
}
`
  },
  {
    path: 'app/views/front/search/index.php',
    name: 'search/index.php',
    language: 'php',
    feature: 'Search',
    description: 'Search results page with type filters and result cards',
    content: `<?php
/**
 * Search Results Page
 * Full-text search results with type filters
 */
?>

<section class="pt-32 pb-20">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Search Form -->
        <div class="mb-8" data-aos="fade-up">
            <form method="GET" action="<?= url('/search') ?>" class="relative">
                <input type="text" name="q" value="<?= e(\$query) ?>" placeholder="Search products, blog, tutorials..."
                       class="w-full px-6 py-4 pl-14 bg-white/5 border border-white/10 rounded-2xl text-white text-lg placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20">
                <svg class="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
            </form>
        </div>

        <?php if (\$query): ?>
        <div class="mb-6">
            <h1 class="text-2xl font-bold text-white">
                <?= \$total ?> results for "<span class="gradient-text"><?= e(\$query) ?></span>"
            </h1>
        </div>

        <!-- Type Filters -->
        <?php if (!empty(\$type_counts)): ?>
        <div class="flex flex-wrap gap-2 mb-8">
            <a href="<?= url('/search?q=' . urlencode(\$query)) ?>"
               class="px-4 py-2 rounded-xl text-sm font-medium transition-colors <?= !\$type ? 'bg-brand-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10' ?>">
                All (<?= \$total ?>)
            </a>
            <?php foreach (\$type_counts as \$t => \$count): ?>
            <a href="<?= url('/search?q=' . urlencode(\$query) . '&type=' . \$t) ?>"
               class="px-4 py-2 rounded-xl text-sm font-medium transition-colors <?= \$type === \$t ? 'bg-brand-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10' ?>">
                <?= ucfirst(\$t) ?> (<?= \$count ?>)
            </a>
            <?php endforeach; ?>
        </div>
        <?php endif; ?>

        <!-- Results -->
        <div class="space-y-4">
            <?php foreach (\$results as \$result): ?>
            <a href="<?= e(\$result['url']) ?>" class="glass rounded-2xl p-6 hover-lift block group">
                <div class="flex items-start gap-4">
                    <?php if (\$result['image']): ?>
                    <img src="<?= upload(\$result['image']) ?>" alt="" class="w-16 h-16 rounded-xl object-cover flex-shrink-0">
                    <?php endif; ?>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="px-2 py-0.5 bg-brand-500/10 text-brand-300 text-xs rounded-full"><?= e(\$result['type_label']) ?></span>
                        </div>
                        <h3 class="font-display text-lg font-bold text-white group-hover:text-brand-400 transition-colors mb-1">
                            <?= e(\$result['title']) ?>
                        </h3>
                        <p class="text-slate-400 text-sm line-clamp-2"><?= e(\$result['description']) ?></p>
                    </div>
                </div>
            </a>
            <?php endforeach; ?>
        </div>

        <?php if (empty(\$results)): ?>
        <div class="text-center py-20">
            <div class="text-6xl mb-4">🔍</div>
            <h2 class="text-2xl font-bold text-white mb-2">No results found</h2>
            <p class="text-slate-400">Try different keywords or browse our <a href="<?= url('/products') ?>" class="text-brand-400 hover:underline">products</a></p>
        </div>
        <?php endif; ?>
    </div>
</section>

<!-- Live Search Script -->
<script>
document.querySelector('input[name="q"]').addEventListener('input', function() {
    const query = this.value;
    if (query.length < 2) return;

    // Debounced AJAX search
    clearTimeout(this._timeout);
    this._timeout = setTimeout(() => {
        fetch('<?= url("/search/live") ?>?q=' + encodeURIComponent(query), {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(r => r.json())
        .then(data => {
            // Update results count
            const heading = document.querySelector('h1');
            if (heading) {
                heading.innerHTML = data.total + ' results for "<span class=\\"gradient-text\\">' + query + '</span>"';
            }
        });
    }, 300);
});
</script>
`
  },
  {
    path: 'app/views/components/live-search.php',
    name: 'live-search.php',
    language: 'php',
    feature: 'Search',
    description: 'Global live search dropdown component (include in navbar)',
    content: `<?php
/**
 * Live Search Component
 * Include in navbar for global search with AJAX dropdown
 */
?>
<div x-data="{
    query: '',
    results: null,
    open: false,
    loading: false,
    async search() {
        if (this.query.length < 2) { this.results = null; this.open = false; return; }
        this.loading = true;
        try {
            const res = await fetch('<?= url("/search/live") ?>?q=' + encodeURIComponent(this.query), {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            this.results = await res.json();
            this.open = true;
        } catch(e) { this.results = null; }
        this.loading = false;
    }
}" @click.away="open = false" class="relative hidden md:block">
    <div class="relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input type="text" x-model="query" @input.debounce.300ms="search()"
               placeholder="Search..." @focus="query.length >= 2 && search()"
               class="w-56 pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:w-72 transition-all">
        <svg x-show="loading" class="animate-spin absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
    </div>

    <!-- Dropdown Results -->
    <div x-show="open && results" x-transition
         class="absolute right-0 mt-2 w-96 bg-navy-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
        <template x-if="results && results.total === 0">
            <div class="p-6 text-center text-slate-400 text-sm">No results found</div>
        </template>

        <template x-if="results && results.total > 0">
            <div class="max-h-96 overflow-y-auto">
                <template x-for="(items, type) in results.groups" :key="type">
                    <div class="p-3 border-b border-white/5">
                        <h4 class="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-2 px-2" x-text="type"></h4>
                        <template x-for="item in items" :key="item.id">
                            <a :href="item.url" class="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors">
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-medium text-white truncate" x-text="item.title"></p>
                                    <p class="text-xs text-slate-500 truncate" x-text="item.description"></p>
                                </div>
                            </a>
                        </template>
                    </div>
                </template>

                <a :href="results.all_url" class="block p-3 text-center text-sm text-brand-400 hover:bg-white/5 font-medium">
                    View all results →
                </a>
            </div>
        </template>
    </div>
</div>
`
  },
  // ==================== ANALYTICS ====================
  {
    path: 'app/core/Analytics.php',
    name: 'Analytics.php',
    language: 'php',
    feature: 'Analytics',
    description: 'Page view tracking, popular content, conversion funnel, traffic sources',
    content: `<?php
declare(strict_types=1);

namespace App\\Core;

/**
 * Analytics - Page view tracking and reporting
 */
class Analytics
{
    private Database \$db;

    public function __construct()
    {
        \$this->db = Database::getInstance();
    }

    /**
     * Track a page view
     */
    public function trackPageView(string \$url, string \$title = '', string \$type = '', int \$modelId = 0): void
    {
        try {
            // Insert page view
            \$this->db->insert('page_views', [
                'url' => \$url,
                'title' => \$title,
                'content_type' => \$type,
                'content_id' => \$modelId ?: null,
                'referrer' => \$_SERVER['HTTP_REFERER'] ?? null,
                'user_agent' => \$_SERVER['HTTP_USER_AGENT'] ?? '',
                'ip' => client_ip(),
                'session_id' => session_id(),
                'user_id' => Auth::id(),
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            // Update content view count
            if (\$type && \$modelId) {
                \$tableMap = [
                    'product' => 'products',
                    'blog' => 'blog_posts',
                    'tutorial' => 'tutorials',
                    'page' => 'pages',
                ];
                \$table = \$tableMap[\$type] ?? null;
                if (\$table) {
                    \$viewCol = in_array(\$table, ['blog_posts']) ? 'views' : 'views';
                    \$this->db->query("UPDATE \`{\$table}\` SET views = COALESCE(views, 0) + 1 WHERE id = ?", [\$modelId]);
                }
            }
        } catch (\\Throwable \$e) {
            // Silently fail
        }
    }

    /**
     * Get dashboard analytics data
     */
    public function getDashboardData(int \$days = 30): array
    {
        \$since = date('Y-m-d H:i:s', strtotime("-{\$days} days"));

        return [
            'total_views' => (int) \$this->db->fetchColumn(
                "SELECT COUNT(*) FROM page_views WHERE created_at >= ?", [\$since]
            ),
            'unique_visitors' => (int) \$this->db->fetchColumn(
                "SELECT COUNT(DISTINCT session_id) FROM page_views WHERE created_at >= ?", [\$since]
            ),
            'daily_views' => \$this->db->fetchAll(
                "SELECT DATE(created_at) as date, COUNT(*) as views
                 FROM page_views WHERE created_at >= ?
                 GROUP BY DATE(created_at) ORDER BY date",
                [\$since]
            ),
            'popular_products' => \$this->db->fetchAll(
                "SELECT p.name, p.slug, COALESCE(p.views, 0) as views
                 FROM products p WHERE p.status = 'published' AND p.deleted_at IS NULL
                 ORDER BY views DESC LIMIT 10"
            ),
            'popular_posts' => \$this->db->fetchAll(
                "SELECT title, slug, views FROM blog_posts
                 WHERE status = 'published' AND deleted_at IS NULL
                 ORDER BY views DESC LIMIT 10"
            ),
            'traffic_sources' => \$this->db->fetchAll(
                "SELECT
                    CASE
                        WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
                        WHEN referrer LIKE '%google%' THEN 'Google'
                        WHEN referrer LIKE '%facebook%' THEN 'Facebook'
                        WHEN referrer LIKE '%twitter%' OR referrer LIKE '%x.com%' THEN 'Twitter/X'
                        WHEN referrer LIKE '%linkedin%' THEN 'LinkedIn'
                        ELSE 'Other'
                    END as source,
                    COUNT(*) as visits
                 FROM page_views
                 WHERE created_at >= ?
                 GROUP BY source ORDER BY visits DESC",
                [\$since]
            ),
            'conversion_funnel' => [
                'visits' => (int) \$this->db->fetchColumn("SELECT COUNT(DISTINCT session_id) FROM page_views WHERE created_at >= ?", [\$since]),
                'product_views' => (int) \$this->db->fetchColumn("SELECT COUNT(*) FROM page_views WHERE content_type = 'product' AND created_at >= ?", [\$since]),
                'inquiries' => (int) \$this->db->fetchColumn("SELECT COUNT(*) FROM product_inquiries WHERE created_at >= ?", [\$since]),
                'demos_booked' => (int) \$this->db->fetchColumn("SELECT COUNT(*) FROM product_inquiries WHERE type = 'demo' AND created_at >= ?", [\$since]),
            ],
        ];
    }

    /**
     * Get conversion rate
     */
    public function getConversionRate(int \$days = 30): float
    {
        \$since = date('Y-m-d H:i:s', strtotime("-{\$days} days"));
        \$visits = (int) \$this->db->fetchColumn("SELECT COUNT(DISTINCT session_id) FROM page_views WHERE created_at >= ?", [\$since]);
        \$inquiries = (int) \$this->db->fetchColumn("SELECT COUNT(*) FROM product_inquiries WHERE created_at >= ?", [\$since]);

        return \$visits > 0 ? round((\$inquiries / \$visits) * 100, 2) : 0;
    }
}
`
  },
  // ==================== SEO ====================
  {
    path: 'app/core/Seo.php',
    name: 'Seo.php',
    language: 'php',
    feature: 'SEO',
    description: 'SEO helper: Schema.org JSON-LD, Open Graph, sitemap generation, meta tags',
    content: `<?php
declare(strict_types=1);

namespace App\\Core;

/**
 * SEO - Schema.org, Open Graph, Sitemap, Meta generation
 */
class Seo
{
    /**
     * Generate Schema.org JSON-LD for Organization
     */
    public static function organization(): string
    {
        \$data = [
            '@context' => 'https://schema.org',
            '@type' => 'Organization',
            'name' => setting('site_name', 'Khybersoft'),
            'url' => SITE_URL,
            'logo' => SITE_URL . '/assets/images/logo.png',
            'description' => setting('site_tagline', ''),
            'email' => setting('site_email', ''),
            'telephone' => setting('site_phone', ''),
            'address' => [
                '@type' => 'PostalAddress',
                'streetAddress' => setting('site_address', ''),
            ],
            'sameAs' => array_filter([
                setting('social_facebook'),
                setting('social_twitter'),
                setting('social_linkedin'),
                setting('social_youtube'),
                setting('social_github'),
            ]),
        ];

        return '<script type="application/ld+json">' . json_encode(\$data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . '</script>';
    }

    /**
     * Generate Schema.org JSON-LD for Product
     */
    public static function product(array \$product): string
    {
        \$data = [
            '@context' => 'https://schema.org',
            '@type' => 'SoftwareApplication',
            'name' => \$product['name'],
            'url' => SITE_URL . '/products/' . \$product['slug'],
            'description' => \$product['short_desc'] ?? '',
            'applicationCategory' => 'BusinessApplication',
            'operatingSystem' => 'Web',
            'image' => !empty(\$product['hero_image']) ? upload(\$product['hero_image']) : null,
            'offers' => [
                '@type' => 'Offer',
                'price' => \$product['price'] ?? '0',
                'priceCurrency' => \$product['price_currency'] ?? 'USD',
                'availability' => 'https://schema.org/InStock',
            ],
        ];

        if (!empty(\$product['video_url'])) {
            \$data['video'] = [
                '@type' => 'VideoObject',
                'name' => \$product['name'] . ' Demo',
                'embedUrl' => \$product['video_url'],
            ];
        }

        return '<script type="application/ld+json">' . json_encode(\$data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . '</script>';
    }

    /**
     * Generate Schema.org JSON-LD for Article/Blog Post
     */
    public static function article(array \$post): string
    {
        \$data = [
            '@context' => 'https://schema.org',
            '@type' => 'Article',
            'headline' => \$post['title'],
            'url' => SITE_URL . '/blog/' . \$post['slug'],
            'description' => \$post['meta_desc'] ?? str_limit(strip_tags(\$post['excerpt'] ?? ''), 160),
            'datePublished' => \$post['published_at'] ?? \$post['created_at'],
            'dateModified' => \$post['updated_at'] ?? \$post['created_at'],
            'author' => [
                '@type' => 'Person',
                'name' => \$post['author_name'] ?? 'Khybersoft',
            ],
            'publisher' => [
                '@type' => 'Organization',
                'name' => setting('site_name'),
                'logo' => [
                    '@type' => 'ImageObject',
                    'url' => SITE_URL . '/assets/images/logo.png',
                ],
            ],
        ];

        if (!empty(\$post['featured_image'])) {
            \$data['image'] = upload(\$post['featured_image']);
        }

        return '<script type="application/ld+json">' . json_encode(\$data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . '</script>';
    }

    /**
     * Generate Schema.org JSON-LD for FAQ
     */
    public static function faq(array \$faqs): string
    {
        \$entities = [];
        foreach (\$faqs as \$faq) {
            \$entities[] = [
                '@type' => 'Question',
                'name' => \$faq['question'],
                'acceptedAnswer' => [
                    '@type' => 'Answer',
                    'text' => \$faq['answer'],
                ],
            ];
        }

        \$data = [
            '@context' => 'https://schema.org',
            '@type' => 'FAQPage',
            'mainEntity' => \$entities,
        ];

        return '<script type="application/ld+json">' . json_encode(\$data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . '</script>';
    }

    /**
     * Generate Schema.org JSON-LD for Breadcrumbs
     */
    public static function breadcrumbs(array \$items): string
    {
        \$listItems = [];
        foreach (\$items as \$i => \$item) {
            \$listItems[] = [
                '@type' => 'ListItem',
                'position' => \$i + 1,
                'name' => \$item['label'],
                'item' => \$item['url'] ? SITE_URL . \$item['url'] : SITE_URL,
            ];
        }

        \$data = [
            '@context' => 'https://schema.org',
            '@type' => 'BreadcrumbList',
            'itemListElement' => \$listItems,
        ];

        return '<script type="application/ld+json">' . json_encode(\$data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . '</script>';
    }

    /**
     * Generate Open Graph meta tags
     */
    public static function openGraph(string \$title, string \$description, string \$url, string \$image = '', string \$type = 'website'): string
    {
        \$tags = [
            'og:title' => \$title,
            'og:description' => \$description,
            'og:url' => \$url,
            'og:type' => \$type,
            'og:site_name' => setting('site_name'),
            'og:locale' => 'en_US',
        ];

        if (\$image) {
            \$tags['og:image'] = \$image;
        }

        // Twitter Card
        \$tags['twitter:card'] = 'summary_large_image';
        \$tags['twitter:title'] = \$title;
        \$tags['twitter:description'] => \$description;
        if (\$image) \$tags['twitter:image'] = \$image;

        \$html = '';
        foreach (\$tags as \$property => \$content) {
            \$html .= '<meta property="' . e(\$property) . '" content="' . e(\$content) . '">' . "\\n";
        }

        return \$html;
    }

    /**
     * Generate XML sitemap
     */
    public static function generateSitemap(): string
    {
        \$db = Database::getInstance();
        \$urls = [];

        // Static pages
        \$staticPages = ['/', '/about', '/services', '/products', '/blog', '/contact', '/faq', '/pricing', '/team', '/portfolio', '/help', '/careers'];
        foreach (\$staticPages as \$page) {
            \$urls[] = ['loc' => SITE_URL . \$page, 'changefreq' => 'weekly', 'priority' => '0.8'];
        }

        // Products
        \$products = \$db->fetchAll("SELECT slug, updated_at FROM products WHERE status = 'published' AND deleted_at IS NULL");
        foreach (\$products as \$p) {
            \$urls[] = ['loc' => SITE_URL . '/products/' . \$p['slug'], 'changefreq' => 'weekly', 'priority' => '0.9', 'lastmod' => \$p['updated_at']];
        }

        // Blog posts
        \$posts = \$db->fetchAll("SELECT slug, updated_at FROM blog_posts WHERE status = 'published' AND deleted_at IS NULL");
        foreach (\$posts as \$p) {
            \$urls[] = ['loc' => SITE_URL . '/blog/' . \$p['slug'], 'changefreq' => 'monthly', 'priority' => '0.7', 'lastmod' => \$p['updated_at']];
        }

        // Tutorials
        \$tutorials = \$db->fetchAll("SELECT slug, updated_at FROM tutorials WHERE status = 'published'");
        foreach (\$tutorials as \$t) {
            \$urls[] = ['loc' => SITE_URL . '/tutorials/' . \$t['slug'], 'changefreq' => 'monthly', 'priority' => '0.6', 'lastmod' => \$t['updated_at']];
        }

        // Services
        \$services = \$db->fetchAll("SELECT slug, updated_at FROM services WHERE status = 'published'");
        foreach (\$services as \$s) {
            \$urls[] = ['loc' => SITE_URL . '/services/' . \$s['slug'], 'changefreq' => 'monthly', 'priority' => '0.7', 'lastmod' => \$s['updated_at']];
        }

        // Build XML
        \$xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\\n";
        \$xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\\n";

        foreach (\$urls as \$url) {
            \$xml .= "  <url>\\n";
            \$xml .= "    <loc>" . htmlspecialchars(\$url['loc']) . "</loc>\\n";
            if (!empty(\$url['lastmod'])) {
                \$xml .= "    <lastmod>" . date('Y-m-d', strtotime(\$url['lastmod'])) . "</lastmod>\\n";
            }
            \$xml .= "    <changefreq>" . \$url['changefreq'] . "</changefreq>\\n";
            \$xml .= "    <priority>" . \$url['priority'] . "</priority>\\n";
            \$xml .= "  </url>\\n";
        }

        \$xml .= '</urlset>';
        return \$xml;
    }

    /**
     * Generate robots.txt content
     */
    public static function robotsTxt(): string
    {
        \$custom = setting('robots_txt');
        if (\$custom) return \$custom;

        return "User-agent: *
Allow: /
Disallow: /admin/
Disallow: /admin
Disallow: /api/

Sitemap: " . SITE_URL . "/sitemap.xml
";
    }

    /**
     * Auto-generate meta description from content
     */
    public static function autoMetaDescription(string \$content, int \$length = 155): string
    {
        \$text = strip_tags(\$content);
        \$text = preg_replace('/\\s+/', ' ', \$text);
        \$text = trim(\$text);

        if (mb_strlen(\$text) <= \$length) return \$text;

        \$truncated = mb_substr(\$text, 0, \$length);
        \$lastSpace = mb_strrpos(\$truncated, ' ');
        if (\$lastSpace !== false) {
            \$truncated = mb_substr(\$truncated, 0, \$lastSpace);
        }

        return \$truncated . '...';
    }
}
`
  },
  // ==================== SITEMAP CONTROLLER ====================
  {
    path: 'app/controllers/front/SitemapController.php',
    name: 'SitemapController.php',
    language: 'php',
    feature: 'SEO',
    description: 'Dynamic sitemap.xml and robots.txt controller',
    content: `<?php
declare(strict_types=1);

namespace App\\Controllers\\Front;

use App\\Core\\Seo;

/**
 * Sitemap Controller
 * Generates dynamic sitemap.xml and robots.txt
 */
class SitemapController
{
    /**
     * Serve sitemap.xml
     */
    public function index(): void
    {
        header('Content-Type: application/xml; charset=utf-8');
        header('Cache-Control: max-age=3600');
        echo Seo::generateSitemap();
        exit;
    }

    /**
     * Serve robots.txt
     */
    public function robots(): void
    {
        header('Content-Type: text/plain; charset=utf-8');
        header('Cache-Control: max-age=86400');
        echo Seo::robotsTxt();
        exit;
    }
}
`
  },
  // ==================== SEARCH LOGS TABLE ====================
  {
    path: 'database/migrations/search_analytics.sql',
    name: 'search_analytics.sql',
    language: 'sql',
    feature: 'Search',
    description: 'Database tables for search logs, page views, and FULLTEXT indexes',
    content: `-- Search & Analytics Tables
-- ============================================

-- Search Logs
CREATE TABLE IF NOT EXISTS \`search_logs\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`query\` VARCHAR(255) NOT NULL,
  \`result_count\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`ip\` VARCHAR(45) NULL,
  \`user_agent\` TEXT NULL,
  \`user_id\` INT UNSIGNED NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_search_query\` (\`query\`),
  INDEX \`idx_search_created\` (\`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Page Views
CREATE TABLE IF NOT EXISTS \`page_views\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`url\` VARCHAR(500) NOT NULL,
  \`title\` VARCHAR(255) NULL,
  \`content_type\` VARCHAR(50) NULL,
  \`content_id\` INT UNSIGNED NULL,
  \`referrer\` VARCHAR(500) NULL,
  \`user_agent\` TEXT NULL,
  \`ip\` VARCHAR(45) NULL,
  \`session_id\` VARCHAR(128) NULL,
  \`user_id\` INT UNSIGNED NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_pv_url\` (\`url\`(255)),
  INDEX \`idx_pv_type\` (\`content_type\`, \`content_id\`),
  INDEX \`idx_pv_session\` (\`session_id\`),
  INDEX \`idx_pv_created\` (\`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add views column to content tables
ALTER TABLE \`products\` ADD COLUMN \`views\` INT UNSIGNED NOT NULL DEFAULT 0 AFTER \`sort_order\`;
ALTER TABLE \`blog_posts\` ADD COLUMN IF NOT EXISTS \`views\` INT UNSIGNED NOT NULL DEFAULT 0;
ALTER TABLE \`tutorials\` ADD COLUMN \`views\` INT UNSIGNED NOT NULL DEFAULT 0 AFTER \`sort_order\`;

-- FULLTEXT Indexes for search
ALTER TABLE \`products\` ADD FULLTEXT INDEX \`ft_products\` (\`name\`, \`tagline\`, \`short_desc\`, \`full_desc\`);
ALTER TABLE \`blog_posts\` ADD FULLTEXT INDEX \`ft_blog_posts\` (\`title\`, \`excerpt\`, \`content\`);
ALTER TABLE \`tutorials\` ADD FULLTEXT INDEX \`ft_tutorials\` (\`title\`, \`description\`);
ALTER TABLE \`pages\` ADD FULLTEXT INDEX \`ft_pages\` (\`title\`, \`content\`);
ALTER TABLE \`services\` ADD FULLTEXT INDEX \`ft_services\` (\`title\`, \`short_desc\`, \`full_desc\`);

-- Email Queue
CREATE TABLE IF NOT EXISTS \`email_queue\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`to_email\` VARCHAR(255) NOT NULL,
  \`to_name\` VARCHAR(100) NULL,
  \`subject\` VARCHAR(255) NOT NULL,
  \`body_html\` LONGTEXT NOT NULL,
  \`body_text\` TEXT NULL,
  \`template\` VARCHAR(100) NULL,
  \`status\` ENUM('pending','sending','sent','failed') NOT NULL DEFAULT 'pending',
  \`attempts\` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  \`max_attempts\` TINYINT UNSIGNED NOT NULL DEFAULT 3,
  \`scheduled_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  \`sent_at\` TIMESTAMP NULL,
  \`error_message\` TEXT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_eq_status\` (\`status\`),
  INDEX \`idx_eq_scheduled\` (\`scheduled_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Email Templates
CREATE TABLE IF NOT EXISTS \`email_templates\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(100) NOT NULL,
  \`slug\` VARCHAR(100) NOT NULL,
  \`subject\` VARCHAR(255) NOT NULL,
  \`body_html\` LONGTEXT NOT NULL,
  \`variables\` JSON NULL,
  \`status\` ENUM('active','inactive') NOT NULL DEFAULT 'active',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_email_templates_slug\` (\`slug\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Leads / CRM
CREATE TABLE IF NOT EXISTS \`leads\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(100) NOT NULL,
  \`email\` VARCHAR(255) NOT NULL,
  \`phone\` VARCHAR(20) NULL,
  \`company\` VARCHAR(100) NULL,
  \`source\` VARCHAR(50) NULL,
  \`source_type\` VARCHAR(50) NULL,
  \`source_id\` INT UNSIGNED NULL,
  \`budget\` VARCHAR(50) NULL,
  \`score\` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  \`temperature\` ENUM('cold','warm','hot') NOT NULL DEFAULT 'cold',
  \`stage\` ENUM('new','contacted','qualified','proposal','won','lost') NOT NULL DEFAULT 'new',
  \`assigned_to\` INT UNSIGNED NULL,
  \`notes\` TEXT NULL,
  \`follow_up_at\` TIMESTAMP NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_leads_stage\` (\`stage\`),
  INDEX \`idx_leads_temp\` (\`temperature\`),
  INDEX \`idx_leads_score\` (\`score\`),
  INDEX \`idx_leads_follow\` (\`follow_up_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Orders
CREATE TABLE IF NOT EXISTS \`orders\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`order_number\` VARCHAR(20) NOT NULL,
  \`user_id\` INT UNSIGNED NULL,
  \`customer_name\` VARCHAR(100) NOT NULL,
  \`customer_email\` VARCHAR(255) NOT NULL,
  \`product_id\` INT UNSIGNED NULL,
  \`plan_id\` INT UNSIGNED NULL,
  \`amount\` DECIMAL(10,2) NOT NULL,
  \`currency\` VARCHAR(3) NOT NULL DEFAULT 'USD',
  \`payment_method\` ENUM('stripe','paypal','bank_transfer','custom') NOT NULL,
  \`payment_status\` ENUM('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
  \`transaction_id\` VARCHAR(255) NULL,
  \`license_key\` VARCHAR(100) NULL,
  \`status\` ENUM('pending','processing','completed','cancelled') NOT NULL DEFAULT 'pending',
  \`notes\` TEXT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_orders_number\` (\`order_number\`),
  INDEX \`idx_orders_status\` (\`payment_status\`),
  INDEX \`idx_orders_product\` (\`product_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Downloads
CREATE TABLE IF NOT EXISTS \`downloads\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`product_id\` INT UNSIGNED NOT NULL,
  \`order_id\` INT UNSIGNED NULL,
  \`token\` VARCHAR(64) NOT NULL,
  \`ip\` VARCHAR(45) NULL,
  \`user_agent\` TEXT NULL,
  \`user_id\` INT UNSIGNED NULL,
  \`expires_at\` TIMESTAMP NOT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_downloads_token\` (\`token\`),
  INDEX \`idx_downloads_product\` (\`product_id\`),
  INDEX \`idx_downloads_expires\` (\`expires_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Languages
CREATE TABLE IF NOT EXISTS \`languages\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`code\` VARCHAR(5) NOT NULL,
  \`name\` VARCHAR(50) NOT NULL,
  \`native_name\` VARCHAR(50) NOT NULL,
  \`direction\` ENUM('ltr','rtl') NOT NULL DEFAULT 'ltr',
  \`is_default\` TINYINT(1) NOT NULL DEFAULT 0,
  \`status\` ENUM('active','inactive') NOT NULL DEFAULT 'active',
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_languages_code\` (\`code\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Translations
CREATE TABLE IF NOT EXISTS \`translations\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`language_code\` VARCHAR(5) NOT NULL,
  \`group\` VARCHAR(50) NOT NULL DEFAULT 'general',
  \`key\` VARCHAR(255) NOT NULL,
  \`value\` TEXT NOT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_translations\` (\`language_code\`, \`group\`, \`key\`),
  INDEX \`idx_translations_lang\` (\`language_code\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default languages
INSERT INTO \`languages\` (\`code\`, \`name\`, \`native_name\`, \`direction\`, \`is_default\`) VALUES
('en', 'English', 'English', 'ltr', 1),
('ur', 'Urdu', 'اردو', 'rtl', 0);

-- Seed default email templates
INSERT INTO \`email_templates\` (\`name\`, \`slug\`, \`subject\`, \`body_html\`) VALUES
('Welcome Email', 'welcome', 'Welcome to {{site_name}}!', '<h1>Welcome, {{name}}!</h1><p>Thank you for joining {{site_name}}.</p>'),
('Inquiry Auto-Reply', 'inquiry_reply', 'We received your inquiry - {{site_name}}', '<h1>Thank you for your inquiry!</h1><p>We have received your message and will get back to you within 24 hours.</p>'),
('Password Reset', 'password_reset', 'Reset Your Password - {{site_name}}', '<h1>Password Reset</h1><p>Click the link below to reset your password:</p><a href="{{reset_url}}">Reset Password</a>'),
('Newsletter Welcome', 'newsletter_welcome', 'Welcome to our newsletter!', '<h1>Welcome!</h1><p>You have been subscribed to our newsletter.</p>');
`
  },
];
