<?php
declare(strict_types=1);

namespace App\Core;

use PDO;
use PDOException;
use PDOStatement;

/**
 * Database - PDO Singleton wrapper
 */
class Database
{
    private static ?Database $instance = null;
    private PDO $pdo;
    private int $queryCount = 0;

    private function __construct()
    {
        $config = require APP_PATH . '/config/database.php';

        $dsn = sprintf(
            '%s:host=%s;port=%s;dbname=%s;charset=%s',
            $config['driver'],
            $config['host'],
            $config['port'],
            $config['database'],
            $config['charset']
        );

        try {
            $this->pdo = new PDO(
                $dsn,
                $config['username'],
                $config['password'],
                $config['options']
            );
        } catch (PDOException $e) {
            if (APP_DEBUG) {
                throw new \RuntimeException('Database connection failed: ' . $e->getMessage());
            }
            error_log('Database connection failed: ' . $e->getMessage());
            throw new \RuntimeException('Database connection failed.');
        }
    }

    private function __clone() {}
    public function __wakeup()
    {
        throw new \RuntimeException('Cannot unserialize singleton.');
    }

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getPdo(): PDO
    {
        return $this->pdo;
    }

    public function query(string $sql, array $params = []): PDOStatement
    {
        $this->queryCount++;

        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            if (APP_DEBUG) {
                throw new \RuntimeException('Query failed: ' . $e->getMessage() . ' | SQL: ' . $sql);
            }
            error_log('Query failed: ' . $e->getMessage());
            throw new \RuntimeException('Database query failed.');
        }
    }

    public function fetchAll(string $sql, array $params = []): array
    {
        return $this->query($sql, $params)->fetchAll();
    }

    public function fetch(string $sql, array $params = []): array|false
    {
        return $this->query($sql, $params)->fetch();
    }

    public function fetchColumn(string $sql, array $params = [], int $column = 0): mixed
    {
        return $this->query($sql, $params)->fetchColumn($column);
    }

    public function insert(string $table, array $data): int
    {
        $columns = implode(', ', array_map(fn($col) => "`$col`", array_keys($data)));
        $placeholders = implode(', ', array_fill(0, count($data), '?'));

        $sql = "INSERT INTO `{$table}` ({$columns}) VALUES ({$placeholders})";
        $this->query($sql, array_values($data));

        return (int) $this->pdo->lastInsertId();
    }

    public function update(string $table, array $data, string $where, array $whereParams = []): int
    {
        $set = implode(', ', array_map(fn($col) => "`{$col}` = ?", array_keys($data)));
        $sql = "UPDATE `{$table}` SET {$set} WHERE {$where}";

        $params = array_merge(array_values($data), $whereParams);
        $stmt = $this->query($sql, $params);

        return $stmt->rowCount();
    }

    public function delete(string $table, string $where, array $params = []): int
    {
        $sql = "DELETE FROM `{$table}` WHERE {$where}";
        $stmt = $this->query($sql, $params);
        return $stmt->rowCount();
    }

    public function beginTransaction(): bool
    {
        return $this->pdo->beginTransaction();
    }

    public function commit(): bool
    {
        return $this->pdo->commit();
    }

    public function rollback(): bool
    {
        return $this->pdo->rollBack();
    }

    public function lastInsertId(): string
    {
        return $this->pdo->lastInsertId();
    }

    public function getQueryCount(): int
    {
        return $this->queryCount;
    }
}
