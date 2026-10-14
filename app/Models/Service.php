<?php

namespace App\Models;

use CodeIgniter\Model;

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
