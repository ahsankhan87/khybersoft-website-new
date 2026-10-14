<?php

namespace App\Models;

use CodeIgniter\Model;

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
