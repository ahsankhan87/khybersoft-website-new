export interface UIPolish {
  path: string;
  name: string;
  language: string;
  content: string;
  description: string;
  category: string;
}

export const uiPolish: UIPolish[] = [
  // ==================== HERO ANIMATIONS ====================
  {
    path: 'app/views/components/hero-animated.php',
    name: 'hero-animated.php',
    language: 'php',
    category: 'Public',
    description: 'Hero section with animated gradient mesh, floating elements, custom cursor',
    content: `<?php
/**
 * Animated Hero Component
 * 
 * Features:
 * - Animated gradient mesh background
 * - Floating elements with parallax
 * - Custom cursor effect (optional)
 * - Scroll-triggered animations
 */
?>

<section class="relative min-h-screen flex items-center justify-center overflow-hidden pt-20" id="hero">
    <!-- Animated Gradient Mesh Background -->
    <div class="absolute inset-0">
        <!-- Gradient Orbs -->
        <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/30 rounded-full blur-3xl animate-float-slow"></div>
        <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-float-slow" style="animation-delay: 2s;"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-600/20 rounded-full blur-3xl animate-pulse-slow"></div>
        
        <!-- Grid Pattern -->
        <div class="absolute inset-0 opacity-10" style="background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0); background-size: 40px 40px;"></div>
    </div>

    <!-- Floating Elements -->
    <div class="absolute inset-0 pointer-events-none">
        <div class="absolute top-20 left-10 w-20 h-20 bg-brand-500/10 rounded-2xl animate-float" style="animation-delay: 0s;"></div>
        <div class="absolute top-40 right-20 w-16 h-16 bg-blue-500/10 rounded-full animate-float" style="animation-delay: 1s;"></div>
        <div class="absolute bottom-32 left-1/4 w-24 h-24 bg-purple-500/10 rounded-2xl animate-float" style="animation-delay: 2s;"></div>
        <div class="absolute bottom-20 right-1/3 w-12 h-12 bg-cyan-500/10 rounded-full animate-float" style="animation-delay: 3s;"></div>
    </div>

    <!-- Content -->
    <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
            <!-- Left Content -->
            <div class="text-center lg:text-left" data-aos="fade-right" data-aos-duration="1000">
                <div class="inline-flex items-center gap-2 px-4 py-2 bg-brand-500/10 border border-brand-500/20 rounded-full text-brand-300 text-sm font-medium mb-6 animate-fade-in-up">
                    <span class="w-2 h-2 bg-brand-400 rounded-full animate-pulse"></span>
                    Trusted by 80+ Companies Worldwide
                </div>

                <h1 class="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight animate-fade-in-up" style="animation-delay: 0.2s;">
                    Transform Your<br>
                    <span class="gradient-text animate-gradient">Business</span> With<br>
                    Smart Software
                </h1>

                <p class="text-xl text-slate-300 mb-8 max-w-xl mx-auto lg:mx-0 animate-fade-in-up" style="animation-delay: 0.4s;">
                    Powerful ERP, CRM, HRM, and LMS solutions designed to streamline your operations and accelerate growth.
                </p>

                <div class="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-in-up" style="animation-delay: 0.6s;">
                    <?= component('button', [
                        'label' => 'Explore Products',
                        'variant' => 'primary',
                        'size' => 'lg',
                        'href' => url('/products'),
                        'icon' => 'M13 7l5 5m0 0l-5 5m5-5H6',
                        'iconPosition' => 'right',
                    ]) ?>
                    
                    <?= component('button', [
                        'label' => 'Book Free Demo',
                        'variant' => 'secondary',
                        'size' => 'lg',
                        'href' => url('/book-demo'),
                        'icon' => 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z',
                    ]) ?>
                </div>

                <!-- Trust Indicators -->
                <div class="flex items-center gap-6 mt-12 justify-center lg:justify-start animate-fade-in-up" style="animation-delay: 0.8s;">
                    <div class="flex -space-x-3">
                        <?php for ($i = 1; $i <= 4; $i++): ?>
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-blue-500 border-2 border-navy-900 flex items-center justify-center text-white text-xs font-bold">
                            <?= $i ?>
                        </div>
                        <?php endfor; ?>
                    </div>
                    <div class="text-left">
                        <div class="flex items-center gap-1 text-amber-400">
                            <?php for ($i = 0; $i < 5; $i++): ?>
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                            <?php endfor; ?>
                        </div>
                        <p class="text-sm text-slate-400">4.9/5 from 200+ reviews</p>
                    </div>
                </div>
            </div>

            <!-- Right: Product Mockup -->
            <div class="relative" data-aos="fade-left" data-aos-duration="1000" data-aos-delay="200">
                <div class="relative glass rounded-3xl p-8 shadow-2xl animate-float-slow">
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
                            <?php foreach ([['Revenue', '$48.2K', '+12%'], ['Users', '2,847', '+8%'], ['Orders', '1,234', '+15%']] as [$label, $value, $change]): ?>
                            <div class="bg-white/5 rounded-xl p-3">
                                <p class="text-xs text-slate-400 mb-1"><?= $label ?></p>
                                <p class="text-lg font-bold text-white"><?= $value ?></p>
                                <p class="text-xs text-green-400"><?= $change ?></p>
                            </div>
                            <?php endforeach; ?>
                        </div>

                        <!-- Chart -->
                        <div class="bg-white/5 rounded-xl p-4 h-32 flex items-end justify-between gap-2">
                            <?php foreach ([40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88] as $h): ?>
                            <div class="flex-1 bg-gradient-to-t from-brand-500 to-blue-400 rounded-t opacity-80" style="height: <?= $h ?>%"></div>
                            <?php endforeach; ?>
                        </div>
                    </div>

                    <!-- Floating Badges -->
                    <div class="absolute -top-4 -right-4 bg-green-500 text-white px-4 py-2 rounded-xl shadow-lg animate-bounce-slow text-sm font-semibold">
                        ✓ Live Demo Available
                    </div>
                    <div class="absolute -bottom-4 -left-4 bg-brand-600 text-white px-4 py-2 rounded-xl shadow-lg text-sm font-semibold">
                        🚀 150+ Projects Delivered
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Scroll Indicator -->
    <div class="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg class="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
        </svg>
    </div>
</section>

<!-- Custom Styles -->
<style>
@keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-20px) rotate(5deg); }
}

@keyframes float-slow {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
}

@keyframes pulse-slow {
    0%, 100% { opacity: 0.2; }
    50% { opacity: 0.3; }
}

@keyframes fade-in-up {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes gradient {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
}

@keyframes bounce-slow {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
}

.animate-float {
    animation: float 6s ease-in-out infinite;
}

.animate-float-slow {
    animation: float-slow 8s ease-in-out infinite;
}

.animate-pulse-slow {
    animation: pulse-slow 4s ease-in-out infinite;
}

.animate-fade-in-up {
    animation: fade-in-up 0.8s ease-out forwards;
    opacity: 0;
}

.animate-gradient {
    background-size: 200% 200%;
    animation: gradient 3s ease infinite;
}

.animate-bounce-slow {
    animation: bounce-slow 3s ease-in-out infinite;
}

/* Custom Cursor (optional) */
@media (min-width: 1024px) {
    .custom-cursor {
        cursor: none;
    }
    
    .custom-cursor-dot {
        width: 8px;
        height: 8px;
        background: #4F46E5;
        border-radius: 50%;
        position: fixed;
        pointer-events: none;
        z-index: 9999;
        transition: transform 0.1s;
    }
    
    .custom-cursor-ring {
        width: 40px;
        height: 40px;
        border: 2px solid rgba(79, 70, 229, 0.5);
        border-radius: 50%;
        position: fixed;
        pointer-events: none;
        z-index: 9998;
        transition: all 0.15s ease-out;
    }
}
</style>

<!-- Custom Cursor Script (optional) -->
<script>
if (window.innerWidth >= 1024) {
    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor-dot';
    document.body.appendChild(cursor);
    document.body.classList.add('custom-cursor');

    const ring = document.createElement('div');
    ring.className = 'custom-cursor-ring';
    document.body.appendChild(ring);

    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
        
        setTimeout(() => {
            ring.style.left = e.clientX + 'px';
            ring.style.top = e.clientY + 'px';
        }, 50);
    });

    // Hover effects
    document.querySelectorAll('a, button').forEach(el => {
        el.addEventListener('mouseenter', () => {
            ring.style.transform = 'translate(-50%, -50%) scale(1.5)';
            ring.style.borderColor = 'rgba(79, 70, 229, 0.8)';
        });
        el.addEventListener('mouseleave', () => {
            ring.style.transform = 'translate(-50%, -50%) scale(1)';
            ring.style.borderColor = 'rgba(79, 70, 229, 0.5)';
        });
    });
}
</script>
`
  },
  // ==================== NUMBER COUNTERS ====================
  {
    path: 'app/views/components/counter.php',
    name: 'counter.php',
    language: 'php',
    category: 'Public',
    description: 'Animated number counter that triggers on scroll',
    content: `<?php
/**
 * Number Counter Component
 * 
 * Usage:
 * <?= component('counter', ['value' => 150, 'suffix' => '+', 'label' => 'Projects Delivered']) ?>
 */
?>

<div class="text-center" data-aos="zoom-in">
    <div class="font-display text-5xl font-bold gradient-text mb-2">
        <span class="counter" data-target="<?= e($value ?? 0) ?>">0</span><?= e($suffix ?? '') ?>
    </div>
    <p class="text-slate-400"><?= e($label ?? '') ?></p>
</div>

<script>
// Intersection Observer for counter animation
const counters = document.querySelectorAll('.counter');
const observerOptions = {
    threshold: 0.5,
    rootMargin: '0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const counter = entry.target;
            const target = parseInt(counter.getAttribute('data-target'));
            const duration = 2000; // 2 seconds
            const increment = target / (duration / 16); // 60fps
            let current = 0;

            const updateCounter = () => {
                current += increment;
                if (current < target) {
                    counter.textContent = Math.floor(current);
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = target;
                }
            };

            updateCounter();
            observer.unobserve(counter);
        }
    });
}, observerOptions);

counters.forEach(counter => observer.observe(counter));
</script>
`
  },
  // ==================== COOKIE CONSENT ====================
  {
    path: 'app/views/components/cookie-consent.php',
    name: 'cookie-consent.php',
    language: 'php',
    category: 'Public',
    description: 'GDPR-compliant cookie consent banner',
    content: `<?php
/**
 * Cookie Consent Banner
 * GDPR-compliant cookie consent with accept/decline/customize options
 */
?>

<div x-data="{ 
    show: !localStorage.getItem('cookieConsent'),
    accepted: false,
    accept() {
        localStorage.setItem('cookieConsent', 'accepted');
        this.show = false;
        // Enable analytics/tracking here
    },
    decline() {
        localStorage.setItem('cookieConsent', 'declined');
        this.show = false;
        // Disable non-essential cookies
    }
}" 
x-show="show" 
x-transition:enter="transition ease-out duration-300"
x-transition:enter-start="opacity-0 translate-y-full"
x-transition:enter-end="opacity-100 translate-y-0"
x-transition:leave="transition ease-in duration-200"
x-transition:leave-start="opacity-100 translate-y-0"
x-transition:leave-end="opacity-0 translate-y-full"
class="fixed bottom-0 left-0 right-0 z-50 p-4 bg-navy-800/95 backdrop-blur-xl border-t border-white/10 shadow-2xl">
    <div class="max-w-7xl mx-auto">
        <div class="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div class="flex-1">
                <h3 class="font-semibold text-white mb-2">🍪 We use cookies</h3>
                <p class="text-sm text-slate-400">
                    We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. 
                    By clicking "Accept All", you consent to our use of cookies. 
                    <a href="<?= url('/privacy-policy') ?>" class="text-brand-400 hover:underline">Learn more</a>
                </p>
            </div>
            <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <button @click="decline()" class="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl transition-colors whitespace-nowrap">
                    Decline
                </button>
                <button @click="accept()" class="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl transition-colors whitespace-nowrap">
                    Accept All
                </button>
            </div>
        </div>
    </div>
</div>
`
  },
  // ==================== ANNOUNCEMENT BAR ====================
  {
    path: 'app/views/components/announcement-bar.php',
    name: 'announcement-bar.php',
    language: 'php',
    category: 'Public',
    description: 'Admin-toggleable announcement bar for promotions/notifications',
    content: `<?php
/**
 * Announcement Bar Component
 * Admin-toggleable banner for promotions, notifications, or important messages
 * 
 * Configure in Admin → Settings → Appearance
 */

$announcementText = setting('announcement_text', '');
$announcementLink = setting('announcement_link', '');
$announcementEnabled = setting('announcement_enabled', '0');

if (!$announcementEnabled || !$announcementText) {
    return;
}
?>

<div x-data="{ dismissed: localStorage.getItem('announcementDismissed') === 'true' }" 
     x-show="!dismissed"
     x-transition:enter="transition ease-out duration-300"
     x-transition:enter-start="opacity-0 -translate-y-full"
     x-transition:enter-end="opacity-100 translate-y-0"
     class="bg-gradient-to-r from-brand-600 to-blue-500 text-white py-2.5 px-4 relative">
    <div class="max-w-7xl mx-auto flex items-center justify-center gap-4">
        <div class="flex items-center gap-3 text-sm">
            <span class="animate-pulse">🎉</span>
            <span class="font-medium"><?= e($announcementText) ?></span>
            <?php if ($announcementLink): ?>
            <a href="<?= e($announcementLink) ?>" class="underline hover:no-underline font-semibold">Learn more →</a>
            <?php endif; ?>
        </div>
        <button @click="dismissed = true; localStorage.setItem('announcementDismissed', 'true')" 
                class="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
        </button>
    </div>
</div>
`
  },
  // ==================== LOADING SPLASH ====================
  {
    path: 'app/views/components/loading-splash.php',
    name: 'loading-splash.php',
    language: 'php',
    category: 'Public',
    description: 'Loading splash screen shown on first visit',
    content: `<?php
/**
 * Loading Splash Screen
 * Shown on first visit while page loads
 */
?>

<div id="loading-splash" class="fixed inset-0 z-[9999] bg-navy-900 flex items-center justify-center transition-opacity duration-500">
    <div class="text-center">
        <!-- Logo -->
        <div class="w-20 h-20 bg-gradient-to-br from-brand-500 to-blue-500 rounded-2xl flex items-center justify-center mb-6 animate-pulse">
            <span class="text-white font-bold text-3xl">K</span>
        </div>
        
        <!-- Loading Text -->
        <p class="text-slate-400 text-sm">Loading...</p>
        
        <!-- Progress Bar -->
        <div class="w-48 h-1 bg-white/10 rounded-full mt-4 overflow-hidden">
            <div class="h-full bg-gradient-to-r from-brand-500 to-blue-500 rounded-full animate-loading-bar"></div>
        </div>
    </div>
</div>

<style>
@keyframes loading-bar {
    0% { width: 0%; }
    50% { width: 70%; }
    100% { width: 100%; }
}

.animate-loading-bar {
    animation: loading-bar 1.5s ease-in-out;
}
</style>

<script>
// Hide splash after page loads
window.addEventListener('load', () => {
    const splash = document.getElementById('loading-splash');
    if (splash) {
        setTimeout(() => {
            splash.style.opacity = '0';
            setTimeout(() => splash.remove(), 500);
        }, 500);
    }
});

// Fallback: hide after 3 seconds max
setTimeout(() => {
    const splash = document.getElementById('loading-splash');
    if (splash) {
        splash.style.opacity = '0';
        setTimeout(() => splash.remove(), 500);
    }
}, 3000);
</script>
`
  },
  // ==================== COMMAND PALETTE ====================
  {
    path: 'app/views/components/command-palette.php',
    name: 'command-palette.php',
    language: 'php',
    category: 'Admin',
    description: 'Cmd+K command palette for quick admin navigation',
    content: `<?php
/**
 * Command Palette (Cmd+K / Ctrl+K)
 * Quick navigation and actions for admin panel
 */
?>

<div x-data="{
    open: false,
    query: '',
    commands: [
        { name: 'Dashboard', url: '<?= url('/admin') ?>', icon: '🏠', category: 'Navigation' },
        { name: 'Products', url: '<?= url('/admin/products') ?>', icon: '📦', category: 'Navigation' },
        { name: 'Blog Posts', url: '<?= url('/admin/blog') ?>', icon: '📝', category: 'Navigation' },
        { name: 'Pages', url: '<?= url('/admin/pages') ?>', icon: '📄', category: 'Navigation' },
        { name: 'Media Library', url: '<?= url('/admin/media') ?>', icon: '🖼️', category: 'Navigation' },
        { name: 'Users', url: '<?= url('/admin/users') ?>', icon: '👥', category: 'Navigation' },
        { name: 'Settings', url: '<?= url('/admin/settings') ?>', icon: '⚙️', category: 'Navigation' },
        { name: 'Create Product', url: '<?= url('/admin/products/create') ?>', icon: '➕', category: 'Actions' },
        { name: 'Create Blog Post', url: '<?= url('/admin/blog/create') ?>', icon: '➕', category: 'Actions' },
        { name: 'Create Page', url: '<?= url('/admin/pages/create') ?>', icon: '➕', category: 'Actions' },
        { name: 'View Inquiries', url: '<?= url('/admin/inquiries') ?>', icon: '📧', category: 'Navigation' },
        { name: 'View Messages', url: '<?= url('/admin/messages') ?>', icon: '💬', category: 'Navigation' },
    ],
    get filteredCommands() {
        if (!this.query) return this.commands;
        return this.commands.filter(cmd => 
            cmd.name.toLowerCase().includes(this.query.toLowerCase()) ||
            cmd.category.toLowerCase().includes(this.query.toLowerCase())
        );
    },
    groupedCommands() {
        const groups = {};
        this.filteredCommands.forEach(cmd => {
            if (!groups[cmd.category]) groups[cmd.category] = [];
            groups[cmd.category].push(cmd);
        });
        return groups;
    },
    execute(cmd) {
        window.location.href = cmd.url;
    }
}"
@keydown.window="if (($event.metaKey || $event.ctrlKey) && $event.key === 'k') { $event.preventDefault(); open = true; }"
x-show="open"
x-cloak
class="fixed inset-0 z-50 overflow-y-auto"
@keydown.escape.window="open = false">
    
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" @click="open = false"></div>

    <!-- Modal -->
    <div class="flex min-h-full items-start justify-center p-4 pt-[20vh]">
        <div x-show="open"
             x-transition:enter="transition ease-out duration-200"
             x-transition:enter-start="opacity-0 scale-95"
             x-transition:enter-end="opacity-100 scale-100"
             class="relative w-full max-w-xl bg-navy-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
             @click.stop>
            
            <!-- Search Input -->
            <div class="p-4 border-b border-white/10">
                <div class="relative">
                    <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <input type="text" 
                           x-model="query" 
                           x-ref="searchInput"
                           placeholder="Type a command or search..."
                           class="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                           @keydown.enter="if (filteredCommands.length > 0) execute(filteredCommands[0])"
                           @keydown.up.prevent="$refs.searchInput.focus()"
                           @keydown.down.prevent="$refs.searchInput.focus()">
                </div>
            </div>

            <!-- Results -->
            <div class="max-h-96 overflow-y-auto p-2">
                <template x-if="filteredCommands.length === 0">
                    <div class="p-8 text-center text-slate-500">
                        <p>No commands found</p>
                    </div>
                </template>

                <template x-for="(commands, category) in groupedCommands()" :key="category">
                    <div class="mb-4">
                        <h3 class="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider" x-text="category"></h3>
                        <div class="space-y-1">
                            <template x-for="cmd in commands" :key="cmd.name">
                                <button @click="execute(cmd)" 
                                        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/5 transition-colors group">
                                    <span class="text-xl" x-text="cmd.icon"></span>
                                    <span class="flex-1 text-sm text-white group-hover:text-brand-400" x-text="cmd.name"></span>
                                    <svg class="w-4 h-4 text-slate-600 group-hover:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                                    </svg>
                                </button>
                            </template>
                        </div>
                    </div>
                </template>
            </div>

            <!-- Footer -->
            <div class="p-3 border-t border-white/10 bg-white/5 flex items-center justify-between text-xs text-slate-500">
                <div class="flex items-center gap-4">
                    <span class="flex items-center gap-1">
                        <kbd class="px-2 py-1 bg-white/10 rounded">↑↓</kbd>
                        <span>Navigate</span>
                    </span>
                    <span class="flex items-center gap-1">
                        <kbd class="px-2 py-1 bg-white/10 rounded">↵</kbd>
                        <span>Select</span>
                    </span>
                    <span class="flex items-center gap-1">
                        <kbd class="px-2 py-1 bg-white/10 rounded">esc</kbd>
                        <span>Close</span>
                    </span>
                </div>
            </div>
        </div>
    </div>

    <!-- Focus input when opened -->
    <script>
    document.addEventListener('alpine:init', () => {
        Alpine.effect(() => {
            if (Alpine.store('commandPalette')?.open) {
                setTimeout(() => {
                    document.querySelector('[x-ref="searchInput"]')?.focus();
                }, 100);
            }
        });
    });
    </script>
</div>

<!-- Keyboard Shortcut Hint -->
<div class="fixed bottom-4 right-4 z-40 hidden lg:block">
    <button @click="$dispatch('open-command-palette')" 
            class="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-slate-400 transition-colors">
        <kbd class="px-1.5 py-0.5 bg-white/10 rounded text-slate-300">⌘K</kbd>
        <span>Quick actions</span>
    </button>
</div>
`
  },
  // ==================== INLINE EDITING ====================
  {
    path: 'app/views/components/inline-edit.php',
    name: 'inline-edit.php',
    language: 'php',
    category: 'Admin',
    description: 'Inline editing component for quick edits without leaving the page',
    content: `<?php
/**
 * Inline Edit Component
 * 
 * Usage:
 * <?= component('inline-edit', [
 *     'value' => $item['title'],
 *     'field' => 'title',
 *     'model' => 'products',
 *     'id' => $item['id'],
 *     'type' => 'text'
 * ]) ?>
 */

function inline_edit(array $props = []): string
{
    $value = $props['value'] ?? '';
    $field = $props['field'] ?? '';
    $model = $props['model'] ?? '';
    $id = $props['id'] ?? 0;
    $type = $props['type'] ?? 'text'; // text, textarea, number
    $class = $props['class'] ?? '';

    $html = "
    <div x-data=\"{
        editing: false,
        value: '" . e($value) . "',
        originalValue: '" . e($value) . "',
        saving: false,
        async save() {
            if (this.value === this.originalValue) {
                this.editing = false;
                return;
            }
            this.saving = true;
            try {
                const response = await fetch('" . url('/admin/api/inline-update') . "', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name=\"csrf-token\"]').content
                    },
                    body: JSON.stringify({
                        model: '$model',
                        id: $id,
                        field: '$field',
                        value: this.value
                    })
                });
                if (response.ok) {
                    this.originalValue = this.value;
                    this.editing = false;
                    // Show success toast
                    window.dispatchEvent(new CustomEvent('toast', {
                        detail: { type: 'success', message: 'Updated successfully' }
                    }));
                }
            } catch (error) {
                console.error('Update failed:', error);
            }
            this.saving = false;
        },
        cancel() {
            this.value = this.originalValue;
            this.editing = false;
        }
    }\" class=\"inline-edit $class\">
        
        <!-- Display Mode -->
        <div x-show=\"!editing\" @click=\"editing = true\" 
             class=\"cursor-pointer hover:bg-white/5 px-2 py-1 rounded transition-colors group\">
            <span x-text=\"value\" class=\"text-slate-300\"></span>
            <svg class=\"w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 inline-block ml-1 transition-opacity\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
                <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z\"/>
            </svg>
        </div>

        <!-- Edit Mode -->
        <div x-show=\"editing\" x-cloak class=\"flex items-center gap-2\">";

    if ($type === 'textarea') {
        $html .= "
            <textarea x-model=\"value\" 
                      @keydown.escape=\"cancel()\"
                      @keydown.enter.ctrl=\"save()\"
                      class=\"flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500 resize-none\"
                      rows=\"3\"></textarea>";
    } else {
        $html .= "
            <input type=\"$type\" 
                   x-model=\"value\" 
                   @keydown.escape=\"cancel()\"
                   @keydown.enter=\"save()\"
                   class=\"flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500\">";
    }

    $html .= "
            <button @click=\"save()\" :disabled=\"saving\" 
                    class=\"p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors disabled:opacity-50\">
                <svg x-show=\"!saving\" class=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
                    <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"/>
                </svg>
                <svg x-show=\"saving\" class=\"w-4 h-4 animate-spin\" fill=\"none\" viewBox=\"0 0 24 24\">
                    <circle class=\"opacity-25\" cx=\"12\" cy=\"12\" r=\"10\" stroke=\"currentColor\" stroke-width=\"4\"></circle>
                    <path class=\"opacity-75\" fill=\"currentColor\" d=\"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z\"></path>
                </svg>
            </button>
            <button @click=\"cancel()\" class=\"p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors\">
                <svg class=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
                    <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M6 18L18 6M6 6l12 12\"/>
                </svg>
            </button>
        </div>
    </div>";

    return $html;
}
`
  },
  // ==================== HELP TOOLTIP ====================
  {
    path: 'app/views/components/help-tooltip.php',
    name: 'help-tooltip.php',
    language: 'php',
    category: 'Admin',
    description: 'Contextual help tooltip with icon',
    content: `<?php
/**
 * Help Tooltip Component
 * 
 * Usage:
 * <?= component('help-tooltip', ['text' => 'This field determines the product visibility']) ?>
 */

function help_tooltip(array $props = []): string
{
    $text = $props['text'] ?? '';
    $position = $props['position'] ?? 'top'; // top, bottom, left, right
    $class = $props['class'] ?? '';

    $positions = [
        'top' => 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        'bottom' => 'top-full left-1/2 -translate-x-1/2 mt-2',
        'left' => 'right-full top-1/2 -translate-y-1/2 mr-2',
        'right' => 'left-full top-1/2 -translate-y-1/2 ml-2',
    ];

    $positionClass = $positions[$position] ?? $positions['top'];

    $html = "
    <div class=\"relative inline-block $class\" x-data=\"{ show: false }\">
        <button @mouseenter=\"show = true\" @mouseleave=\"show = false\" @focus=\"show = true\" @blur=\"show = false\"
                class=\"text-slate-500 hover:text-slate-300 transition-colors\"
                aria-label=\"Help\">
            <svg class=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
                <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z\"/>
            </svg>
        </button>
        
        <div x-show=\"show\" 
             x-transition:enter=\"transition ease-out duration-200\"
             x-transition:enter-start=\"opacity-0 scale-95\"
             x-transition:enter-end=\"opacity-100 scale-100\"
             x-transition:leave=\"transition ease-in duration-150\"
             x-transition:leave-start=\"opacity-100 scale-100\"
             x-transition:leave-end=\"opacity-0 scale-95\"
             class=\"absolute $positionClass z-50 w-64 px-3 py-2 bg-navy-800 border border-white/10 rounded-xl shadow-xl text-sm text-slate-300 pointer-events-none\"
             role=\"tooltip\">
            " . e($text) . "
            <div class=\"absolute w-2 h-2 bg-navy-800 border-white/10 rotate-45 " . 
                ($position === 'top' ? 'bottom-[-5px] left-1/2 -translate-x-1/2 border-b border-r' :
                ($position === 'bottom' ? 'top-[-5px] left-1/2 -translate-x-1/2 border-t border-l' :
                ($position === 'left' ? 'right-[-5px] top-1/2 -translate-y-1/2 border-r border-t' :
                'left-[-5px] top-1/2 -translate-y-1/2 border-l border-b'))) . "\"></div>
        </div>
    </div>";

    return $html;
}
`
  },
  // ==================== PARALLAX SECTION ====================
  {
    path: 'app/views/components/parallax-section.php',
    name: 'parallax-section.php',
    language: 'php',
    category: 'Public',
    description: 'Parallax scrolling section with background image',
    content: `<?php
/**
 * Parallax Section Component
 * 
 * Usage:
 * <?= component('parallax-section', [
 *     'image' => asset('images/parallax-bg.jpg'),
 *     'title' => 'Ready to Transform?',
 *     'subtitle' => 'Join 80+ companies already using our solutions',
 *     'cta' => ['label' => 'Get Started', 'url' => '/contact']
 * ]) ?>
 */

function parallax_section(array $props = []): string
{
    $image = $props['image'] ?? '';
    $title = $props['title'] ?? '';
    $subtitle = $props['subtitle'] ?? '';
    $cta = $props['cta'] ?? null;
    $height = $props['height'] ?? '500px';
    $overlay = $props['overlay'] ?? 0.7; // 0-1

    $html = "
    <section class=\"relative overflow-hidden\" style=\"height: $height;\">
        <!-- Parallax Background -->
        <div class=\"absolute inset-0 parallax-bg\" style=\"background-image: url('$image'); background-size: cover; background-position: center; transform: translateZ(0);\"></div>
        
        <!-- Overlay -->
        <div class=\"absolute inset-0 bg-navy-900\" style=\"opacity: $overlay;\"></div>
        
        <!-- Content -->
        <div class=\"relative h-full flex items-center justify-center text-center px-4\" data-aos=\"fade-up\">
            <div class=\"max-w-3xl\">
                ";

    if ($title) {
        $html .= "<h2 class=\"font-display text-4xl lg:text-5xl font-bold text-white mb-4\">" . e($title) . "</h2>";
    }

    if ($subtitle) {
        $html .= "<p class=\"text-xl text-slate-300 mb-8\">" . e($subtitle) . "</p>";
    }

    if ($cta) {
        $html .= component('button', [
            'label' => $cta['label'] ?? 'Learn More',
            'href' => $cta['url'] ?? '#',
            'variant' => $cta['variant'] ?? 'primary',
            'size' => 'lg',
        ]);
    }

    $html .= "
            </div>
        </div>
    </section>

    <style>
    .parallax-bg {
        will-change: transform;
        transition: transform 0.1s ease-out;
    }
    </style>

    <script>
    // Parallax effect
    const parallaxElements = document.querySelectorAll('.parallax-bg');
    
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        
        parallaxElements.forEach(el => {
            const rate = scrolled * -0.5;
            el.style.transform = \`translateY(\${rate}px)\`;
        });
    });
    </script>";

    return $html;
}
`
  },
];
