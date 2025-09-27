<?php
// Configuration file for ft_transcendence PHP backend

define('BASE_PATH', dirname(__DIR__));
define('API_PATH', BASE_PATH . '/api');
define('DATABASE_PATH', BASE_PATH . '/database');

// Database configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'ft_transcendence');

// JWT Secret (change in production)
define('JWT_SECRET', 'your_jwt_secret_key_change_in_production');
define('JWT_ALGORITHM', 'HS256');

// API Configuration
define('API_VERSION', 'v1');
define('CORS_ORIGIN', '*'); // Change to specific domains in production

// Error reporting (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Timezone
date_default_timezone_set('UTC');

// Headers for API responses
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . CORS_ORIGIN);
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight OPTIONS requests (only for web requests)
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Session configuration (only for web requests)
if (php_sapi_name() !== 'cli') {
    session_start();
}
?>
