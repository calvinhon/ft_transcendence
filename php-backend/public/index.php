<?php
/**
 * Main entry point for ft_transcendence PHP API
 */

// Include configuration and core classes
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../includes/Database.php';
require_once __DIR__ . '/../includes/Auth.php';
require_once __DIR__ . '/../includes/ApiResponse.php';
require_once __DIR__ . '/../includes/Router.php';

// Initialize router
$router = new Router();

// Health check endpoint
$router->get('/health', function() {
    ApiResponse::success(['status' => 'OK', 'timestamp' => time()], 'Service is healthy');
});

// Auth endpoints
$router->post('/auth/register', __DIR__ . '/../api/auth/register.php');
$router->post('/auth/login', __DIR__ . '/../api/auth/login.php');
$router->get('/auth/me', __DIR__ . '/../api/auth/me.php');

// User endpoints
$router->get('/user/profile/{id}', __DIR__ . '/../api/user/profile.php');
$router->put('/user/profile/{id}', __DIR__ . '/../api/user/update.php');
$router->get('/user/stats/{id}', __DIR__ . '/../api/user/stats.php');

// Game endpoints
$router->get('/game/list', __DIR__ . '/../api/game/list.php');
$router->post('/game/create', __DIR__ . '/../api/game/create.php');
$router->post('/game/join/{id}', __DIR__ . '/../api/game/join.php');
$router->put('/game/{id}/score', __DIR__ . '/../api/game/update_score.php');
$router->get('/game/{id}', __DIR__ . '/../api/game/get.php');

// Tournament endpoints
$router->get('/tournament/list', __DIR__ . '/../api/tournament/list.php');
$router->post('/tournament/create', __DIR__ . '/../api/tournament/create.php');
$router->post('/tournament/join', __DIR__ . '/../api/tournament/join.php');
$router->get('/tournament/{id}', __DIR__ . '/../api/tournament/get.php');
$router->post('/tournament/{id}/start', __DIR__ . '/../api/tournament/start.php');

// Handle the request
try {
    $router->handleRequest();
} catch (Exception $e) {
    error_log('API Error: ' . $e->getMessage());
    ApiResponse::serverError('Internal server error');
}
?>
