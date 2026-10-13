-- Khybersoft Seed Data
-- Sample data for initial installation

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- ROLES & PERMISSIONS
-- ============================================

INSERT INTO `roles` (`name`, `slug`, `description`) VALUES
('Super Admin', 'super_admin', 'Full system access'),
('Admin', 'admin', 'Administrative access'),
('Editor', 'editor', 'Content management access');

INSERT INTO `permissions` (`name`, `slug`, `group`) VALUES
('View Dashboard', 'view_dashboard', 'dashboard'),
('Manage Users', 'manage_users', 'users'),
('Manage Roles', 'manage_roles', 'users'),
('Manage Pages', 'manage_pages', 'content'),
('Manage Blog', 'manage_blog', 'content'),
('Manage Products', 'manage_products', 'products'),
('Manage Services', 'manage_services', 'services'),
('Manage Settings', 'manage_settings', 'system'),
('Manage Media', 'manage_media', 'system'),
('View Reports', 'view_reports', 'reports');

INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8), (1, 9), (1, 10),
(2, 1), (2, 2), (2, 4), (2, 5), (2, 6), (2, 7), (2, 9), (2, 10),
(3, 1), (3, 4), (3, 5), (3, 9);

-- ============================================
-- DEFAULT ADMIN USER
-- ============================================

INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role_id`, `status`, `created_at`) VALUES
(1, 'Admin', 'admin@khybersoft.com', '$2y$12$LQv3c1yqBo9NvXq7ZqQ8Q.QQ8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8', 1, 'active', NOW());

-- ============================================
-- SETTINGS
-- ============================================

INSERT INTO `settings` (`key`, `value`, `type`, `group`, `label`, `description`, `is_public`) VALUES
('site_name', 'Khybersoft', 'string', 'general', 'Site Name', 'The name of your website', 1),
('site_tagline', 'Innovative Software Solutions', 'string', 'general', 'Site Tagline', 'Brief description of your site', 1),
('site_email', 'info@khybersoft.com', 'string', 'general', 'Contact Email', 'Main contact email', 1),
('site_phone', '+1-234-567-8900', 'string', 'general', 'Contact Phone', 'Main contact phone', 1),
('site_address', '123 Tech Street, Digital City', 'string', 'general', 'Address', 'Business address', 1),
('maintenance_mode', '0', 'boolean', 'system', 'Maintenance Mode', 'Enable maintenance mode', 0),
('items_per_page', '20', 'integer', 'system', 'Items Per Page', 'Default pagination', 0),
('allow_registration', '0', 'boolean', 'auth', 'Allow Registration', 'Allow public registration', 0),
('smtp_host', '', 'string', 'mail', 'SMTP Host', 'SMTP server host', 0),
('smtp_port', '587', 'integer', 'mail', 'SMTP Port', 'SMTP server port', 0),
('smtp_user', '', 'string', 'mail', 'SMTP Username', 'SMTP username', 0),
('smtp_pass', '', 'string', 'mail', 'SMTP Password', 'SMTP password', 0),
('smtp_from', 'noreply@khybersoft.com', 'string', 'mail', 'From Email', 'Email sender address', 0),
('stripe_public_key', '', 'string', 'payment', 'Stripe Public Key', 'Stripe publishable key', 0),
('stripe_secret_key', '', 'string', 'payment', 'Stripe Secret Key', 'Stripe secret key', 0),
('paypal_client_id', '', 'string', 'payment', 'PayPal Client ID', 'PayPal client ID', 0),
('paypal_secret', '', 'string', 'payment', 'PayPal Secret', 'PayPal secret key', 0),
('recaptcha_site_key', '', 'string', 'integrations', 'reCAPTCHA Site Key', 'Google reCAPTCHA site key', 0),
('recaptcha_secret_key', '', 'string', 'integrations', 'reCAPTCHA Secret Key', 'Google reCAPTCHA secret key', 0),
('google_maps_api', '', 'string', 'integrations', 'Google Maps API Key', 'Google Maps API key', 0),
('whatsapp_number', '', 'string', 'integrations', 'WhatsApp Number', 'WhatsApp contact number', 1),
('chat_provider', '', 'string', 'integrations', 'Chat Provider', 'Live chat provider (tawk/crisp)', 0),
('chat_widget_id', '', 'string', 'integrations', 'Chat Widget ID', 'Live chat widget ID', 0),
('announcement_enabled', '0', 'boolean', 'appearance', 'Announcement Bar', 'Show announcement bar', 1),
('announcement_text', '', 'string', 'appearance', 'Announcement Text', 'Announcement bar text', 1),
('announcement_link', '', 'string', 'appearance', 'Announcement Link', 'Announcement bar link', 1),
('social_facebook', '', 'string', 'social', 'Facebook URL', 'Facebook page URL', 1),
('social_twitter', '', 'string', 'social', 'Twitter URL', 'Twitter profile URL', 1),
('social_linkedin', '', 'string', 'social', 'LinkedIn URL', 'LinkedIn company URL', 1),
('social_youtube', '', 'string', 'social', 'YouTube URL', 'YouTube channel URL', 1),
('social_github', '', 'string', 'social', 'GitHub URL', 'GitHub profile URL', 1),
('social_instagram', '', 'string', 'social', 'Instagram URL', 'Instagram profile URL', 1);

-- ============================================
-- PRODUCT CATEGORIES
-- ============================================

INSERT INTO `product_categories` (`name`, `slug`, `icon`, `description`, `sort_order`) VALUES
('Business Management', 'business-management', '💼', 'Complete business management solutions', 1),
('Education', 'education', '🎓', 'Educational and learning management systems', 2),
('Real Estate', 'real-estate', '🏢', 'Property and real estate management', 3),
('Retail & POS', 'retail-pos', '🛒', 'Point of sale and retail solutions', 4),
('Human Resources', 'human-resources', '👥', 'HR and workforce management', 5),
('Finance & Accounting', 'finance-accounting', '💰', 'Financial management and accounting', 6);

-- ============================================
-- SAMPLE PRODUCTS
-- ============================================

INSERT INTO `products` (`category_id`, `name`, `slug`, `tagline`, `short_desc`, `full_desc`, `price_type`, `price`, `price_currency`, `billing_cycle`, `is_featured`, `status`, `sort_order`, `meta_title`, `meta_desc`, `created_at`) VALUES
(1, 'POS System Pro', 'pos-system-pro', 'Complete Point of Sale Solution', 'Modern, fast, and reliable POS system for retail businesses. Manage sales, inventory, and customers with ease.', '<h2>Transform Your Retail Business</h2><p>POS System Pro is a comprehensive point of sale solution designed for modern retail businesses. With intuitive interface and powerful features, you can manage sales, inventory, customers, and reports all in one place.</p><h3>Key Features</h3><ul><li>Fast checkout with barcode scanning</li><li>Real-time inventory management</li><li>Customer loyalty programs</li><li>Sales reports and analytics</li><li>Multi-store support</li><li>Offline mode capability</li></ul>', 'subscription', 49.99, 'USD', 'monthly', 1, 'published', 1, 'POS System Pro - Complete Retail Solution', 'Modern POS system for retail businesses with inventory management and reporting', NOW()),
(6, 'Accounting Software', 'accounting-software', 'Smart Accounting for Small Business', 'Simplify your bookkeeping with intelligent accounting software. Invoicing, expenses, tax reports, and more.', '<h2>Smart Accounting Made Simple</h2><p>Take control of your finances with our intelligent accounting software. Designed for small businesses and freelancers, it makes bookkeeping effortless.</p><h3>Features</h3><ul><li>Professional invoicing</li><li>Expense tracking</li><li>Bank reconciliation</li><li>Tax reports</li><li>Financial statements</li><li>Multi-currency support</li></ul>', 'subscription', 29.99, 'USD', 'monthly', 1, 'published', 2, 'Accounting Software for Small Business', 'Intelligent accounting software with invoicing and tax reporting', NOW()),
(2, 'School Management System', 'school-management-system', 'Complete School ERP', 'All-in-one school management system. Student records, attendance, grades, fees, and communication.', '<h2>Complete School Management</h2><p>Streamline your school operations with our comprehensive management system. From admissions to graduation, manage every aspect of your educational institution.</p><h3>Modules</h3><ul><li>Student information system</li><li>Attendance tracking</li><li>Grade management</li><li>Fee collection</li><li>Parent portal</li><li>Teacher dashboard</li></ul>', 'subscription', 99.99, 'USD', 'monthly', 1, 'published', 3, 'School Management System - Complete ERP', 'Comprehensive school management with student records and fee collection', NOW()),
(3, 'Plot Management System', 'plot-management-system', 'Real Estate Made Easy', 'Manage plots, properties, and clients efficiently. Track availability, bookings, and payments.', '<h2>Real Estate Management Simplified</h2><p>Efficiently manage your real estate portfolio with our specialized plot management system. Track properties, clients, and transactions in one place.</p><h3>Features</h3><ul><li>Plot inventory management</li><li>Client database</li><li>Booking system</li><li>Payment tracking</li><li>Document management</li><li>Commission calculator</li></ul>', 'one_time', 499.00, 'USD', 'lifetime', 0, 'published', 4, 'Plot Management System for Real Estate', 'Real estate management system for plots and properties', NOW()),
(1, 'Inventory Management', 'inventory-management', 'Track Everything, Miss Nothing', 'Real-time inventory tracking across multiple locations. Barcode support, stock alerts, and reporting.', '<h2>Complete Inventory Control</h2><p>Never run out of stock again with our intelligent inventory management system. Track products across multiple locations with real-time updates.</p><h3>Capabilities</h3><ul><li>Multi-location inventory</li><li>Barcode scanning</li><li>Stock level alerts</li><li>Purchase orders</li><li>Supplier management</li><li>Inventory reports</li></ul>', 'subscription', 39.99, 'USD', 'monthly', 0, 'published', 5, 'Inventory Management System', 'Real-time inventory tracking with barcode support', NOW()),
(5, 'HRM System', 'hrm-system', 'Human Resource Management', 'Complete HR solution. Employee management, payroll, leave tracking, performance reviews, and more.', '<h2>Complete HR Solution</h2><p>Manage your most valuable asset - your people. Our HRM system handles everything from recruitment to retirement.</p><h3>HR Modules</h3><ul><li>Employee database</li><li>Payroll management</li><li>Leave tracking</li><li>Performance reviews</li><li>Recruitment portal</li><li>Document management</li></ul>', 'subscription', 79.99, 'USD', 'monthly', 1, 'published', 6, 'HRM System - Complete HR Solution', 'Human resource management with payroll and performance tracking', NOW());

-- ============================================
-- PRODUCT FEATURES
-- ============================================

INSERT INTO `product_features` (`product_id`, `title`, `description`, `icon`, `sort_order`) VALUES
(1, 'Fast Checkout', 'Quick and efficient checkout process with barcode scanning', '⚡', 1),
(1, 'Inventory Tracking', 'Real-time inventory management across multiple locations', '📦', 2),
(1, 'Sales Reports', 'Comprehensive sales analytics and reporting', '📊', 3),
(1, 'Customer Management', 'Complete customer database with purchase history', '👥', 4),
(2, 'Professional Invoicing', 'Create and send professional invoices in seconds', '📄', 1),
(2, 'Expense Tracking', 'Track and categorize all business expenses', '💸', 2),
(2, 'Tax Reports', 'Automatic tax calculations and reports', '🧾', 3),
(3, 'Student Records', 'Complete student information management', '🎓', 1),
(3, 'Attendance System', 'Digital attendance tracking with reports', '✓', 2),
(3, 'Fee Management', 'Automated fee collection and reminders', '💰', 3),
(4, 'Plot Inventory', 'Manage all plots and properties in one place', '🗺️', 1),
(4, 'Client Database', 'Complete client information and history', '👤', 2),
(5, 'Multi-Location', 'Track inventory across multiple warehouses', '🏢', 1),
(5, 'Barcode Support', 'Scan and manage products with barcodes', '📱', 2),
(6, 'Employee Database', 'Complete employee information management', '👥', 1),
(6, 'Payroll System', 'Automated payroll calculations and processing', '💵', 2);

-- ============================================
-- PRODUCT PLANS
-- ============================================

INSERT INTO `product_plans` (`product_id`, `name`, `price`, `billing_cycle`, `features`, `is_popular`, `sort_order`) VALUES
(1, 'Starter', 29.99, 'monthly', '["Up to 1,000 transactions/month", "1 register", "Basic reports", "Email support"]', 0, 1),
(1, 'Professional', 49.99, 'monthly', '["Unlimited transactions", "5 registers", "Advanced reports", "Priority support", "Multi-store"]', 1, 2),
(1, 'Enterprise', 99.99, 'monthly', '["Everything in Professional", "Unlimited registers", "API access", "Dedicated support", "Custom features"]', 0, 3),
(2, 'Freelancer', 19.99, 'monthly', '["Up to 50 invoices/month", "Expense tracking", "Basic reports", "Email support"]', 0, 1),
(2, 'Business', 29.99, 'monthly', '["Unlimited invoices", "Advanced reports", "Bank reconciliation", "Priority support"]', 1, 2),
(3, 'Basic', 79.99, 'monthly', '["Up to 500 students", "Core modules", "Email support"]', 0, 1),
(3, 'Standard', 99.99, 'monthly', '["Up to 2,000 students", "All modules", "Parent portal", "Priority support"]', 1, 2),
(6, 'Startup', 59.99, 'monthly', '["Up to 50 employees", "Core HR features", "Email support"]', 0, 1),
(6, 'Growth', 79.99, 'monthly', '["Up to 200 employees", "All HR modules", "Payroll", "Priority support"]', 1, 2);

-- ============================================
-- BLOG CATEGORIES
-- ============================================

INSERT INTO `blog_categories` (`name`, `slug`, `description`, `sort_order`) VALUES
('Product Updates', 'product-updates', 'Latest product features and updates', 1),
('Business Tips', 'business-tips', 'Tips and advice for growing your business', 2),
('Tutorials', 'tutorials', 'How-to guides and tutorials', 3),
('Industry News', 'industry-news', 'News and trends in the software industry', 4);

-- ============================================
-- BLOG TAGS
-- ============================================

INSERT INTO `blog_tags` (`name`, `slug`) VALUES
('POS', 'pos'),
('Accounting', 'accounting'),
('Small Business', 'small-business'),
('Productivity', 'productivity'),
('Software', 'software'),
('Tips', 'tips'),
('Tutorial', 'tutorial'),
('Features', 'features');

-- ============================================
-- SAMPLE BLOG POSTS
-- ============================================

INSERT INTO `blog_posts` (`title`, `slug`, `excerpt`, `content`, `category_id`, `author_id`, `meta_title`, `meta_desc`, `published_at`, `status`, `created_at`) VALUES
('5 Ways POS Systems Can Boost Your Retail Sales', '5-ways-pos-systems-boost-retail-sales', 'Discover how modern POS systems can increase your retail sales by up to 30% with better inventory management and customer insights.', '<h2>Transform Your Retail Business</h2><p>In today''s competitive retail landscape, having the right technology can make all the difference. A modern POS system isn''t just about processing payments—it''s a powerful tool that can significantly boost your sales.</p><h3>1. Faster Checkout Process</h3><p>Long queues are the number one reason customers abandon purchases. With barcode scanning and quick payment processing, you can reduce checkout time by up to 50%.</p><h3>2. Better Inventory Management</h3><p>Never miss a sale due to stockouts again. Real-time inventory tracking ensures you always have the right products in stock.</p><h3>3. Data-Driven Decisions</h3><p>Make informed decisions with comprehensive sales reports. Identify your best-selling products, peak hours, and customer preferences.</p><h3>4. Customer Loyalty Programs</h3><p>Build customer loyalty with integrated loyalty programs. Reward repeat customers and encourage more frequent purchases.</p><h3>5. Multi-Channel Selling</h3><p>Expand your reach with integrated e-commerce capabilities. Sell online and in-store with synchronized inventory.</p>', 1, 1, '5 Ways POS Systems Boost Retail Sales', 'Learn how modern POS systems can increase retail sales by 30%', NOW(), 'published', NOW()),

('The Complete Guide to Small Business Accounting', 'complete-guide-small-business-accounting', 'Everything you need to know about managing your small business finances, from bookkeeping basics to tax preparation.', '<h2>Master Your Business Finances</h2><p>Good financial management is the backbone of any successful small business. Whether you''re just starting out or looking to improve your existing processes, this guide will help you stay on top of your finances.</p><h3>Understanding Bookkeeping Basics</h3><p>Bookkeeping is the foundation of financial management. Keep track of every transaction, categorize expenses properly, and maintain accurate records.</p><h3>Choosing the Right Accounting Method</h3><p>Decide between cash basis and accrual basis accounting. Each has its advantages depending on your business size and needs.</p><h3>Essential Financial Reports</h3><p>Learn to read and interpret key financial statements: profit and loss, balance sheet, and cash flow statement.</p><h3>Tax Planning and Preparation</h3><p>Stay compliant and maximize deductions with proper tax planning throughout the year.</p>', 2, 1, 'Small Business Accounting Guide', 'Complete guide to managing small business finances', NOW(), 'published', NOW()),

('How to Choose the Right School Management System', 'choose-right-school-management-system', 'A comprehensive guide to selecting the perfect school management system for your educational institution.', '<h2>Find the Perfect Fit for Your School</h2><p>Choosing the right school management system is a critical decision that will impact your institution for years to come. Here''s what you need to consider.</p><h3>Assess Your Needs</h3><p>Start by identifying your specific requirements. Consider class size, number of campuses, and specific features you need.</p><h3>Key Features to Look For</h3><p>Look for comprehensive student management, attendance tracking, grade management, fee collection, and parent communication tools.</p><h3>Ease of Use</h3><p>The system should be intuitive for teachers, administrators, and parents. Complex systems lead to low adoption rates.</p><h3>Integration Capabilities</h3><p>Ensure the system can integrate with your existing tools and can scale as your institution grows.</p><h3>Support and Training</h3><p>Choose a vendor that offers comprehensive training and responsive support.</p>', 3, 1, 'School Management System Selection Guide', 'How to choose the right school management system', NOW(), 'published', NOW());

-- Link tags to posts
INSERT INTO `blog_post_tags` (`post_id`, `tag_id`) VALUES
(1, 1), (1, 5), (1, 6),
(2, 2), (2, 3), (2, 6),
(3, 5), (3, 7);

-- ============================================
-- SAMPLE PAGES
-- ============================================

INSERT INTO `pages` (`title`, `slug`, `content`, `meta_title`, `meta_desc`, `template`, `status`, `sort_order`, `created_at`) VALUES
('About Us', 'about', '<h2>Our Story</h2><p>Founded in 2016, Khybersoft has been at the forefront of software innovation, helping businesses streamline their operations and achieve their goals.</p><h3>Our Mission</h3><p>To empower businesses with innovative, reliable, and scalable software solutions that drive growth and efficiency.</p><h3>Our Vision</h3><p>To be the global leader in business software innovation, recognized for transforming how companies operate through technology.</p><h3>Our Values</h3><ul><li><strong>Innovation:</strong> We constantly push boundaries and embrace new technologies</li><li><strong>Quality:</strong> We deliver excellence in every product and service</li><li><strong>Customer Focus:</strong> Our customers'' success is our success</li><li><strong>Integrity:</strong> We operate with transparency and honesty</li></ul>', 'About Khybersoft - Our Story & Mission', 'Learn about Khybersoft, our mission, vision, and values. Transforming businesses through innovative software solutions since 2016.', 'default', 'published', 1, NOW()),
('Privacy Policy', 'privacy-policy', '<h2>Privacy Policy</h2><p>Last updated: January 2024</p><h3>Information We Collect</h3><p>We collect information you provide directly to us, such as when you create an account, make a purchase, or contact us for support.</p><h3>How We Use Your Information</h3><p>We use the information we collect to provide, maintain, and improve our services, process transactions, and send you technical notices and support messages.</p><h3>Information Sharing</h3><p>We do not share your personal information with third parties except as described in this policy or with your consent.</p><h3>Data Security</h3><p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p><h3>Contact Us</h3><p>If you have questions about this privacy policy, please contact us at privacy@khybersoft.com.</p>', 'Privacy Policy - Khybersoft', 'Read our privacy policy to understand how we collect, use, and protect your personal information.', 'default', 'published', 2, NOW()),
('Terms of Service', 'terms', '<h2>Terms of Service</h2><p>Last updated: January 2024</p><h3>Acceptance of Terms</h3><p>By accessing or using Khybersoft services, you agree to be bound by these terms of service.</p><h3>Use of Services</h3><p>You agree to use our services only for lawful purposes and in accordance with these terms. You must not misuse or interfere with our services.</p><h3>Account Responsibility</h3><p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p><h3>Payment Terms</h3><p>All payments are non-refundable except as required by law or as explicitly stated in our refund policy. Subscription fees are billed in advance.</p><h3>Intellectual Property</h3><p>All content, features, and functionality of our services are owned by Khybersoft and are protected by international copyright, trademark, and other intellectual property laws.</p><h3>Limitation of Liability</h3><p>To the maximum extent permitted by law, Khybersoft shall not be liable for any indirect, incidental, special, or consequential damages.</p>', 'Terms of Service - Khybersoft', 'Read our terms of service to understand the rules and guidelines for using Khybersoft services.', 'default', 'published', 3, NOW());

-- ============================================
-- SAMPLE TESTIMONIALS
-- ============================================

INSERT INTO `testimonials` (`name`, `company`, `role`, `message`, `rating`, `status`, `sort_order`) VALUES
('Ahmed Khan', 'TechCorp Pakistan', 'CEO', 'Khybersoft''s POS system transformed our retail operations. Sales increased by 35% in the first quarter. The support team is exceptional!', 5, 'published', 1),
('Sarah Johnson', 'Startup Hub', 'Founder', 'The accounting software saved us countless hours. It''s intuitive, powerful, and the pricing is very competitive. Highly recommended!', 5, 'published', 2),
('Muhammad Ali', 'Ali Enterprises', 'Owner', 'We''ve been using the inventory management system for 2 years now. It''s reliable, feature-rich, and the updates keep getting better.', 5, 'published', 3),
('Fatima Zahra', 'EduTech Solutions', 'Director', 'The school management system streamlined our entire operation. Parents love the portal, and teachers find it easy to use.', 5, 'published', 4),
('John Smith', 'Global Retail Inc', 'Operations Manager', 'Best POS system we''ve used. The multi-store feature is a game-changer for our business. Implementation was smooth and support is top-notch.', 5, 'published', 5);

-- ============================================
-- SAMPLE SERVICES
-- ============================================

INSERT INTO `services` (`title`, `slug`, `icon`, `short_desc`, `full_desc`, `features`, `price_from`, `status`, `sort_order`, `created_at`) VALUES
('Custom Software Development', 'custom-software-development', '💻', 'Tailored software solutions built specifically for your business needs and workflows.', '<h2>Custom Software Development</h2><p>Get software that fits your business like a glove. Our custom development service creates solutions tailored to your specific requirements, workflows, and goals.</p><h3>What We Offer</h3><ul><li>Requirements analysis and planning</li><li>Custom application development</li><li>System integration</li><li>API development</li><li>Ongoing maintenance and support</li></ul>', '["Custom requirements analysis", "Agile development process", "Regular progress updates", "Quality assurance testing", "Documentation and training", "Post-launch support"]', 5000.00, 'published', 1, NOW()),
('Software Maintenance & Support', 'software-maintenance-support', '🔧', 'Keep your software running smoothly with our comprehensive maintenance and support services.', '<h2>Maintenance & Support</h2><p>Ensure your software stays up-to-date, secure, and performing at its best with our comprehensive maintenance services.</p><h3>Services Include</h3><ul><li>Regular updates and patches</li><li>Bug fixes and troubleshooting</li><li>Performance optimization</li><li>Security updates</li><li>24/7 technical support</li></ul>', '["Regular software updates", "Bug fixes and patches", "Performance monitoring", "Security updates", "24/7 support", "Monthly reports"]', 500.00, 'published', 2, NOW()),
('IT Consulting & Strategy', 'it-consulting-strategy', '🎯', 'Expert guidance to help you make the right technology decisions for your business growth.', '<h2>IT Consulting & Strategy</h2><p>Make informed technology decisions with expert guidance from our experienced consultants. We help you align your IT strategy with your business goals.</p><h3>Consulting Services</h3><ul><li>Technology assessment</li><li>Digital transformation strategy</li><li>Software selection guidance</li><li>IT infrastructure planning</li><li>Cost optimization</li></ul>', '["Technology assessment", "Strategic planning", "Vendor evaluation", "Implementation roadmap", "Cost analysis", "Training and workshops"]', 2000.00, 'published', 3, NOW());

-- ============================================
-- SAMPLE TUTORIALS
-- ============================================

INSERT INTO `tutorial_categories` (`name`, `slug`, `description`, `sort_order`) VALUES
('Getting Started', 'getting-started', 'Beginner tutorials to get you started', 1),
('Advanced Features', 'advanced-features', 'Deep dive into advanced features', 2),
('Best Practices', 'best-practices', 'Tips and best practices', 3);

INSERT INTO `tutorials` (`product_id`, `category_id`, `title`, `slug`, `description`, `video_url`, `duration`, `difficulty`, `sort_order`, `status`, `created_at`) VALUES
(1, 1, 'Getting Started with POS System Pro', 'getting-started-pos-system-pro', 'Learn the basics of setting up and using POS System Pro for your retail business.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', '10:30', 'beginner', 1, 'published', NOW()),
(1, 2, 'Advanced Inventory Management', 'advanced-inventory-management', 'Master advanced inventory features including multi-location tracking and barcode scanning.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', '15:45', 'intermediate', 2, 'published', NOW()),
(2, 1, 'Creating Your First Invoice', 'creating-first-invoice', 'Step-by-step guide to creating professional invoices with our accounting software.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', '8:20', 'beginner', 3, 'published', NOW()),
(3, 1, 'Student Registration Guide', 'student-registration-guide', 'Learn how to register students and manage their information in the school management system.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', '12:15', 'beginner', 4, 'published', NOW());

-- ============================================
-- MENUS
-- ============================================

INSERT INTO `menus` (`name`, `slug`, `location`, `status`) VALUES
('Header Menu', 'header', 'header', 'active'),
('Footer Menu', 'footer', 'footer', 'active');

INSERT INTO `menu_items` (`menu_id`, `title`, `url`, `target`, `sort_order`, `status`) VALUES
(1, 'Home', '/', '_self', 1, 'active'),
(1, 'Products', '/products', '_self', 2, 'active'),
(1, 'Services', '/services', '_self', 3, 'active'),
(1, 'Blog', '/blog', '_self', 4, 'active'),
(1, 'About', '/about', '_self', 5, 'active'),
(1, 'Contact', '/contact', '_self', 6, 'active'),
(2, 'Products', '/products', '_self', 1, 'active'),
(2, 'Pricing', '/pricing', '_self', 2, 'active'),
(2, 'Blog', '/blog', '_self', 3, 'active'),
(2, 'About', '/about', '_self', 4, 'active'),
(2, 'Contact', '/contact', '_self', 5, 'active'),
(2, 'Privacy Policy', '/privacy-policy', '_self', 6, 'active'),
(2, 'Terms of Service', '/terms', '_self', 7, 'active');

-- ============================================
-- SAMPLE CLIENTS
-- ============================================

INSERT INTO `clients` (`name`, `website`, `description`, `category`, `sort_order`, `status`) VALUES
('TechCorp Pakistan', 'https://techcorp.pk', 'Leading technology company in Pakistan', 'Technology', 1, 'active'),
('Global Retail Inc', 'https://globalretail.com', 'International retail chain', 'Retail', 2, 'active'),
('EduTech Solutions', 'https://edutech.edu', 'Educational technology provider', 'Education', 3, 'active'),
('Ali Enterprises', 'https://alienterprises.com', 'Manufacturing and distribution', 'Manufacturing', 4, 'active'),
('Startup Hub', 'https://startuphub.io', 'Startup incubator and accelerator', 'Startups', 5, 'active');

-- ============================================
-- SAMPLE FAQS
-- ============================================

INSERT INTO `faqs` (`question`, `answer`, `category`, `sort_order`, `status`) VALUES
('What is Khybersoft?', 'Khybersoft is a software company specializing in business management solutions including POS systems, accounting software, school management systems, and more.', 'General', 1, 'active'),
('How do I purchase a product?', 'You can purchase our products directly from our website. Simply choose the product, select a plan, and complete the checkout process. We accept credit cards, PayPal, and bank transfers.', 'Purchasing', 2, 'active'),
('Do you offer free trials?', 'Yes! Most of our products offer a 14-day free trial with full features. No credit card required to start.', 'Purchasing', 3, 'active'),
('What kind of support do you provide?', 'We provide email support for all customers, with priority phone and chat support for Professional and Enterprise plans. Our support team is available 24/7.', 'Support', 4, 'active'),
('Can I customize the software?', 'Yes! We offer custom development services to tailor our software to your specific needs. Contact our sales team for a consultation.', 'Customization', 5, 'active'),
('Is my data secure?', 'Absolutely. We use industry-standard encryption, regular backups, and secure data centers. Your data is protected with bank-level security.', 'Security', 6, 'active'),
('Do you offer refunds?', 'We offer a 30-day money-back guarantee for all subscription plans. If you''re not satisfied, contact us for a full refund.', 'Billing', 7, 'active'),
('Can I upgrade or downgrade my plan?', 'Yes, you can change your plan at any time. Upgrades take effect immediately, and downgrades take effect at the next billing cycle.', 'Billing', 8, 'active');

-- ============================================
-- LANGUAGES
-- ============================================

INSERT INTO `languages` (`code`, `name`, `native_name`, `direction`, `is_default`, `status`) VALUES
('en', 'English', 'English', 'ltr', 1, 'active'),
('ur', 'Urdu', 'اردو', 'rtl', 0, 'active');

-- ============================================
-- EMAIL TEMPLATES
-- ============================================

INSERT INTO `email_templates` (`name`, `slug`, `subject`, `body_html`) VALUES
('Welcome Email', 'welcome', 'Welcome to {{site_name}}!', '<h1>Welcome to {{site_name}}, {{name}}!</h1><p>Thank you for joining us. We''re excited to have you on board.</p><p>If you have any questions, don''t hesitate to reach out to our support team.</p><p>Best regards,<br>The {{site_name}} Team</p>'),
('Inquiry Auto-Reply', 'inquiry_reply', 'We received your inquiry - {{site_name}}', '<h1>Thank you for your inquiry!</h1><p>Hi {{name}},</p><p>We have received your message and our team will get back to you within 24 hours.</p><p>In the meantime, feel free to browse our <a href="{{site_url}}">website</a> for more information.</p><p>Best regards,<br>The {{site_name}} Team</p>'),
('Password Reset', 'password_reset', 'Reset Your Password - {{site_name}}', '<h1>Password Reset Request</h1><p>Hi {{name}},</p><p>We received a request to reset your password. Click the button below to create a new password:</p><p><a href="{{reset_url}}" style="display:inline-block;padding:12px 24px;background:#4F46E5;color:white;text-decoration:none;border-radius:6px;">Reset Password</a></p><p>This link will expire in 1 hour. If you didn''t request this, you can safely ignore this email.</p><p>Best regards,<br>The {{site_name}} Team</p>'),
('Newsletter Welcome', 'newsletter_welcome', 'Welcome to our newsletter!', '<h1>Welcome to the {{site_name}} Newsletter!</h1><p>Thank you for subscribing. You''ll now receive the latest updates, tips, and exclusive offers directly in your inbox.</p><p>Stay tuned for exciting content!</p><p>Best regards,<br>The {{site_name}} Team</p>');

SET FOREIGN_KEY_CHECKS = 1;
