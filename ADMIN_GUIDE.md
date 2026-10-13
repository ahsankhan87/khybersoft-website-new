# Khybersoft Admin Panel Guide

## 🎯 Overview

The Khybersoft admin panel provides complete control over your website content, products, users, and settings. Access it at `https://yourdomain.com/admin`.

---

## 🔐 Authentication

### Login
- **URL**: `/admin/login`
- **Default Credentials**:
  - Email: `admin@khybersoft.com`
  - Password: `change-me-on-first-login`

### Security Features
- **Rate Limiting**: 5 login attempts per 15 minutes
- **Account Lockout**: After 5 failed attempts
- **2FA Support**: Optional TOTP authentication
- **Session Management**: Automatic timeout after inactivity
- **Remember Me**: 30-day persistent login option

### Enable 2FA
1. Go to **Settings** → **Security**
2. Click **Enable Two-Factor Authentication**
3. Scan QR code with Google Authenticator
4. Enter verification code
5. Save backup codes securely

---

## 📊 Dashboard

The dashboard provides an overview of your website's activity.

### Stats Cards
- **Total Products**: Number of products in system
- **Inquiries Today**: New product inquiries today
- **Blog Posts**: Total published blog posts
- **Subscribers**: Active newsletter subscribers

### Recent Inquiries
- View latest product inquiries
- Quick status change (New → In Progress → Resolved → Closed)
- Click to view full details

### Activity Feed
- Recent system activities
- User actions (create, update, delete)
- Timestamp and user information

### System Health
- PHP version
- MySQL version
- Database size
- Disk space usage
- Memory usage
- Query count

---

## 📄 Content Management

### Pages
**Location**: Content → Pages

Create and manage static pages (About, Privacy, Terms, etc.)

**Features**:
- Rich text editor (TinyMCE)
- SEO fields (meta title, description)
- Template selection
- Slug auto-generation
- Publish/Draft status
- Sort order

**Creating a Page**:
1. Click **Create Page**
2. Enter title (slug auto-generates)
3. Add content using rich editor
4. Set SEO fields
5. Choose template
6. Set status (Draft/Published)
7. Click **Create Page**

### Blog Posts
**Location**: Content → Blog Posts

Manage blog articles with categories and tags.

**Features**:
- Rich text editor
- Featured image upload
- Categories and multi-select tags
- Scheduled publishing
- SEO optimization
- Auto read-time calculation

**Creating a Post**:
1. Click **New Post**
2. Enter title and slug
3. Add excerpt and content
4. Upload featured image
5. Select category
6. Add tags (multi-select)
7. Set publish date (or immediate)
8. Configure SEO fields
9. Click **Create Post**

### Blog Categories
**Location**: Content → Categories

Organize blog posts into categories.

**Features**:
- Simple CRUD
- Slug auto-generation
- Description field
- Sort order

### Comments
**Location**: Content → Comments

Moderate blog comments.

**Features**:
- View all comments
- Filter by status (Pending/Approved/Spam)
- Approve/Reject/Spam actions
- Delete comments
- View comment details

**Moderation Workflow**:
1. Review pending comments
2. Approve legitimate comments
3. Mark spam as spam
4. Delete inappropriate comments

### Media Library
**Location**: Content → Media Library

Manage all uploaded files.

**Features**:
- Grid view with thumbnails
- Drag-and-drop upload
- Multiple file upload
- Image resize on upload
- Copy URL button
- Delete files
- Filter by type (images, documents)
- Search by filename

**Uploading Files**:
1. Click upload area or drag files
2. Select multiple files
3. Files upload automatically
4. Images are resized automatically
5. Files appear in grid

---

## 📦 Products Management

### Products
**Location**: Products → Products

Manage your software products.

**Features**:
- Full product details
- Repeater fields (features, plans)
- Multi-image screenshots
- Drag-drop sortable
- Pricing configuration
- SEO fields
- Featured flag

**Creating a Product**:
1. Click **Add Product**
2. Enter basic info (name, tagline, description)
3. Add features (repeater field)
4. Configure pricing plans
5. Upload screenshots (drag-drop sortable)
6. Set pricing (one-time/subscription/free)
7. Add URLs (demo, download, docs, video)
8. Configure SEO
9. Set category and status
10. Click **Create Product**

**Repeater Fields**:
- **Features**: Add multiple features with icon, title, description
- **Plans**: Add pricing plans with name, price, billing cycle, features
- Click **+ Add** to add new items
- Drag to reorder
- Click **X** to remove

### Product Categories
**Location**: Products → Categories

Organize products into categories.

**Features**:
- Category name and slug
- Icon upload
- Description
- Sort order

### Product Inquiries
**Location**: Products → Inquiries

Manage customer inquiries about products.

**Features**:
- View all inquiries
- Filter by status/type/product
- Search by name/email/company
- View inquiry details
- Change status
- Export to CSV

**Inquiry Workflow**:
1. **New**: Inquiry just received
2. **In Progress**: Being handled
3. **Resolved**: Issue resolved
4. **Closed**: No further action needed

**Exporting**:
- Click **Export CSV** button
- Downloads all inquiries
- Includes: ID, Name, Email, Phone, Company, Product, Type, Status, Message, Date

### Tutorials
**Location**: Products → Tutorials

Create video tutorials for products.

**Features**:
- YouTube/Vimeo embed
- Thumbnail upload
- Duration and difficulty
- Category assignment
- Product association

**Creating a Tutorial**:
1. Click **Create Tutorial**
2. Enter title and description
3. Paste video URL (YouTube/Vimeo)
4. Upload thumbnail
5. Set duration and difficulty
6. Assign to product/category
7. Click **Create**

### Product Versions
**Location**: Products → [Product] → Versions

Track product version history.

**Features**:
- Version number
- Release date
- Changelog
- Download URL

---

## 🛠️ Services Management

### Services
**Location**: Services → Services

Manage service offerings.

**Features**:
- Service title and description
- Icon upload
- Features repeater
- Starting price
- Status management

**Creating a Service**:
1. Click **Add Service**
2. Enter title and description
3. Upload icon
4. Add features (repeater)
5. Set starting price
6. Set status
7. Click **Create**

### Service Inquiries
**Location**: Services → Inquiries

Track service inquiries.

**Features**:
- View all inquiries
- Filter by status
- View details
- Update status

---

## 💼 Business Management

### Testimonials
**Location**: Business → Testimonials

Manage customer testimonials.

**Features**:
- Customer name and company
- Photo upload
- Star rating (1-5)
- Testimonial message
- Optional video URL
- Status management

**Creating a Testimonial**:
1. Click **Add Testimonial**
2. Enter customer details
3. Upload photo
4. Select star rating
5. Enter testimonial message
6. Add video URL (optional)
7. Set status
8. Click **Create**

### Team Members
**Location**: Business → Team

Manage team member profiles.

**Features**:
- Name and role
- Photo upload
- Bio/description
- Social links repeater
- Status management

**Creating a Team Member**:
1. Click **Add Member**
2. Enter name and role
3. Upload photo
4. Add bio
5. Add social links (repeater)
   - Platform: Twitter, LinkedIn, GitHub, Facebook
   - URL: Profile URL
6. Set status
7. Click **Create**

### Clients/Portfolio
**Location**: Business → Clients

Showcase client logos and projects.

**Features**:
- Client name
- Logo upload
- Website URL
- Description
- Category
- Project URL
- Sort order

### FAQs
**Location**: Business → FAQs

Manage frequently asked questions.

**Features**:
- Question and answer
- Category grouping
- Sort order
- Status management
- Accordion display

**Creating an FAQ**:
1. Click **Add FAQ**
2. Enter question
3. Enter answer
4. Set category
5. Set sort order
6. Set status
7. Click **Create**

### Contact Messages
**Location**: Business → Messages

View contact form submissions.

**Features**:
- View all messages
- Filter by status
- View message details
- Mark as read/replied
- Reply via email

**Message Workflow**:
1. **New**: Unread message
2. **Read**: Message viewed
3. **Replied**: Response sent
4. **Closed**: Conversation complete

### Newsletter Subscribers
**Location**: Business → Newsletter

Manage newsletter subscriptions.

**Features**:
- View all subscribers
- Export to CSV
- Total count
- Verified count

**Exporting**:
- Click **Export CSV**
- Downloads subscriber list
- Includes: Email, Status, Verified, Subscribed Date

---

## 👥 User Management

### Users
**Location**: System → Users

Manage admin users.

**Features**:
- Create/edit users
- Assign roles
- Set status (Active/Inactive/Banned)
- Reset passwords
- View last login

**Creating a User**:
1. Click **Add User**
2. Enter name and email
3. Select role
4. Set initial password
5. Set status
6. Click **Create User**

**Editing a User**:
1. Click edit icon
2. Modify details
3. Change password (optional)
4. Update role/status
5. Click **Update User**

### Roles & Permissions
**Location**: System → Roles

Manage user roles and permissions.

**Features**:
- View all roles
- Permission matrix
- Add new roles
- Assign permissions

**Permission Matrix**:
- Rows: Permissions (view dashboard, manage users, etc.)
- Columns: Roles (Super Admin, Admin, Editor)
- Checkboxes: Grant/revoke permissions

**Default Roles**:
- **Super Admin**: Full access to everything
- **Admin**: Most features except system settings
- **Editor**: Content management only

---

## ⚙️ Settings

### General Settings
**Location**: System → Settings → General

Basic site configuration.

**Fields**:
- Site Name
- Site Tagline
- Contact Email
- Contact Phone
- Address
- Logo upload
- Favicon upload

### Contact Settings
**Location**: System → Settings → Contact

Contact information and map.

**Fields**:
- Email address
- Phone number
- Physical address
- Google Maps embed code
- Working hours

### Social Media
**Location**: System → Settings → Social

Social media profile links.

**Fields**:
- Facebook URL
- Twitter URL
- LinkedIn URL
- YouTube URL
- GitHub URL
- Instagram URL
- WhatsApp number

### SEO Settings
**Location**: System → Settings → SEO

Search engine optimization.

**Fields**:
- Default meta title
- Default meta description
- Google Analytics ID
- Google Search Console verification
- robots.txt editor
- Sitemap generation

### Email Settings
**Location**: System → Settings → Email

SMTP configuration for sending emails.

**Fields**:
- SMTP Host
- SMTP Port (usually 587)
- SMTP Username
- SMTP Password
- From Email
- From Name
- Encryption (TLS/SSL)

**Testing**:
- Click **Test Email** button
- Sends test email to admin
- Verify delivery

### Payment Settings
**Location**: System → Settings → Payment

Payment gateway configuration.

**Stripe**:
- Public Key
- Secret Key
- Webhook Secret

**PayPal**:
- Client ID
- Secret Key
- Sandbox/Live mode

**Bank Transfer**:
- Bank name
- Account number
- Routing number
- Instructions

### Integrations
**Location**: System → Settings → Integrations

Third-party service integrations.

**Google Maps API**:
- API key for maps

**reCAPTCHA**:
- Site key
- Secret key
- Enable/disable on forms

**Live Chat**:
- Provider: Tawk.to / Crisp / WhatsApp
- Widget ID
- Phone number (WhatsApp)

### Appearance
**Location**: System → Settings → Appearance

Visual customization.

**Fields**:
- Primary color
- Footer text
- Announcement bar (enable/disable)
- Announcement text
- Announcement link

---

## 📈 Analytics

### Activity Logs
**Location**: System → Activity Logs

View all system activities.

**Features**:
- Filterable by action type
- Searchable
- User information
- Timestamp
- IP address
- Model and ID affected

**Common Actions**:
- `create` - New record created
- `update` - Record updated
- `delete` - Record deleted
- `login` - User logged in
- `logout` - User logged out

### Dashboard Analytics
**Location**: Dashboard

Real-time statistics and insights.

**Metrics**:
- Page views
- Unique visitors
- Popular products
- Popular blog posts
- Traffic sources
- Conversion funnel

---

## 🔗 URL Management

### Redirects
**Location**: Marketing → Redirects

Manage URL redirects.

**Features**:
- From URL
- To URL
- Status code (301/302)
- Hit counter
- Active/Inactive

**Creating a Redirect**:
1. Click **Add Redirect**
2. Enter from URL (e.g., `/old-page`)
3. Enter to URL (e.g., `/new-page`)
4. Select status code (301 permanent, 302 temporary)
5. Click **Create**

### SEO Manager
**Location**: Marketing → SEO

Manage SEO metadata for all content.

**Features**:
- Per-page meta titles
- Per-page meta descriptions
- Keywords
- Open Graph images
- Canonical URLs

---

## 💾 Backup & Recovery

### Database Backup
**Location**: System → Backup

Backup your database.

**Features**:
- One-click backup
- Download backup file
- Auto-backup via cron

**Manual Backup**:
1. Click **Create Backup**
2. Wait for completion
3. Download `.sql` file
4. Store securely

### File Backup
**Location**: System → Backup

Backup uploaded files.

**Features**:
- Backup uploads folder
- Download ZIP archive
- Auto-backup via cron

**Cron Job Setup**:
```bash
# Daily backup at 2 AM
0 2 * * * php /home/username/cron/backup.php
```

---

## 🎨 UI Customization

### Theme Colors
Edit primary colors in Settings → Appearance

### Logo & Favicon
Upload in Settings → General

### Custom CSS
Add custom styles in Settings → Appearance → Custom CSS

---

## 🔒 Security Best Practices

### Admin Security
1. **Change default password** immediately
2. **Enable 2FA** for all admin accounts
3. **Review user roles** regularly
4. **Monitor activity logs** for suspicious activity
5. **Use strong passwords** (12+ characters, mixed case, numbers, symbols)

### Regular Maintenance
1. **Update software** regularly
2. **Backup database** daily
3. **Review user accounts** monthly
4. **Check activity logs** weekly
5. **Test email delivery** monthly

### Access Control
- **Super Admin**: Full system access
- **Admin**: Most features, no system settings
- **Editor**: Content management only
- Create custom roles for specific needs

---

## 📞 Support & Help

### Getting Help
1. Check this guide first
2. Review DEVELOPER_GUIDE.md for technical details
3. Contact support: info@khybersoft.com

### Common Issues

**Can't login?**
- Check credentials
- Clear browser cache
- Try incognito mode
- Reset password via email

**Emails not sending?**
- Check SMTP settings
- Test email configuration
- Verify email templates
- Check spam folder

**Images not uploading?**
- Check file permissions (755)
- Verify upload size limits
- Check disk space
- Review error logs

**Slow performance?**
- Enable caching
- Optimize images
- Check database queries
- Review server resources

---

## 🎓 Training Resources

### Video Tutorials
Available at: `/tutorials`

### Documentation
- README.md - Project overview
- INSTALL.md - Installation guide
- DEVELOPER_GUIDE.md - Technical documentation
- API.md - API documentation

### Support
- Email: info@khybersoft.com
- Website: https://khybersoft.com

---

## ✅ Admin Checklist

### Daily Tasks
- [ ] Check new inquiries
- [ ] Review contact messages
- [ ] Moderate blog comments
- [ ] Monitor activity logs

### Weekly Tasks
- [ ] Review analytics
- [ ] Check for spam comments
- [ ] Update content if needed
- [ ] Backup database

### Monthly Tasks
- [ ] Review user accounts
- [ ] Update software
- [ ] Check security logs
- [ ] Review SEO performance
- [ ] Test all features

---

**Happy Managing!** 🎉

For technical questions, see DEVELOPER_GUIDE.md
For installation issues, see INSTALL.md
For API integration, see API.md
