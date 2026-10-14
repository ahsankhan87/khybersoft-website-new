<?php

namespace App\Models;

use CodeIgniter\Model;

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
