# Khybersoft Deployment Guide

## 📋 Pre-Deployment Checklist

### Requirements Verification
- [ ] PHP 8.2+ installed
- [ ] MySQL 8.0+ available
- [ ] Apache with mod_rewrite enabled
- [ ] Required PHP extensions loaded (pdo_mysql, gd, mbstring, openssl, curl, zip, json, fileinfo)
- [ ] SSL certificate installed (recommended)
- [ ] Sufficient disk space (minimum 500MB)
- [ ] Cron job access available

### File Preparation
- [ ] All files uploaded to server
- [ ] Directory structure correct
- [ ] File permissions set correctly
- [ ] .env.example copied to .env
- [ ] Database credentials configured

---

## 🚀 cPanel Deployment Steps

### Step 1: Create Database
1. Log in to cPanel
2. Go to **MySQL Databases**
3. Create database: `khybersoft_db`
4. Create user with strong password
5. Add user to database with **ALL PRIVILEGES**
6. Note credentials for installation

### Step 2: Upload Files
**Option A: File Manager**
1. Go to **File Manager**
2. Navigate to `public_html/`
3. Upload project ZIP
4. Extract archive
5. Verify folder structure

**Option B: FTP**
```bash
Host: yourdomain.com
User: cPanel username
Pass: cPanel password
Port: 21

Upload to: /home/username/public_html/
```

### Step 3: Set Permissions
```bash
# Directories (755)
chmod 755 storage/
chmod 755 storage/logs/
chmod 755 storage/cache/
chmod 755 storage/backups/
chmod 755 public_html/uploads/

# Files (644)
chmod 644 .env
find . -type f -exec chmod 644 {} \;
find . -type d -exec chmod 755 {} \;
```

### Step 4: Configure Domain
1. Go to **Domains** in cPanel
2. Select your domain
3. Set **Document Root** to: `public_html/public_html`
4. Enable **Force HTTPS Redirect** (if SSL available)

### Step 5: Install SSL Certificate
1. Go to **SSL/TLS Status**
2. Select your domain
3. Click **Run AutoSSL**
4. Wait for certificate installation (5-30 minutes)
5. Verify HTTPS works

### Step 6: Run Installation Wizard
1. Visit: `https://yourdomain.com/install/`
2. Follow 6-step wizard:
   - Step 1: Requirements check
   - Step 2: Database configuration
   - Step 3: Import schema
   - Step 4: Create .env file
   - Step 5: Create admin account
   - Step 6: Complete installation
3. Installer auto-deletes after completion

### Step 7: Configure Cron Jobs
1. Go to **Cron Jobs** in cPanel
2. Add these jobs:

**Email Queue** (every 5 minutes):
```bash
*/5 * * * * php /home/username/cron/email_queue.php
```

**Daily Backup** (2 AM daily):
```bash
0 2 * * * php /home/username/cron/backup.php
```

**Scheduled Posts** (every 5 minutes):
```bash
*/5 * * * * php /home/username/cron/scheduled_posts.php
```

**Sitemap Generation** (3 AM daily):
```bash
0 3 * * * php /home/username/cron/sitemap.php
```

**Newsletter Sending** (every 6 hours):
```bash
0 */6 * * * php /home/username/cron/newsletter.php
```

### Step 8: Post-Installation Configuration
1. Log in to admin: `https://yourdomain.com/admin`
2. Configure site settings:
   - General settings (name, tagline, contact info)
   - Email settings (SMTP configuration)
   - Social media links
   - Payment gateways (if needed)
   - Live chat integration (if needed)
3. Test all features
4. Customize content

---

## 🔒 Security Hardening

### File Permissions
```bash
# Verify permissions
ls -la storage/
ls -la public_html/uploads/

# Should show:
# drwxr-xr-x (755) for directories
# -rw-r--r-- (644) for files
```

### .htaccess Protection
Verify these are blocked:
- `/app/` directory
- `/storage/` directory
- `/.env` file
- `/install/` folder (should be deleted)

### Admin Security
- [ ] Change default admin password
- [ ] Enable 2FA for admin accounts
- [ ] Review user roles and permissions
- [ ] Set strong session timeout
- [ ] Enable login rate limiting

### Database Security
- [ ] Use strong database password
- [ ] Limit database user privileges
- [ ] Regular database backups
- [ ] Monitor for suspicious queries

### SSL/HTTPS
- [ ] Force HTTPS redirect
- [ ] Valid SSL certificate
- [ ] HSTS header enabled
- [ ] Secure cookies flag

---

## ⚡ Performance Optimization

### PHP Configuration
Edit `php.ini` (or use cPanel PHP Config):
```ini
memory_limit = 256M
upload_max_filesize = 20M
post_max_size = 25M
max_execution_time = 60
max_input_time = 60
```

### Enable OPcache
```ini
opcache.enable=1
opcache.memory_consumption=128
opcache.interned_strings_buffer=8
opcache.max_accelerated_files=10000
opcache.revalidate_freq=2
```

### Database Optimization
```sql
-- Run periodically
OPTIMIZE TABLE products;
OPTIMIZE TABLE blog_posts;
OPTIMIZE TABLE page_views;
```

### Caching Strategy
1. **File Cache**: Enabled by default
2. **Browser Cache**: Configured in .htaccess
3. **CDN**: Recommended for static assets
4. **OPcache**: Enable in PHP settings

### Image Optimization
- Images auto-resized on upload
- Use WebP format when possible
- Lazy loading enabled
- CDN for images (recommended)

---

## 📊 Monitoring & Maintenance

### Daily Tasks
- [ ] Check error logs: `storage/logs/error.log`
- [ ] Review activity logs in admin
- [ ] Monitor disk space usage
- [ ] Check cron job execution

### Weekly Tasks
- [ ] Review analytics dashboard
- [ ] Check for failed emails
- [ ] Verify backups are running
- [ ] Update content as needed

### Monthly Tasks
- [ ] Review user accounts
- [ ] Check security logs
- [ ] Update software (if updates available)
- [ ] Test all features
- [ ] Review and optimize database
- [ ] Clean up old backups

### Backup Strategy
1. **Database**: Daily automatic backup
2. **Files**: Daily automatic backup
3. **Off-site**: Weekly manual download
4. **Retention**: 30 days automatic cleanup

---

## 🔄 Updating Khybersoft

### Update Process
1. **Backup First**:
   ```bash
   # Database backup
   mysqldump -u user -p database_name > backup_$(date +%Y%m%d).sql
   
   # File backup
   tar -czf files_backup_$(date +%Y%m%d).tar.gz public_html/ app/ routes/
   ```

2. **Upload New Files**:
   - Upload updated files via FTP/File Manager
   - Overwrite existing files
   - Don't overwrite `.env` file

3. **Run Migrations** (if any):
   ```bash
   php artisan migrate
   ```

4. **Clear Cache**:
   ```bash
   rm -rf storage/cache/*
   ```

5. **Test Thoroughly**:
   - Test all admin features
   - Test all frontend pages
   - Check error logs
   - Verify cron jobs

### Update Checklist
- [ ] Backup database
- [ ] Backup files
- [ ] Upload new files
- [ ] Run migrations (if needed)
- [ ] Clear cache
- [ ] Test all features
- [ ] Check error logs
- [ ] Verify cron jobs
- [ ] Update documentation

---

## 🐛 Troubleshooting

### Common Issues

#### 500 Internal Server Error
**Causes:**
- PHP errors
- Permission issues
- .htaccess problems

**Solutions:**
```bash
# Check error log
tail -f storage/logs/error.log

# Check permissions
chmod 755 storage/
chmod 755 public_html/uploads/

# Check .htaccess
# Ensure mod_rewrite is enabled
```

#### Database Connection Error
**Causes:**
- Wrong credentials
- Database doesn't exist
- User lacks privileges

**Solutions:**
- Verify credentials in `.env`
- Check database exists
- Verify user has ALL PRIVILEGES

#### Images Not Uploading
**Causes:**
- Permission issues
- PHP upload limits
- Disk space full

**Solutions:**
```bash
# Check permissions
chmod 755 public_html/uploads/

# Check PHP limits
# upload_max_filesize = 20M
# post_max_size = 25M

# Check disk space
df -h
```

#### Emails Not Sending
**Causes:**
- SMTP not configured
- Wrong credentials
- Port blocked

**Solutions:**
- Configure SMTP in admin settings
- Test SMTP connection
- Check email logs
- Verify port is open (587 for TLS)

#### Cron Jobs Not Running
**Causes:**
- Wrong path
- PHP path issue
- Permission denied

**Solutions:**
```bash
# Test manually
php /home/username/cron/email_queue.php

# Check PHP path
which php

# Check cron logs
grep CRON /var/log/syslog
```

#### Slow Performance
**Causes:**
- No caching
- Large images
- Database not optimized
- Too many queries

**Solutions:**
- Enable OPcache
- Optimize images
- Run OPTIMIZE TABLE
- Enable file caching
- Use CDN for static assets

---

## 📞 Support Resources

### Documentation
- **README.md** - Project overview
- **INSTALL.md** - Installation guide
- **ADMIN_GUIDE.md** - Admin panel guide
- **DEVELOPER_GUIDE.md** - Developer documentation
- **API.md** - API documentation
- **CHANGELOG.md** - Version history

### Getting Help
1. Check documentation first
2. Review error logs
3. Search for similar issues
4. Contact support: support@khybersoft.com

### Reporting Issues
When reporting bugs, include:
- PHP version
- MySQL version
- Error message
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)

---

## ✅ Final Deployment Checklist

### Pre-Launch
- [ ] All pages tested
- [ ] All forms working
- [ ] Email sending verified
- [ ] Payment processing tested (if applicable)
- [ ] Mobile responsiveness checked
- [ ] Cross-browser testing done
- [ ] Speed test performed
- [ ] Security scan completed

### Launch Day
- [ ] Final backup created
- [ ] DNS propagated
- [ ] SSL certificate active
- [ ] Cron jobs running
- [ ] Error monitoring enabled
- [ ] Admin access verified
- [ ] Contact forms tested
- [ ] Search functionality tested

### Post-Launch
- [ ] Monitor error logs
- [ ] Check analytics
- [ ] Verify backups
- [ ] Test all features
- [ ] Gather user feedback
- [ ] Plan next updates

---

## 🎉 Deployment Complete!

Your Khybersoft website is now live and ready to use!

### Quick Links
- **Admin Panel**: `https://yourdomain.com/admin`
- **Homepage**: `https://yourdomain.com/`
- **Products**: `https://yourdomain.com/products`
- **Blog**: `https://yourdomain.com/blog`
- **Contact**: `https://yourdomain.com/contact`

### Next Steps
1. Customize your content
2. Add your products
3. Configure payment gateways
4. Set up email marketing
5. Monitor analytics
6. Plan regular updates

---

**Congratulations on launching Khybersoft!** 🚀

For ongoing support, contact: support@khybersoft.com
