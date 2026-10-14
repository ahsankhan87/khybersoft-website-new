export interface CI4File {
  path: string;
  name: string;
  language: string;
  content: string;
  description: string;
  category: string;
}

export const ci4ControllersFront: CI4File[] = [
  {
    path: 'app/Controllers/Home.php',
    name: 'Home.php',
    language: 'php',
    category: 'Frontend Controllers',
    description: 'Homepage controller',
    content: `<?php

namespace App\\Controllers;

use App\\Models\\Product;
use App\\Models\\BlogPost;
use App\\Models\\Testimonial;
use App\\Models\\Service;
use App\\Models\\Client;
use App\\Models\\Tutorial;

class Home extends BaseController
{
    public function index(): string
    {
        $productModel = new Product();
        $blogModel = new BlogPost();
        $testimonialModel = new Testimonial();
        $serviceModel = new Service();
        $clientModel = new Client();
        $tutorialModel = new Tutorial();

        $data = [
            'title' => setting('site_name', 'Khybersoft') . ' - ' . setting('site_tagline', 'Innovative Software Solutions'),
            'meta_desc' => 'Khybersoft - Innovative software solutions for modern businesses.',
            'featured_products' => $productModel->where(['is_featured' => 1, 'status' => 'published'])->findAll(6),
            'product_categories' => $this->db->table('product_categories')->orderBy('sort_order', 'ASC')->get()->getResultArray(),
            'testimonials' => $testimonialModel->where('status', 'published')->orderBy('sort_order', 'ASC')->findAll(10),
            'latest_posts' => $blogModel->where('status', 'published')->orderBy('published_at', 'DESC')->findAll(3),
            'services' => $serviceModel->where('status', 'published')->orderBy('sort_order', 'ASC')->findAll(3),
            'clients' => $clientModel->where('status', 'active')->orderBy('sort_order', 'ASC')->findAll(),
            'tutorials' => $tutorialModel->where('status', 'published')->orderBy('created_at', 'DESC')->findAll(4),
            'stats' => [
                ['value' => '150+', 'label' => 'Projects Delivered'],
                ['value' => '80+', 'label' => 'Happy Clients'],
                ['value' => '25+', 'label' => 'Countries'],
                ['value' => '8+', 'label' => 'Years Experience'],
            ],
        ];

        return view('frontend/home/index', $data);
    }

    public function about(): string
    {
        $data = [
            'title' => 'About Us - ' . setting('site_name', 'Khybersoft'),
            'team' => $this->db->table('team_members')->where('status', 'active')->orderBy('sort_order', 'ASC')->get()->getResultArray(),
        ];

        return view('frontend/home/about', $data);
    }

    public function contact(): string
    {
        return view('frontend/home/contact', [
            'title' => 'Contact Us - ' . setting('site_name', 'Khybersoft'),
        ]);
    }

    public function submitContact()
    {
        $rules = [
            'name' => 'required|min_length[2]|max_length[100]',
            'email' => 'required|valid_email',
            'subject' => 'required|min_length[3]|max_length[255]',
            'message' => 'required|min_length[10]|max_length[5000]',
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()->withInput()->with('errors', $this->validator->getErrors());
        }

        $this->db->table('contact_messages')->insert([
            'name' => $this->request->getPost('name'),
            'email' => $this->request->getPost('email'),
            'phone' => $this->request->getPost('phone'),
            'subject' => $this->request->getPost('subject'),
            'message' => $this->request->getPost('message'),
            'ip' => $this->request->getIPAddress(),
            'status' => 'new',
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return redirect()->to('/contact')->with('success', 'Thank you! Your message has been sent.');
    }
}
`
  },
  {
    path: 'app/Controllers/Products.php',
    name: 'Products.php',
    language: 'php',
    category: 'Frontend Controllers',
    description: 'Products listing and detail',
    content: `<?php

namespace App\\Controllers;

use App\\Models\\Product;

class Products extends BaseController
{
    public function index(): string
    {
        $productModel = new Product();
        $page = max(1, (int) $this->request->getGet('page'));
        $category = $this->request->getGet('category');
        $search = trim($this->request->getGet('search') ?? '');

        $builder = $productModel->select('products.*, product_categories.name as category_name')
            ->join('product_categories', 'product_categories.id = products.category_id', 'left')
            ->where('products.status', 'published')
            ->where('products.deleted_at', null);

        if ($category) {
            $builder->where('product_categories.slug', $category);
        }

        if ($search) {
            $builder->groupStart()
                ->like('products.name', $search)
                ->orLike('products.tagline', $search)
                ->groupEnd();
        }

        $total = $builder->countAllResults(false);
        $perPage = 12;
        $products = $builder->orderBy('products.sort_order', 'ASC')
            ->limit($perPage, ($page - 1) * $perPage)
            ->get()->getResultArray();

        $categories = $this->db->table('product_categories')->orderBy('sort_order', 'ASC')->get()->getResultArray();

        return view('frontend/products/index', [
            'title' => 'Our Products - ' . setting('site_name', 'Khybersoft'),
            'products' => $products,
            'categories' => $categories,
            'current_category' => $category,
            'search' => $search,
            'pager' => ['total' => $total, 'per_page' => $perPage, 'current_page' => $page, 'last_page' => max(1, (int) ceil($total / $perPage))],
        ]);
    }

    public function show(string $slug): string
    {
        $productModel = new Product();
        $product = $productModel->select('products.*, product_categories.name as category_name')
            ->join('product_categories', 'product_categories.id = products.category_id', 'left')
            ->where('products.slug', $slug)
            ->where('products.status', 'published')
            ->where('products.deleted_at', null)
            ->first();

        if (!$product) {
            throw \\CodeIgniter\\Exceptions\\PageNotFoundException::forPageNotFound('Product not found');
        }

        $plans = $this->db->table('product_plans')->where('product_id', $product['id'])->orderBy('sort_order', 'ASC')->get()->getResultArray();
        $features = $this->db->table('product_features')->where('product_id', $product['id'])->orderBy('sort_order', 'ASC')->get()->getResultArray();
        $faqs = $this->db->table('product_faqs')->where('product_id', $product['id'])->orderBy('sort_order', 'ASC')->get()->getResultArray();
        $demos = $this->db->table('product_demos')->where('product_id', $product['id'])->orderBy('sort_order', 'ASC')->get()->getResultArray();
        $screenshots = json_decode($product['screenshots'] ?? '[]', true) ?: [];
        $related = $productModel->where(['category_id' => $product['category_id'], 'status' => 'published', 'deleted_at' => null])
            ->where('id !=', $product['id'])->findAll(3);

        return view('frontend/products/show', [
            'title' => ($product['meta_title'] ?: $product['name']) . ' - ' . setting('site_name', 'Khybersoft'),
            'product' => $product,
            'plans' => $plans,
            'features' => $features,
            'faqs' => $faqs,
            'demos' => $demos,
            'screenshots' => $screenshots,
            'related' => $related,
        ]);
    }

    public function inquire(string $slug)
    {
        $productModel = new Product();
        $product = $productModel->where('slug', $slug)->first();
        if (!$product) {
            return redirect()->back()->with('error', 'Product not found.');
        }

        $rules = [
            'name' => 'required|min_length[2]|max_length[100]',
            'email' => 'required|valid_email',
            'message' => 'required|min_length[10]|max_length[2000]',
            'type' => 'required|in_list[demo,quote,support]',
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()->withInput()->with('errors', $this->validator->getErrors());
        }

        $this->db->table('product_inquiries')->insert([
            'product_id' => $product['id'],
            'name' => $this->request->getPost('name'),
            'email' => $this->request->getPost('email'),
            'phone' => $this->request->getPost('phone'),
            'company' => $this->request->getPost('company'),
            'message' => $this->request->getPost('message'),
            'type' => $this->request->getPost('type'),
            'ip' => $this->request->getIPAddress(),
            'status' => 'new',
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return redirect()->to('/products/' . $slug)->with('success', 'Thank you! We will contact you shortly.');
    }
}
`
  },
  {
    path: 'app/Controllers/Blog.php',
    name: 'Blog.php',
    language: 'php',
    category: 'Frontend Controllers',
    description: 'Blog listing and post detail',
    content: `<?php

namespace App\\Controllers;

use App\\Models\\BlogPost;

class Blog extends BaseController
{
    public function index(): string
    {
        $blogModel = new BlogPost();
        $page = max(1, (int) $this->request->getGet('page'));
        $category = $this->request->getGet('category');
        $search = trim($this->request->getGet('search') ?? '');

        $builder = $blogModel->select('blog_posts.*, blog_categories.name as category_name, users.name as author_name')
            ->join('blog_categories', 'blog_categories.id = blog_posts.category_id', 'left')
            ->join('users', 'users.id = blog_posts.author_id', 'left')
            ->where('blog_posts.status', 'published')
            ->where('blog_posts.published_at <=', date('Y-m-d H:i:s'))
            ->where('blog_posts.deleted_at', null);

        if ($category) {
            $builder->where('blog_categories.slug', $category);
        }

        if ($search) {
            $builder->groupStart()
                ->like('blog_posts.title', $search)
                ->orLike('blog_posts.excerpt', $search)
                ->groupEnd();
        }

        $total = $builder->countAllResults(false);
        $perPage = 9;
        $posts = $builder->orderBy('blog_posts.published_at', 'DESC')
            ->limit($perPage, ($page - 1) * $perPage)
            ->get()->getResultArray();

        $categories = $this->db->table('blog_categories')->orderBy('name', 'ASC')->get()->getResultArray();

        return view('frontend/blog/index', [
            'title' => 'Blog - ' . setting('site_name', 'Khybersoft'),
            'posts' => $posts,
            'categories' => $categories,
            'current_category' => $category,
            'search' => $search,
            'pager' => ['total' => $total, 'per_page' => $perPage, 'current_page' => $page, 'last_page' => max(1, (int) ceil($total / $perPage))],
        ]);
    }

    public function show(string $slug): string
    {
        $blogModel = new BlogPost();
        $post = $blogModel->select('blog_posts.*, blog_categories.name as category_name, users.name as author_name')
            ->join('blog_categories', 'blog_categories.id = blog_posts.category_id', 'left')
            ->join('users', 'users.id = blog_posts.author_id', 'left')
            ->where('blog_posts.slug', $slug)
            ->where('blog_posts.status', 'published')
            ->where('blog_posts.deleted_at', null)
            ->first();

        if (!$post) {
            throw \\CodeIgniter\\Exceptions\\PageNotFoundException::forPageNotFound('Post not found');
        }

        $blogModel->update($post['id'], ['views' => ($post['views'] ?? 0) + 1]);

        $tags = $this->db->table('blog_tags')
            ->select('blog_tags.*')
            ->join('blog_post_tags', 'blog_post_tags.tag_id = blog_tags.id')
            ->where('blog_post_tags.post_id', $post['id'])
            ->get()->getResultArray();

        $comments = $this->db->table('blog_comments')
            ->where(['post_id' => $post['id'], 'status' => 'approved'])
            ->orderBy('created_at', 'ASC')
            ->get()->getResultArray();

        $related = $blogModel->select('title, slug, featured_image, excerpt')
            ->where(['category_id' => $post['category_id'], 'status' => 'published', 'deleted_at' => null])
            ->where('id !=', $post['id'])
            ->orderBy('published_at', 'DESC')
            ->findAll(3);

        return view('frontend/blog/show', [
            'title' => ($post['meta_title'] ?: $post['title']) . ' - Blog',
            'post' => $post,
            'tags' => $tags,
            'comments' => $comments,
            'related' => $related,
        ]);
    }

    public function submitComment(string $slug)
    {
        $blogModel = new BlogPost();
        $post = $blogModel->where('slug', $slug)->where('status', 'published')->first();
        if (!$post) {
            return redirect()->back();
        }

        $rules = [
            'name' => 'required|min_length[2]|max_length[100]',
            'email' => 'required|valid_email',
            'message' => 'required|min_length[5]|max_length[2000]',
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()->withInput()->with('comment_errors', $this->validator->getErrors());
        }

        $this->db->table('blog_comments')->insert([
            'post_id' => $post['id'],
            'name' => $this->request->getPost('name'),
            'email' => $this->request->getPost('email'),
            'message' => $this->request->getPost('message'),
            'ip' => $this->request->getIPAddress(),
            'status' => 'pending',
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return redirect()->to('/blog/' . $slug)->with('success', 'Your comment is awaiting moderation.');
    }
}
`
  },
];
