<?php
/**
 * User registration endpoint
 */

$input = ApiResponse::getJsonInput();
ApiResponse::validateRequired($input, ['username', 'email', 'password']);

$username = trim($input['username']);
$email = trim($input['email']);
$password = $input['password'];

// Validate input
if (strlen($username) < 3 || strlen($username) > 50) {
    ApiResponse::badRequest('Username must be between 3 and 50 characters');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    ApiResponse::badRequest('Invalid email format');
}

if (strlen($password) < 6) {
    ApiResponse::badRequest('Password must be at least 6 characters');
}

try {
    $db = Database::getInstance();
    
    // Check if username or email already exists
    $existingUser = $db->fetchOne(
        'SELECT id FROM users WHERE username = ? OR email = ?',
        [$username, $email]
    );
    
    if ($existingUser) {
        ApiResponse::badRequest('Username or email already exists');
    }
    
    // Create new user
    $userId = $db->insert('users', [
        'username' => $username,
        'email' => $email,
        'password_hash' => Auth::hashPassword($password),
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s')
    ]);
    
    // Generate JWT token
    $token = Auth::generateJWT([
        'userId' => $userId,
        'username' => $username,
        'exp' => time() + (24 * 60 * 60) // 24 hours
    ]);
    
    ApiResponse::success([
        'userId' => $userId,
        'username' => $username,
        'email' => $email,
        'token' => $token
    ], 'User registered successfully', 201);
    
} catch (Exception $e) {
    error_log('Registration error: ' . $e->getMessage());
    ApiResponse::serverError('Failed to register user');
}
?>
