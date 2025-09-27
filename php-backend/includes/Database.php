<?php
/**
 * Database helper class using pure PHP and PDO
 */
class Database {
    private static $instance = null;
    private $connection;

    private function __construct() {
        try {
            $this->connection = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8",
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
        } catch (PDOException $e) {
            // Fallback to SQLite if MySQL is not available
            try {
                $dbPath = DATABASE_PATH . '/ft_transcendence.db';
                $this->connection = new PDO("sqlite:" . $dbPath);
                $this->connection->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                $this->initializeTables();
            } catch (PDOException $sqliteError) {
                throw new Exception("Database connection failed: " . $sqliteError->getMessage());
            }
        }
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->connection;
    }

    public function query($sql, $params = []) {
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            throw new Exception("Query failed: " . $e->getMessage());
        }
    }

    public function fetchAll($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt->fetchAll();
    }

    public function fetchOne($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt->fetch();
    }

    public function insert($table, $data) {
        $keys = array_keys($data);
        $fields = implode(', ', $keys);
        $placeholders = ':' . implode(', :', $keys);
        
        $sql = "INSERT INTO {$table} ({$fields}) VALUES ({$placeholders})";
        $this->query($sql, $data);
        
        return $this->connection->lastInsertId();
    }

    public function update($table, $data, $where, $whereParams = []) {
        $setClause = [];
        foreach (array_keys($data) as $key) {
            $setClause[] = "{$key} = :{$key}";
        }
        $setClause = implode(', ', $setClause);
        
        $sql = "UPDATE {$table} SET {$setClause} WHERE {$where}";
        $params = array_merge($data, $whereParams);
        
        return $this->query($sql, $params);
    }

    public function delete($table, $where, $params = []) {
        $sql = "DELETE FROM {$table} WHERE {$where}";
        return $this->query($sql, $params);
    }

    private function initializeTables() {
        // Users table
        $this->connection->exec("
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1
            )
        ");

        // Games table
        $this->connection->exec("
            CREATE TABLE IF NOT EXISTS games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player1_id INTEGER NOT NULL,
                player2_id INTEGER,
                player1_score INTEGER DEFAULT 0,
                player2_score INTEGER DEFAULT 0,
                status VARCHAR(20) DEFAULT 'waiting',
                game_mode VARCHAR(20) DEFAULT 'classic',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                started_at DATETIME,
                finished_at DATETIME,
                winner_id INTEGER,
                FOREIGN KEY (player1_id) REFERENCES users(id),
                FOREIGN KEY (player2_id) REFERENCES users(id),
                FOREIGN KEY (winner_id) REFERENCES users(id)
            )
        ");

        // Tournaments table
        $this->connection->exec("
            CREATE TABLE IF NOT EXISTS tournaments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                max_participants INTEGER DEFAULT 8,
                current_participants INTEGER DEFAULT 0,
                status VARCHAR(20) DEFAULT 'open',
                created_by INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                started_at DATETIME,
                finished_at DATETIME,
                winner_id INTEGER,
                FOREIGN KEY (created_by) REFERENCES users(id),
                FOREIGN KEY (winner_id) REFERENCES users(id)
            )
        ");

        // Tournament participants table
        $this->connection->exec("
            CREATE TABLE IF NOT EXISTS tournament_participants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tournament_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                eliminated_at DATETIME,
                FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(tournament_id, user_id)
            )
        ");
    }
}
?>
