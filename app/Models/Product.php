<?php

namespace App\Models;

use CodeIgniter\Model;

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
