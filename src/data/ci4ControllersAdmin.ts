export interface CI4File {
  path: string;
  name: string;
  language: string;
  content: string;
  description: string;
  category: string;
}

export const ci4ControllersAdmin: CI4File[] = [
  {
    path: 'app/Controllers/Admin/Auth.php',
    name: 'Auth.php',
    language: 'php',
    category: 'Admin Controllers',
    description: 'Admin authentication controller',
    content: `<?php

namespace App\\Controllers\\Admin;

use App\\Controllers\\BaseController;
use App\\Models\\User;

class Auth extends BaseController
{
    public function login(): string
    {
        if (session()->get('logged_in')) {
            return redirect()->to('/admin');
        }

        return view('admin/auth/login', ['title' => 'Admin Login']);
    }

    public function attemptLogin()
    {
        $ip = $this->request->getIPAddress();
        $attempts = session()->get('login_attempts_' . $ip) ?? 0;

        if ($attempts >= 5) {
            return redirect()->back()->with('error', 'Too many login attempts. Please try again in 15 minutes.');
        }

        $rules = [
            'email' => 'required|valid_email',
            'password' => 'required|min_length[6]',
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()->withInput()->with('errors', $this->validator->getErrors());
        }

        $userModel = new User();
        $email = $this->request->getPost('email');
        $password = $this->request->getPost('password');
        $remember = $this->request->getPost('remember');

        $user = $userModel->where('email', $email)->where('status', 'active')->where('deleted_at', null)->first();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            session()->set('login_attempts_' . $ip, $attempts + 1);
            $this->logActivity('login_failed', 'User', null, null, ['email' => $email, 'ip' => $ip]);
            return redirect()->back()->withInput()->with('error', 'Invalid email or password.');
        }

        session()->regenerate();
        session()->set([
            'user_id' => $user['id'],
            'user_name' => $user['name'],
            'user_email' => $user['email'],
            'user_role' => $user['role_id'],
            'logged_in' => true,
            'last_activity' => time(),
        ]);

        session()->remove('login_attempts_' . $ip);

        $userModel->update($user['id'], [
            'last_login' => date('Y-m-d H:i:s'),
            'last_login_ip' => $ip,
            'failed_attempts' => 0,
        ]);

        if ($remember) {
            $token = bin2hex(random_bytes(32));
            $hashedToken = hash('sha256', $token);
            $userModel->update($user['id'], ['remember_token' => $hashedToken]);
            set_cookie('remember_token', $user['id'] . ':' . $token, 30 * 86400);
        }

        $this->logActivity('login', 'User', $user['id']);

        $intended = session()->get('intended_url') ?? '/admin';
        session()->remove('intended_url');

        return redirect()->to($intended)->with('success', 'Welcome back, ' . $user['name'] . '!');
    }

    public function logout()
    {
        $userId = session()->get('user_id');
        if ($userId) {
            $this->logActivity('logout', 'User', $userId);
            (new User())->update($userId, ['remember_token' => null]);
        }

        delete_cookie('remember_token');
        session()->destroy();

        return redirect()->to('/admin/login');
    }

    public function forgotPassword(): string
    {
        return view('admin/auth/forgot-password', ['title' => 'Forgot Password']);
    }

    public function sendResetLink()
    {
        $rules = ['email' => 'required|valid_email'];

        if (!$this->validate($rules)) {
            return redirect()->back()->withInput()->with('errors', $this->validator->getErrors());
        }

        $email = $this->request->getPost('email');
        $userModel = new User();
        $user = $userModel->where('email', $email)->where('status', 'active')->first();

        if ($user) {
            $token = bin2hex(random_bytes(32));
            $hashedToken = hash('sha256', $token);

            $this->db->table('password_resets')->insert([
                'user_id' => $user['id'],
                'token' => $hashedToken,
                'expires_at' => date('Y-m-d H:i:s', time() + 3600),
                'used' => 0,
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            $resetUrl = site_url('/admin/reset-password?token=' . $token . '&email=' . urlencode($email));

            $emailService = \\Config\\Services::email();
            $emailService->setTo($email);
            $emailService->setFrom(setting('site_email', 'noreply@khybersoft.com'));
            $emailService->setSubject('Password Reset - ' . setting('site_name', 'Khybersoft'));
            $emailService->setMessage(view('emails/password-reset', ['name' => $user['name'], 'resetUrl' => $resetUrl]));
            $emailService->send();
        }

        return redirect()->to('/admin/forgot-password')->with('success', 'If an account exists with that email, a reset link has been sent.');
    }

    public function resetPassword(): string
    {
        $token = $this->request->getGet('token');
        $email = $this->request->getGet('email');

        if (!$token || !$email) {
            return redirect()->to('/admin/login')->with('error', 'Invalid reset link.');
        }

        return view('admin/auth/reset-password', [
            'title' => 'Reset Password',
            'token' => $token,
            'email' => $email,
        ]);
    }

    public function updatePassword()
    {
        $rules = [
            'email' => 'required|valid_email',
            'token' => 'required',
            'password' => 'required|min_length[8]|matches[password_confirmation]',
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()->withInput()->with('errors', $this->validator->getErrors());
        }

        $email = $this->request->getPost('email');
        $token = $this->request->getPost('token');
        $hashedToken = hash('sha256', $token);

        $reset = $this->db->table('password_resets')
            ->select('password_resets.*, users.id as user_id')
            ->join('users', 'users.id = password_resets.user_id')
            ->where('password_resets.token', $hashedToken)
            ->where('users.email', $email)
            ->where('password_resets.used', 0)
            ->where('password_resets.expires_at >', date('Y-m-d H:i:s'))
            ->get()->getRowArray();

        if (!$reset) {
            return redirect()->to('/admin/forgot-password')->with('error', 'Invalid or expired reset token.');
        }

        $userModel = new User();
        $userModel->update($reset['user_id'], [
            'password_hash' => password_hash($this->request->getPost('password'), PASSWORD_BCRYPT, ['cost' => 12]),
            'remember_token' => null,
        ]);

        $this->db->table('password_resets')->where('id', $reset['id'])->update(['used' => 1]);

        return redirect()->to('/admin/login')->with('success', 'Password has been reset. Please log in.');
    }
}
`
  },
  {
    path: 'app/Controllers/Admin/Dashboard.php',
    name: 'Dashboard.php',
    language: 'php',
    category: 'Admin Controllers',
    description: 'Admin dashboard controller',
    content: `<?php

namespace App\\Controllers\\Admin;

use App\\Controllers\\BaseController;

class Dashboard extends BaseController
{
    public function index(): string
    {
        $stats = [
            'total_products' => (int) $this->db->table('products')->where('deleted_at', null)->countAllResults(),
            'inquiries_today' => (int) $this->db->table('product_inquiries')->where('DATE(created_at)', date('Y-m-d'))->countAllResults(),
            'blog_posts' => (int) $this->db->table('blog_posts')->where(['status' => 'published'])->where('deleted_at', null)->countAllResults(),
            'subscribers' => (int) $this->db->table('newsletter_subscribers')->where('status', 'active')->countAllResults(),
            'messages_unread' => (int) $this->db->table('contact_messages')->where('status', 'new')->countAllResults(),
            'total_users' => (int) $this->db->table('users')->where(['deleted_at' => null, 'status' => 'active'])->countAllResults(),
        ];

        $recentInquiries = $this->db->table('product_inquiries')
            ->select('product_inquiries.*, products.name as product_name')
            ->join('products', 'products.id = product_inquiries.product_id', 'left')
            ->orderBy('product_inquiries.created_at', 'DESC')
            ->limit(10)
            ->get()->getResultArray();

        $recentActivity = $this->db->table('activity_logs')
            ->select('activity_logs.*, users.name as user_name')
            ->join('users', 'users.id = activity_logs.user_id', 'left')
            ->orderBy('activity_logs.created_at', 'DESC')
            ->limit(20)
            ->get()->getResultArray();

        $topProducts = $this->db->table('products')
            ->select('products.name, products.slug, COUNT(product_inquiries.id) as inquiry_count')
            ->join('product_inquiries', 'product_inquiries.product_id = products.id')
            ->groupBy('products.id, products.name, products.slug')
            ->orderBy('inquiry_count', 'DESC')
            ->limit(5)
            ->get()->getResultArray();

        return view('admin/dashboard', [
            'title' => 'Dashboard',
            'stats' => $stats,
            'recent_inquiries' => $recentInquiries,
            'recent_activity' => $recentActivity,
            'top_products' => $topProducts,
            'user' => $this->getCurrentUser(),
        ]);
    }

    public function updateInquiryStatus()
    {
        $id = (int) $this->request->getPost('id');
        $status = $this->request->getPost('status');
        $allowedStatuses = ['new', 'in_progress', 'resolved', 'closed'];

        if (!in_array($status, $allowedStatuses)) {
            return $this->response->setJSON(['error' => 'Invalid status'], 400);
        }

        $this->db->table('product_inquiries')->where('id', $id)->update([
            'status' => $status,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->response->setJSON(['success' => true]);
    }
}
`
  },
  {
    path: 'app/Controllers/Admin/Pages.php',
    name: 'Pages.php',
    language: 'php',
    category: 'Admin Controllers',
    description: 'Admin pages CRUD',
    content: `<?php

namespace App\\Controllers\\Admin;

use App\\Controllers\\BaseController;
use App\\Models\\Page;

class Pages extends BaseController
{
    protected Page $pageModel;

    public function __construct()
    {
        $this->pageModel = new Page();
    }

    public function index(): string
    {
        $page = max(1, (int) $this->request->getGet('page'));
        $search = trim($this->request->getGet('search') ?? '');
        $filters = $this->request->getGet('filter') ?? [];

        $builder = $this->pageModel->where('deleted_at', null);

        if ($search) {
            $builder->groupStart()->like('title', $search)->orLike('slug', $search)->groupEnd();
        }

        if (!empty($filters['status'])) {
            $builder->where('status', $filters['status']);
        }

        $total = $builder->countAllResults(false);
        $perPage = 15;
        $items = $builder->orderBy('sort_order', 'ASC')->limit($perPage, ($page - 1) * $perPage)->get()->getResultArray();

        return view('admin/pages/index', [
            'title' => 'Pages',
            'items' => $items,
            'pagination' => ['total' => $total, 'per_page' => $perPage, 'current_page' => $page, 'last_page' => max(1, (int) ceil($total / $perPage))],
            'search' => $search,
            'filters' => $filters,
            'route_prefix' => '/admin/pages',
        ]);
    }

    public function create(): string
    {
        return view('admin/pages/create', ['title' => 'Create Page', 'item' => [], 'route_prefix' => '/admin/pages']);
    }

    public function store()
    {
        $rules = [
            'title' => 'required|min_length[2]|max_length[255]',
            'content' => 'required',
            'template' => 'required|in_list[default,full-width,sidebar,landing,contact]',
            'status' => 'required|in_list[draft,published,archived]',
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()->withInput()->with('errors', $this->validator->getErrors());
        }

        $data = $this->request->getPost();
        unset($data['csrf_token']);

        if (empty($data['slug'])) {
            $data['slug'] = url_title($data['title'], '-', true);
        }

        $data['created_at'] = date('Y-m-d H:i:s');
        $data['updated_at'] = date('Y-m-d H:i:s');

        $id = $this->pageModel->insert($data);
        $this->logActivity('create', 'Page', $id);

        return redirect()->to('/admin/pages')->with('success', 'Page created successfully!');
    }

    public function edit(int $id): string
    {
        $item = $this->pageModel->find($id);
        if (!$item) {
            return redirect()->to('/admin/pages')->with('error', 'Page not found.');
        }

        return view('admin/pages/edit', ['title' => 'Edit Page', 'item' => $item, 'route_prefix' => '/admin/pages']);
    }

    public function update(int $id)
    {
        $item = $this->pageModel->find($id);
        if (!$item) {
            return redirect()->to('/admin/pages')->with('error', 'Page not found.');
        }

        $rules = [
            'title' => 'required|min_length[2]|max_length[255]',
            'content' => 'required',
            'status' => 'required|in_list[draft,published,archived]',
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()->withInput()->with('errors', $this->validator->getErrors());
        }

        $data = $this->request->getPost();
        unset($data['csrf_token']);

        if (empty($data['slug'])) {
            $data['slug'] = url_title($data['title'], '-', true);
        }

        $data['updated_at'] = date('Y-m-d H:i:s');

        $this->pageModel->update($id, $data);
        $this->logActivity('update', 'Page', $id);

        return redirect()->to('/admin/pages')->with('success', 'Page updated successfully!');
    }

    public function delete(int $id)
    {
        $item = $this->pageModel->find($id);
        if (!$item) {
            return redirect()->to('/admin/pages')->with('error', 'Page not found.');
        }

        $this->pageModel->update($id, ['deleted_at' => date('Y-m-d H:i:s')]);
        $this->logActivity('delete', 'Page', $id);

        return redirect()->to('/admin/pages')->with('success', 'Page deleted!');
    }
}
`
  },
  {
    path: 'app/Controllers/Admin/Products.php',
    name: 'Products.php',
    language: 'php',
    category: 'Admin Controllers',
    description: 'Admin products CRUD',
    content: `<?php

namespace App\\Controllers\\Admin;

use App\\Controllers\\BaseController;
use App\\Models\\Product;

class Products extends BaseController
{
    protected Product $productModel;

    public function __construct()
    {
        $this->productModel = new Product();
    }

    public function index(): string
    {
        $page = max(1, (int) $this->request->getGet('page'));
        $search = trim($this->request->getGet('search') ?? '');
        $filters = $this->request->getGet('filter') ?? [];

        $builder = $this->productModel->select('products.*, product_categories.name as category_name')
            ->join('product_categories', 'product_categories.id = products.category_id', 'left')
            ->where('products.deleted_at', null);

        if ($search) {
            $builder->groupStart()->like('products.name', $search)->orLike('products.tagline', $search)->groupEnd();
        }

        if (!empty($filters['status'])) {
            $builder->where('products.status', $filters['status']);
        }

        $total = $builder->countAllResults(false);
        $perPage = 15;
        $items = $builder->orderBy('products.sort_order', 'ASC')->limit($perPage, ($page - 1) * $perPage)->get()->getResultArray();

        $categories = $this->db->table('product_categories')->orderBy('sort_order', 'ASC')->get()->getResultArray();

        return view('admin/products/index', [
            'title' => 'Products',
            'items' => $items,
            'categories' => $categories,
            'pagination' => ['total' => $total, 'per_page' => $perPage, 'current_page' => $page, 'last_page' => max(1, (int) ceil($total / $perPage))],
            'search' => $search,
            'filters' => $filters,
            'route_prefix' => '/admin/products',
        ]);
    }

    public function create(): string
    {
        $categories = $this->db->table('product_categories')->orderBy('sort_order', 'ASC')->get()->getResultArray();
        return view('admin/products/create', ['title' => 'Create Product', 'item' => [], 'categories' => $categories, 'route_prefix' => '/admin/products']);
    }

    public function store()
    {
        $rules = [
            'name' => 'required|min_length[2]|max_length[255]',
            'full_desc' => 'required',
            'price_type' => 'required|in_list[one_time,subscription,custom,free]',
            'status' => 'required|in_list[draft,published,archived]',
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()->withInput()->with('errors', $this->validator->getErrors());
        }

        $data = $this->request->getPost();
        unset($data['csrf_token'], $data['features'], $data['plans']);

        if (empty($data['slug'])) {
            $data['slug'] = url_title($data['name'], '-', true);
        }

        // Handle file uploads
        $icon = $this->request->getFile('icon');
        if ($icon && $icon->isValid() && !$icon->hasMoved()) {
            $icon->move(FCPATH . 'uploads/products', $icon->getRandomName());
            $data['icon'] = 'products/' . $icon->getName();
        }

        $heroImage = $this->request->getFile('hero_image');
        if ($heroImage && $heroImage->isValid() && !$heroImage->hasMoved()) {
            $heroImage->move(FCPATH . 'uploads/products', $heroImage->getRandomName());
            $data['hero_image'] = 'products/' . $heroImage->getName();
        }

        $data['is_featured'] = isset($data['is_featured']) ? 1 : 0;
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['updated_at'] = date('Y-m-d H:i:s');

        $productId = $this->productModel->insert($data);

        // Save features
        $features = $this->request->getPost('features') ?? [];
        foreach ($features as $i => $feat) {
            if (!empty($feat['title'])) {
                $this->db->table('product_features')->insert([
                    'product_id' => $productId,
                    'title' => $feat['title'],
                    'description' => $feat['description'] ?? '',
                    'icon' => $feat['icon'] ?? '',
                    'sort_order' => $i,
                ]);
            }
        }

        // Save plans
        $plans = $this->request->getPost('plans') ?? [];
        foreach ($plans as $i => $plan) {
            if (!empty($plan['name'])) {
                $this->db->table('product_plans')->insert([
                    'product_id' => $productId,
                    'name' => $plan['name'],
                    'price' => $plan['price'] ?? 0,
                    'billing_cycle' => $plan['billing_cycle'] ?? 'lifetime',
                    'features' => json_encode(array_filter(explode("\\n", $plan['features'] ?? ''))),
                    'is_popular' => $plan['is_popular'] ?? 0,
                    'sort_order' => $i,
                ]);
            }
        }

        $this->logActivity('create', 'Product', $productId);

        return redirect()->to('/admin/products')->with('success', 'Product created successfully!');
    }

    public function edit(int $id): string
    {
        $item = $this->productModel->find($id);
        if (!$item) {
            return redirect()->to('/admin/products')->with('error', 'Product not found.');
        }

        $categories = $this->db->table('product_categories')->orderBy('sort_order', 'ASC')->get()->getResultArray();
        $features = $this->db->table('product_features')->where('product_id', $id)->orderBy('sort_order', 'ASC')->get()->getResultArray();
        $plans = $this->db->table('product_plans')->where('product_id', $id)->orderBy('sort_order', 'ASC')->get()->getResultArray();

        return view('admin/products/edit', [
            'title' => 'Edit Product',
            'item' => $item,
            'categories' => $categories,
            'features' => $features,
            'plans' => $plans,
            'route_prefix' => '/admin/products',
        ]);
    }

    public function update(int $id)
    {
        $item = $this->productModel->find($id);
        if (!$item) {
            return redirect()->to('/admin/products')->with('error', 'Product not found.');
        }

        $rules = [
            'name' => 'required|min_length[2]|max_length[255]',
            'full_desc' => 'required',
            'status' => 'required|in_list[draft,published,archived]',
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()->withInput()->with('errors', $this->validator->getErrors());
        }

        $data = $this->request->getPost();
        unset($data['csrf_token'], $data['features'], $data['plans']);

        if (empty($data['slug'])) {
            $data['slug'] = url_title($data['name'], '-', true);
        }

        $data['is_featured'] = isset($data['is_featured']) ? 1 : 0;
        $data['updated_at'] = date('Y-m-d H:i:s');

        $this->productModel->update($id, $data);

        // Update features
        $this->db->table('product_features')->where('product_id', $id)->delete();
        $features = $this->request->getPost('features') ?? [];
        foreach ($features as $i => $feat) {
            if (!empty($feat['title'])) {
                $this->db->table('product_features')->insert([
                    'product_id' => $id,
                    'title' => $feat['title'],
                    'description' => $feat['description'] ?? '',
                    'icon' => $feat['icon'] ?? '',
                    'sort_order' => $i,
                ]);
            }
        }

        // Update plans
        $this->db->table('product_plans')->where('product_id', $id)->delete();
        $plans = $this->request->getPost('plans') ?? [];
        foreach ($plans as $i => $plan) {
            if (!empty($plan['name'])) {
                $this->db->table('product_plans')->insert([
                    'product_id' => $id,
                    'name' => $plan['name'],
                    'price' => $plan['price'] ?? 0,
                    'billing_cycle' => $plan['billing_cycle'] ?? 'lifetime',
                    'features' => json_encode(array_filter(explode("\\n", $plan['features'] ?? ''))),
                    'is_popular' => $plan['is_popular'] ?? 0,
                    'sort_order' => $i,
                ]);
            }
        }

        $this->logActivity('update', 'Product', $id);

        return redirect()->to('/admin/products')->with('success', 'Product updated!');
    }

    public function delete(int $id)
    {
        $item = $this->productModel->find($id);
        if (!$item) {
            return redirect()->to('/admin/products')->with('error', 'Product not found.');
        }

        $this->productModel->update($id, ['deleted_at' => date('Y-m-d H:i:s')]);
        $this->logActivity('delete', 'Product', $id);

        return redirect()->to('/admin/products')->with('success', 'Product deleted!');
    }
}
`
  },
  {
    path: 'app/Controllers/Admin/BlogPosts.php',
    name: 'BlogPosts.php',
    language: 'php',
    category: 'Admin Controllers',
    description: 'Admin blog posts CRUD',
    content: `<?php

namespace App\\Controllers\\Admin;

use App\\Controllers\\BaseController;
use App\\Models\\BlogPost;

class BlogPosts extends BaseController
{
    protected BlogPost $blogModel;

    public function __construct()
    {
        $this->blogModel = new BlogPost();
    }

    public function index(): string
    {
        $page = max(1, (int) $this->request->getGet('page'));
        $search = trim($this->request->getGet('search') ?? '');

        $builder = $this->blogModel->select('blog_posts.*, blog_categories.name as category_name, users.name as author_name')
            ->join('blog_categories', 'blog_categories.id = blog_posts.category_id', 'left')
            ->join('users', 'users.id = blog_posts.author_id', 'left')
            ->where('blog_posts.deleted_at', null);

        if ($search) {
            $builder->groupStart()->like('blog_posts.title', $search)->orLike('blog_posts.excerpt', $search)->groupEnd();
        }

        $total = $builder->countAllResults(false);
        $perPage = 15;
        $items = $builder->orderBy('blog_posts.created_at', 'DESC')->limit($perPage, ($page - 1) * $perPage)->get()->getResultArray();

        $categories = $this->db->table('blog_categories')->orderBy('name', 'ASC')->get()->getResultArray();

        return view('admin/blog/index', [
            'title' => 'Blog Posts',
            'items' => $items,
            'categories' => $categories,
            'pagination' => ['total' => $total, 'per_page' => $perPage, 'current_page' => $page, 'last_page' => max(1, (int) ceil($total / $perPage))],
            'search' => $search,
            'route_prefix' => '/admin/blog',
        ]);
    }

    public function create(): string
    {
        $categories = $this->db->table('blog_categories')->orderBy('name', 'ASC')->get()->getResultArray();
        $tags = $this->db->table('blog_tags')->orderBy('name', 'ASC')->get()->getResultArray();

        return view('admin/blog/create', ['title' => 'Create Blog Post', 'item' => [], 'categories' => $categories, 'tags' => $tags, 'postTagIds' => [], 'route_prefix' => '/admin/blog']);
    }

    public function store()
    {
        $rules = [
            'title' => 'required|min_length[3]|max_length[255]',
            'content' => 'required',
            'status' => 'required|in_list[draft,published,archived]',
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()->withInput()->with('errors', $this->validator->getErrors());
        }

        $data = $this->request->getPost();
        unset($data['csrf_token'], $data['tags']);

        $data['slug'] = $data['slug'] ?? url_title($data['title'], '-', true);
        $data['author_id'] = session()->get('user_id');

        $wordCount = str_word_count(strip_tags($data['content'] ?? ''));
        $data['read_time'] = max(1, (int) ceil($wordCount / 200));

        $file = $this->request->getFile('featured_image');
        if ($file && $file->isValid() && !$file->hasMoved()) {
            $file->move(FCPATH . 'uploads/blog', $file->getRandomName());
            $data['featured_image'] = 'blog/' . $file->getName();
        }

        if ($data['status'] === 'published' && empty($data['published_at'])) {
            $data['published_at'] = date('Y-m-d H:i:s');
        }

        $data['created_at'] = date('Y-m-d H:i:s');
        $data['updated_at'] = date('Y-m-d H:i:s');

        $postId = $this->blogModel->insert($data);

        $tagIds = $this->request->getPost('tags') ?? [];
        foreach ($tagIds as $tagId) {
            $this->db->table('blog_post_tags')->insert(['post_id' => $postId, 'tag_id' => (int) $tagId]);
        }

        $this->logActivity('create', 'Blog Post', $postId);

        return redirect()->to('/admin/blog')->with('success', 'Blog post created!');
    }

    public function edit(int $id): string
    {
        $item = $this->blogModel->find($id);
        if (!$item) {
            return redirect()->to('/admin/blog')->with('error', 'Post not found.');
        }

        $categories = $this->db->table('blog_categories')->orderBy('name', 'ASC')->get()->getResultArray();
        $tags = $this->db->table('blog_tags')->orderBy('name', 'ASC')->get()->getResultArray();
        $postTags = $this->db->table('blog_post_tags')->where('post_id', $id)->get()->getResultArray();
        $postTagIds = array_column($postTags, 'tag_id');

        return view('admin/blog/edit', ['title' => 'Edit Blog Post', 'item' => $item, 'categories' => $categories, 'tags' => $tags, 'postTagIds' => $postTagIds, 'route_prefix' => '/admin/blog']);
    }

    public function update(int $id)
    {
        $item = $this->blogModel->find($id);
        if (!$item) {
            return redirect()->to('/admin/blog')->with('error', 'Post not found.');
        }

        $rules = ['title' => 'required|min_length[3]|max_length[255]', 'content' => 'required', 'status' => 'required|in_list[draft,published,archived]'];

        if (!$this->validate($rules)) {
            return redirect()->back()->withInput()->with('errors', $this->validator->getErrors());
        }

        $data = $this->request->getPost();
        unset($data['csrf_token'], $data['tags']);

        $wordCount = str_word_count(strip_tags($data['content'] ?? ''));
        $data['read_time'] = max(1, (int) ceil($wordCount / 200));
        $data['updated_at'] = date('Y-m-d H:i:s');

        $this->blogModel->update($id, $data);

        $this->db->table('blog_post_tags')->where('post_id', $id)->delete();
        $tagIds = $this->request->getPost('tags') ?? [];
        foreach ($tagIds as $tagId) {
            $this->db->table('blog_post_tags')->insert(['post_id' => $id, 'tag_id' => (int) $tagId]);
        }

        $this->logActivity('update', 'Blog Post', $id);

        return redirect()->to('/admin/blog')->with('success', 'Blog post updated!');
    }

    public function delete(int $id)
    {
        $item = $this->blogModel->find($id);
        if (!$item) {
            return redirect()->to('/admin/blog')->with('error', 'Post not found.');
        }

        $this->blogModel->update($id, ['deleted_at' => date('Y-m-d H:i:s')]);
        $this->logActivity('delete', 'Blog Post', $id);

        return redirect()->to('/admin/blog')->with('success', 'Blog post deleted!');
    }
}
`
  },
  {
    path: 'app/Controllers/Admin/Users.php',
    name: 'Users.php',
    language: 'php',
    category: 'Admin Controllers',
    description: 'Admin users CRUD',
    content: `<?php

namespace App\\Controllers\\Admin;

use App\\Controllers\\BaseController;
use App\\Models\\User;

class Users extends BaseController
{
    protected User $userModel;

    public function __construct()
    {
        $this->userModel = new User();
    }

    public function index(): string
    {
        $page = max(1, (int) $this->request->getGet('page'));
        $search = trim($this->request->getGet('search') ?? '');

        $builder = $this->userModel->select('users.*, roles.name as role_name')
            ->join('roles', 'roles.id = users.role_id', 'left')
            ->where('users.deleted_at', null);

        if ($search) {
            $builder->groupStart()->like('users.name', $search)->orLike('users.email', $search)->groupEnd();
        }

        $total = $builder->countAllResults(false);
        $perPage = 15;
        $items = $builder->orderBy('users.created_at', 'DESC')->limit($perPage, ($page - 1) * $perPage)->get()->getResultArray();

        return view('admin/users/index', [
            'title' => 'Users',
            'items' => $items,
            'pagination' => ['total' => $total, 'per_page' => $perPage, 'current_page' => $page, 'last_page' => max(1, (int) ceil($total / $perPage))],
            'search' => $search,
            'route_prefix' => '/admin/users',
        ]);
    }

    public function create(): string
    {
        $roles = $this->db->table('roles')->orderBy('name', 'ASC')->get()->getResultArray();
        return view('admin/users/create', ['title' => 'Create User', 'item' => [], 'roles' => $roles, 'route_prefix' => '/admin/users']);
    }

    public function store()
    {
        $rules = [
            'name' => 'required|min_length[2]|max_length[100]',
            'email' => 'required|valid_email|is_unique[users.email]',
            'role_id' => 'required|integer',
            'password' => 'required|min_length[8]',
            'status' => 'required|in_list[active,inactive,banned]',
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()->withInput()->with('errors', $this->validator->getErrors());
        }

        $data = $this->request->getPost();
        unset($data['csrf_token'], $data['password_confirmation']);

        $data['password_hash'] = password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => 12]);
        unset($data['password']);

        $data['created_at'] = date('Y-m-d H:i:s');
        $data['updated_at'] = date('Y-m-d H:i:s');

        $id = $this->userModel->insert($data);
        $this->logActivity('create', 'User', $id);

        return redirect()->to('/admin/users')->with('success', 'User created!');
    }

    public function edit(int $id): string
    {
        $item = $this->userModel->find($id);
        if (!$item) {
            return redirect()->to('/admin/users')->with('error', 'User not found.');
        }

        $roles = $this->db->table('roles')->orderBy('name', 'ASC')->get()->getResultArray();
        return view('admin/users/edit', ['title' => 'Edit User', 'item' => $item, 'roles' => $roles, 'route_prefix' => '/admin/users']);
    }

    public function update(int $id)
    {
        $item = $this->userModel->find($id);
        if (!$item) {
            return redirect()->to('/admin/users')->with('error', 'User not found.');
        }

        $rules = [
            'name' => 'required|min_length[2]|max_length[100]',
            'email' => 'required|valid_email|is_unique[users.email,id,' . $id . ']',
            'role_id' => 'required|integer',
            'status' => 'required|in_list[active,inactive,banned]',
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()->withInput()->with('errors', $this->validator->getErrors());
        }

        $data = $this->request->getPost();
        unset($data['csrf_token'], $data['password'], $data['password_confirmation']);

        $password = $this->request->getPost('password');
        if (!empty($password)) {
            $data['password_hash'] = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
            $data['remember_token'] = null;
        }

        $data['updated_at'] = date('Y-m-d H:i:s');

        $this->userModel->update($id, $data);
        $this->logActivity('update', 'User', $id);

        return redirect()->to('/admin/users')->with('success', 'User updated!');
    }

    public function delete(int $id)
    {
        $item = $this->userModel->find($id);
        if (!$item) {
            return redirect()->to('/admin/users')->with('error', 'User not found.');
        }

        if ($id == session()->get('user_id')) {
            return redirect()->to('/admin/users')->with('error', 'You cannot delete your own account.');
        }

        $this->userModel->update($id, ['deleted_at' => date('Y-m-d H:i:s')]);
        $this->logActivity('delete', 'User', $id);

        return redirect()->to('/admin/users')->with('success', 'User deleted!');
    }
}
`
  },
];
