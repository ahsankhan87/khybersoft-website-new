export interface CI4File {
  path: string;
  name: string;
  language: string;
  content: string;
  description: string;
  category: string;
}

export const ci4Models: CI4File[] = [
  {
    path: 'app/Models/User.php',
    name: 'User.php',
    language: 'php',
    category: 'Models',
    description: 'User model with authentication',
    content: `<?php

namespace App\\Models;

use CodeIgniter\\Model;

class User extends Model
{
    protected $table = 'users';
    protected $primaryKey = 'id';
    protected $allowedFields = ['name', 'email', 'password_hash', 'role_id', 'avatar', 'status', 'email_verified_at', 'remember_token', 'two_factor_secret', 'two_factor_enabled', 'last_login', 'last_login_ip'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $deletedField = 'deleted_at';
    protected $useSoftDeletes = true;

    protected $validationRules = [
        'name' => 'required|min_length[2]|max_length[100]',
        'email' => 'required|valid_email|is_unique[users.email,id,{id}]',
        'role_id' => 'required|integer',
        'status' => 'required|in_list[active,inactive,banned]',
    ];

    protected $validationMessages = [
        'email' => [
            'is_unique' => 'This email address is already registered.',
        ],
    ];

    public function getFullName()
    {
        return $this->attributes['name'] ?? '';
    }

    public function isActive()
    {
        return $this->attributes['status'] === 'active';
    }

    public function isAdmin()
    {
        $role = $this->db->table('roles')->where('id', $this->attributes['role_id'])->get()->getRowArray();
        return $role && in_array($role['slug'], ['super_admin', 'admin']);
    }

    public function getRole()
    {
        return $this->db->table('roles')->where('id', $this->attributes['role_id'])->get()->getRowArray();
    }

    public function hasPermission(string $permissionSlug): bool
    {
        $role = $this->getRole();
        if (!$role) return false;

        if ($role['slug'] === 'super_admin') return true;

        $result = $this->db->table('permissions p')
            ->select('p.id')
            ->join('role_permissions rp', 'rp.permission_id = p.id')
            ->where('rp.role_id', $role['id'])
            ->where('p.slug', $permissionSlug)
            ->get()->getRowArray();

        return !empty($result);
    }
}
`
  },
  {
    path: 'app/Models/Product.php',
    name: 'Product.php',
    language: 'php',
    category: 'Models',
    description: 'Product model',
    content: `<?php

namespace App\\Models;

use CodeIgniter\\Model;

class Product extends Model
{
    protected $table = 'products';
    protected $primaryKey = 'id';
    protected $allowedFields = ['category_id', 'name', 'slug', 'tagline', 'short_desc', 'full_desc', 'features', 'screenshots', 'icon', 'hero_image', 'video_url', 'demo_url', 'download_url', 'documentation_url', 'price_type', 'price', 'price_currency', 'billing_cycle', 'is_featured', 'status', 'sort_order', 'views', 'meta_title', 'meta_desc'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $deletedField = 'deleted_at';
    protected $useSoftDeletes = true;

    protected $validationRules = [
        'name' => 'required|min_length[2]|max_length[255]',
        'slug' => 'required|is_unique[products.slug,id,{id}]|max_length[255]',
        'full_desc' => 'required',
        'price_type' => 'required|in_list[one_time,subscription,custom,free]',
        'status' => 'required|in_list[draft,published,archived]',
    ];

    public function getCategory()
    {
        return $this->db->table('product_categories')->where('id', $this->attributes['category_id'])->get()->getRowArray();
    }

    public function getPlans()
    {
        return $this->db->table('product_plans')->where('product_id', $this->attributes['id'])->orderBy('sort_order', 'ASC')->get()->getResultArray();
    }

    public function getFeatures()
    {
        return $this->db->table('product_features')->where('product_id', $this->attributes['id'])->orderBy('sort_order', 'ASC')->get()->getResultArray();
    }

    public function getFaqs()
    {
        return $this->db->table('product_faqs')->where('product_id', $this->attributes['id'])->orderBy('sort_order', 'ASC')->get()->getResultArray();
    }

    public function getDemos()
    {
        return $this->db->table('product_demos')->where('product_id', $this->attributes['id'])->orderBy('sort_order', 'ASC')->get()->getResultArray();
    }

    public function getVersions()
    {
        return $this->db->table('product_versions')->where('product_id', $this->attributes['id'])->orderBy('release_date', 'DESC')->get()->getResultArray();
    }

    public function getInquiries()
    {
        return $this->db->table('product_inquiries')->where('product_id', $this->attributes['id'])->orderBy('created_at', 'DESC')->get()->getResultArray();
    }

    public function isFeatured()
    {
        return (bool) $this->attributes['is_featured'];
    }

    public function isPublished()
    {
        return $this->attributes['status'] === 'published';
    }

    public function getFormattedPrice()
    {
        $price = (float) $this->attributes['price'];
        $currency = $this->attributes['price_currency'] ?? 'USD';

        $symbols = ['USD' => '$', 'EUR' => '€', 'GBP' => '£', 'PKR' => 'Rs.', 'INR' => '₹'];
        $symbol = $symbols[$currency] ?? $currency . ' ';

        return $symbol . number_format($price, 2);
    }
}
`
  },
  {
    path: 'app/Models/BlogPost.php',
    name: 'BlogPost.php',
    language: 'php',
    category: 'Models',
    description: 'Blog post model',
    content: `<?php

namespace App\\Models;

use CodeIgniter\\Model;

class BlogPost extends Model
{
    protected $table = 'blog_posts';
    protected $primaryKey = 'id';
    protected $allowedFields = ['title', 'slug', 'excerpt', 'content', 'featured_image', 'category_id', 'author_id', 'meta_title', 'meta_desc', 'views', 'read_time', 'published_at', 'status'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $deletedField = 'deleted_at';
    protected $useSoftDeletes = true;

    protected $validationRules = [
        'title' => 'required|min_length[3]|max_length[255]',
        'slug' => 'required|is_unique[blog_posts.slug,id,{id}]|max_length[255]',
        'content' => 'required',
        'status' => 'required|in_list[draft,published,archived]',
    ];

    public function getCategory()
    {
        return $this->db->table('blog_categories')->where('id', $this->attributes['category_id'])->get()->getRowArray();
    }

    public function getAuthor()
    {
        return $this->db->table('users')->where('id', $this->attributes['author_id'])->get()->getRowArray();
    }

    public function getTags()
    {
        return $this->db->table('blog_tags')
            ->select('blog_tags.*')
            ->join('blog_post_tags', 'blog_post_tags.tag_id = blog_tags.id')
            ->where('blog_post_tags.post_id', $this->attributes['id'])
            ->get()->getResultArray();
    }

    public function getComments()
    {
        return $this->db->table('blog_comments')
            ->where(['post_id' => $this->attributes['id'], 'status' => 'approved'])
            ->orderBy('created_at', 'ASC')
            ->get()->getResultArray();
    }

    public function isPublished()
    {
        return $this->attributes['status'] === 'published' && strtotime($this->attributes['published_at'] ?? 'now') <= time();
    }

    public function incrementViews()
    {
        $this->db->table('blog_posts')->where('id', $this->attributes['id'])->update(['views' => ($this->attributes['views'] ?? 0) + 1]);
    }
}
`
  },
  {
    path: 'app/Models/Page.php',
    name: 'Page.php',
    language: 'php',
    category: 'Models',
    description: 'Page model',
    content: `<?php

namespace App\\Models;

use CodeIgniter\\Model;

class Page extends Model
{
    protected $table = 'pages';
    protected $primaryKey = 'id';
    protected $allowedFields = ['title', 'slug', 'content', 'meta_title', 'meta_desc', 'og_image', 'template', 'status', 'sort_order', 'views'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $deletedField = 'deleted_at';
    protected $useSoftDeletes = true;

    protected $validationRules = [
        'title' => 'required|min_length[2]|max_length[255]',
        'slug' => 'required|is_unique[pages.slug,id,{id}]|max_length[255]',
        'content' => 'required',
        'template' => 'required|in_list[default,full-width,sidebar,landing,contact]',
        'status' => 'required|in_list[draft,published,archived]',
    ];

    public function isPublished()
    {
        return $this->attributes['status'] === 'published';
    }

    public function incrementViews()
    {
        $this->db->table('pages')->where('id', $this->attributes['id'])->update(['views' => ($this->attributes['views'] ?? 0) + 1]);
    }
}
`
  },
  {
    path: 'app/Models/Testimonial.php',
    name: 'Testimonial.php',
    language: 'php',
    category: 'Models',
    description: 'Testimonial model',
    content: `<?php

namespace App\\Models;

use CodeIgniter\\Model;

class Testimonial extends Model
{
    protected $table = 'testimonials';
    protected $primaryKey = 'id';
    protected $allowedFields = ['name', 'company', 'role', 'photo', 'message', 'rating', 'status', 'sort_order'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';

    protected $validationRules = [
        'name' => 'required|min_length[2]|max_length[100]',
        'message' => 'required|min_length[10]|max_length[2000]',
        'rating' => 'required|integer|greater_than_equal_to[1]|less_than_equal_to[5]',
        'status' => 'required|in_list[draft,published]',
    ];

    public function isPublished()
    {
        return $this->attributes['status'] === 'published';
    }

    public function getStars()
    {
        $rating = (int) $this->attributes['rating'];
        return str_repeat('★', $rating) . str_repeat('☆', 5 - $rating);
    }
}
`
  },
  {
    path: 'app/Models/Service.php',
    name: 'Service.php',
    language: 'php',
    category: 'Models',
    description: 'Service model',
    content: `<?php

namespace App\\Models;

use CodeIgniter\\Model;

class Service extends Model
{
    protected $table = 'services';
    protected $primaryKey = 'id';
    protected $allowedFields = ['title', 'slug', 'icon', 'short_desc', 'full_desc', 'features', 'price_from', 'price_currency', 'status', 'sort_order'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';

    protected $validationRules = [
        'title' => 'required|min_length[2]|max_length[255]',
        'slug' => 'required|is_unique[services.slug,id,{id}]|max_length[255]',
        'status' => 'required|in_list[draft,published]',
    ];

    public function isPublished()
    {
        return $this->attributes['status'] === 'published';
    }

    public function getFeatures()
    {
        return json_decode($this->attributes['features'] ?? '[]', true) ?: [];
    }

    public function getFormattedPrice()
    {
        $price = (float) $this->attributes['price_from'];
        $currency = $this->attributes['price_currency'] ?? 'USD';

        $symbols = ['USD' => '$', 'EUR' => '€', 'GBP' => '£', 'PKR' => 'Rs.', 'INR' => '₹'];
        $symbol = $symbols[$currency] ?? $currency . ' ';

        return $symbol . number_format($price, 2);
    }
}
`
  },
  {
    path: 'app/Models/Client.php',
    name: 'Client.php',
    language: 'php',
    category: 'Models',
    description: 'Client model',
    content: `<?php

namespace App\\Models;

use CodeIgniter\\Model;

class Client extends Model
{
    protected $table = 'clients';
    protected $primaryKey = 'id';
    protected $allowedFields = ['name', 'logo', 'website', 'description', 'category', 'project_url', 'sort_order', 'status'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';

    protected $validationRules = [
        'name' => 'required|min_length[2]|max_length[255]',
        'status' => 'required|in_list[active,inactive]',
    ];

    public function isActive()
    {
        return $this->attributes['status'] === 'active';
    }
}
`
  },
  {
    path: 'app/Models/Tutorial.php',
    name: 'Tutorial.php',
    language: 'php',
    category: 'Models',
    description: 'Tutorial model',
    content: `<?php

namespace App\\Models;

use CodeIgniter\\Model;

class Tutorial extends Model
{
    protected $table = 'tutorials';
    protected $primaryKey = 'id';
    protected $allowedFields = ['product_id', 'category_id', 'title', 'slug', 'description', 'video_url', 'thumbnail', 'duration', 'difficulty', 'sort_order', 'views', 'status'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';

    protected $validationRules = [
        'title' => 'required|min_length[3]|max_length[255]',
        'slug' => 'required|is_unique[tutorials.slug,id,{id}]|max_length[255]',
        'difficulty' => 'required|in_list[beginner,intermediate,advanced]',
        'status' => 'required|in_list[draft,published]',
    ];

    public function getCategory()
    {
        return $this->db->table('tutorial_categories')->where('id', $this->attributes['category_id'])->get()->getRowArray();
    }

    public function getProduct()
    {
        if (empty($this->attributes['product_id'])) return null;
        return $this->db->table('products')->where('id', $this->attributes['product_id'])->get()->getRowArray();
    }

    public function isPublished()
    {
        return $this->attributes['status'] === 'published';
    }

    public function incrementViews()
    {
        $this->db->table('tutorials')->where('id', $this->attributes['id'])->update(['views' => ($this->attributes['views'] ?? 0) + 1]);
    }

    public function getDifficultyLabel()
    {
        $labels = ['beginner' => 'Beginner', 'intermediate' => 'Intermediate', 'advanced' => 'Advanced'];
        return $labels[$this->attributes['difficulty']] ?? 'Unknown';
    }
}
`
  },
  {
    path: 'app/Models/Setting.php',
    name: 'Setting.php',
    language: 'php',
    category: 'Models',
    description: 'Setting model',
    content: `<?php

namespace App\\Models;

use CodeIgniter\\Model;

class Setting extends Model
{
    protected $table = 'settings';
    protected $primaryKey = 'id';
    protected $allowedFields = ['key', 'value', 'type', 'group', 'label', 'description', 'is_public'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected static $cache = [];

    public function get(string $key, string $default = ''): string
    {
        if (isset(self::$cache[$key])) {
            return self::$cache[$key];
        }

        $result = $this->where('key', $key)->first();
        $value = $result ? $result['value'] : $default;
        self::$cache[$key] = $value;

        return $value;
    }

    public function set(string $key, string $value): bool
    {
        $result = $this->where('key', $key)->first();

        if ($result) {
            return $this->update($result['id'], ['value' => $value, 'updated_at' => date('Y-m-d H:i:s')]);
        } else {
            return $this->insert(['key' => $key, 'value' => $value, 'type' => 'string', 'group' => 'general', 'created_at' => date('Y-m-d H:i:s')]) !== false;
        }
    }

    public function getByGroup(string $group): array
    {
        return $this->where('group', $group)->orderBy('id', 'ASC')->findAll();
    }

    public function getAll(): array
    {
        $settings = $this->orderBy('group', 'ASC')->orderBy('id', 'ASC')->findAll();
        $grouped = [];

        foreach ($settings as $setting) {
            $grouped[$setting['group']][] = $setting;
        }

        return $grouped;
    }

    public static function clearCache(): void
    {
        self::$cache = [];
    }
}
`
  },
  {
    path: 'app/Models/ContactMessage.php',
    name: 'ContactMessage.php',
    language: 'php',
    category: 'Models',
    description: 'Contact message model',
    content: `<?php

namespace App\\Models;

use CodeIgniter\\Model;

class ContactMessage extends Model
{
    protected $table = 'contact_messages';
    protected $primaryKey = 'id';
    protected $allowedFields = ['name', 'email', 'phone', 'subject', 'message', 'status', 'ip'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';

    protected $validationRules = [
        'name' => 'required|min_length[2]|max_length[100]',
        'email' => 'required|valid_email|max_length[255]',
        'subject' => 'required|min_length[3]|max_length[255]',
        'message' => 'required|min_length[10]|max_length[5000]',
    ];

    public function isNew()
    {
        return $this->attributes['status'] === 'new';
    }

    public function markAsRead()
    {
        $this->update($this->attributes['id'], ['status' => 'read']);
    }

    public function markAsReplied()
    {
        $this->update($this->attributes['id'], ['status' => 'replied']);
    }
}
`
  },
  {
    path: 'app/Models/NewsletterSubscriber.php',
    name: 'NewsletterSubscriber.php',
    language: 'php',
    category: 'Models',
    description: 'Newsletter subscriber model',
    content: `<?php

namespace App\\Models;

use CodeIgniter\\Model;

class NewsletterSubscriber extends Model
{
    protected $table = 'newsletter_subscribers';
    protected $primaryKey = 'id';
    protected $allowedFields = ['email', 'token', 'verified', 'status'];
    protected $useTimestamps = true;
    protected $createdField = 'subscribed_at';

    protected $validationRules = [
        'email' => 'required|valid_email|is_unique[newsletter_subscribers.email]',
    ];

    public function isActive()
    {
        return $this->attributes['status'] === 'active';
    }

    public function isVerified()
    {
        return (bool) $this->attributes['verified'];
    }

    public function verify()
    {
        $this->update($this->attributes['id'], ['verified' => 1]);
    }

    public function unsubscribe()
    {
        $this->update($this->attributes['id'], ['status' => 'unsubscribed']);
    }

    public function generateToken(): string
    {
        return bin2hex(random_bytes(32));
    }
}
`
  },
];
