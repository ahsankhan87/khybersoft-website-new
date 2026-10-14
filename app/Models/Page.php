<?php

namespace App\Models;

use CodeIgniter\Model;

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
