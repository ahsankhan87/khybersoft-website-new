<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Base Model - Active Record pattern
 */
abstract class Model
{
    protected string $table = '';
    protected string $primaryKey = 'id';
    protected bool $timestamps = true;
    protected bool $softDelete = false;
    protected string $deletedAtColumn = 'deleted_at';
    protected array $fillable = [];
    protected array $hidden = ['password_hash', 'remember_token'];

    protected Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function find(int|string $id): ?array
    {
        $sql = "SELECT * FROM `{$this->table}` WHERE `{$this->primaryKey}` = ?";

        if ($this->softDelete) {
            $sql .= " AND `{$this->deletedAtColumn}` IS NULL";
        }

        $result = $this->db->fetch($sql, [$id]);
        return $result ?: null;
    }

    public function findOrFail(int|string $id): array
    {
        $result = $this->find($id);
        if (!$result) {
            throw new \RuntimeException('Record not found.');
        }
        return $result;
    }

    public function findBy(string $column, mixed $value): ?array
    {
        $sql = "SELECT * FROM `{$this->table}` WHERE `{$column}` = ?";

        if ($this->softDelete) {
            $sql .= " AND `{$this->deletedAtColumn}` IS NULL";
        }

        $result = $this->db->fetch($sql, [$value]);
        return $result ?: null;
    }

    public function all(string $orderBy = 'created_at DESC'): array
    {
        $sql = "SELECT * FROM `{$this->table}`";

        if ($this->softDelete) {
            $sql .= " WHERE `{$this->deletedAtColumn}` IS NULL";
        }

        $sql .= " ORDER BY {$orderBy}";
        return $this->db->fetchAll($sql);
    }

    public function where(string $column, mixed $value, string $operator = '='): array
    {
        $sql = "SELECT * FROM `{$this->table}` WHERE `{$column}` {$operator} ?";

        if ($this->softDelete) {
            $sql .= " AND `{$this->deletedAtColumn}` IS NULL";
        }

        return $this->db->fetchAll($sql, [$value]);
    }

    public function create(array $data): int
    {
        $data = $this->filterFillable($data);

        if ($this->timestamps) {
            $data['created_at'] = date('Y-m-d H:i:s');
            $data['updated_at'] = date('Y-m-d H:i:s');
        }

        return $this->db->insert($this->table, $data);
    }

    public function update(int|string $id, array $data): bool
    {
        $data = $this->filterFillable($data);

        if ($this->timestamps) {
            $data['updated_at'] = date('Y-m-d H:i:s');
        }

        $affected = $this->db->update(
            $this->table,
            $data,
            "`{$this->primaryKey}` = ?",
            [$id]
        );

        return $affected > 0;
    }

    public function delete(int|string $id): bool
    {
        if ($this->softDelete) {
            return $this->db->update(
                $this->table,
                [$this->deletedAtColumn => date('Y-m-d H:i:s')],
                "`{$this->primaryKey}` = ?",
                [$id]
            ) > 0;
        }

        return $this->db->delete(
            $this->table,
            "`{$this->primaryKey}` = ?",
            [$id]
        ) > 0;
    }

    public function paginate(int $page = 1, int $perPage = PER_PAGE, string $where = '1=1', array $params = [], string $orderBy = 'created_at DESC'): array
    {
        $offset = ($page - 1) * $perPage;

        $countSql = "SELECT COUNT(*) FROM `{$this->table}` WHERE {$where}";
        if ($this->softDelete) {
            $countSql .= " AND `{$this->deletedAtColumn}` IS NULL";
        }
        $total = (int) $this->db->fetchColumn($countSql, $params);

        $sql = "SELECT * FROM `{$this->table}` WHERE {$where}";
        if ($this->softDelete) {
            $sql .= " AND `{$this->deletedAtColumn}` IS NULL";
        }
        $sql .= " ORDER BY {$orderBy} LIMIT ? OFFSET ?";

        $items = $this->db->fetchAll($sql, array_merge($params, [$perPage, $offset]));

        return [
            'data' => $items,
            'total' => $total,
            'per_page' => $perPage,
            'current_page' => $page,
            'last_page' => (int) ceil($total / $perPage),
            'from' => $offset + 1,
            'to' => min($offset + $perPage, $total),
        ];
    }

    public function count(string $where = '1=1', array $params = []): int
    {
        $sql = "SELECT COUNT(*) FROM `{$this->table}` WHERE {$where}";
        if ($this->softDelete) {
            $sql .= " AND `{$this->deletedAtColumn}` IS NULL";
        }
        return (int) $this->db->fetchColumn($sql, $params);
    }

    protected function filterFillable(array $data): array
    {
        if (empty($this->fillable)) {
            return $data;
        }
        return array_intersect_key($data, array_flip($this->fillable));
    }

    public function getTable(): string
    {
        return $this->table;
    }
}
