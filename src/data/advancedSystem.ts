export const advancedSystemFiles = [
  {
    path: 'app/core/Security.php',
    name: 'Security.php',
    language: 'php',
    feature: 'Security',
    description: 'Security hardening: honeypot, reCAPTCHA v3, file validation, security headers',
    content: `<?php
declare(strict_types=1);

namespace App\\Core;

/**
 * Security - Comprehensive security utilities
 */
class Security
{
    /**
     * Verify honeypot field (anti-bot)
     */
    public static function verifyHoneypot(): bool
    {
        // Honeypot field should be empty (bots fill it)
        return empty(\$_POST['website_url'] ?? '');
    }

    /**
     * Generate honeypot field HTML
     */
    public static function honeypotField(): string
    {
        return '<div style="position:absolute;left:-9999px;" aria-hidden="true">
            <input type="text" name="website_url" tabindex="-1" autocomplete="off" value="">
        </div>';
    }

    /**
     * Verify Google reCAPTCHA v3
     */
    public static function verifyRecaptcha(?string \$token = null): bool
    {
        \$secretKey = setting('recaptcha_secret');
        if (!\$secretKey) return true; // Skip if not configured

        \$token = \$token ?? (\$_POST['recaptcha_token'] ?? '');
        if (empty(\$token)) return false;

        \$response = @file_get_contents(
            'https://www.google.com/recaptcha/api/siteverify?' . http_build_query([
                'secret' => \$secretKey,
                'response' => \$token,
                'remoteip' => client_ip(),
            ])
        );

        if (!\$response) return false;

        \$data = json_decode(\$response, true);
        return (\$data['success'] ?? false) && (\$data['score'] ?? 0) >= 0.5;
    }

    /**
     * Validate uploaded file
     */
    public static function validateUpload(array \$file, array \$options = []): array
    {
        \$errors = [];

        // Check upload error
        if (\$file['error'] !== UPLOAD_ERR_OK) {
            \$errorMessages = [
                UPLOAD_ERR_INI_SIZE => 'File exceeds server upload limit',
                UPLOAD_ERR_FORM_SIZE => 'File exceeds form upload limit',
                UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
                UPLOAD_ERR_NO_FILE => 'No file was uploaded',
                UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
                UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
            ];
            \$errors[] = \$errorMessages[\$file['error']] ?? 'Upload error';
            return ['valid' => false, 'errors' => \$errors];
        }

        // Check file size
        \$maxSize = \$options['max_size'] ?? MAX_UPLOAD_SIZE;
        if (\$file['size'] > \$maxSize) {
            \$errors[] = 'File size exceeds ' . round(\$maxSize / 1024 / 1024) . 'MB limit';
        }

        // Check MIME type
        \$allowedMimes = \$options['allowed_mimes'] ?? array_merge(ALLOWED_IMAGE_TYPES, ALLOWED_DOC_TYPES);
        \$finfo = new \\finfo(FILEINFO_MIME_TYPE);
        \$actualMime = \$finfo->file(\$file['tmp_name']);

        if (!in_array(\$actualMime, \$allowedMimes)) {
            \$errors[] = 'File type not allowed: ' . \$actualMime;
        }

        // Check extension
        \$allowedExtensions = \$options['allowed_extensions'] ?? ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf', 'zip'];
        \$ext = strtolower(pathinfo(\$file['name'], PATHINFO_EXTENSION));
        if (!in_array(\$ext, \$allowedExtensions)) {
            \$errors[] = 'File extension not allowed: ' . \$ext;
        }

        // Check for PHP files (security)
        if (in_array(\$ext, ['php', 'phtml', 'php3', 'php4', 'php5', 'phps', 'phar'])) {
            \$errors[] = 'PHP files are not allowed';
        }

        // Verify image dimensions if applicable
        if (str_starts_with(\$actualMime, 'image/') && \$actualMime !== 'image/svg+xml') {
            \$imageInfo = @getimagesize(\$file['tmp_name']);
            if (!\$imageInfo) {
                \$errors[] = 'Invalid image file';
            } else {
                \$maxWidth = \$options['max_width'] ?? 5000;
                \$maxHeight = \$options['max_height'] ?? 5000;
                if (\$imageInfo[0] > \$maxWidth || \$imageInfo[1] > \$maxHeight) {
                    \$errors[] = "Image dimensions exceed {\$maxWidth}x{\$maxHeight}px";
                }
            }
        }

        return [
            'valid' => empty(\$errors),
            'errors' => \$errors,
            'mime' => \$actualMime,
            'extension' => \$ext,
        ];
    }

    /**
     * Send security headers
     */
    public static function sendHeaders(): void
    {
        // Prevent clickjacking
        header('X-Frame-Options: SAMEORIGIN');

        // Prevent MIME type sniffing
        header('X-Content-Type-Options: nosniff');

        // XSS Protection
        header('X-XSS-Protection: 1; mode=block');

        // Referrer Policy
        header('Referrer-Policy: strict-origin-when-cross-origin');

        // Permissions Policy
        header('Permissions-Policy: camera=(), microphone=(), geolocation=()');

        // HSTS (uncomment in production with HTTPS)
        // header('Strict-Transport-Security: max-age=31536000; includeSubDomains');

        // Content Security Policy
        \$csp = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://unpkg.com https://cdn.tiny.cloud",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com",
            "img-src 'self' data: https: " . SITE_URL,
            "font-src 'self' https://fonts.gstatic.com",
            "connect-src 'self' https://www.google.com https://chart.googleapis.com",
            "frame-src https://www.youtube.com https://player.vimeo.com",
        ];
        header('Content-Security-Policy: ' . implode('; ', \$csp));

        // Hide PHP version
        header_remove('X-Powered-By');
    }

    /**
     * Sanitize input (for database storage)
     */
    public static function sanitize(string \$input): string
    {
        return trim(strip_tags(\$input));
    }

    /**
     * Generate secure random token
     */
    public static function token(int \$length = 32): string
    {
        return bin2hex(random_bytes(\$length));
    }

    /**
     * Rate limit check for forms
     */
    public static function rateLimitForm(string \$formName, int \$maxAttempts = 5, int \$decaySeconds = 900): bool
    {
        \$key = 'form_rate_' . md5(\$formName . client_ip());
        \$limiter = new RateLimiter(\$key, \$maxAttempts, \$decaySeconds);
        return !\$limiter->isLimited();
    }
}
`
  },
  {
    path: 'app/core/Cache.php',
    name: 'Cache.php',
    language: 'php',
    feature: 'Performance',
    description: 'Simple file-based query caching system',
    content: `<?php
declare(strict_types=1);

namespace App\\Core;

/**
 * Cache - Simple file-based caching
 */
class Cache
{
    private static string \$cachePath;
    private static bool \$enabled = true;

    public static function init(): void
    {
        self::\$cachePath = CACHE_PATH;
        if (!is_dir(self::\$cachePath)) {
            mkdir(self::\$cachePath, 0755, true);
        }
    }

    /**
     * Get cached value
     */
    public static function get(string \$key, mixed \$default = null): mixed
    {
        if (!self::\$enabled) return \$default;

        \$file = self::\$cachePath . '/' . md5(\$key) . '.cache';
        if (!file_exists(\$file)) return \$default;

        \$data = @unserialize(file_get_contents(\$file));
        if (!\$data) return \$default;

        // Check expiry
        if (isset(\$data['expires']) && \$data['expires'] < time()) {
            @unlink(\$file);
            return \$default;
        }

        return \$data['value'] ?? \$default;
    }

    /**
     * Set cached value
     */
    public static function set(string \$key, mixed \$value, int \$ttl = 3600): bool
    {
        if (!self::\$enabled) return false;

        \$file = self::\$cachePath . '/' . md5(\$key) . '.cache';
        \$data = [
            'value' => \$value,
            'expires' => time() + \$ttl,
            'created' => time(),
        ];

        return (bool) @file_put_contents(\$file, serialize(\$data));
    }

    /**
     * Remember - get or set cache
     */
    public static function remember(string \$key, int \$ttl, callable \$callback): mixed
    {
        \$value = self::get(\$key);
        if (\$value !== null) return \$value;

        \$value = \$callback();
        self::set(\$key, \$value, \$ttl);
        return \$value;
    }

    /**
     * Delete cached value
     */
    public static function forget(string \$key): bool
    {
        \$file = self::\$cachePath . '/' . md5(\$key) . '.cache';
        return @unlink(\$file);
    }

    /**
     * Clear all cache
     */
    public static function flush(): int
    {
        \$count = 0;
        \$files = glob(self::\$cachePath . '/*.cache');
        foreach (\$files as \$file) {
            if (@unlink(\$file)) \$count++;
        }
        return \$count;
    }

    /**
     * Enable/disable cache
     */
    public static function setEnabled(bool \$enabled): void
    {
        self::\$enabled = \$enabled;
    }
}
`
  },
  {
    path: 'app/core/I18n.php',
    name: 'I18n.php',
    language: 'php',
    feature: 'i18n',
    description: 'Multi-language support with RTL, translations, language switcher',
    content: `<?php
declare(strict_types=1);

namespace App\\Core;

/**
 * I18n - Internationalization
 * Multi-language support with RTL capability
 */
class I18n
{
    private static ?string \$currentLang = null;
    private static array \$translations = [];
    private static array \$availableLanguages = [];

    /**
     * Initialize i18n
     */
    public static function init(): void
    {
        // Get current language from session/cookie/URL
        self::\$currentLang = \$_SESSION['lang']
            ?? \$_COOKIE['lang']
            ?? \$_GET['lang']
            ?? self::getDefaultLanguage();

        // Load available languages
        self::loadLanguages();

        // Load translations for current language
        self::loadTranslations();
    }

    /**
     * Translate a key
     */
    public static function trans(string \$key, array \$replacements = [], ?string \$lang = null): string
    {
        \$lang = \$lang ?? self::\$currentLang;
        \$value = self::\$translations[\$lang][\$key] ?? \$key;

        // Replace placeholders
        foreach (\$replacements as \$placeholder => \$replacement) {
            \$value = str_replace(':' . \$placeholder, (string) \$replacement, \$value);
        }

        return \$value;
    }

    /**
     * Shorthand for trans()
     */
    public static function t(string \$key, array \$replacements = []): string
    {
        return self::trans(\$key, \$replacements);
    }

    /**
     * Get current language code
     */
    public static function currentLang(): string
    {
        return self::\$currentLang ?? 'en';
    }

    /**
     * Check if current language is RTL
     */
    public static function isRtl(): bool
    {
        \$lang = self::getLanguageInfo(self::\$currentLang ?? 'en');
        return (\$lang['direction'] ?? 'ltr') === 'rtl';
    }

    /**
     * Set current language
     */
    public static function setLang(string \$code): void
    {
        if (isset(self::\$availableLanguages[\$code])) {
            self::\$currentLang = \$code;
            \$_SESSION['lang'] = \$code;
            setcookie('lang', \$code, time() + 86400 * 365, '/');
            self::loadTranslations();
        }
    }

    /**
     * Get all available languages
     */
    public static function getLanguages(): array
    {
        return self::\$availableLanguages;
    }

    /**
     * Get language info
     */
    public static function getLanguageInfo(string \$code): array
    {
        return self::\$availableLanguages[\$code] ?? ['code' => \$code, 'name' => \$code, 'direction' => 'ltr'];
    }

    /**
     * Get URL for language switch
     */
    public static function langUrl(string \$code): string
    {
        \$currentUrl = \$_SERVER['REQUEST_URI'] ?? '/';
        \$separator = str_contains(\$currentUrl, '?') ? '&' : '?';
        return \$currentUrl . \$separator . 'lang=' . \$code;
    }

    /**
     * Load available languages from DB
     */
    private static function loadLanguages(): void
    {
        try {
            \$db = Database::getInstance();
            \$languages = \$db->fetchAll("SELECT * FROM languages WHERE status = 'active' ORDER BY is_default DESC, name");
            foreach (\$languages as \$lang) {
                self::\$availableLanguages[\$lang['code']] = \$lang;
            }
        } catch (\\Throwable \$e) {
            // Fallback
            self::\$availableLanguages = [
                'en' => ['code' => 'en', 'name' => 'English', 'native_name' => 'English', 'direction' => 'ltr', 'is_default' => 1],
            ];
        }
    }

    /**
     * Load translations for current language
     */
    private static function loadTranslations(): void
    {
        if (isset(self::\$translations[self::\$currentLang])) return;

        try {
            \$db = Database::getInstance();
            \$translations = \$db->fetchAll(
                "SELECT \`key\`, \`value\` FROM translations WHERE language_code = ?",
                [self::\$currentLang]
            );
            self::\$translations[self::\$currentLang] = array_column(\$translations, 'value', 'key');
        } catch (\\Throwable \$e) {
            self::\$translations[self::\$currentLang] = [];
        }
    }

    /**
     * Get default language
     */
    private static function getDefaultLanguage(): string
    {
        try {
            \$db = Database::getInstance();
            \$default = \$db->fetch("SELECT code FROM languages WHERE is_default = 1 AND status = 'active' LIMIT 1");
            return \$default['code'] ?? 'en';
        } catch (\\Throwable \$e) {
            return 'en';
        }
    }
}
`
  },
  {
    path: 'app/views/components/language-switcher.php',
    name: 'language-switcher.php',
    language: 'php',
    feature: 'i18n',
    description: 'Language switcher dropdown component',
    content: `<?php
/**
 * Language Switcher Component
 * Include in navbar for multi-language support
 */
use App\\Core\\I18n;

\$languages = I18n::getLanguages();
if (count(\$languages) <= 1) return; // Don't show if only one language

\$currentLang = I18n::currentLang();
\$currentInfo = I18n::getLanguageInfo(\$currentLang);
?>

<div x-data="{ open: false }" class="relative">
    <button @click="open = !open" class="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span><?= e(\$currentInfo['native_name'] ?? \$currentInfo['name'] ?? strtoupper(\$currentLang)) ?></span>
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
    </button>

    <div x-show="open" @click.away="open = false" x-transition
         class="absolute right-0 mt-2 w-40 bg-navy-800 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
        <?php foreach (\$languages as \$code => \$lang): ?>
        <a href="<?= I18n::langUrl(\$code) ?>"
           class="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-white/5 transition-colors <?= \$code === \$currentLang ? 'text-brand-400 bg-white/5' : 'text-slate-300' ?>">
            <span><?= e(\$lang['native_name'] ?? \$lang['name']) ?></span>
            <?php if (\$code === \$currentLang): ?>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            <?php endif; ?>
        </a>
        <?php endforeach; ?>
    </div>
</div>
`
  },
  {
    path: 'app/views/components/chat-widget.php',
    name: 'chat-widget.php',
    language: 'php',
    feature: 'Chat',
    description: 'Live chat integration (Tawk.to/Crisp) + WhatsApp click-to-chat',
    content: `<?php
/**
 * Chat Widget Component
 * Supports Tawk.to, Crisp, or WhatsApp click-to-chat
 * Configured via admin settings
 */

\$chatProvider = setting('chat_provider', '');
\$chatId = setting('chat_widget_id', '');
\$whatsappNumber = setting('whatsapp_number', '');
?>

<?php if (\$chatProvider === 'tawk' && \$chatId): ?>
<!-- Tawk.to Live Chat -->
<script type="text/javascript">
var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
(function(){
var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
s1.async=true;
s1.src='https://embed.tawk.to/<?= e(\$chatId) ?>';
s1.charset='UTF-8';
s1.setAttribute('crossorigin','*');
s0.parentNode.insertBefore(s1,s0);
})();
</script>

<?php elseif (\$chatProvider === 'crisp' && \$chatId): ?>
<!-- Crisp Chat -->
<script type="text/javascript">window.\$crisp=[];window.CRISP_WEBSITE_ID="<?= e(\$chatId) ?>";(function(){d=document;s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();</script>

<?php endif; ?>

<?php if (\$whatsappNumber): ?>
<!-- WhatsApp Click-to-Chat -->
<a href="https://wa.me/<?= e(preg_replace('/[^0-9]/', '', \$whatsappNumber)) ?>?text=<?= urlencode('Hi, I need help with...') ?>"
   target="_blank" rel="noopener"
   class="fixed bottom-6 right-6 z-40 w-14 h-14 bg-green-500 hover:bg-green-400 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 transition-transform hover:scale-110 group"
   title="Chat on WhatsApp">
    <svg class="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
    <!-- Pulse animation -->
    <span class="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-ping opacity-75"></span>
    <span class="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full"></span>
</a>
<?php endif; ?>
`
  },
  {
    path: 'public_html/.htaccess',
    name: '.htaccess',
    language: 'apache',
    feature: 'Security',
    description: 'Complete .htaccess with security rules, performance, and URL rewriting',
    content: `# ============================================================
# Khybersoft - Complete .htaccess
# Security + Performance + URL Rewriting
# ============================================================

# Enable Rewrite Engine
RewriteEngine On
RewriteBase /

# ============================================================
# SECURITY RULES
# ============================================================

# Block access to sensitive files
<FilesMatch "\\.(env|log|sql|md|json|lock|yml|yaml|ini|conf|sh|bak|old|tmp)\$">
    Order allow,deny
    Deny from all
</FilesMatch>

# Block access to hidden files and directories
RewriteRule "(^|/)\\." - [F,L]

# Block access to app directory
RewriteRule "^app/" - [F,L]
RewriteRule "^storage/" - [F,L]
RewriteRule "^routes/" - [F,L]
RewriteRule "^vendor/" - [F,L]

# Block directory listing
Options -Indexes

# Disable server signature
ServerSignature Off

# Prevent script execution in uploads
<Directory "uploads">
    <FilesMatch "\\.(php|phtml|php3|php4|php5|phps|phar)\$">
        Deny from all
    </FilesMatch>
</Directory>

# ============================================================
# PERFORMANCE RULES
# ============================================================

# Enable Gzip compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml
    AddOutputFilterByType DEFLATE text/css application/javascript
    AddOutputFilterByType DEFLATE application/json application/xml
    AddOutputFilterByType DEFLATE image/svg+xml
    AddOutputFilterByType DEFLATE font/woff font/woff2
</IfModule>

# Browser caching
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/webp "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType image/x-icon "access plus 1 year"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType application/pdf "access plus 1 month"
    ExpiresByType font/woff "access plus 1 year"
    ExpiresByType font/woff2 "access plus 1 year"
</IfModule>

# Cache control headers
<IfModule mod_headers.c>
    <FilesMatch "\\.(ico|pdf|flv|jpg|jpeg|png|gif|webp|swf)\$">
        Header set Cache-Control "max-age=31536000, public"
    </FilesMatch>
    <FilesMatch "\\.(css|js)\$">
        Header set Cache-Control "max-age=2592000, public"
    </FilesMatch>
    <FilesMatch "\\.(html|htm|php)\$">
        Header set Cache-Control "max-age=0, private, no-store, no-cache, must-revalidate"
    </FilesMatch>
</IfModule>

# ============================================================
# SECURITY HEADERS
# ============================================================

<IfModule mod_headers.c>
    # Prevent clickjacking
    Header always set X-Frame-Options "SAMEORIGIN"

    # Prevent MIME type sniffing
    Header always set X-Content-Type-Options "nosniff"

    # XSS Protection
    Header always set X-XSS-Protection "1; mode=block"

    # Referrer Policy
    Header always set Referrer-Policy "strict-origin-when-cross-origin"

    # Permissions Policy
    Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"

    # Remove server info
    Header unset X-Powered-By
    Header unset Server
</IfModule>

# ============================================================
# URL REWRITING
# ============================================================

# Remove trailing slash (except directories)
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)/\$ /\$1 [L,R=301]

# Serve static files directly
RewriteCond %{REQUEST_FILENAME} -f
RewriteRule ^ - [L]

# Serve existing directories
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Sitemap
RewriteRule ^sitemap\\.xml\$ index.php?url=sitemap.xml [L]
RewriteRule ^robots\\.txt\$ index.php?url=robots.txt [L]

# API routes
RewriteRule ^api/(.*)\$ index.php?url=api/\$1 [QSA,L]

# Route everything else to front controller
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)\$ index.php?url=\$1 [QSA,L]

# ============================================================
# CUSTOM ERROR PAGES
# ============================================================

ErrorDocument 404 /index.php?url=404
ErrorDocument 403 /index.php?url=403
ErrorDocument 500 /index.php?url=500

# ============================================================
# PHP SETTINGS (if allowed)
# ============================================================

<IfModule mod_php.c>
    php_value upload_max_filesize 20M
    php_value post_max_size 25M
    php_value max_execution_time 60
    php_value memory_limit 128M
    php_flag expose_php Off
    php_flag display_errors Off
    php_flag log_errors On
</IfModule>
`
  },
  {
    path: 'app/views/components/seo-meta.php',
    name: 'seo-meta.php',
    language: 'php',
    feature: 'SEO',
    description: 'SEO meta component with Schema.org, Open Graph, Twitter Cards',
    content: `<?php
/**
 * SEO Meta Component
 * Include in <head> for automatic SEO meta tags
 * Usage: <?php require APP_PATH . '/views/components/seo-meta.php'; ?>
 *
 * Required variables: \$page_title, \$meta_desc, \$og_image (optional)
 */

use App\\Core\\Seo;

\$page_title = \$page_title ?? setting('site_name');
\$meta_desc = \$meta_desc ?? setting('site_tagline');
\$og_image = \$og_image ?? '';
\$canonical = \$canonical ?? SITE_URL . (parse_url(\$_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/');
\$schemaType = \$schemaType ?? 'WebPage';

// Basic meta
echo '<meta name="description" content="' . e(\$meta_desc) . '">' . "\\n";
echo '<link rel="canonical" href="' . e(\$canonical) . '">' . "\\n";

// Open Graph
echo Seo::openGraph(\$page_title, \$meta_desc, \$canonical, \$og_image);

// Hreflang (if multi-language)
if (class_exists('App\\Core\\I18n')) {
    \$languages = \\App\\Core\\I18n::getLanguages();
    foreach (\$languages as \$code => \$lang) {
        echo '<link rel="alternate" hreflang="' . e(\$code) . '" href="' . e(\$canonical . '?lang=' . \$code) . '">' . "\\n";
    }
}

// Schema.org Organization (on homepage)
if ((\$_SERVER['REQUEST_URI'] ?? '/') === '/') {
    echo Seo::organization() . "\\n";
}

// Product schema
if (!empty(\$product)) {
    echo Seo::product(\$product) . "\\n";
}

// Article schema
if (!empty(\$post)) {
    echo Seo::article(\$post) . "\\n";
}

// FAQ schema
if (!empty(\$faqs)) {
    echo Seo::faq(\$faqs) . "\\n";
}

// Breadcrumbs schema
if (!empty(\$breadcrumbs)) {
    echo Seo::breadcrumbs(\$breadcrumbs) . "\\n";
}
`
  },
];
