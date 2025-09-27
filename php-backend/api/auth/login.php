<?php
/**
 * User login endpoint
 */

$input = ApiResponse::getJsonInput();
ApiResponse::validateRequired($input, ['username', 'password']);

$username = trim($input['username']);
$password = $input['password'];

try {
    $db = Database::getInstance();
    
    // Find user by username or email
    $user = $db->fetchOne(
        'SELECT id, username, email, password_hash, is_active FROM users WHERE username = ? OR email = ?',
        [$username, $username]
    );
    
    if (!$user || !Auth::verifyPassword($password, $user['password_hash'])) {
        ApiResponse::unauthorized('Invalid credentials');
    }
    
    if (!$user['is_active']) {
        ApiResponse::forbidden('Account is disabled');
    }
    
    // Generate JWT token
    $token = Auth::generateJWT([
        'userId' => $user['id'],
        'username' => $user['username'],
        'exp' => time() + (24 * 60 * 60) // 24 hours
    ]);
    
    ApiResponse::success([
        'userId' => $user['id'],
        'username' => $user['username'],
        'email' => $user['email'],
        'token' => $token
    ], 'Login successful');
    
} catch (Exception $e) {
    error_log('Login error: ' . $e->getMessage());
    ApiResponse::serverError('Login failed');
}
?>
