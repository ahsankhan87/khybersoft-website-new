<?php

namespace App\Models;

use CodeIgniter\Model;

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
