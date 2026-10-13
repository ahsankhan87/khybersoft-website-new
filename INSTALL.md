# Khybersoft Installation Guide

## 📋 Prerequisites

Before installing Khybersoft, ensure your hosting meets these requirements:

### Server Requirements
- **PHP**: 8.2 or higher
- **MySQL**: 8.0 or higher
- **Web Server**: Apache with mod_rewrite enabled
- **SSL**: HTTPS recommended (AutoSSL available in cPanel)

### Required PHP Extensions
- `pdo_mysql` - Database connectivity
- `gd` - Image processing
- `mbstring` - Multi-byte string support
- `openssl` - Encryption
- `curl` - HTTP requests
- `zip` - File compression
- `json` - JSON handling
- `fileinfo` - File type detection

### File Permissions
- Directories: `755`
- Files: `644`
- `storage/` directory: `755` (writable)
- `public_html/uploads/`: `755` (writable)

---

## 🚀 Installation Steps

### Step 1: Prepare cPanel

#### 1.1 Create Database
1. Log in to cPanel
2. Navigate to **Databases** → **MySQL Databases**
3. **Create Database**:
   - Database Name: `khybersoft_db` (or your preferred name)
   - Click **Create Database**
4. **Create User**:
   - Username: `khybersoft_user` (or your preferred name)
   - Password: Generate a strong password (save it!)
   - Click **Create User**
5. **Add User to Database**:
   - Select the user and database
   - Click **Add**
   - Grant **ALL PRIVILEGES**

#### 1.2 Note Credentials
Save these credentials (you'll need them during installation):
- Database Host: `localhost` (usually)
- Database Name: `khybersoft_db`
- Database User: `khybersoft_user`
- Database Password: `your_password`

---

### Step 2: Upload Files

#### 2.1 Via File Manager
1. Go to **File Manager** in cPanel
2. Navigate to `public_html/`
3. **Upload Files**:
   - Upload the entire project ZIP file
   - Extract the archive
   - Ensure folder structure is correct:
     ```
     public_html/
     ├── app/
     ├── public_html/
     ├── routes/
     ├── storage/
     ├── install/
     └── .env.example
     ```

#### 2.2 Via FTP (Alternative)
```bash
# Connect via FTP
Host: yourdomain.com
User: your cPanel username
Pass: your cPanel password

# Upload to /home/username/public_html/
```

#### 2.3 Set Permissions
In File Manager, right-click and set permissions:
- `storage/` → **755** (recursive)
- `public_html/uploads/` → **755** (recursive)
- All other directories → **755**
- All files → **644**

---

### Step 3: Configure Domain

#### 3.1 Set Document Root
1. Go to **Domains** in cPanel
2. Find your domain
3. Click **Manage**
4. Set **Document Root** to: `public_html/public_html`
5. Save changes

#### 3.2 Enable SSL (Recommended)
1. Go to **Security** → **SSL/TLS Status**
2. Select your domain
3. Click **Run AutoSSL**
4. Wait for certificate installation (usually 5-30 minutes)

---

### Step 4: Run Installation Wizard

#### 4.1 Access Installer
Visit: `https://yourdomain.com/install/`

#### 4.2 Step 1: Requirements Check
- The installer will check all requirements automatically
- All items should show green checkmarks ✓
- If any fail, fix them before continuing

**Common Issues:**
- Missing PHP extensions → Contact hosting support
- Directory not writable → Set permissions to 755
- PHP version too old → Upgrade PHP in cPanel

#### 4.3 Step 2: Database Configuration
Enter your database credentials:
- **Database Host**: `localhost`
- **Database Name**: `khybersoft_db`
- **Database User**: `khybersoft_user`
- **Database Password**: `your_password`

Click **Test Connection & Continue**

#### 4.4 Step 3: Import Schema
- Click **Import Schema & Seed Data**
- This creates all tables and imports sample data
- Wait for completion message

#### 4.5 Step 4: Create .env File
- Click **Create .env File**
- This generates your configuration file
- The installer creates `.env` with your database credentials

#### 4.6 Step 5: Create Admin Account
Enter your admin details:
- **Admin Name**: Your name
- **Admin Email**: `admin@yourdomain.com`
- **Password**: Strong password (min 8 characters)

Click **Create Admin Account**

#### 4.7 Step 6: Complete
- Installation is complete!
- Click **Go to Admin Panel & Delete Installer**
- The installer folder will be automatically deleted

---

### Step 5: Post-Installation Configuration

#### 5.1 Configure Email (SMTP)
1. Log in to admin: `https://yourdomain.com/admin`
2. Go to **Settings** → **Email**
3. Configure SMTP settings:
   ```
   SMTP Host: smtp.yourdomain.com
   SMTP Port: 587
   SMTP User: your email
   SMTP Pass: your password
   From Email: noreply@yourdomain.com
   ```
4. Save settings

#### 5.2 Configure Site Settings
1. Go to **Settings** → **General**
2. Update:
   - Site Name
   - Site Tagline
   - Contact Email
   - Contact Phone
   - Address
3. Save settings

#### 5.3 Set Up Cron Jobs
1. Go to cPanel → **Cron Jobs**
2. Add these cron jobs:

**Email Queue Processor** (every 5 minutes):
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

#### 5.4 Configure Payment (Optional)
If you want to accept payments:

**Stripe:**
1. Go to **Settings** → **Payment**
2. Enter Stripe keys from your Stripe dashboard
3. Set up webhook endpoint: `https://yourdomain.com/api/webhooks/stripe`

**PayPal:**
1. Enter PayPal Client ID and Secret
2. Configure webhook in PayPal dashboard

#### 5.5 Set Up Live Chat (Optional)
1. Go to **Settings** → **Integrations**
2. Choose provider:
   - **Tawk.to**: Enter widget ID
   - **Crisp**: Enter website ID
   - **WhatsApp**: Enter phone number

---

## 🔒 Security Checklist

After installation, verify these security measures:

### File Permissions
```bash
# Check permissions
ls -la storage/
ls -la public_html/uploads/

# Should be:
# drwxr-xr-x (755) for directories
# -rw-r--r-- (644) for files
```

### .htaccess Protection
Verify these are blocked:
- `/app/` directory
- `/storage/` directory
- `/.env` file
- `/install/` folder (should be deleted)

### Admin Access
- Change default admin password immediately
- Enable 2FA for admin accounts
- Review user roles and permissions

### SSL/HTTPS
- Ensure site loads over HTTPS
- Force HTTPS redirect in `.htaccess`
- Check SSL certificate validity

---

## 🐛 Troubleshooting

### Issue: "Database connection failed"
**Solution:**
- Verify database credentials in `.env`
- Check database user has ALL PRIVILEGES
- Ensure database host is correct (usually `localhost`)

### Issue: "Permission denied" errors
**Solution:**
```bash
# Set correct permissions
chmod -R 755 storage/
chmod -R 755 public_html/uploads/
```

### Issue: "Page not found" (404)
**Solution:**
- Check `.htaccess` file exists in `public_html/`
- Verify mod_rewrite is enabled in Apache
- Check document root is set correctly

### Issue: Images not uploading
**Solution:**
- Check `uploads/` directory permissions (755)
- Verify PHP upload limits in `php.ini`:
  ```
  upload_max_filesize = 20M
  post_max_size = 25M
  ```

### Issue: Emails not sending
**Solution:**
- Configure SMTP settings in admin
- Test SMTP connection
- Check spam folder
- Verify email templates exist

### Issue: Cron jobs not running
**Solution:**
- Verify cron job syntax in cPanel
- Check PHP path: `which php`
- Test manually: `php /home/username/cron/email_queue.php`
- Check cron logs in cPanel

### Issue: Slow performance
**Solution:**
- Enable OPcache in PHP settings
- Use CDN for static assets
- Optimize images before upload
- Enable browser caching (already configured)

---

## 📧 Email Configuration

### Using cPanel Email
1. Create email account in cPanel → **Email Accounts**
2. Use these SMTP settings:
   ```
   Host: mail.yourdomain.com
   Port: 587 (TLS) or 465 (SSL)
   Username: full email address
   Password: email password
   ```

### Using External SMTP (Gmail, SendGrid, etc.)
**Gmail:**
```
Host: smtp.gmail.com
Port: 587
Username: your-email@gmail.com
Password: App-specific password (not regular password)
```

**SendGrid:**
```
Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: your-sendgrid-api-key
```

---

## 🔄 Updating Khybersoft

### Manual Update
1. Backup database and files
2. Upload new files (overwrite existing)
3. Run database migrations (if any)
4. Clear cache: Delete `storage/cache/*`
5. Test thoroughly

### Update Checklist
- [ ] Backup database
- [ ] Backup files
- [ ] Upload new files
- [ ] Run migrations
- [ ] Clear cache
- [ ] Test all features
- [ ] Check error logs

---

## 📞 Support

If you encounter issues during installation:

1. **Check Documentation**: Review this guide thoroughly
2. **Check Error Logs**: `storage/logs/error.log`
3. **Contact Hosting**: For server-related issues
4. **Email Support**: info@khybersoft.com

---

## ✅ Installation Complete!

Congratulations! Khybersoft is now installed and ready to use.

### Next Steps:
1. Log in to admin panel: `https://yourdomain.com/admin`
2. Customize site settings
3. Add your products and content
4. Configure email and payment settings
5. Set up cron jobs
6. Test all features

### Quick Links:
- Admin Panel: `/admin`
- Homepage: `/`
- Products: `/products`
- Blog: `/blog`
- Contact: `/contact`

---

**Need Help?**
- Documentation: Check `/ADMIN_GUIDE.md` and `/DEVELOPER_GUIDE.md`
- Support: info@khybersoft.com
- Website: https://khybersoft.com
