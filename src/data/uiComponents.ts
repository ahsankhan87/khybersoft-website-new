export interface UIComponent {
  path: string;
  name: string;
  language: string;
  content: string;
  description: string;
  category: string;
}

export const uiComponents: UIComponent[] = [
  // ==================== BUTTON ====================
  {
    path: 'app/views/components/button.php',
    name: 'button.php',
    language: 'php',
    category: 'Basic',
    description: 'Button component with variants, sizes, loading state, icons',
    content: `<?php
/**
 * Button Component
 * 
 * Usage:
 * <?= component('button', ['label' => 'Click Me', 'variant' => 'primary', 'size' => 'md', 'href' => '/url']) ?>
 * <?= component('button', ['label' => 'Submit', 'type' => 'submit', 'loading' => true]) ?>
 * 
 * Variants: primary, secondary, outline, ghost, danger
 * Sizes: sm, md, lg
 */

function button(array $props = []): string
{
    $label = $props['label'] ?? 'Button';
    $variant = $props['variant'] ?? 'primary';
    $size = $props['size'] ?? 'md';
    $type = $props['type'] ?? 'button';
    $href = $props['href'] ?? null;
    $loading = $props['loading'] ?? false;
    $disabled = $props['disabled'] ?? false;
    $icon = $props['icon'] ?? null;
    $iconPosition = $props['iconPosition'] ?? 'left';
    $class = $props['class'] ?? '';
    $attrs = $props['attrs'] ?? [];

    // Size classes
    $sizes = [
        'sm' => 'px-3 py-1.5 text-xs',
        'md' => 'px-4 py-2 text-sm',
        'lg' => 'px-6 py-3 text-base',
    ];

    // Variant classes
    $variants = [
        'primary' => 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40',
        'secondary' => 'bg-white/5 hover:bg-white/10 border border-white/10 text-white',
        'outline' => 'border-2 border-brand-600 text-brand-600 hover:bg-brand-600 hover:text-white',
        'ghost' => 'text-slate-300 hover:text-white hover:bg-white/5',
        'danger' => 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/25',
    ];

    $sizeClass = $sizes[$size] ?? $sizes['md'];
    $variantClass = $variants[$variant] ?? $variants['primary'];

    $baseClasses = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-navy-900 disabled:opacity-50 disabled:cursor-not-allowed';
    
    $classes = trim("$baseClasses $sizeClass $variantClass $class");

    // Build attributes
    $attrString = '';
    foreach ($attrs as $key => $value) {
        $attrString .= " $key=\"" . e($value) . "\"";
    }

    if ($loading) {
        $attrString .= ' disabled';
    }
    if ($disabled) {
        $attrString .= ' disabled';
    }

    // Icon HTML
    $iconHtml = '';
    if ($icon) {
        $iconHtml = "<svg class=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"$icon\"/></svg>";
    }

    // Loading spinner
    $loadingHtml = '';
    if ($loading) {
        $loadingHtml = '<svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
    }

    // Content
    $content = '';
    if ($icon && $iconPosition === 'left') $content .= $iconHtml;
    if ($loading) $content .= $loadingHtml;
    $content .= '<span>' . e($label) . '</span>';
    if ($icon && $iconPosition === 'right') $content .= $iconHtml;

    // Render
    if ($href) {
        return "<a href=\"" . e($href) . "\" class=\"$classes\"$attrString>$content</a>";
    } else {
        return "<button type=\"$type\" class=\"$classes\"$attrString>$content</button>";
    }
}

// Helper function
if (!function_exists('component')) {
    function component(string $name, array $props = []): string
    {
        if ($name === 'button') {
            return button($props);
        }
        return '';
    }
}
`
  },
  // ==================== CARD ====================
  {
    path: 'app/views/components/card.php',
    name: 'card.php',
    language: 'php',
    category: 'Basic',
    description: 'Card component with header, footer, hover effects',
    content: `<?php
/**
 * Card Component
 * 
 * Usage:
 * <?= component('card', ['title' => 'Card Title', 'content' => 'Card content...', 'hover' => true]) ?>
 */

function card(array $props = []): string
{
    $title = $props['title'] ?? null;
    $content = $props['content'] ?? '';
    $footer = $props['footer'] ?? null;
    $hover = $props['hover'] ?? false;
    $class = $props['class'] ?? '';
    $headerImage = $props['headerImage'] ?? null;

    $baseClasses = 'bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden';
    $hoverClasses = $hover ? 'hover-lift' : '';
    $classes = trim("$baseClasses $hoverClasses $class");

    $html = "<div class=\"$classes\">";

    // Header image
    if ($headerImage) {
        $html .= "<div class=\"aspect-video overflow-hidden\">";
        $html .= "<img src=\"" . e($headerImage) . "\" class=\"w-full h-full object-cover\" alt=\"\">";
        $html .= "</div>";
    }

    // Content wrapper
    $html .= "<div class=\"p-6\">";

    // Title
    if ($title) {
        $html .= "<h3 class=\"font-display text-xl font-bold text-white mb-3\">" . e($title) . "</h3>";
    }

    // Content
    $html .= "<div class=\"text-slate-400\">$content</div>";

    $html .= "</div>";

    // Footer
    if ($footer) {
        $html .= "<div class=\"px-6 py-4 border-t border-white/10 bg-white/5\">$footer</div>";
    }

    $html .= "</div>";

    return $html;
}
`
  },
  // ==================== BADGE ====================
  {
    path: 'app/views/components/badge.php',
    name: 'badge.php',
    language: 'php',
    category: 'Basic',
    description: 'Badge/Pill component for status, tags, counts',
    content: `<?php
/**
 * Badge Component
 * 
 * Usage:
 * <?= component('badge', ['label' => 'New', 'variant' => 'primary']) ?>
 * <?= component('badge', ['label' => '5', 'variant' => 'danger', 'size' => 'sm']) ?>
 */

function badge(array $props = []): string
{
    $label = $props['label'] ?? '';
    $variant = $props['variant'] ?? 'default';
    $size = $props['size'] ?? 'md';
    $class = $props['class'] ?? '';

    $variants = [
        'default' => 'bg-white/10 text-slate-300',
        'primary' => 'bg-brand-500/20 text-brand-300 border border-brand-500/30',
        'success' => 'bg-green-500/20 text-green-300 border border-green-500/30',
        'warning' => 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
        'danger' => 'bg-red-500/20 text-red-300 border border-red-500/30',
        'info' => 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    ];

    $sizes = [
        'sm' => 'px-2 py-0.5 text-xs',
        'md' => 'px-3 py-1 text-sm',
        'lg' => 'px-4 py-1.5 text-base',
    ];

    $variantClass = $variants[$variant] ?? $variants['default'];
    $sizeClass = $sizes[$size] ?? $sizes['md'];

    $classes = "inline-flex items-center font-medium rounded-full $sizeClass $variantClass $class";

    return "<span class=\"$classes\">" . e($label) . "</span>";
}
`
  },
  // ==================== ALERT ====================
  {
    path: 'app/views/components/alert.php',
    name: 'alert.php',
    language: 'php',
    category: 'Feedback',
    description: 'Alert/Toast component for messages',
    content: `<?php
/**
 * Alert Component
 * 
 * Usage:
 * <?= component('alert', ['type' => 'success', 'message' => 'Operation completed!']) ?>
 * <?= component('alert', ['type' => 'error', 'message' => 'Something went wrong', 'dismissible' => true]) ?>
 */

function alert(array $props = []): string
{
    $type = $props['type'] ?? 'info';
    $message = $props['message'] ?? '';
    $title = $props['title'] ?? null;
    $dismissible = $props['dismissible'] ?? false;
    $class = $props['class'] ?? '';

    $types = [
        'success' => [
            'bg' => 'bg-green-500/10 border-green-500/30',
            'text' => 'text-green-300',
            'icon' => 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
        ],
        'error' => [
            'bg' => 'bg-red-500/10 border-red-500/30',
            'text' => 'text-red-300',
            'icon' => 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        ],
        'warning' => [
            'bg' => 'bg-amber-500/10 border-amber-500/30',
            'text' => 'text-amber-300',
            'icon' => 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
        ],
        'info' => [
            'bg' => 'bg-blue-500/10 border-blue-500/30',
            'text' => 'text-blue-300',
            'icon' => 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        ],
    ];

    $typeConfig = $types[$type] ?? $types['info'];

    $html = "<div class=\"rounded-xl border {$typeConfig['bg']} p-4 $class\" x-data=\"{ show: true }\" x-show=\"show\">";
    $html .= "<div class=\"flex items-start gap-3\">";
    
    // Icon
    $html .= "<svg class=\"w-5 h-5 {$typeConfig['text']} flex-shrink-0 mt-0.5\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">";
    $html .= "<path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"{$typeConfig['icon']}\"/>";
    $html .= "</svg>";

    // Content
    $html .= "<div class=\"flex-1\">";
    if ($title) {
        $html .= "<h4 class=\"font-semibold {$typeConfig['text']} mb-1\">" . e($title) . "</h4>";
    }
    $html .= "<p class=\"text-sm {$typeConfig['text']}\">" . e($message) . "</p>";
    $html .= "</div>";

    // Dismiss button
    if ($dismissible) {
        $html .= "<button @click=\"show = false\" class=\"{$typeConfig['text']} hover:opacity-70\">";
        $html .= "<svg class=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">";
        $html .= "<path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M6 18L18 6M6 6l12 12\"/>";
        $html .= "</svg></button>";
    }

    $html .= "</div></div>";

    return $html;
}
`
  },
  // ==================== MODAL ====================
  {
    path: 'app/views/components/modal.php',
    name: 'modal.php',
    language: 'php',
    category: 'Overlay',
    description: 'Accessible modal with ESC close, focus trap, backdrop',
    content: `<?php
/**
 * Modal Component
 * 
 * Usage:
 * <?= component('modal', ['id' => 'myModal', 'title' => 'Modal Title', 'content' => 'Modal content...']) ?>
 * 
 * Open with: <button @click="$dispatch('open-modal', 'myModal')">Open</button>
 */

function modal(array $props = []): string
{
    $id = $props['id'] ?? 'modal-' . uniqid();
    $title = $props['title'] ?? null;
    $content = $props['content'] ?? '';
    $footer = $props['footer'] ?? null;
    $size = $props['size'] ?? 'md';
    $class = $props['class'] ?? '';

    $sizes = [
        'sm' => 'max-w-md',
        'md' => 'max-w-2xl',
        'lg' => 'max-w-4xl',
        'xl' => 'max-w-6xl',
        'full' => 'max-w-full mx-4',
    ];

    $sizeClass = $sizes[$size] ?? $sizes['md'];

    $html = "
    <div x-data=\"{ open: false }\" 
         @open-modal.window=\"if(\\$event.detail === '$id') open = true\"
         @close-modal.window=\"if(\\$event.detail === '$id') open = false\"
         @keydown.escape.window=\"open = false\"
         x-show=\"open\" 
         x-cloak
         class=\"fixed inset-0 z-50 overflow-y-auto\"
         aria-labelledby=\"$id-title\"
         role=\"dialog\"
         aria-modal=\"true\">
        
        <!-- Backdrop -->
        <div x-show=\"open\"
             x-transition:enter=\"ease-out duration-300\"
             x-transition:enter-start=\"opacity-0\"
             x-transition:enter-end=\"opacity-100\"
             x-transition:leave=\"ease-in duration-200\"
             x-transition:leave-start=\"opacity-100\"
             x-transition:leave-end=\"opacity-0\"
             class=\"fixed inset-0 bg-black/60 backdrop-blur-sm\"
             @click=\"open = false\"></div>

        <!-- Modal Panel -->
        <div class=\"flex min-h-full items-center justify-center p-4\">
            <div x-show=\"open\"
                 x-transition:enter=\"ease-out duration-300\"
                 x-transition:enter-start=\"opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95\"
                 x-transition:enter-end=\"opacity-100 translate-y-0 sm:scale-100\"
                 x-transition:leave=\"ease-in duration-200\"
                 x-transition:leave-start=\"opacity-100 translate-y-0 sm:scale-100\"
                 x-transition:leave-end=\"opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95\"
                 class=\"relative w-full $sizeClass bg-navy-800 border border-white/10 rounded-2xl shadow-2xl $class\"
                 @click.stop>
                
                <!-- Header -->
                ";
    
    if ($title) {
        $html .= "
                <div class=\"flex items-center justify-between p-6 border-b border-white/10\">
                    <h3 id=\"$id-title\" class=\"text-xl font-semibold text-white\">" . e($title) . "</h3>
                    <button @click=\"open = false\" class=\"text-slate-400 hover:text-white transition-colors\">
                        <svg class=\"w-5 h-5\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
                            <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M6 18L18 6M6 6l12 12\"/>
                        </svg>
                    </button>
                </div>";
    }

    $html .= "
                <!-- Content -->
                <div class=\"p-6\">
                    $content
                </div>";

    if ($footer) {
        $html .= "
                <!-- Footer -->
                <div class=\"flex items-center justify-end gap-3 p-6 border-t border-white/10 bg-white/5\">
                    $footer
                </div>";
    }

    $html .= "
            </div>
        </div>
    </div>";

    return $html;
}
`
  },
  // ==================== ACCORDION ====================
  {
    path: 'app/views/components/accordion.php',
    name: 'accordion.php',
    language: 'php',
    category: 'Data Display',
    description: 'Accordion component for FAQs, collapsible content',
    content: `<?php
/**
 * Accordion Component
 * 
 * Usage:
 * <?= component('accordion', ['items' => [
 *     ['title' => 'Question 1', 'content' => 'Answer 1'],
 *     ['title' => 'Question 2', 'content' => 'Answer 2'],
 * ]]) ?>
 */

function accordion(array $props = []): string
{
    $items = $props['items'] ?? [];
    $multiple = $props['multiple'] ?? false;
    $class = $props['class'] ?? '';

    $html = "<div class=\"space-y-3 $class\" x-data=\"{ active: " . ($multiple ? "[]" : "null") . " }\">";

    foreach ($items as $index => $item) {
        $title = $item['title'] ?? '';
        $content = $item['content'] ?? '';
        $id = 'accordion-' . uniqid();

        $html .= "
        <div class=\"bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden\">
            <button 
                @click=\"" . ($multiple ? "active.includes($index) ? active = active.filter(i => i !== $index) : active.push($index)" : "active = active === $index ? null : $index") . "\"
                class=\"w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors\"
                aria-expanded=\"" . ($multiple ? "active.includes($index)" : "active === $index") . "\"
                aria-controls=\"$id\">
                <span class=\"font-semibold text-white pr-4\">" . e($title) . "</span>
                <svg 
                    :class=\"" . ($multiple ? "active.includes($index)" : "active === $index") . " ? 'rotate-180' : ''\"
                    class=\"w-5 h-5 text-brand-400 flex-shrink-0 transition-transform duration-200\"
                    fill=\"none\" 
                    stroke=\"currentColor\" 
                    viewBox=\"0 0 24 24\">
                    <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M19 9l-7 7-7-7\"/>
                </svg>
            </button>
            <div 
                x-show=\"" . ($multiple ? "active.includes($index)" : "active === $index") . "\"
                x-collapse
                id=\"$id\"
                class=\"px-6 pb-6\">
                <div class=\"text-slate-400\">$content</div>
            </div>
        </div>";
    }

    $html .= "</div>";

    return $html;
}
`
  },
  // ==================== TABS ====================
  {
    path: 'app/views/components/tabs.php',
    name: 'tabs.php',
    language: 'php',
    category: 'Navigation',
    description: 'Tabs component for switching between content panels',
    content: `<?php
/**
 * Tabs Component
 * 
 * Usage:
 * <?= component('tabs', ['tabs' => [
 *     ['label' => 'Tab 1', 'content' => 'Content 1'],
 *     ['label' => 'Tab 2', 'content' => 'Content 2'],
 * ]]) ?>
 */

function tabs(array $props = []): string
{
    $tabs = $props['tabs'] ?? [];
    $variant = $props['variant'] ?? 'underline';
    $class = $props['class'] ?? '';

    $html = "<div class=\"$class\" x-data=\"{ activeTab: 0 }\">";

    // Tab buttons
    $html .= "<div class=\"flex gap-2 mb-6";
    if ($variant === 'underline') {
        $html .= " border-b border-white/10";
    }
    $html .= "\">";

    foreach ($tabs as $index => $tab) {
        $label = $tab['label'] ?? '';
        $icon = $tab['icon'] ?? null;

        $activeClasses = $variant === 'underline' 
            ? 'border-brand-500 text-brand-400' 
            : 'bg-brand-600 text-white';

        $inactiveClasses = $variant === 'underline'
            ? 'border-transparent text-slate-400 hover:text-white hover:border-white/20'
            : 'bg-white/5 text-slate-400 hover:bg-white/10';

        $html .= "
        <button 
            @click=\"activeTab = $index\"
            :class=\"activeTab === $index ? '$activeClasses' : '$inactiveClasses'\"
            class=\"flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors\">";
        
        if ($icon) {
            $html .= "<svg class=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"$icon\"/></svg>";
        }
        
        $html .= e($label) . "</button>";
    }

    $html .= "</div>";

    // Tab content
    $html .= "<div>";
    foreach ($tabs as $index => $tab) {
        $content = $tab['content'] ?? '';
        $html .= "<div x-show=\"activeTab === $index\" x-transition>" . $content . "</div>";
    }
    $html .= "</div>";

    $html .= "</div>";

    return $html;
}
`
  },
  // ==================== INPUT ====================
  {
    path: 'app/views/components/input.php',
    name: 'input.php',
    language: 'php',
    category: 'Form',
    description: 'Form input component with label, error, help text',
    content: `<?php
/**
 * Input Component
 * 
 * Usage:
 * <?= component('input', ['name' => 'email', 'label' => 'Email', 'type' => 'email', 'required' => true]) ?>
 */

function input(array $props = []): string
{
    $name = $props['name'] ?? '';
    $label = $props['label'] ?? '';
    $type = $props['type'] ?? 'text';
    $value = $props['value'] ?? old($name);
    $placeholder = $props['placeholder'] ?? '';
    $required = $props['required'] ?? false;
    $disabled = $props['disabled'] ?? false;
    $error = $props['error'] ?? null;
    $help = $props['help'] ?? null;
    $icon = $props['icon'] ?? null;
    $class = $props['class'] ?? '';

    $id = $props['id'] ?? $name;
    $requiredAttr = $required ? 'required' : '';
    $disabledAttr = $disabled ? 'disabled' : '';

    $baseClasses = 'w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors';
    $borderClass = $error ? 'border-red-500' : 'border-white/10';
    $classes = trim("$baseClasses $borderClass $class");

    $html = "<div class=\"mb-4\">";

    // Label
    if ($label) {
        $html .= "<label for=\"$id\" class=\"block text-sm font-medium text-slate-300 mb-2\">";
        $html .= e($label);
        if ($required) {
            $html .= " <span class=\"text-red-400\">*</span>";
        }
        $html .= "</label>";
    }

    // Input wrapper (for icon)
    if ($icon) {
        $html .= "<div class=\"relative\">";
        $html .= "<div class=\"absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none\">";
        $html .= "<svg class=\"w-5 h-5 text-slate-500\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"$icon\"/></svg>";
        $html .= "</div>";
        $classes .= " pl-10";
    }

    // Input
    $html .= "<input type=\"$type\" id=\"$id\" name=\"$name\" value=\"" . e($value) . "\" placeholder=\"" . e($placeholder) . "\" $requiredAttr $disabledAttr class=\"$classes\">";

    if ($icon) {
        $html .= "</div>";
    }

    // Error message
    if ($error) {
        $html .= "<p class=\"mt-1 text-sm text-red-400\">" . e($error) . "</p>";
    }

    // Help text
    if ($help && !$error) {
        $html .= "<p class=\"mt-1 text-xs text-slate-500\">" . e($help) . "</p>";
    }

    $html .= "</div>";

    return $html;
}
`
  },
  // ==================== PAGINATION ====================
  {
    path: 'app/views/components/pagination.php',
    name: 'pagination.php',
    language: 'php',
    category: 'Navigation',
    description: 'Pagination component with page numbers, prev/next',
    content: `<?php
/**
 * Pagination Component
 * 
 * Usage:
 * <?= component('pagination', ['pagination' => $paginationData, 'baseUrl' => '/products']) ?>
 */

function pagination(array $props = []): string
{
    $pagination = $props['pagination'] ?? [];
    $baseUrl = $props['baseUrl'] ?? '';
    $class = $props['class'] ?? '';

    $currentPage = $pagination['current_page'] ?? 1;
    $lastPage = $pagination['last_page'] ?? 1;
    $total = $pagination['total'] ?? 0;

    if ($lastPage <= 1) {
        return '';
    }

    $html = "<div class=\"flex items-center justify-between gap-4 $class\">";

    // Info
    $html .= "<p class=\"text-sm text-slate-400\">";
    $html .= "Showing <span class=\"font-medium text-white\">" . (($currentPage - 1) * ($pagination['per_page'] ?? 10) + 1) . "</span> to ";
    $html .= "<span class=\"font-medium text-white\">" . min($currentPage * ($pagination['per_page'] ?? 10), $total) . "</span> of ";
    $html .= "<span class=\"font-medium text-white\">$total</span> results";
    $html .= "</p>";

    // Pages
    $html .= "<div class=\"flex items-center gap-2\">";

    // Previous
    if ($currentPage > 1) {
        $html .= "<a href=\"$baseUrl?page=" . ($currentPage - 1) . "\" class=\"px-3 py-2 text-sm bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 transition-colors\">← Prev</a>";
    }

    // Page numbers
    $start = max(1, $currentPage - 2);
    $end = min($lastPage, $currentPage + 2);

    if ($start > 1) {
        $html .= "<a href=\"$baseUrl?page=1\" class=\"px-3 py-2 text-sm bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 transition-colors\">1</a>";
        if ($start > 2) {
            $html .= "<span class=\"text-slate-500\">...</span>";
        }
    }

    for ($i = $start; $i <= $end; $i++) {
        if ($i === $currentPage) {
            $html .= "<span class=\"px-3 py-2 text-sm bg-brand-600 text-white rounded-xl font-medium\">$i</span>";
        } else {
            $html .= "<a href=\"$baseUrl?page=$i\" class=\"px-3 py-2 text-sm bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 transition-colors\">$i</a>";
        }
    }

    if ($end < $lastPage) {
        if ($end < $lastPage - 1) {
            $html .= "<span class=\"text-slate-500\">...</span>";
        }
        $html .= "<a href=\"$baseUrl?page=$lastPage\" class=\"px-3 py-2 text-sm bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 transition-colors\">$lastPage</a>";
    }

    // Next
    if ($currentPage < $lastPage) {
        $html .= "<a href=\"$baseUrl?page=" . ($currentPage + 1) . "\" class=\"px-3 py-2 text-sm bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 transition-colors\">Next →</a>";
    }

    $html .= "</div></div>";

    return $html;
}
`
  },
  // ==================== BREADCRUMB ====================
  {
    path: 'app/views/components/breadcrumb.php',
    name: 'breadcrumb.php',
    language: 'php',
    category: 'Navigation',
    description: 'Breadcrumb navigation component',
    content: `<?php
/**
 * Breadcrumb Component
 * 
 * Usage:
 * <?= component('breadcrumb', ['items' => [
 *     ['label' => 'Home', 'url' => '/'],
 *     ['label' => 'Products', 'url' => '/products'],
 *     ['label' => 'Product Name'],
 * ]]) ?>
 */

function breadcrumb(array $props = []): string
{
    $items = $props['items'] ?? [];
    $class = $props['class'] ?? '';

    if (empty($items)) {
        return '';
    }

    $html = "<nav class=\"flex items-center gap-2 text-sm $class\" aria-label=\"Breadcrumb\">";

    foreach ($items as $index => $item) {
        $label = $item['label'] ?? '';
        $url = $item['url'] ?? null;
        $isLast = $index === count($items) - 1;

        if ($url && !$isLast) {
            $html .= "<a href=\"" . e($url) . "\" class=\"text-slate-400 hover:text-white transition-colors\">" . e($label) . "</a>";
        } else {
            $html .= "<span class=\"text-white font-medium\">" . e($label) . "</span>";
        }

        if (!$isLast) {
            $html .= "<svg class=\"w-4 h-4 text-slate-600\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M9 5l7 7-7 7\"/></svg>";
        }
    }

    $html .= "</nav>";

    return $html;
}
`
  },
  // ==================== SKELETON ====================
  {
    path: 'app/views/components/skeleton.php',
    name: 'skeleton.php',
    language: 'php',
    category: 'Feedback',
    description: 'Skeleton loader for loading states',
    content: `<?php
/**
 * Skeleton Component
 * 
 * Usage:
 * <?= component('skeleton', ['type' => 'text']) ?>
 * <?= component('skeleton', ['type' => 'card']) ?>
 * <?= component('skeleton', ['type' => 'image', 'aspect' => 'video']) ?>
 */

function skeleton(array $props = []): string
{
    $type = $props['type'] ?? 'text';
    $lines = $props['lines'] ?? 3;
    $aspect = $props['aspect'] ?? 'square';
    $class = $props['class'] ?? '';

    $baseClass = 'animate-pulse bg-white/10 rounded';

    switch ($type) {
        case 'text':
            $html = "<div class=\"space-y-2 $class\">";
            for ($i = 0; $i < $lines; $i++) {
                $width = $i === $lines - 1 ? 'w-3/4' : 'w-full';
                $html .= "<div class=\"$baseClass h-4 $width\"></div>";
            }
            $html .= "</div>";
            return $html;

        case 'card':
            return "
            <div class=\"bg-white/5 border border-white/10 rounded-2xl overflow-hidden $class\">
                <div class=\"$baseClass aspect-video\"></div>
                <div class=\"p-6 space-y-3\">
                    <div class=\"$baseClass h-6 w-3/4\"></div>
                    <div class=\"$baseClass h-4 w-full\"></div>
                    <div class=\"$baseClass h-4 w-5/6\"></div>
                </div>
            </div>";

        case 'image':
            $aspects = [
                'square' => 'aspect-square',
                'video' => 'aspect-video',
                'avatar' => 'w-12 h-12 rounded-full',
            ];
            $aspectClass = $aspects[$aspect] ?? $aspects['square'];
            return "<div class=\"$baseClass $aspectClass $class\"></div>";

        case 'circle':
            return "<div class=\"$baseClass rounded-full w-12 h-12 $class\"></div>";

        default:
            return "<div class=\"$baseClass h-4 w-full $class\"></div>";
    }
}
`
  },
  // ==================== STAT CARD ====================
  {
    path: 'app/views/components/stat-card.php',
    name: 'stat-card.php',
    language: 'php',
    category: 'Data Display',
    description: 'Stat card with value, label, trend indicator',
    content: `<?php
/**
 * Stat Card Component
 * 
 * Usage:
 * <?= component('stat-card', [
 *     'label' => 'Total Revenue',
 *     'value' => '$48,294',
 *     'trend' => '+12.5%',
 *     'trendDirection' => 'up',
 *     'icon' => 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
 * ]) ?>
 */

function stat_card(array $props = []): string
{
    $label = $props['label'] ?? '';
    $value = $props['value'] ?? '0';
    $trend = $props['trend'] ?? null;
    $trendDirection = $props['trendDirection'] ?? 'up'; // up, down, neutral
    $icon = $props['icon'] ?? null;
    $class = $props['class'] ?? '';

    $trendColors = [
        'up' => 'text-green-400',
        'down' => 'text-red-400',
        'neutral' => 'text-slate-400',
    ];

    $trendIcons = [
        'up' => 'M5 10l7-7m0 0l7 7m-7-7v18',
        'down' => 'M19 14l-7 7m0 0l-7-7m7 7V3',
        'neutral' => 'M5 12h14',
    ];

    $html = "<div class=\"bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover-lift $class\">";
    $html .= "<div class=\"flex items-start justify-between\">";
    
    // Content
    $html .= "<div class=\"flex-1\">";
    $html .= "<p class=\"text-sm text-slate-400 mb-1\">" . e($label) . "</p>";
    $html .= "<p class=\"font-display text-3xl font-bold text-white mb-2\">" . e($value) . "</p>";
    
    if ($trend) {
        $trendColor = $trendColors[$trendDirection] ?? $trendColors['neutral'];
        $trendIcon = $trendIcons[$trendDirection] ?? $trendIcons['neutral'];
        
        $html .= "<div class=\"flex items-center gap-1 $trendColor text-sm font-medium\">";
        $html .= "<svg class=\"w-4 h-4\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">";
        $html .= "<path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"$trendIcon\"/>";
        $html .= "</svg>";
        $html .= "<span>" . e($trend) . "</span>";
        $html .= "</div>";
    }
    
    $html .= "</div>";

    // Icon
    if ($icon) {
        $html .= "<div class=\"w-12 h-12 bg-gradient-to-br from-brand-500/20 to-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0\">";
        $html .= "<svg class=\"w-6 h-6 text-brand-400\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">";
        $html .= "<path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"$icon\"/>";
        $html .= "</svg></div>";
    }

    $html .= "</div></div>";

    return $html;
}
`
  },
  // ==================== SECTION HEADING ====================
  {
    path: 'app/views/components/section-heading.php',
    name: 'section-heading.php',
    language: 'php',
    category: 'Layout',
    description: 'Section heading with eyebrow, title, subtitle',
    content: `<?php
/**
 * Section Heading Component
 * 
 * Usage:
 * <?= component('section-heading', [
 *     'eyebrow' => 'Our Products',
 *     'title' => 'Powerful Solutions',
 *     'subtitle' => 'Everything you need to grow your business',
 *     'align' => 'center'
 * ]) ?>
 */

function section_heading(array $props = []): string
{
    $eyebrow = $props['eyebrow'] ?? null;
    $title = $props['title'] ?? '';
    $subtitle = $props['subtitle'] ?? null;
    $align = $props['align'] ?? 'center';
    $class = $props['class'] ?? '';

    $alignClasses = [
        'left' => 'text-left',
        'center' => 'text-center',
        'right' => 'text-right',
    ];

    $alignClass = $alignClasses[$align] ?? $alignClasses['center'];

    $html = "<div class=\"mb-12 $alignClass $class\" data-aos=\"fade-up\">";

    if ($eyebrow) {
        $html .= "<div class=\"inline-flex items-center gap-2 px-4 py-2 bg-brand-500/10 border border-brand-500/20 rounded-full text-brand-300 text-sm font-medium mb-4\">";
        $html .= "<span class=\"w-2 h-2 bg-brand-400 rounded-full animate-pulse\"></span>";
        $html .= e($eyebrow);
        $html .= "</div>";
    }

    $html .= "<h2 class=\"font-display text-4xl lg:text-5xl font-bold text-white mb-4\">" . e($title) . "</h2>";

    if ($subtitle) {
        $html .= "<p class=\"text-xl text-slate-400 max-w-2xl mx-auto\">" . e($subtitle) . "</p>";
    }

    $html .= "</div>";

    return $html;
}
`
  },
  // ==================== PRODUCT CARD ====================
  {
    path: 'app/views/components/product-card.php',
    name: 'product-card.php',
    language: 'php',
    category: 'Domain',
    description: 'Product card with image, title, description, pricing, CTAs',
    content: `<?php
/**
 * Product Card Component
 * 
 * Usage:
 * <?= component('product-card', ['product' => $productData]) ?>
 */

function product_card(array $props = []): string
{
    $product = $props['product'] ?? [];
    $variant = $props['variant'] ?? 'default'; // default, compact, featured
    $class = $props['class'] ?? '';

    $name = $product['name'] ?? '';
    $slug = $product['slug'] ?? '';
    $tagline = $product['tagline'] ?? '';
    $shortDesc = $product['short_desc'] ?? '';
    $heroImage = $product['hero_image'] ?? null;
    $price = $product['price'] ?? 0;
    $priceType = $product['price_type'] ?? 'custom';
    $category = $product['category_name'] ?? 'Software';
    $isFeatured = $product['is_featured'] ?? false;

    $html = "<div class=\"bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover-lift group $class\">";

    // Image
    if ($heroImage) {
        $html .= "<div class=\"aspect-video overflow-hidden\">";
        $html .= "<img src=\"" . upload($heroImage) . "\" alt=\"" . e($name) . "\" class=\"w-full h-full object-cover group-hover:scale-105 transition-transform duration-500\">";
        $html .= "</div>";
    }

    // Content
    $html .= "<div class=\"p-6\">";

    // Category badge
    $html .= "<div class=\"flex items-center gap-2 mb-3\">";
    $html .= "<span class=\"px-3 py-1 bg-brand-500/10 text-brand-300 text-xs font-medium rounded-full\">" . e($category) . "</span>";
    
    if ($isFeatured) {
        $html .= "<span class=\"px-3 py-1 bg-amber-500/10 text-amber-300 text-xs font-medium rounded-full\">Featured</span>";
    }
    
    if ($priceType === 'free') {
        $html .= "<span class=\"px-3 py-1 bg-green-500/10 text-green-300 text-xs font-medium rounded-full\">Free</span>";
    }
    
    $html .= "</div>";

    // Title
    $html .= "<h3 class=\"font-display text-xl font-bold text-white mb-2 group-hover:text-brand-400 transition-colors\">";
    $html .= "<a href=\"" . url('/products/' . e($slug)) . "\">" . e($name) . "</a>";
    $html .= "</h3>";

    // Description
    $description = $tagline ?: str_limit($shortDesc, 100);
    $html .= "<p class=\"text-slate-400 text-sm mb-4\">" . e($description) . "</p>";

    // Price
    if ($priceType !== 'free' && $price > 0) {
        $html .= "<div class=\"mb-4\">";
        $html .= "<span class=\"font-display text-2xl font-bold text-white\">" . money($price, $product['price_currency'] ?? 'USD') . "</span>";
        if (!empty($product['billing_cycle'])) {
            $html .= "<span class=\"text-slate-400 text-sm\"> / " . e($product['billing_cycle']) . "</span>";
        }
        $html .= "</div>";
    }

    // CTAs
    $html .= "<div class=\"flex items-center gap-3\">";
    $html .= "<a href=\"" . url('/products/' . e($slug)) . "\" class=\"flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-xl text-center transition-colors\">Learn More</a>";
    
    if (!empty($product['demo_url'])) {
        $html .= "<a href=\"" . e($product['demo_url']) . "\" target=\"_blank\" class=\"px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-xl transition-colors\">Demo</a>";
    }
    
    $html .= "</div>";

    $html .= "</div></div>";

    return $html;
}
`
  },
  // ==================== BLOG CARD ====================
  {
    path: 'app/views/components/blog-card.php',
    name: 'blog-card.php',
    language: 'php',
    category: 'Domain',
    description: 'Blog post card with image, title, excerpt, author, date',
    content: `<?php
/**
 * Blog Card Component
 * 
 * Usage:
 * <?= component('blog-card', ['post' => $postData]) ?>
 */

function blog_card(array $props = []): string
{
    $post = $props['post'] ?? [];
    $class = $props['class'] ?? '';

    $title = $post['title'] ?? '';
    $slug = $post['slug'] ?? '';
    $excerpt = $post['excerpt'] ?? '';
    $featuredImage = $post['featured_image'] ?? null;
    $category = $post['category_name'] ?? 'Blog';
    $author = $post['author_name'] ?? 'Admin';
    $authorAvatar = $post['author_avatar'] ?? null;
    $publishedAt = $post['published_at'] ?? $post['created_at'] ?? '';

    $html = "<article class=\"bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover-lift group $class\">";

    // Image
    if ($featuredImage) {
        $html .= "<div class=\"aspect-video overflow-hidden\">";
        $html .= "<img src=\"" . upload($featuredImage) . "\" alt=\"" . e($title) . "\" class=\"w-full h-full object-cover group-hover:scale-105 transition-transform duration-500\">";
        $html .= "</div>";
    }

    // Content
    $html .= "<div class=\"p-6\">";

    // Category & Date
    $html .= "<div class=\"flex items-center gap-3 mb-3\">";
    $html .= "<span class=\"px-3 py-1 bg-brand-500/10 text-brand-300 text-xs font-medium rounded-full\">" . e($category) . "</span>";
    $html .= "<span class=\"text-xs text-slate-500\">" . format_date($publishedAt) . "</span>";
    $html .= "</div>";

    // Title
    $html .= "<h3 class=\"font-display text-xl font-bold text-white mb-2 group-hover:text-brand-400 transition-colors line-clamp-2\">";
    $html .= "<a href=\"" . url('/blog/' . e($slug)) . "\">" . e($title) . "</a>";
    $html .= "</h3>";

    // Excerpt
    $html .= "<p class=\"text-slate-400 text-sm mb-4 line-clamp-3\">" . e(str_limit(strip_tags($excerpt), 120)) . "</p>";

    // Author & Read More
    $html .= "<div class=\"flex items-center justify-between\">";
    
    // Author
    $html .= "<div class=\"flex items-center gap-2\">";
    if ($authorAvatar) {
        $html .= "<img src=\"" . upload($authorAvatar) . "\" class=\"w-8 h-8 rounded-full\" alt=\"" . e($author) . "\">";
    } else {
        $html .= "<div class=\"w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold\">";
        $html .= strtoupper(substr($author, 0, 1));
        $html .= "</div>";
    }
    $html .= "<span class=\"text-xs text-slate-400\">" . e($author) . "</span>";
    $html .= "</div>";

    // Read More
    $html .= "<a href=\"" . url('/blog/' . e($slug)) . "\" class=\"text-brand-400 hover:text-brand-300 text-sm font-medium inline-flex items-center gap-1\">";
    $html .= "Read More";
    $html .= "<svg class=\"w-4 h-4 group-hover:translate-x-1 transition-transform\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">";
    $html .= "<path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M13 7l5 5m0 0l-5 5m5-5H6\"/>";
    $html .= "</svg></a>";

    $html .= "</div></div></article>";

    return $html;
}
`
  },
];
