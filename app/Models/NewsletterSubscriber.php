<?php

namespace App\Models;

use CodeIgniter\Model;

class NewsletterSubscriber extends Model
{
    protected $table = 'newsletter_subscribers';
    protected $primaryKey = 'id';
    protected $allowedFields = ['email', 'token', 'verified', 'status'];
    protected $useTimestamps = true;
    protected $createdField = 'subscribed_at';

    protected $validationRules = [
        'email' => 'required|valid_email|is_unique[newsletter_subscribers.email]',
    ];

    public function isActive()
    {
        return $this->attributes['status'] === 'active';
    }

    public function isVerified()
    {
        return (bool) $this->attributes['verified'];
    }

    public function verify()
    {
        $this->update($this->attributes['id'], ['verified' => 1]);
    }

    public function unsubscribe()
    {
        $this->update($this->attributes['id'], ['status' => 'unsubscribed']);
    }

    public function generateToken(): string
    {
        return bin2hex(random_bytes(32));
    }
}
