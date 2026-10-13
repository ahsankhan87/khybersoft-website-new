export const databaseSchema = `-- ============================================================
-- Khybersoft Database Schema
-- MySQL 8.0+ | InnoDB | utf8mb4_unicode_ci
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------
-- CORE TABLES
-- -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS \`roles\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(50) NOT NULL,
  \`slug\` VARCHAR(50) NOT NULL,
  \`description\` TEXT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_roles_slug\` (\`slug\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`permissions\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(100) NOT NULL,
  \`slug\` VARCHAR(100) NOT NULL,
  \`group\` VARCHAR(50) NOT NULL DEFAULT 'general',
  \`description\` TEXT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_permissions_slug\` (\`slug\`),
  INDEX \`idx_permissions_group\` (\`group\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`role_permissions\` (
  \`role_id\` INT UNSIGNED NOT NULL,
  \`permission_id\` INT UNSIGNED NOT NULL,
  PRIMARY KEY (\`role_id\`, \`permission_id\`),
  CONSTRAINT \`fk_rp_role\` FOREIGN KEY (\`role_id\`) REFERENCES \`roles\`(\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_rp_permission\` FOREIGN KEY (\`permission_id\`) REFERENCES \`permissions\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(100) NOT NULL,
  \`email\` VARCHAR(255) NOT NULL,
  \`password_hash\` VARCHAR(255) NOT NULL,
  \`role_id\` INT UNSIGNED NOT NULL,
  \`avatar\` VARCHAR(255) NULL,
  \`status\` ENUM('active','inactive','banned') NOT NULL DEFAULT 'active',
  \`email_verified_at\` TIMESTAMP NULL,
  \`remember_token\` VARCHAR(100) NULL,
  \`last_login\` TIMESTAMP NULL,
  \`last_login_ip\` VARCHAR(45) NULL,
  \`deleted_at\` TIMESTAMP NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_users_email\` (\`email\`),
  INDEX \`idx_users_role\` (\`role_id\`),
  INDEX \`idx_users_status\` (\`status\`),
  CONSTRAINT \`fk_users_role\` FOREIGN KEY (\`role_id\`) REFERENCES \`roles\`(\`id\`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`settings\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`key\` VARCHAR(100) NOT NULL,
  \`value\` LONGTEXT NULL,
  \`type\` ENUM('string','integer','boolean','json','file') NOT NULL DEFAULT 'string',
  \`group\` VARCHAR(50) NOT NULL DEFAULT 'general',
  \`label\` VARCHAR(100) NULL,
  \`description\` TEXT NULL,
  \`is_public\` TINYINT(1) NOT NULL DEFAULT 0,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_settings_key\` (\`key\`),
  INDEX \`idx_settings_group\` (\`group\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`activity_logs\` (
  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`user_id\` INT UNSIGNED NULL,
  \`action\` VARCHAR(50) NOT NULL,
  \`model\` VARCHAR(100) NULL,
  \`model_id\` INT UNSIGNED NULL,
  \`old_values\` JSON NULL,
  \`new_values\` JSON NULL,
  \`description\` TEXT NULL,
  \`ip\` VARCHAR(45) NULL,
  \`user_agent\` TEXT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_activity_user\` (\`user_id\`),
  INDEX \`idx_activity_model\` (\`model\`, \`model_id\`),
  INDEX \`idx_activity_action\` (\`action\`),
  INDEX \`idx_activity_created\` (\`created_at\`),
  CONSTRAINT \`fk_activity_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`media\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`filename\` VARCHAR(255) NOT NULL,
  \`original_name\` VARCHAR(255) NOT NULL,
  \`path\` VARCHAR(500) NOT NULL,
  \`mime\` VARCHAR(100) NOT NULL,
  \`size\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`width\` SMALLINT UNSIGNED NULL,
  \`height\` SMALLINT UNSIGNED NULL,
  \`alt_text\` VARCHAR(255) NULL,
  \`title\` VARCHAR(255) NULL,
  \`uploaded_by\` INT UNSIGNED NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_media_mime\` (\`mime\`),
  INDEX \`idx_media_uploader\` (\`uploaded_by\`),
  CONSTRAINT \`fk_media_uploader\` FOREIGN KEY (\`uploaded_by\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- CONTENT TABLES
-- -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS \`pages\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`title\` VARCHAR(255) NOT NULL,
  \`slug\` VARCHAR(255) NOT NULL,
  \`content\` LONGTEXT NULL,
  \`meta_title\` VARCHAR(255) NULL,
  \`meta_desc\` TEXT NULL,
  \`og_image\` VARCHAR(500) NULL,
  \`template\` VARCHAR(50) NOT NULL DEFAULT 'default',
  \`status\` ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  \`sort_order\` INT NOT NULL DEFAULT 0,
  \`deleted_at\` TIMESTAMP NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_pages_slug\` (\`slug\`),
  INDEX \`idx_pages_status\` (\`status\`),
  INDEX \`idx_pages_template\` (\`template\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`menus\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(100) NOT NULL,
  \`slug\` VARCHAR(100) NOT NULL,
  \`location\` VARCHAR(50) NOT NULL DEFAULT 'header',
  \`status\` ENUM('active','inactive') NOT NULL DEFAULT 'active',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_menus_slug\` (\`slug\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`menu_items\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`menu_id\` INT UNSIGNED NOT NULL,
  \`parent_id\` INT UNSIGNED NULL,
  \`title\` VARCHAR(100) NOT NULL,
  \`url\` VARCHAR(500) NULL,
  \`target\` ENUM('_self','_blank') NOT NULL DEFAULT '_self',
  \`icon\` VARCHAR(50) NULL,
  \`css_class\` VARCHAR(100) NULL,
  \`sort_order\` INT NOT NULL DEFAULT 0,
  \`status\` ENUM('active','inactive') NOT NULL DEFAULT 'active',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_menu_items_menu\` (\`menu_id\`),
  INDEX \`idx_menu_items_parent\` (\`parent_id\`),
  CONSTRAINT \`fk_menu_items_menu\` FOREIGN KEY (\`menu_id\`) REFERENCES \`menus\`(\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_menu_items_parent\` FOREIGN KEY (\`parent_id\`) REFERENCES \`menu_items\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`blog_categories\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(100) NOT NULL,
  \`slug\` VARCHAR(100) NOT NULL,
  \`description\` TEXT NULL,
  \`parent_id\` INT UNSIGNED NULL,
  \`sort_order\` INT NOT NULL DEFAULT 0,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_blog_cat_slug\` (\`slug\`),
  CONSTRAINT \`fk_blog_cat_parent\` FOREIGN KEY (\`parent_id\`) REFERENCES \`blog_categories\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`blog_tags\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(100) NOT NULL,
  \`slug\` VARCHAR(100) NOT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_blog_tags_slug\` (\`slug\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`blog_posts\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`title\` VARCHAR(255) NOT NULL,
  \`slug\` VARCHAR(255) NOT NULL,
  \`excerpt\` TEXT NULL,
  \`content\` LONGTEXT NULL,
  \`featured_image\` VARCHAR(500) NULL,
  \`category_id\` INT UNSIGNED NULL,
  \`author_id\` INT UNSIGNED NOT NULL,
  \`meta_title\` VARCHAR(255) NULL,
  \`meta_desc\` TEXT NULL,
  \`views\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`published_at\` TIMESTAMP NULL,
  \`status\` ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  \`deleted_at\` TIMESTAMP NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_blog_posts_slug\` (\`slug\`),
  INDEX \`idx_blog_posts_category\` (\`category_id\`),
  INDEX \`idx_blog_posts_author\` (\`author_id\`),
  INDEX \`idx_blog_posts_status\` (\`status\`),
  INDEX \`idx_blog_posts_published\` (\`published_at\`),
  CONSTRAINT \`fk_blog_posts_category\` FOREIGN KEY (\`category_id\`) REFERENCES \`blog_categories\`(\`id\`) ON DELETE SET NULL,
  CONSTRAINT \`fk_blog_posts_author\` FOREIGN KEY (\`author_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`blog_post_tags\` (
  \`post_id\` INT UNSIGNED NOT NULL,
  \`tag_id\` INT UNSIGNED NOT NULL,
  PRIMARY KEY (\`post_id\`, \`tag_id\`),
  CONSTRAINT \`fk_bpt_post\` FOREIGN KEY (\`post_id\`) REFERENCES \`blog_posts\`(\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_bpt_tag\` FOREIGN KEY (\`tag_id\`) REFERENCES \`blog_tags\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`blog_comments\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`post_id\` INT UNSIGNED NOT NULL,
  \`parent_id\` INT UNSIGNED NULL,
  \`name\` VARCHAR(100) NOT NULL,
  \`email\` VARCHAR(255) NOT NULL,
  \`message\` TEXT NOT NULL,
  \`ip\` VARCHAR(45) NULL,
  \`status\` ENUM('pending','approved','spam') NOT NULL DEFAULT 'pending',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_comments_post\` (\`post_id\`),
  INDEX \`idx_comments_status\` (\`status\`),
  CONSTRAINT \`fk_comments_post\` FOREIGN KEY (\`post_id\`) REFERENCES \`blog_posts\`(\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_comments_parent\` FOREIGN KEY (\`parent_id\`) REFERENCES \`blog_comments\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`testimonials\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(100) NOT NULL,
  \`company\` VARCHAR(100) NULL,
  \`role\` VARCHAR(100) NULL,
  \`photo\` VARCHAR(500) NULL,
  \`message\` TEXT NOT NULL,
  \`rating\` TINYINT UNSIGNED NOT NULL DEFAULT 5,
  \`status\` ENUM('draft','published') NOT NULL DEFAULT 'draft',
  \`sort_order\` INT NOT NULL DEFAULT 0,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_testimonials_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`team_members\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(100) NOT NULL,
  \`role\` VARCHAR(100) NOT NULL,
  \`bio\` TEXT NULL,
  \`photo\` VARCHAR(500) NULL,
  \`social_links\` JSON NULL,
  \`sort_order\` INT NOT NULL DEFAULT 0,
  \`status\` ENUM('active','inactive') NOT NULL DEFAULT 'active',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`faqs\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`question\` VARCHAR(500) NOT NULL,
  \`answer\` TEXT NOT NULL,
  \`category\` VARCHAR(100) NULL,
  \`sort_order\` INT NOT NULL DEFAULT 0,
  \`status\` ENUM('active','inactive') NOT NULL DEFAULT 'active',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_faqs_category\` (\`category\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- PRODUCT TABLES
-- -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS \`product_categories\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(100) NOT NULL,
  \`slug\` VARCHAR(100) NOT NULL,
  \`icon\` VARCHAR(100) NULL,
  \`description\` TEXT NULL,
  \`sort_order\` INT NOT NULL DEFAULT 0,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_prod_cat_slug\` (\`slug\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`products\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`category_id\` INT UNSIGNED NULL,
  \`name\` VARCHAR(255) NOT NULL,
  \`slug\` VARCHAR(255) NOT NULL,
  \`tagline\` VARCHAR(255) NULL,
  \`short_desc\` TEXT NULL,
  \`full_desc\` LONGTEXT NULL,
  \`features\` JSON NULL,
  \`screenshots\` JSON NULL,
  \`icon\` VARCHAR(500) NULL,
  \`hero_image\` VARCHAR(500) NULL,
  \`video_url\` VARCHAR(500) NULL,
  \`demo_url\` VARCHAR(500) NULL,
  \`download_url\` VARCHAR(500) NULL,
  \`documentation_url\` VARCHAR(500) NULL,
  \`price_type\` ENUM('one_time','subscription','custom','free') NOT NULL DEFAULT 'custom',
  \`price\` DECIMAL(10,2) NULL DEFAULT 0.00,
  \`price_currency\` VARCHAR(3) NOT NULL DEFAULT 'USD',
  \`billing_cycle\` ENUM('monthly','yearly','lifetime') NULL,
  \`is_featured\` TINYINT(1) NOT NULL DEFAULT 0,
  \`status\` ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  \`sort_order\` INT NOT NULL DEFAULT 0,
  \`meta_title\` VARCHAR(255) NULL,
  \`meta_desc\` TEXT NULL,
  \`deleted_at\` TIMESTAMP NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_products_slug\` (\`slug\`),
  INDEX \`idx_products_category\` (\`category_id\`),
  INDEX \`idx_products_featured\` (\`is_featured\`),
  INDEX \`idx_products_status\` (\`status\`),
  CONSTRAINT \`fk_products_category\` FOREIGN KEY (\`category_id\`) REFERENCES \`product_categories\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`product_plans\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`product_id\` INT UNSIGNED NOT NULL,
  \`name\` VARCHAR(100) NOT NULL,
  \`price\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  \`billing_cycle\` ENUM('monthly','yearly','lifetime') NOT NULL DEFAULT 'lifetime',
  \`features\` JSON NULL,
  \`is_popular\` TINYINT(1) NOT NULL DEFAULT 0,
  \`sort_order\` INT NOT NULL DEFAULT 0,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_plans_product\` (\`product_id\`),
  CONSTRAINT \`fk_plans_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`product_features\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`product_id\` INT UNSIGNED NOT NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`description\` TEXT NULL,
  \`icon\` VARCHAR(100) NULL,
  \`sort_order\` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_prod_features_product\` (\`product_id\`),
  CONSTRAINT \`fk_prod_features_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`product_faqs\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`product_id\` INT UNSIGNED NOT NULL,
  \`question\` VARCHAR(500) NOT NULL,
  \`answer\` TEXT NOT NULL,
  \`sort_order\` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_prod_faqs_product\` (\`product_id\`),
  CONSTRAINT \`fk_prod_faqs_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`product_demos\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`product_id\` INT UNSIGNED NOT NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`type\` ENUM('video','live','screenshot') NOT NULL DEFAULT 'video',
  \`url\` VARCHAR(500) NOT NULL,
  \`thumbnail\` VARCHAR(500) NULL,
  \`sort_order\` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_prod_demos_product\` (\`product_id\`),
  CONSTRAINT \`fk_prod_demos_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`product_inquiries\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`product_id\` INT UNSIGNED NOT NULL,
  \`name\` VARCHAR(100) NOT NULL,
  \`email\` VARCHAR(255) NOT NULL,
  \`phone\` VARCHAR(20) NULL,
  \`company\` VARCHAR(100) NULL,
  \`message\` TEXT NULL,
  \`type\` ENUM('demo','quote','support') NOT NULL DEFAULT 'demo',
  \`status\` ENUM('new','in_progress','resolved','closed') NOT NULL DEFAULT 'new',
  \`ip\` VARCHAR(45) NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_prod_inq_product\` (\`product_id\`),
  INDEX \`idx_prod_inq_status\` (\`status\`),
  CONSTRAINT \`fk_prod_inq_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`product_versions\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`product_id\` INT UNSIGNED NOT NULL,
  \`version\` VARCHAR(20) NOT NULL,
  \`changelog\` TEXT NULL,
  \`release_date\` DATE NOT NULL,
  \`download_url\` VARCHAR(500) NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_prod_versions_product\` (\`product_id\`),
  CONSTRAINT \`fk_prod_versions_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`tutorial_categories\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(100) NOT NULL,
  \`slug\` VARCHAR(100) NOT NULL,
  \`description\` TEXT NULL,
  \`sort_order\` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_tut_cat_slug\` (\`slug\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`tutorials\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`product_id\` INT UNSIGNED NULL,
  \`category_id\` INT UNSIGNED NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`slug\` VARCHAR(255) NOT NULL,
  \`description\` TEXT NULL,
  \`video_url\` VARCHAR(500) NULL,
  \`thumbnail\` VARCHAR(500) NULL,
  \`duration\` VARCHAR(20) NULL,
  \`difficulty\` ENUM('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
  \`sort_order\` INT NOT NULL DEFAULT 0,
  \`status\` ENUM('draft','published') NOT NULL DEFAULT 'draft',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_tutorials_slug\` (\`slug\`),
  INDEX \`idx_tutorials_product\` (\`product_id\`),
  INDEX \`idx_tutorials_category\` (\`category_id\`),
  CONSTRAINT \`fk_tutorials_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE SET NULL,
  CONSTRAINT \`fk_tutorials_category\` FOREIGN KEY (\`category_id\`) REFERENCES \`tutorial_categories\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- BUSINESS TABLES
-- -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS \`services\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`title\` VARCHAR(255) NOT NULL,
  \`slug\` VARCHAR(255) NOT NULL,
  \`icon\` VARCHAR(100) NULL,
  \`short_desc\` TEXT NULL,
  \`full_desc\` LONGTEXT NULL,
  \`features\` JSON NULL,
  \`price_from\` DECIMAL(10,2) NULL,
  \`price_currency\` VARCHAR(3) NOT NULL DEFAULT 'USD',
  \`status\` ENUM('draft','published') NOT NULL DEFAULT 'draft',
  \`sort_order\` INT NOT NULL DEFAULT 0,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_services_slug\` (\`slug\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`service_inquiries\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`service_id\` INT UNSIGNED NOT NULL,
  \`name\` VARCHAR(100) NOT NULL,
  \`email\` VARCHAR(255) NOT NULL,
  \`phone\` VARCHAR(20) NULL,
  \`company\` VARCHAR(100) NULL,
  \`message\` TEXT NULL,
  \`budget\` VARCHAR(50) NULL,
  \`status\` ENUM('new','in_progress','resolved','closed') NOT NULL DEFAULT 'new',
  \`ip\` VARCHAR(45) NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_svc_inq_service\` (\`service_id\`),
  CONSTRAINT \`fk_svc_inq_service\` FOREIGN KEY (\`service_id\`) REFERENCES \`services\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`contact_messages\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(100) NOT NULL,
  \`email\` VARCHAR(255) NOT NULL,
  \`phone\` VARCHAR(20) NULL,
  \`subject\` VARCHAR(255) NOT NULL,
  \`message\` TEXT NOT NULL,
  \`status\` ENUM('new','read','replied','closed') NOT NULL DEFAULT 'new',
  \`ip\` VARCHAR(45) NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_contact_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`newsletter_subscribers\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`email\` VARCHAR(255) NOT NULL,
  \`token\` VARCHAR(100) NOT NULL,
  \`verified\` TINYINT(1) NOT NULL DEFAULT 0,
  \`status\` ENUM('active','unsubscribed') NOT NULL DEFAULT 'active',
  \`subscribed_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_newsletter_email\` (\`email\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`custom_development_requests\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(100) NOT NULL,
  \`email\` VARCHAR(255) NOT NULL,
  \`phone\` VARCHAR(20) NULL,
  \`project_type\` VARCHAR(100) NULL,
  \`budget\` VARCHAR(50) NULL,
  \`timeline\` VARCHAR(100) NULL,
  \`description\` TEXT NOT NULL,
  \`requirements\` JSON NULL,
  \`status\` ENUM('new','reviewing','approved','in_progress','completed','rejected') NOT NULL DEFAULT 'new',
  \`ip\` VARCHAR(45) NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  INDEX \`idx_cdr_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`clients\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(255) NOT NULL,
  \`logo\` VARCHAR(500) NULL,
  \`website\` VARCHAR(500) NULL,
  \`description\` TEXT NULL,
  \`category\` VARCHAR(100) NULL,
  \`project_url\` VARCHAR(500) NULL,
  \`sort_order\` INT NOT NULL DEFAULT 0,
  \`status\` ENUM('active','inactive') NOT NULL DEFAULT 'active',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- SEO / SYSTEM TABLES
-- -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS \`seo_meta\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`model\` VARCHAR(100) NOT NULL,
  \`model_id\` INT UNSIGNED NOT NULL,
  \`meta_title\` VARCHAR(255) NULL,
  \`meta_desc\` TEXT NULL,
  \`keywords\` VARCHAR(500) NULL,
  \`og_image\` VARCHAR(500) NULL,
  \`canonical\` VARCHAR(500) NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_seo_model\` (\`model\`, \`model_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`redirects\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`from_url\` VARCHAR(500) NOT NULL,
  \`to_url\` VARCHAR(500) NOT NULL,
  \`status_code\` INT NOT NULL DEFAULT 301,
  \`hits\` INT UNSIGNED NOT NULL DEFAULT 0,
  \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_redirects_from\` (\`from_url\`(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`testimonials_videos\` (
  \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  \`testimonial_id\` INT UNSIGNED NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`video_url\` VARCHAR(500) NOT NULL,
  \`thumbnail\` VARCHAR(500) NULL,
  \`duration\` VARCHAR(20) NULL,
  \`sort_order\` INT NOT NULL DEFAULT 0,
  \`status\` ENUM('draft','published') NOT NULL DEFAULT 'draft',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`fk_tv_testimonial\` FOREIGN KEY (\`testimonial_id\`) REFERENCES \`testimonials\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- SEED DATA
-- -----------------------------------------------------------

INSERT INTO \`roles\` (\`name\`, \`slug\`, \`description\`) VALUES
('Super Admin', 'super_admin', 'Full system access'),
('Admin', 'admin', 'Administrative access'),
('Editor', 'editor', 'Content management access');

INSERT INTO \`permissions\` (\`name\`, \`slug\`, \`group\`) VALUES
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

INSERT INTO \`role_permissions\` (\`role_id\`, \`permission_id\`) VALUES
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8), (1, 9), (1, 10),
(2, 1), (2, 2), (2, 4), (2, 5), (2, 6), (2, 7), (2, 9), (2, 10),
(3, 1), (3, 4), (3, 5), (3, 9);

INSERT INTO \`settings\` (\`key\`, \`value\`, \`type\`, \`group\`, \`label\`, \`is_public\`) VALUES
('site_name', 'Khybersoft', 'string', 'general', 'Site Name', 1),
('site_tagline', 'Innovative Software Solutions', 'string', 'general', 'Site Tagline', 1),
('site_email', 'info@khybersoft.com', 'string', 'general', 'Contact Email', 1),
('site_phone', '+1-234-567-8900', 'string', 'general', 'Contact Phone', 1),
('site_address', '123 Tech Street, Digital City', 'string', 'general', 'Address', 1),
('maintenance_mode', '0', 'boolean', 'system', 'Maintenance Mode', 0),
('items_per_page', '20', 'integer', 'system', 'Items Per Page', 0),
('allow_registration', '0', 'boolean', 'auth', 'Allow Registration', 0),
('smtp_host', '', 'string', 'mail', 'SMTP Host', 0),
('smtp_port', '587', 'integer', 'mail', 'SMTP Port', 0),
('smtp_user', '', 'string', 'mail', 'SMTP Username', 0),
('smtp_pass', '', 'string', 'mail', 'SMTP Password', 0);

SET FOREIGN_KEY_CHECKS = 1;
`;
