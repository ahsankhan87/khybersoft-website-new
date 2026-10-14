<?php

namespace App\Models;

use CodeIgniter\Model;

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
