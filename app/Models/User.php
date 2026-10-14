<?php

namespace App\Models;

use CodeIgniter\Model;

class User extends Model
{
    protected $table = 'users';
    protected $primaryKey = 'id';
    protected $allowedFields = ['name', 'email', 'password_hash', 'role_id', 'avatar', 'status', 'email_verified_at', 'remember_token', 'two_factor_secret', 'two_factor_enabled', 'last_login', 'last_login_ip'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $deletedField = 'deleted_at';
    protected $useSoftDeletes = true;

    protected $validationRules = [
        'name' => 'required|min_length[2]|max_length[100]',
        'email' => 'required|valid_email|is_unique[users.email,id,{id}]',
        'role_id' => 'required|integer',
        'status' => 'required|in_list[active,inactive,banned]',
    ];

    protected $validationMessages = [
        'email' => [
            'is_unique' => 'This email address is already registered.',
        ],
    ];

    public function getFullName()
    {
        return $this->attributes['name'] ?? '';
    }

    public function isActive()
    {
        return $this->attributes['status'] === 'active';
    }

    public function isAdmin()
    {
        $role = $this->db->table('roles')->where('id', $this->attributes['role_id'])->get()->getRowArray();
        return $role && in_array($role['slug'], ['super_admin', 'admin']);
    }

    public function getRole()
    {
        return $this->db->table('roles')->where('id', $this->attributes['role_id'])->get()->getRowArray();
    }

    public function hasPermission(string $permissionSlug): bool
    {
        $role = $this->getRole();
        if (!$role) return false;

        if ($role['slug'] === 'super_admin') return true;

        $result = $this->db->table('permissions p')
            ->select('p.id')
            ->join('role_permissions rp', 'rp.permission_id = p.id')
            ->where('rp.role_id', $role['id'])
            ->where('p.slug', $permissionSlug)
            ->get()->getRowArray();

        return !empty($result);
    }
}
