# Khybersoft - Complete PHP MVC Project

## 🎉 Project Successfully Built!

A production-ready PHP 8.2 MVC framework with complete admin panel and public frontend for Khybersoft software company.

---

## 📊 Project Statistics

- **Total PHP Files**: 135+ files
- **Database Tables**: 40+ tables
- **Admin Modules**: 19 modules with full CRUD
- **Frontend Pages**: 12 pages with premium design
- **Advanced Features**: 12 production-grade systems
- **UI Components**: 25+ reusable components
- **Deployment Files**: Installation wizard, cron jobs, security configs
- **Spam Protection**: 12-layer defense-in-depth system
- **Runtime**: PHP 8.2+
- **Database**: MySQL 8.0+
- **Frontend**: TailwindCSS + Alpine.js + AOS

---

## 🏗️ Architecture Overview

### Backend (PHP 8.2 MVC)

```
/public_html          # Document root
├── index.php         # Front controller
├── .htaccess         # URL rewriting & security
├── assets/           # CSS, JS, images
└── uploads/          # User uploads

/app                  # Application logic
├── config/           # Configuration files
├── core/             # Core framework classes
│   ├── Database.php      # PDO singleton
│   ├── Router.php        # URL routing
│   ├── Controller.php    # Base controller
│   ├── Model.php         # Base model with CRUD
│   ├── Auth.php          # Authentication
│   ├── Validator.php     # Input validation
│   ├── CSRF.php          # CSRF protection
│   ├── RateLimiter.php   # Rate limiting
│   ├── TOTP.php          # 2FA (Google Authenticator)
│   └── AdminController.php # Base admin CRUD
├── controllers/      # Request handlers
│   ├── admin/        # Admin panel controllers
│   └── front/        # Public frontend controllers
├── models/           # Data models
├── views/            # View templates
│   ├── layouts/      # Layout templates
│   ├── admin/        # Admin views
│   └── front/        # Frontend views
├── helpers/          # Helper functions
└── middleware/       # Request middleware

/routes               # Route definitions
/storage              # Logs, cache
/database             # Migrations
```

---

## 🔐 Security Features

✅ **CSRF Protection** - Token-based form protection  
✅ **Password Hashing** - bcrypt with cost 12  
✅ **SQL Injection Prevention** - PDO prepared statements  
✅ **XSS Prevention** - htmlspecialchars output escaping  
✅ **Rate Limiting** - 5 login attempts per 15 minutes  
✅ **Session Fixation Prevention** - ID regeneration on login  
✅ **Account Lockout** - After 5 failed attempts  
✅ **Two-Factor Authentication** - TOTP (Google Authenticator compatible)  
✅ **Role-Based Access Control** - Granular permissions  
✅ **Security Headers** - Via .htaccess  

---

## 🎨 Admin Panel Features

### Authentication System
- Login with email/password
- Remember me (30 days)
- Forgot/reset password with email token
- Optional 2FA (TOTP)
- Session management
- Rate limiting

### Dashboard
- Stats cards with sparklines
- Recent inquiries table
- Activity log feed
- Traffic chart
- Top products by inquiries
- System health monitor

### Content Management
- **Pages** - CMS with TinyMCE, SEO fields, templates
- **Blog Posts** - Categories, tags, featured images, scheduled publishing
- **Blog Categories** - Simple CRUD
- **Comments** - Moderate, approve, reject, spam
- **Media Library** - Grid view, drag-drop upload, image resize

### Products Management
- **Products** - Full CRUD with repeater fields, drag-drop sortable
- **Product Categories** - With icons
- **Product Plans** - Pricing comparison tables
- **Product Demos** - Video/screenshot/live demos
- **Product Inquiries** - Filter, view, status, CSV export
- **Tutorials** - YouTube/Vimeo embed, categories
- **Product Versions** - Changelog tracking

### Services & Business
- **Services** - Features repeater, pricing
- **Testimonials** - Photo, star rating, video
- **Team Members** - Social links repeater
- **Clients/Portfolio** - Logo, category
- **FAQs** - Category, sortable, accordion
- **Contact Messages** - View, reply, status
- **Newsletter** - Subscribers, export CSV

### System
- **Users** - CRUD, role assignment, status
- **Roles & Permissions** - Matrix UI with checkboxes
- **Settings** - Tabbed interface (General, Contact, Social, SEO, Email, Payment, Integrations, Appearance)
- **Activity Logs** - Filterable, searchable
- **Redirects** - URL redirects with status codes

---

## 🌐 Public Frontend Features

### Design Language
- **Color Palette**: Deep indigo (#4F46E5), electric blue accents, dark navy (#0B1220)
- **Typography**: Inter (body) + Sora (headings)
- **Effects**: Glassmorphism, gradient borders, hover lifts
- **Animations**: AOS.js scroll animations
- **Responsive**: Mobile-first, fully responsive

### Homepage (/)
- Hero section with animated background
- Trust bar with client logos (marquee)
- Product categories grid
- Featured products showcase
- Why Khybersoft features
- Stats counter
- Services preview
- Testimonials slider (auto-play)
- Latest blog posts
- Newsletter CTA
- Final CTA section

### Product Detail (/products/{slug})
- Hero with product info and CTAs
- Screenshots carousel (lightbox)
- Features grid
- Pricing plans comparison
- Demo videos section
- Tutorials for product
- FAQ accordion
- Inquiry form (Book Demo / Get Quote tabs)
- Related products
- Sticky CTA on scroll

### Blog Post (/blog/{slug})
- Article hero with featured image
- Reading progress bar
- Table of contents sidebar
- Content with auto-generated heading IDs
- Tags
- Share buttons (Twitter, Facebook, LinkedIn, Copy)
- Related posts
- Comments section with moderation

### About Page (/about)
- Company story section
- Mission, Vision, Values cards
- Team grid with photos and social links
- Stats counter
- Timeline of company milestones
- CTA section

### Services Page (/services)
- Service cards with icons and descriptions
- Pricing display
- Process steps (Discovery → Planning → Development → Delivery)
- CTA for custom solutions

### Blog Listing (/blog)
- Grid layout with featured images
- Category filter
- Tag filter
- Search functionality
- Pagination
- Popular tags section
- Author info on each post

### FAQ Page (/faq)
- Categorized accordion
- Grouped by category
- Expandable/collapsible answers
- CTA to contact support

### Error Pages
- **404** - Branded "Page Not Found" with navigation
- **500** - Branded "Internal Server Error" with retry option

### Shared Components
- Sticky translucent navbar with blur
- Dynamic menu from database
- Footer with newsletter, social links
- WhatsApp floating chat button
- Back-to-top button

---

## 🚀 Advanced Features

### 1. Global Search System
✅ **Full-text search** using MySQL FULLTEXT indexes  
✅ **AJAX live search** with debounced results  
✅ **Multi-content search** (products, blog, tutorials, pages, services)  
✅ **Relevance scoring** with weighted results  
✅ **Search analytics** (popular terms, result tracking)  
✅ **Type filtering** with result counts  

### 2. Lead Capture & CRM
✅ **Auto-capture** from all forms (contact, demo, quote, inquiry)  
✅ **Lead scoring** (0-100 based on budget, type, company, phone)  
✅ **Temperature tagging** (hot/warm/cold)  
✅ **Pipeline management** (Kanban: New → Contacted → Qualified → Won/Lost)  
✅ **Follow-up reminders** with scheduled tasks  
✅ **Admin notifications** for new leads  
✅ **Source tracking** (product page, blog, referral, direct)  

### 3. Email System
✅ **PHPMailer wrapper** with SMTP support  
✅ **Email templates** (welcome, inquiry reply, password reset, newsletter)  
✅ **Queue system** with cron job processing  
✅ **Retry logic** (3 attempts before marking failed)  
✅ **Unsubscribe handling** with secure tokens  
✅ **Template variables** replacement  
✅ **Admin notifications** for new leads  

### 4. Payment Integration
✅ **Stripe Checkout** for one-time and subscription payments  
✅ **PayPal Smart Buttons** integration  
✅ **Order management** with order numbers  
✅ **Invoice generation** (HTML/PDF)  
✅ **License key generation** (auto on purchase)  
✅ **License validation API** for software products  
✅ **Webhook handlers** for payment events  
✅ **Secure download tokens** (expiring, tracked)  

### 5. Download System
✅ **Tokenized downloads** (24-hour expiry)  
✅ **Download tracking** (IP, user agent, timestamp)  
✅ **Free vs paid gating** (verify order before download)  
✅ **Direct file serving** or redirect to URL  

### 6. Live Chat
✅ **Tawk.to integration** (settings-driven)  
✅ **Crisp Chat integration** (settings-driven)  
✅ **WhatsApp click-to-chat** with pulse animation  
✅ **Configurable from admin** (Settings → Integrations)  

### 7. Analytics Dashboard
✅ **Page view tracking** (own table + optional Google Analytics)  
✅ **Popular content** (products, blog posts, tutorials)  
✅ **Conversion funnel** (visit → product view → inquiry → demo → sale)  
✅ **Traffic sources** (Direct, Google, Facebook, LinkedIn, etc.)  
✅ **Unique visitors** tracking  
✅ **Daily views chart**  

### 8. SEO Features
✅ **Auto sitemap.xml** (products, blog, tutorials, services, static pages)  
✅ **Schema.org JSON-LD** (Organization, Product, Article, FAQ, BreadcrumbList, VideoObject)  
✅ **Open Graph tags** (title, description, image, type)  
✅ **Twitter Cards** (summary_large_image)  
✅ **Canonical URLs**  
✅ **Auto meta generation** from content  
✅ **robots.txt editor** (from admin settings)  
✅ **301 redirect manager**  
✅ **hreflang ready** (multi-language structure)  

### 9. Multi-Language (i18n)
✅ **Languages table** with RTL support  
✅ **Translations table** (key-value pairs)  
✅ **Language switcher** component  
✅ **RTL support** (Urdu, Arabic ready)  
✅ **Session/cookie persistence**  
✅ **URL parameter switching** (?lang=ur)  
✅ **Default language** configuration  

### 10. Backup System
✅ **One-click database backup** (mysqldump wrapper)  
✅ **File backup** (uploads folder → ZIP)  
✅ **Auto-backup cron** (daily at 2 AM)  
✅ **Compression** (ZIP archives)  
✅ **Cleanup old backups** (keep last 30 days)  
✅ **Download from admin** panel  

### 11. Security Hardening
✅ **CSRF protection** on all forms  
✅ **XSS prevention** (output escaping helper)  
✅ **SQL injection prevention** (PDO prepared statements only)  
✅ **Rate limiting** (session + IP based, 5 attempts/15 min)  
✅ **Honeypot fields** (anti-bot)  
✅ **reCAPTCHA v3** (optional, settings-driven)  
✅ **File upload validation** (MIME, extension, size, dimensions)  
✅ **.htaccess security** (block .env, config, hide PHP version)  
✅ **Security headers** (CSP, X-Frame-Options, HSTS, X-Content-Type-Options)  
✅ **Login attempt logging**  
✅ **2FA for admins** (TOTP, Google Authenticator compatible)  
✅ **Session fixation prevention** (ID regeneration)  
✅ **Account lockout** (after 5 failed attempts)  

### 12. Performance Optimization
✅ **File-based caching** (simple, effective)  
✅ **Lazy loading images** (native browser support)  
✅ **Minified CSS/JS** in production  
✅ **Gzip compression** via .htaccess  
✅ **Browser caching** (1 year for images, 1 month for CSS/JS)  
✅ **CDN-ready** asset URLs  
✅ **Database indexes** (slug, status, created_at, FULLTEXT)  
✅ **Query optimization** (prepared statements, indexed queries)  
✅ **Asset versioning** (cache busting with ?v=timestamp)

---

## 🚀 Deployment & Installation

### Installation Wizard
✅ **Multi-step installer** with 6 steps:
1. Requirements check (PHP version, extensions, permissions)
2. Database configuration with connection test
3. Schema import with sample data
4. Environment file (.env) generation
5. Admin account creation
6. Completion with auto-cleanup

### Sample Data
✅ **Default admin user** (admin@khybersoft.com)  
✅ **Sample products** (POS System, Accounting, School Management, etc.)  
✅ **Sample blog posts** with categories and tags  
✅ **Sample pages** (About, Privacy, Terms)  
✅ **Default settings** and configuration  
✅ **Sample testimonials** and team members  
✅ **Sample services** and FAQs  
✅ **Menu items** for navigation  

### Cron Jobs
✅ **Email queue processor** - Every 5 minutes  
✅ **Daily database backup** - 2 AM daily  
✅ **Scheduled posts publisher** - Every 5 minutes  
✅ **Sitemap generator** - 3 AM daily  
✅ **Newsletter sender** - Every 6 hours  

### Security Configuration
✅ **Main .htaccess** - URL rewriting, security headers, performance  
✅ **Uploads .htaccess** - Prevents PHP execution, allows media only  
✅ **App .htaccess** - Denies all direct access  
✅ **Storage .htaccess** - Denies all direct access  

### Environment Configuration
✅ **.env.example** - Complete template with all settings  
✅ **Database configuration** - Host, name, user, password  
✅ **Email settings** - SMTP configuration  
✅ **Payment gateways** - Stripe and PayPal  
✅ **Social media** - All major platforms  
✅ **Integrations** - reCAPTCHA, Google Maps, live chat  
✅ **Security settings** - Session, rate limiting  
✅ **Performance settings** - Caching, backup  

### Documentation Files
✅ **README.md** - Project overview and quick start  
✅ **INSTALL.md** - Detailed cPanel installation guide  
✅ **ADMIN_GUIDE.md** - Complete admin panel documentation  
✅ **DEVELOPER_GUIDE.md** - Technical documentation for developers  
✅ **API.md** - API documentation with examples  
✅ **CHANGELOG.md** - Version history and updates  
✅ **DEPLOYMENT.md** - Deployment checklist and troubleshooting  
✅ **PROJECT_SUMMARY.md** - This comprehensive summary  

### cPanel Deployment
✅ **Step-by-step guide** with screenshots placeholders  
✅ **Database creation** instructions  
✅ **File upload** methods (File Manager, FTP)  
✅ **Permission setup** (755 for dirs, 644 for files)  
✅ **Domain configuration** with document root  
✅ **SSL certificate** setup via AutoSSL  
✅ **Cron job setup** with exact commands  
✅ **Post-installation** configuration checklist  

### Performance & Security
✅ **OPcache configuration** for PHP optimization  
✅ **Database optimization** with OPTIMIZE TABLE  
✅ **Image optimization** with auto-resize  
✅ **CDN integration** ready  
✅ **Browser caching** configured  
✅ **Gzip compression** enabled  
✅ **Security headers** (CSP, X-Frame-Options, HSTS)  
✅ **Rate limiting** on all forms  
✅ **File upload validation** (MIME, size, dimensions)  

---

## 🛡️ Comprehensive Spam Protection (12 Layers)

Defense-in-depth system protecting ALL public forms with multiple overlapping layers.

### Layer 1: Honeypot Fields 🍯
✅ **Two invisible trap fields** per form (rotated names per session)  
✅ **Silent rejection** - fake success message, no detection revealed  
✅ **Session-based rotation** - bots can't learn field names  
✅ **CSS-hidden** with `position:absolute; left:-9999px`  

### Layer 2: Time-Based Protection ⏱️
✅ **Minimum 3-second** submission time (bots are too fast)  
✅ **Maximum 2-hour** session expiry (prevents replay attacks)  
✅ **HMAC-encrypted timestamp** token (`_t` field)  
✅ **Tamper detection** - invalid tokens rejected  

### Layer 3: CSRF Token 🔐
✅ **One-time use** tokens per form render  
✅ **Regenerated** after successful submission  
✅ **Strict validation** - missing/invalid/expired rejected  

### Layer 4: Rate Limiting 🚦
✅ **Per-form per-IP per-hour**: Max 3 submissions  
✅ **Per-IP total per-hour**: Max 5 submissions  
✅ **Per-email per-day**: Max 2 submissions  
✅ **Per-session total**: Max 10 submissions  
✅ **Configurable thresholds** in admin settings  
✅ **Auto-blocking** with countdown timer shown to user  
✅ **Database-backed** rate_limits table with expiry  

### Layer 5: Content Analysis 🔍
✅ **30+ spam keywords** (viagra, casino, crypto, SEO, etc.)  
✅ **Configurable weights** (10-40 points per keyword)  
✅ **Excessive links detection** (>2 URLs = +20 points)  
✅ **ALL CAPS detection** (>70% uppercase = +15 points)  
✅ **Gibberish detection** (words without vowels = +25 points)  
✅ **Non-Latin character detection** (Cyrillic/Arabic in English forms)  
✅ **Score-based threshold** (default 60/100 = spam)  
✅ **Admin-editable** keyword list with weights  

### Layer 6: Email Validation 📧
✅ **Format validation** (FILTER_VALIDATE_EMAIL)  
✅ **DNS MX record check** (reject domains with no MX)  
✅ **200+ disposable domains** pre-seeded (mailinator, tempmail, etc.)  
✅ **Fake pattern detection** (test@test.com, admin@admin.com)  
✅ **Blocked email/domain list** (admin-managed)  
✅ **Configurable checks** (MX, disposable, patterns)  

### Layer 7: reCAPTCHA (Google) 🤖
✅ **reCAPTCHA v3** (invisible, score-based, recommended)  
✅ **reCAPTCHA v2** (checkbox fallback)  
✅ **Configurable threshold** (default 0.5 for v3)  
✅ **Graceful degradation** - if Google API down, allow through (v3) or show error (v2)  
✅ **Site key + secret key** in admin settings  
✅ **Works alongside** honeypot + timing (defense in depth)  

### Layer 8: Math Captcha (Fallback) 🧮
✅ **Simple math challenges** (7 + 3 = ?)  
✅ **Session-stored answers** (hashed for security)  
✅ **10-minute expiry**  
✅ **One-time use** (cleared after verification)  
✅ **Privacy-friendly** alternative to reCAPTCHA  
✅ **Configurable** - can disable reCAPTCHA and use math only  

### Layer 9: IP & Geo Intelligence 🌐
✅ **blocked_ips table** with reason + expiry  
✅ **Auto-block after N spam** (configurable, default 3)  
✅ **Country blocking** (optional, from settings)  
✅ **IP whitelist** (your office, staff)  
✅ **GeoIP lookup** via ipapi.co (cached 7 days)  
✅ **Permanent or temporary** blocks  

### Layer 10: Email Header Analysis 📬
✅ **X-Spam-Score header** added to outgoing emails  
✅ **X-Form-IP, X-Form-Time** headers for debugging  
✅ **Hidden meta info** in email body  
✅ **High-score spam** saved to DB but not emailed to admin  
✅ **Spam folder** in admin for review  

### Layer 11: Spam Queue & Admin Review 📋
✅ **7-tab admin interface**:
  - 🚩 Flagged submissions (review, mark safe/spam, delete)
  - 🌐 Blocked IPs (unblock, extend, add manually)
  - 📧 Blocked emails/domains
  - 🔑 Spam keywords (add, edit weight, toggle active)
  - 🗑️ Disposable domains (200+ pre-seeded, editable)
  - ⏱️ Rate limits (view active blocks)
  - 📊 Statistics (daily chart, top IPs, top keywords, by form)
✅ **Teach the system** - mark as "not spam" → whitelist sender  
✅ **Bulk actions** - delete, block IP, mark safe  
✅ **Real-time stats** - spam blocked per day, top offenders  

### Layer 12: Form-Specific Hardening 🎯
✅ **Newsletter**: Double opt-in (confirmation email with token)  
✅ **Contact form**: Require phone + reason dropdown  
✅ **Comments**: Moderation queue + Akismet-style checks  
✅ **Careers**: Require resume upload (specific file types)  
✅ **Product inquiry**: Require product selection (not free text)  
✅ **Configurable rules** per form in admin settings  

---

### Spam Protection Files

#### Core Classes
- ✅ `app/core/SpamGuard.php` - Main orchestrator (all 12 layers)
- ✅ `app/core/Captcha.php` - reCAPTCHA v2/v3 + math captcha

#### Helpers
- ✅ `app/helpers/spam.php` - `spam_field()`, `captcha_field()`, `spam_check()`

#### Admin
- ✅ `app/controllers/admin/SpamController.php` - 7-tab spam center
- ✅ `app/views/admin/spam/index.php` - Main spam center UI
- ✅ `app/views/admin/spam/test.php` - Test harness (simulate spam)

#### Components
- ✅ `app/views/components/form-protection.php` - Reusable form fields partial

#### Assets
- ✅ `assets/js/form-protection.js` - Client-side timing + double-submit prevention

#### Database
- ✅ `database/migrations/spam_tables.sql` - 7 tables + seed data (30 keywords, 200+ disposable domains)

---

### Usage Pattern

**In any form view:**
```php
<?= spam_field('contact') ?>     <!-- honeypot + timing + CSRF -->
<?= captcha_field() ?>           <!-- reCAPTCHA or math -->
```

**In controller:**
```php
$result = spam_check('contact', $_POST);
if (!$result['passed']) {
    // Silent fake success (don't reveal detection)
    flash('success', 'Message sent!');
    $this->redirect('/contact');
    return;
}
// Process legitimate submission
```

---

### Admin Settings (Security Tab)

- ✅ Enable reCAPTCHA (toggle + keys + version + threshold)
- ✅ Enable math captcha fallback
- ✅ Spam score threshold (slider 0-100, default 60)
- ✅ Content analysis threshold (default 40)
- ✅ Auto-block IP after N spam reports (default 3)
- ✅ Rate limit rules (editable numbers)
- ✅ Enable content analysis (toggle)
- ✅ Enable disposable email blocking (toggle)
- ✅ Enable DNS MX check (toggle)
- ✅ Enable country blocking (toggle + country list)
- ✅ IP whitelist (JSON array)
- ✅ Notification email on new spam (toggle)

---

### Test Harness

**Admin-only test page** (`/admin/spam/test`) to verify each layer:

- ✅ **Legitimate submission** - Should pass all checks
- ✅ **Honeypot filled** - Should be blocked (score 100)
- ✅ **Too fast submit** - Should be blocked (< 3 seconds)
- ✅ **Spam keywords** - Should be flagged (score based on keywords)
- ✅ **Disposable email** - Should be blocked (mailinator.com)
- ✅ **Excessive links** - Should be flagged (> 2 URLs)
- ✅ **ALL CAPS** - Should be flagged (> 70% uppercase)
- ✅ **Rate limited** - Should be blocked after N submissions

**Results show:**
- Pass/fail for each layer
- Total spam score (0-100)
- Detection reasons with scores
- Layer-by-layer breakdown

---

### Database Tables (7)

1. **form_submissions** - All submissions (spam or not) with score + reasons
2. **rate_limits** - Active rate limit blocks with expiry
3. **blocked_ips** - IP blacklist with reason + expiry
4. **blocked_emails** - Email/domain blacklist
5. **spam_keywords** - Keyword list with weights (30+ seeded)
6. **disposable_domains** - Disposable email domains (200+ seeded)
7. **spam_logs** - Detailed per-layer logs for debugging

---

### Statistics & Analytics

**Dashboard shows:**
- Today's spam vs total submissions
- Blocked IPs count
- Blocked emails count
- 30-day daily chart (total vs spam)
- Top spam IPs (last 7 days)
- Top triggered keywords
- Submissions by form (with spam rate %)

---

### Key Features

✅ **Defense in depth** - 12 overlapping layers  
✅ **Silent failure** - Bots don't know they're detected  
✅ **Teachable** - Mark as "not spam" → whitelist sender  
✅ **Configurable** - All thresholds editable in admin  
✅ **Scalable** - Database-backed, indexed queries  
✅ **Privacy-friendly** - Math captcha option (no Google)  
✅ **Graceful degradation** - Works even if external APIs down  
✅ **Comprehensive logging** - Every layer trigger logged  
✅ **Admin review** - Full spam center with 7 tabs  
✅ **Test harness** - Verify each layer works  
✅ **Auto-blocking** - IPs auto-blocked after N spam  
✅ **Rate limiting** - Configurable per-form/IP/email/session  
✅ **Content analysis** - Keyword detection + scoring  
✅ **Email validation** - MX check + disposable blocklist  
✅ **Geo intelligence** - Country blocking + IP whitelist  

---

### Protected Forms (All Public Forms)

- ✅ Contact form
- ✅ Product inquiry (Book Demo, Get Quote)
- ✅ Custom development request
- ✅ Newsletter subscribe
- ✅ Blog comments
- ✅ Careers application
- ✅ Book demo form
- ✅ Service inquiry
- ✅ Support request
- ✅ Feedback form
- ✅ Registration
- ✅ Any other public form

---


## 🎨 UI Component Library

### Reusable PHP Components (Blade-like)
Located in `/app/views/components/`, these components provide consistent, reusable UI elements across the application.

#### Basic Components
✅ **Button** - Multiple variants (primary, secondary, outline, ghost, danger), sizes (sm, md, lg), loading state, icons  
✅ **Card** - Flexible container with optional header, footer, hover effects  
✅ **Badge/Pill** - Status indicators with color variants  
✅ **Alert/Toast** - Success, error, warning, info messages with dismissible option  

#### Overlay Components
✅ **Modal** - Accessible modal with ESC close, focus trap, backdrop, sizes (sm, md, lg, xl, full)  
✅ **Dropdown** - Context menus and action dropdowns  
✅ **Tooltip** - Contextual help on hover  

#### Data Display
✅ **Accordion** - Collapsible content sections (FAQ-style)  
✅ **Tabs** - Tabbed interface with underline or pill variants  
✅ **Table** - Sortable, responsive data tables  
✅ **Stat Card** - Metrics display with trend indicators  
✅ **Empty State** - Placeholder for empty lists  

#### Form Components
✅ **Input** - Text input with label, error, help text, icons  
✅ **Textarea** - Multi-line text input  
✅ **Select** - Dropdown select with options  
✅ **Checkbox** - Checkbox with label  
✅ **Radio** - Radio button group  
✅ **Toggle** - Switch/toggle component  
✅ **File Upload** - Drag-and-drop file upload with preview  

#### Navigation
✅ **Pagination** - Styled pagination with page numbers  
✅ **Breadcrumb** - Navigation breadcrumb trail  

#### Layout
✅ **Section Heading** - Eyebrow + title + subtitle pattern  
✅ **CTA Band** - Call-to-action banner  
✅ **Skeleton Loader** - Loading placeholder animations  

#### Domain-Specific Cards
✅ **Product Card** - Product display with image, pricing, CTAs  
✅ **Blog Card** - Blog post preview with author, date, excerpt  
✅ **Tutorial Card** - Tutorial/video card with duration, difficulty  
✅ **Testimonial Card** - Customer testimonial with rating  
✅ **Team Card** - Team member with photo, role, social links  
✅ **Pricing Table** - Pricing plans comparison  

### Usage Example
```php
<?= component('button', [
    'label' => 'Submit',
    'variant' => 'primary',
    'size' => 'lg',
    'icon' => 'M5 13l4 4L19 7',
    'loading' => false
]) ?>

<?= component('card', [
    'title' => 'Product Name',
    'content' => 'Description here...',
    'hover' => true,
    'headerImage' => $product['hero_image']
]) ?>
```

---

## ✨ Page Polish & Enhancements

### Public Pages
✅ **Animated Hero** - Gradient mesh background, floating elements, custom cursor  
✅ **Scroll Animations** - AOS (Animate On Scroll) integration  
✅ **Number Counters** - Animated counters that trigger on scroll  
✅ **Parallax Sections** - Depth effect on scroll  
✅ **Smooth Scroll** - Smooth anchor link scrolling  
✅ **Loading Splash** - Initial loading screen  
✅ **Cookie Consent** - GDPR-compliant cookie banner  
✅ **Announcement Bar** - Admin-toggleable promotion banner  

### Admin Panel
✅ **Skeleton Loading** - Loading placeholders for async content  
✅ **Inline Editing** - Quick edit without leaving the page  
✅ **Command Palette** - Cmd+K / Ctrl+K for quick navigation  
✅ **Contextual Help** - Tooltip-based help system  
✅ **Keyboard Shortcuts** - Power user navigation  

### Animation System
```css
/* Custom animations defined in components */
@keyframes float { ... }
@keyframes fade-in-up { ... }
@keyframes gradient { ... }
@keyframes pulse-slow { ... }
```

### Interactive Features
- **Custom Cursor** - Optional branded cursor on desktop
- **Hover Effects** - Lift, scale, glow effects
- **Micro-interactions** - Button states, transitions
- **Scroll Triggers** - Elements animate into view
- **Parallax Depth** - Background layers move at different speeds

---

## 📦 Key Components

### Base AdminController
Reusable CRUD operations:
- `index()` - Paginated list with search, filters, sort
- `create()` / `store()` - Create form and save
- `edit($id)` / `update($id)` - Edit form and update
- `destroy($id)` - Soft delete
- `bulkAction()` - Bulk operations (delete, publish, unpublish)
- `exportCsv()` - CSV export
- Activity logging
- File upload handling

### Reusable View Components
- DataTables-style table with search, sort, filters, bulk actions
- Form field helpers (text, textarea, select, file, toggle, editor)
- Status badges
- Pagination
- Flash messages

### Frontend Layout
- Dynamic navbar from database
- Footer with multiple link columns
- Newsletter subscription
- Social media links
- WhatsApp floating button
- Back-to-top button
- Reading progress bar
- AOS animations initialization

---

## 🗄️ Database Schema

### Core Tables (7)
- `users` - User accounts with roles
- `roles` - User roles
- `permissions` - System permissions
- `role_permissions` - Role-permission mapping
- `settings` - Site-wide configuration
- `activity_logs` - Audit trail
- `media` - File/media library

### Content Tables (11)
- `pages` - CMS pages
- `menus` / `menu_items` - Navigation menus
- `blog_categories` / `blog_tags` / `blog_posts` / `blog_post_tags` / `blog_comments` - Blog system
- `testimonials` - Client testimonials
- `team_members` - Team profiles
- `faqs` - Frequently asked questions

### Product Tables (10)
- `product_categories` - Product categories
- `products` - Main products table
- `product_plans` - Pricing plans
- `product_features` - Product features
- `product_faqs` - Product-specific FAQs
- `product_demos` - Demo videos/screenshots
- `product_inquiries` - Customer inquiries
- `product_versions` - Version history
- `tutorial_categories` / `tutorials` - Tutorial system

### Business Tables (6)
- `services` - Service offerings
- `service_inquiries` - Service inquiries
- `contact_messages` - Contact form submissions
- `newsletter_subscribers` - Newsletter signups
- `custom_development_requests` - Custom project requests
- `clients` - Client/portfolio items

### SEO/System Tables (3)
- `seo_meta` - SEO metadata
- `redirects` - URL redirects
- `testimonials_videos` - Video testimonials

---

## 🚀 Deployment Instructions

### 1. Upload Files
```bash
# Upload to cPanel shared hosting
public_html/     → /home/username/public_html/
app/             → /home/username/app/ (outside webroot)
routes/          → /home/username/routes/
storage/         → /home/username/storage/
```

### 2. Database Setup
```bash
# Create database in cPanel
# Import schema from Database Schema tab
# Or run: mysql -u user -p database_name < schema.sql
```

### 3. Configuration
```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env with your credentials
DB_HOST=localhost
DB_NAME=khybersoft_db
DB_USER=your_username
DB_PASS=your_password

SITE_URL=https://khybersoft.com
```

### 4. Permissions
```bash
# Set proper permissions
chmod -R 755 storage/
chmod -R 755 public_html/uploads/
```

### 5. PHP Requirements
- PHP 8.2 or higher
- Extensions: PDO, mbstring, JSON, GD (for image resize)
- MySQL 8.0 or higher

### 6. Create Admin User
```sql
-- Insert default super admin
INSERT INTO users (name, email, password_hash, role_id, status, created_at)
VALUES (
  'Admin',
  'admin@khybersoft.com',
  '$2y$12$...', -- Generate with password_hash()
  1, -- super_admin role
  'active',
  NOW()
);
```

---

## 📝 Development Notes

### Adding a New Admin Module

1. **Create Model** (`app/models/YourModel.php`)
```php
class YourModel extends Model {
    protected string $table = 'your_table';
    protected array $fillable = ['field1', 'field2'];
}
```

2. **Create Controller** (`app/controllers/admin/YourController.php`)
```php
class YourController extends AdminController {
    protected string $modelClass = YourModel::class;
    protected string $viewPrefix = 'admin.your-module';
    protected string $routePrefix = '/admin/your-module';
    protected string $pageTitle = 'Your Module';
    protected array $validationRules = [...];
}
```

3. **Create Views** (`app/views/admin/your-module/`)
- `index.php` - List view
- `create.php` - Create form
- `edit.php` - Edit form

4. **Add Routes** (`routes/admin.php`)
```php
$router->get('/your-module', ['Admin\\YourController', 'index'], ['AdminAuth']);
$router->get('/your-module/create', ['Admin\\YourController', 'create'], ['AdminAuth']);
$router->post('/your-module', ['Admin\\YourController', 'store'], ['AdminAuth']);
$router->get('/your-module/{id}/edit', ['Admin\\YourController', 'edit'], ['AdminAuth']);
$router->post('/your-module/{id}', ['Admin\\YourController', 'update'], ['AdminAuth']);
$router->post('/your-module/{id}/delete', ['Admin\\YourController', 'destroy'], ['AdminAuth']);
```

### Adding a New Frontend Page

1. **Create Controller** (`app/controllers/front/YourController.php`)
2. **Create View** (`app/views/front/your-page.php`)
3. **Add Route** (`routes/web.php`)

---

## 🎯 Key Features Summary

### Backend
✅ PHP 8.2 with strict types and typed properties  
✅ Custom MVC framework (no heavy frameworks)  
✅ PDO with prepared statements  
✅ Complete authentication system with 2FA  
✅ Role-based access control  
✅ CSRF protection on all forms  
✅ Rate limiting for login  
✅ Activity logging  
✅ File upload with image resize  
✅ Soft deletes  
✅ Pagination helper  
✅ Validation system  
✅ Flash messages  
✅ SEO-friendly URLs  

### Admin Panel
✅ Premium dark theme with TailwindCSS  
✅ Alpine.js for interactivity  
✅ Collapsible sidebar with icons  
✅ Dashboard with stats and charts  
✅ DataTables-style lists with search/filter/sort  
✅ Bulk actions  
✅ TinyMCE rich text editor  
✅ Drag-drop sortable (SortableJS)  
✅ Repeater fields (Alpine.js)  
✅ Media library with grid view  
✅ Settings with tabbed interface  
✅ Activity logs viewer  
✅ CSV export  

### Frontend
✅ Premium design with glassmorphism  
✅ Inter + Sora fonts  
✅ AOS scroll animations  
✅ Responsive mobile-first design  
✅ Sticky navbar with blur  
✅ Dynamic menus from database  
✅ Homepage with hero, products, testimonials, blog  
✅ Product detail with carousel, pricing, demos, FAQ, inquiry form  
✅ Blog listing with categories, tags, search, pagination  
✅ Blog post with TOC, reading progress, comments, share buttons  
✅ About page with story, mission, vision, values, team, timeline  
✅ Services listing with cards, process steps, CTAs  
✅ Contact page with form, map, contact cards  
✅ FAQ page with categorized accordion  
✅ 404 and 500 error pages with branded design  
✅ WhatsApp floating button  
✅ Back-to-top button  
✅ Newsletter subscription  

### Advanced Features
✅ Global search with FULLTEXT and AJAX live results  
✅ Lead capture & CRM with scoring and pipeline  
✅ Email system with templates, queue, and unsubscribe  
✅ Payment integration (Stripe + PayPal)  
✅ License key generation and validation API  
✅ Secure download system with tokenization  
✅ Live chat (Tawk.to/Crisp/WhatsApp)  
✅ Analytics dashboard with conversion funnel  
✅ Complete SEO (Schema.org, sitemap, Open Graph)  
✅ Multi-language with RTL support  
✅ Backup system (database + files)  
✅ Security hardening (honeypot, reCAPTCHA, headers)  
✅ Performance optimization (caching, compression, CDN)  

---

## 📚 Documentation

All code is fully documented with:
- PHPDoc comments
- Inline explanations
- Type hints
- Example usage

Browse the interactive documentation site to explore:
- **Project Structure** - Complete folder tree
- **Database Schema** - All 40+ tables with relationships
- **Source Code** - Core framework files
- **Admin Panel** - Admin controllers and views
- **Admin CRUD** - All 19 admin modules
- **Frontend** - Public-facing pages
- **Advanced Features** - Search, Email, Payments, Security, Performance, i18n
- **UI Components** - 25+ reusable components + page polish

---

## 🔧 Customization

### Change Colors
Edit `app/views/layouts/front.php`:
```javascript
colors: {
    brand: {
        600: '#4F46E5', // Primary brand color
    }
}
```

### Add Social Links
Admin → Settings → Social tab

### Configure Email
Admin → Settings → Email tab (SMTP settings)

### Customize Homepage
Edit `app/views/front/home/index.php`

---

## 📄 License

This is a custom-built solution for Khybersoft. All rights reserved.

---

## 🤝 Support

For support or questions:
- Email: info@khybersoft.com
- Website: https://khybersoft.com

---

**Built with ❤️ using PHP 8.2, MySQL 8, TailwindCSS, and Alpine.js**
