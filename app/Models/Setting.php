<?php

namespace App\Models;

use CodeIgniter\Model;

class Setting extends Model
{
    protected $table = 'settings';
    protected $primaryKey = 'id';
    protected $allowedFields = ['key', 'value', 'type', 'group', 'label', 'description', 'is_public'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected static $cache = [];

    public function get(string $key, string $default = ''): string
    {
        if (isset(self::$cache[$key])) {
            return self::$cache[$key];
        }

        $result = $this->where('key', $key)->first();
        $value = $result ? $result['value'] : $default;
        self::$cache[$key] = $value;

        return $value;
    }

    public function set(string $key, string $value): bool
    {
        $result = $this->where('key', $key)->first();

        if ($result) {
            return $this->update($result['id'], ['value' => $value, 'updated_at' => date('Y-m-d H:i:s')]);
        } else {
            return $this->insert(['key' => $key, 'value' => $value, 'type' => 'string', 'group' => 'general', 'created_at' => date('Y-m-d H:i:s')]) !== false;
        }
    }

    public function getByGroup(string $group): array
    {
        return $this->where('group', $group)->orderBy('id', 'ASC')->findAll();
    }

    public function getAll(): array
    {
        $settings = $this->orderBy('group', 'ASC')->orderBy('id', 'ASC')->findAll();
        $grouped = [];

        foreach ($settings as $setting) {
            $grouped[$setting['group']][] = $setting;
        }

        return $grouped;
    }

    public static function clearCache(): void
    {
        self::$cache = [];
    }
}
