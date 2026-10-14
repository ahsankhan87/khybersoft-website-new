<?php

namespace App\Models;

use CodeIgniter\Model;

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
