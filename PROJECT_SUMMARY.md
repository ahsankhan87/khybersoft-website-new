# Khybersoft - Complete PHP MVC Project

## 🎉 Project Successfully Built!

A production-ready PHP 8.2 MVC framework with complete admin panel and public frontend for Khybersoft software company.

---

## 📊 Project Statistics

- **Total PHP Files**: 110+ files
- **Database Tables**: 40+ tables
- **Admin Modules**: 19 modules with full CRUD
- **Frontend Pages**: 12 pages with premium design
- **Advanced Features**: 12 production-grade systems
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
