export interface FrontFile {
  path: string;
  name: string;
  language: string;
  content: string;
  description: string;
  module: string;
  type: 'controller' | 'view' | 'layout' | 'partial' | 'config';
}

export const frontLayoutFiles: FrontFile[] = [
  {
    path: 'app/views/layouts/front.php',
    name: 'front.php',
    language: 'php',
    module: 'Layout',
    type: 'layout',
    description: 'Main frontend layout with sticky navbar, footer, WhatsApp button, back-to-top',
    content: `<?php
/**
 * Khybersoft - Frontend Layout
 * Premium design with Inter + Sora fonts, glassmorphism, animations
 */
\$page_title = \$page_title ?? setting('site_name');
\$meta_desc = \$meta_desc ?? setting('site_tagline');
\$og_image = \$og_image ?? asset('images/og-default.jpg');
\$current_path = parse_url(\$_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?? '/';

// Load dynamic menus
\$db = \\App\\Core\\Database::getInstance();
\$headerMenu = \$db->fetchAll(
    "SELECT mi.* FROM menu_items mi
     INNER JOIN menus m ON mi.menu_id = m.id
     WHERE m.slug = 'header' AND mi.status = 'active' AND mi.parent_id IS NULL
     ORDER BY mi.sort_order"
);
\$footerMenu = \$db->fetchAll(
    "SELECT mi.* FROM menu_items mi
     INNER JOIN menus m ON mi.menu_id = m.id
     WHERE m.slug = 'footer' AND mi.status = 'active' AND mi.parent_id IS NULL
     ORDER BY mi.sort_order"
);
?>
<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e(\$page_title) ?></title>
    <meta name="description" content="<?= e(\$meta_desc) ?>">
    <meta property="og:title" content="<?= e(\$page_title) ?>">
    <meta property="og:description" content="<?= e(\$meta_desc) ?>">
    <meta property="og:image" content="<?= e(\$og_image) ?>">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="canonical" href="<?= e(\$current_path) ?>">
    <?= \\App\\Core\\CSRF::meta() ?>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Sora:wght@400;500;600;700;800&display=swap" rel="stylesheet">

    <!-- TailwindCSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
    tailwind.config = {
        theme: {
            extend: {
                fontFamily: {
                    sans: ['Inter', 'system-ui', 'sans-serif'],
                    display: ['Sora', 'Inter', 'sans-serif'],
                },
                colors: {
                    brand: {
                        50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc',
                        400: '#818cf8', 500: '#6366f1', 600: '#4F46E5', 700: '#4338ca',
                        800: '#3730a3', 900: '#312e81', 950: '#1e1b4b',
                    },
                    navy: { 900: '#0B1220', 800: '#111827', 700: '#1f2937' },
                },
            }
        }
    }
    </script>

    <!-- AOS Animations -->
    <link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet">
    <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>

    <!-- Alpine.js -->
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>

    <style>
        body { font-family: 'Inter', system-ui, sans-serif; }
        .font-display { font-family: 'Sora', 'Inter', sans-serif; }

        /* Glassmorphism */
        .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); }
        .glass-light { background: rgba(255,255,255,0.8); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.3); }

        /* Gradient text */
        .gradient-text { background: linear-gradient(135deg, #4F46E5 0%, #3b82f6 50%, #06b6d4 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

        /* Hover lift */
        .hover-lift { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .hover-lift:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(79,70,229,0.15); }

        /* Gradient border */
        .gradient-border { position: relative; }
        .gradient-border::before { content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1px; background: linear-gradient(135deg, #4F46E5, #3b82f6, #06b6d4); -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }

        /* Marquee */
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 30s linear infinite; }

        /* Reading progress */
        #reading-progress { position: fixed; top: 0; left: 0; height: 3px; background: linear-gradient(90deg, #4F46E5, #3b82f6); z-index: 9999; transition: width 0.1s; }

        /* Custom scrollbar */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #0B1220; }
        ::-webkit-scrollbar-thumb { background: #4F46E5; border-radius: 4px; }

        /* Navbar scroll effect */
        .navbar-scrolled { background: rgba(11,18,32,0.9); backdrop-filter: blur(20px); box-shadow: 0 4px 30px rgba(0,0,0,0.3); }
    </style>
</head>
<body class="bg-navy-900 text-white antialiased">
    <!-- Reading Progress Bar (for blog posts) -->
    <div id="reading-progress" style="width: 0%"></div>

    <!-- Sticky Navbar -->
    <nav id="main-nav" class="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-16 lg:h-20">
                <!-- Logo -->
                <a href="<?= url('/') ?>" class="flex items-center gap-2.5">
                    <div class="w-9 h-9 bg-gradient-to-br from-brand-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/25">
                        <span class="text-white font-bold text-lg">K</span>
                    </div>
                    <span class="font-display font-bold text-xl text-white"><?= e(setting('site_name')) ?></span>
                </a>

                <!-- Desktop Menu -->
                <div class="hidden lg:flex items-center gap-1">
                    <?php foreach (\$headerMenu as \$menuItem): ?>
                    <a href="<?= e(\$menuItem['url'] ?? '#') ?>" target="<?= e(\$menuItem['target'] ?? '_self') ?>"
                       class="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors <?= str_starts_with(\$current_path, parse_url(\$menuItem['url'] ?? '', PHP_URL_PATH) ?? '/') && \$menuItem['url'] !== '/' ? 'text-white bg-white/10' : '' ?>">
                        <?= e(\$menuItem['title']) ?>
                    </a>
                    <?php endforeach; ?>
                </div>

                <!-- CTA + Mobile Toggle -->
                <div class="flex items-center gap-3">
                    <a href="<?= url('/book-demo') ?>" class="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-600 to-blue-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-brand-500/25 transition-all">
                        Book Demo
                    </a>
                    <button id="mobile-toggle" class="lg:hidden p-2 text-slate-300 hover:text-white">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                    </button>
                </div>
            </div>
        </div>

        <!-- Mobile Menu -->
        <div id="mobile-menu" class="lg:hidden hidden bg-navy-900/95 backdrop-blur-xl border-t border-white/10">
            <div class="px-4 py-4 space-y-1">
                <?php foreach (\$headerMenu as \$menuItem): ?>
                <a href="<?= e(\$menuItem['url'] ?? '#') ?>" class="block px-4 py-3 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg"><?= e(\$menuItem['title']) ?></a>
                <?php endforeach; ?>
                <a href="<?= url('/book-demo') ?>" class="block px-4 py-3 mt-2 text-center bg-gradient-to-r from-brand-600 to-blue-500 text-white font-semibold rounded-xl">Book Free Demo</a>
            </div>
        </div>
    </nav>

    <!-- Main Content -->
    <main>
        <?= \$_view_content_ ?? '' ?>
    </main>

    <!-- Footer -->
    <footer class="bg-navy-900 border-t border-white/10 pt-16 pb-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
                <!-- Brand -->
                <div class="lg:col-span-2">
                    <div class="flex items-center gap-2.5 mb-4">
                        <div class="w-9 h-9 bg-gradient-to-br from-brand-500 to-blue-500 rounded-xl flex items-center justify-center">
                            <span class="text-white font-bold text-lg">K</span>
                        </div>
                        <span class="font-display font-bold text-xl text-white"><?= e(setting('site_name')) ?></span>
                    </div>
                    <p class="text-slate-400 text-sm mb-4 max-w-sm"><?= e(setting('site_tagline')) ?></p>
                    <!-- Newsletter -->
                    <form method="POST" action="<?= url('/newsletter/subscribe') ?>" class="flex gap-2">
                        <?= \\App\\Core\\CSRF::field() ?>
                        <input type="email" name="email" placeholder="Your email" required class="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500">
                        <button type="submit" class="px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-500">Subscribe</button>
                    </form>
                </div>

                <!-- Footer Links -->
                <?php
                \$footerGroups = [
                    'Products' => [['Products', '/products'], ['Pricing', '/pricing'], ['Demos', '/products'], ['Tutorials', '/tutorials']],
                    'Company' => [['About', '/about'], ['Team', '/team'], ['Careers', '/careers'], ['Contact', '/contact']],
                    'Resources' => [['Blog', '/blog'], ['Help Center', '/help'], ['FAQ', '/faq'], ['Portfolio', '/portfolio']],
                ];
                foreach (\$footerGroups as \$groupTitle => \$links):
                ?>
                <div>
                    <h4 class="font-semibold text-white mb-4"><?= e(\$groupTitle) ?></h4>
                    <ul class="space-y-2.5">
                        <?php foreach (\$links as [\$label, \$url]): ?>
                        <li><a href="<?= url(\$url) ?>" class="text-sm text-slate-400 hover:text-white transition-colors"><?= e(\$label) ?></a></li>
                        <?php endforeach; ?>
                    </ul>
                </div>
                <?php endforeach; ?>
            </div>

            <!-- Bottom Bar -->
            <div class="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p class="text-sm text-slate-500">&copy; <?= date('Y') ?> <?= e(setting('site_name')) ?>. All rights reserved.</p>
                <div class="flex items-center gap-4">
                    <a href="<?= url('/privacy-policy') ?>" class="text-xs text-slate-500 hover:text-slate-300">Privacy</a>
                    <a href="<?= url('/terms') ?>" class="text-xs text-slate-500 hover:text-slate-300">Terms</a>
                    <a href="<?= url('/refund-policy') ?>" class="text-xs text-slate-500 hover:text-slate-300">Refund</a>
                </div>
                <div class="flex items-center gap-3">
                    <!-- Social Icons -->
                    <?php
                    \$socials = [
                        'facebook' => 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z',
                        'twitter' => 'M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z',
                        'linkedin' => 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z',
                    ];
                    foreach (\$socials as \$platform => \$path):
                    ?>
                    <a href="<?= e(setting("social_{\$platform}")) ?>" target="_blank" rel="noopener" class="w-9 h-9 rounded-lg bg-white/5 hover:bg-brand-600 flex items-center justify-center transition-colors">
                        <svg class="w-4 h-4 text-slate-400 hover:text-white" fill="currentColor" viewBox="0 0 24 24"><path d="<?= \$path ?>"/></svg>
                    </a>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>
    </footer>

    <!-- WhatsApp Floating Button -->
    <?php if (setting('whatsapp_number')): ?>
    <a href="https://wa.me/<?= e(setting('whatsapp_number')) ?>" target="_blank" rel="noopener"
       class="fixed bottom-6 right-6 z-40 w-14 h-14 bg-green-500 hover:bg-green-400 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 transition-transform hover:scale-110">
        <svg class="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
    </a>
    <?php endif; ?>

    <!-- Back to Top -->
    <button id="back-to-top" class="fixed bottom-6 left-6 z-40 w-12 h-12 bg-brand-600/80 hover:bg-brand-600 rounded-full flex items-center justify-center shadow-lg transition-all opacity-0 pointer-events-none">
        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
    </button>

    <!-- Scripts -->
    <script>
    // Initialize AOS
    AOS.init({ duration: 600, once: true, offset: 50 });

    // Navbar scroll effect
    const nav = document.getElementById('main-nav');
    window.addEventListener('scroll', () => {
        nav.classList.toggle('navbar-scrolled', window.scrollY > 50);
    });

    // Mobile menu toggle
    document.getElementById('mobile-toggle')?.addEventListener('click', () => {
        document.getElementById('mobile-menu').classList.toggle('hidden');
    });

    // Back to top
    const backToTop = document.getElementById('back-to-top');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            backToTop.classList.remove('opacity-0', 'pointer-events-none');
            backToTop.classList.add('opacity-100');
        } else {
            backToTop.classList.add('opacity-0', 'pointer-events-none');
            backToTop.classList.remove('opacity-100');
        }
    });
    backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    // Reading progress bar
    window.addEventListener('scroll', () => {
        const bar = document.getElementById('reading-progress');
        if (bar) {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            bar.style.width = (scrollTop / docHeight * 100) + '%';
        }
    });
    </script>
</body>
</html>
`
  },
];

export const frontControllerFiles: FrontFile[] = [
  {
    path: 'app/controllers/front/HomeController.php',
    name: 'HomeController.php',
    language: 'php',
    module: 'Front',
    type: 'controller',
    description: 'Homepage controller with all sections data',
    content: `<?php
declare(strict_types=1);
namespace App\\Controllers\\Front;
use App\\Core\\Controller;
use App\\Core\\Database;

class HomeController extends Controller
{
    protected string \$layout = 'front';

    public function index(): void
    {
        \$db = Database::getInstance();

        \$data = [
            'page_title' => setting('site_name') . ' - ' . setting('site_tagline'),
            'meta_desc' => 'Khybersoft - Innovative software solutions for modern businesses. ERP, CRM, HRM, LMS and custom development.',
            'featured_products' => \$db->fetchAll(
                "SELECT * FROM products WHERE is_featured = 1 AND status = 'published' AND deleted_at IS NULL ORDER BY sort_order LIMIT 6"
            ),
            'product_categories' => \$db->fetchAll(
                "SELECT * FROM product_categories ORDER BY sort_order LIMIT 8"
            ),
            'testimonials' => \$db->fetchAll(
                "SELECT * FROM testimonials WHERE status = 'published' ORDER BY sort_order LIMIT 10"
            ),
            'latest_posts' => \$db->fetchAll(
                "SELECT p.*, c.name as category_name FROM blog_posts p
                 LEFT JOIN blog_categories c ON p.category_id = c.id
                 WHERE p.status = 'published' AND p.published_at <= NOW() AND p.deleted_at IS NULL
                 ORDER BY p.published_at DESC LIMIT 3"
            ),
            'services' => \$db->fetchAll(
                "SELECT * FROM services WHERE status = 'published' ORDER BY sort_order LIMIT 3"
            ),
            'clients' => \$db->fetchAll(
                "SELECT * FROM clients WHERE status = 'active' ORDER BY sort_order"
            ),
            'tutorials' => \$db->fetchAll(
                "SELECT * FROM tutorials WHERE status = 'published' ORDER BY created_at DESC LIMIT 4"
            ),
            'stats' => [
                ['value' => '150+', 'label' => 'Projects Delivered'],
                ['value' => '80+', 'label' => 'Happy Clients'],
                ['value' => '25+', 'label' => 'Countries'],
                ['value' => '8+', 'label' => 'Years Experience'],
            ],
        ];

        \$this->view('front.home.index', \$data);
    }
}
`
  },
  {
    path: 'app/controllers/front/ProductController.php',
    name: 'ProductController.php',
    language: 'php',
    module: 'Front',
    type: 'controller',
    description: 'Products listing and detail controller',
    content: `<?php
declare(strict_types=1);
namespace App\\Controllers\\Front;
use App\\Core\\Controller;
use App\\Core\\Database;
use App\\Core\\Validator;

class ProductController extends Controller
{
    protected string \$layout = 'front';

    public function index(): void
    {
        \$db = Database::getInstance();
        \$page = max(1, (int) (\$_GET['page'] ?? 1));
        \$category = \$_GET['category'] ?? '';
        \$search = trim(\$_GET['search'] ?? '');
        \$view = \$_GET['view'] ?? 'grid';

        \$where = "p.status = 'published' AND p.deleted_at IS NULL";
        \$params = [];

        if (\$category) {
            \$where .= " AND pc.slug = ?";
            \$params[] = \$category;
        }
        if (\$search) {
            \$where .= " AND (p.name LIKE ? OR p.tagline LIKE ? OR p.short_desc LIKE ?)";
            \$params = array_merge(\$params, ["%{\$search}%", "%{\$search}%", "%{\$search}%"]);
        }

        \$total = (int) \$db->fetchColumn(
            "SELECT COUNT(*) FROM products p LEFT JOIN product_categories pc ON p.category_id = pc.id WHERE {\$where}",
            \$params
        );
        \$perPage = 12;
        \$offset = (\$page - 1) * \$perPage;

        \$products = \$db->fetchAll(
            "SELECT p.*, pc.name as category_name, pc.slug as category_slug
             FROM products p LEFT JOIN product_categories pc ON p.category_id = pc.id
             WHERE {\$where} ORDER BY p.sort_order, p.created_at DESC LIMIT ? OFFSET ?",
            array_merge(\$params, [\$perPage, \$offset])
        );

        \$categories = \$db->fetchAll("SELECT * FROM product_categories ORDER BY sort_order");

        \$this->view('front.products.index', [
            'page_title' => 'Our Products - ' . setting('site_name'),
            'meta_desc' => 'Explore our suite of powerful software products.',
            'products' => \$products,
            'categories' => \$categories,
            'current_category' => \$category,
            'search' => \$search,
            'view' => \$view,
            'pagination' => ['total' => \$total, 'per_page' => \$perPage, 'current_page' => \$page, 'last_page' => max(1, (int) ceil(\$total / \$perPage))],
        ]);
    }

    public function show(string \$slug): void
    {
        \$db = Database::getInstance();

        \$product = \$db->fetch(
            "SELECT p.*, pc.name as category_name, pc.slug as category_slug
             FROM products p LEFT JOIN product_categories pc ON p.category_id = pc.id
             WHERE p.slug = ? AND p.status = 'published' AND p.deleted_at IS NULL",
            [\$slug]
        );

        if (!\$product) { \$this->abort(404); return; }

        \$plans = \$db->fetchAll("SELECT * FROM product_plans WHERE product_id = ? ORDER BY sort_order", [\$product['id']]);
        \$features = \$db->fetchAll("SELECT * FROM product_features WHERE product_id = ? ORDER BY sort_order", [\$product['id']]);
        \$faqs = \$db->fetchAll("SELECT * FROM product_faqs WHERE product_id = ? ORDER BY sort_order", [\$product['id']]);
        \$demos = \$db->fetchAll("SELECT * FROM product_demos WHERE product_id = ? ORDER BY sort_order", [\$product['id']]);
        \$versions = \$db->fetchAll("SELECT * FROM product_versions WHERE product_id = ? ORDER BY release_date DESC LIMIT 5", [\$product['id']]);
        \$tutorials = \$db->fetchAll("SELECT * FROM tutorials WHERE product_id = ? AND status = 'published' ORDER BY sort_order", [\$product['id']]);
        \$screenshots = json_decode(\$product['screenshots'] ?? '[]', true) ?: [];

        \$related = \$db->fetchAll(
            "SELECT * FROM products WHERE category_id = ? AND id != ? AND status = 'published' AND deleted_at IS NULL LIMIT 3",
            [\$product['category_id'], \$product['id']]
        );

        \$this->view('front.products.show', [
            'page_title' => (\$product['meta_title'] ?: \$product['name']) . ' - ' . setting('site_name'),
            'meta_desc' => \$product['meta_desc'] ?: \$product['short_desc'],
            'product' => \$product,
            'plans' => \$plans,
            'features' => \$features,
            'faqs' => \$faqs,
            'demos' => \$demos,
            'versions' => \$versions,
            'tutorials' => \$tutorials,
            'screenshots' => \$screenshots,
            'related' => \$related,
        ]);
    }

    public function inquire(string \$slug): void
    {
        if (!\$this->validateCsrf()) return;
        \$db = Database::getInstance();
        \$product = \$db->fetch("SELECT id FROM products WHERE slug = ?", [\$slug]);
        if (!\$product) { \$this->redirectBack(); return; }

        \$validator = Validator::make(\$_POST, [
            'name' => 'required|min:2|max:100',
            'email' => 'required|email',
            'phone' => 'nullable|phone',
            'company' => 'nullable|max:100',
            'message' => 'required|min:10|max:2000',
            'type' => 'required|in:demo,quote,support',
        ]);

        if (!\$validator->validate()) {
            flash_input(); flash('errors', json_encode(\$validator->errors()));
            \$this->redirectBack(); return;
        }

        \$db->insert('product_inquiries', [
            'product_id' => \$product['id'],
            'name' => \$this->input('name'), 'email' => \$this->input('email'),
            'phone' => \$this->input('phone'), 'company' => \$this->input('company'),
            'message' => \$this->input('message'), 'type' => \$this->input('type'),
            'ip' => client_ip(), 'created_at' => date('Y-m-d H:i:s'),
        ]);

        flash('success', 'Thank you! We will contact you shortly.');
        \$this->redirect('/products/' . \$slug);
    }
}
`
  },
  {
    path: 'app/controllers/front/BlogController.php',
    name: 'BlogController.php',
    language: 'php',
    module: 'Front',
    type: 'controller',
    description: 'Blog listing and post detail with comments, TOC, related posts',
    content: `<?php
declare(strict_types=1);
namespace App\\Controllers\\Front;
use App\\Core\\Controller;
use App\\Core\\Database;
use App\\Core\\Validator;

class BlogController extends Controller
{
    protected string \$layout = 'front';

    public function index(): void
    {
        \$db = Database::getInstance();
        \$page = max(1, (int) (\$_GET['page'] ?? 1));
        \$category = \$_GET['category'] ?? '';
        \$tag = \$_GET['tag'] ?? '';
        \$search = trim(\$_GET['search'] ?? '');

        \$where = "p.status = 'published' AND p.published_at <= NOW() AND p.deleted_at IS NULL";
        \$params = [];

        if (\$category) { \$where .= " AND c.slug = ?"; \$params[] = \$category; }
        if (\$search) { \$where .= " AND (p.title LIKE ? OR p.excerpt LIKE ?)"; \$params[] = "%{\$search}%"; \$params[] = "%{\$search}%"; }

        \$total = (int) \$db->fetchColumn("SELECT COUNT(*) FROM blog_posts p LEFT JOIN blog_categories c ON p.category_id = c.id WHERE {\$where}", \$params);
        \$perPage = 9;
        \$offset = (\$page - 1) * \$perPage;

        \$posts = \$db->fetchAll(
            "SELECT p.*, c.name as category_name, c.slug as category_slug, u.name as author_name
             FROM blog_posts p LEFT JOIN blog_categories c ON p.category_id = c.id LEFT JOIN users u ON p.author_id = u.id
             WHERE {\$where} ORDER BY p.published_at DESC LIMIT ? OFFSET ?",
            array_merge(\$params, [\$perPage, \$offset])
        );

        \$categories = \$db->fetchAll("SELECT * FROM blog_categories ORDER BY name");
        \$popularTags = \$db->fetchAll("SELECT t.*, COUNT(pt.post_id) as count FROM blog_tags t INNER JOIN blog_post_tags pt ON pt.tag_id = t.id GROUP BY t.id ORDER BY count DESC LIMIT 10");

        \$this->view('front.blog.index', [
            'page_title' => 'Blog - ' . setting('site_name'),
            'posts' => \$posts, 'categories' => \$categories, 'tags' => \$popularTags,
            'current_category' => \$category, 'search' => \$search,
            'pagination' => ['total' => \$total, 'per_page' => \$perPage, 'current_page' => \$page, 'last_page' => max(1, (int) ceil(\$total / \$perPage))],
        ]);
    }

    public function show(string \$slug): void
    {
        \$db = Database::getInstance();
        \$post = \$db->fetch(
            "SELECT p.*, c.name as category_name, c.slug as category_slug, u.name as author_name, u.avatar as author_avatar
             FROM blog_posts p LEFT JOIN blog_categories c ON p.category_id = c.id LEFT JOIN users u ON p.author_id = u.id
             WHERE p.slug = ? AND p.status = 'published' AND p.deleted_at IS NULL",
            [\$slug]
        );
        if (!\$post) { \$this->abort(404); return; }

        \$db->query("UPDATE blog_posts SET views = views + 1 WHERE id = ?", [\$post['id']]);
        \$tags = \$db->fetchAll("SELECT t.* FROM blog_tags t INNER JOIN blog_post_tags pt ON pt.tag_id = t.id WHERE pt.post_id = ?", [\$post['id']]);
        \$comments = \$db->fetchAll("SELECT * FROM blog_comments WHERE post_id = ? AND status = 'approved' ORDER BY created_at ASC", [\$post['id']]);
        \$related = \$db->fetchAll("SELECT p.title, p.slug, p.featured_image, p.excerpt FROM blog_posts p WHERE p.category_id = ? AND p.id != ? AND p.status = 'published' ORDER BY p.published_at DESC LIMIT 3", [\$post['category_id'], \$post['id']]);

        // Generate TOC from headings
        preg_match_all('/<h([2-3])[^>]*>(.*?)<\\/h[2-3]>/', \$post['content'] ?? '', \$matches);
        \$toc = [];
        foreach (\$matches[0] as \$i => \$heading) {
            \$id = 'section-' . slugify(strip_tags(\$matches[2][\$i]));
            \$toc[] = ['level' => (int) \$matches[1][\$i], 'text' => strip_tags(\$matches[2][\$i]), 'id' => \$id];
        }

        \$this->view('front.blog.show', [
            'page_title' => (\$post['meta_title'] ?: \$post['title']) . ' - Blog',
            'meta_desc' => \$post['meta_desc'] ?: str_limit(strip_tags(\$post['excerpt'] ?? ''), 160),
            'post' => \$post, 'tags' => \$tags, 'comments' => \$comments, 'related' => \$related, 'toc' => \$toc,
        ]);
    }

    public function submitComment(string \$slug): void
    {
        if (!\$this->validateCsrf()) return;
        \$db = Database::getInstance();
        \$post = \$db->fetch("SELECT id FROM blog_posts WHERE slug = ? AND status = 'published'", [\$slug]);
        if (!\$post) { \$this->redirectBack(); return; }

        \$validator = Validator::make(\$_POST, ['name' => 'required|min:2|max:100', 'email' => 'required|email', 'message' => 'required|min:5|max:2000']);
        if (!\$validator->validate()) { flash_input(); flash('comment_errors', json_encode(\$validator->errors())); \$this->redirect('/blog/' . \$slug); return; }

        \$db->insert('blog_comments', [
            'post_id' => \$post['id'], 'name' => \$this->input('name'), 'email' => \$this->input('email'),
            'message' => \$this->input('message'), 'ip' => client_ip(), 'status' => 'pending', 'created_at' => date('Y-m-d H:i:s'),
        ]);

        flash('success', 'Your comment is awaiting moderation.');
        \$this->redirect('/blog/' . \$slug);
    }
}
`
  },
];
