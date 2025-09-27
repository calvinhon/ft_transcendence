<?php
/**
 * Update user profile endpoint
 */

$user = Auth::requireAuth();
$userId = intval($_PARAMS['id'] ?? 0);
$input = ApiResponse::getJsonInput();

// Check if user can update this profile
if ($userId !== $user['userId']) {
    ApiResponse::forbidden('You can only update your own profile');
}

try {
    $db = Database::getInstance();
    
    // Check if user exists
    $existingUser = $db->fetchOne('SELECT id, username, email FROM users WHERE id = ?', [$userId]);
    if (!$existingUser) {
        ApiResponse::notFound('User not found');
    }
    
    $updateData = [];
    
    // Update username if provided
    if (isset($input['username'])) {
        $username = trim($input['username']);
        if (strlen($username) < 3 || strlen($username) > 50) {
            ApiResponse::badRequest('Username must be between 3 and 50 characters');
        }
        
        // Check if username is already taken by another user
        $usernameCheck = $db->fetchOne(
            'SELECT id FROM users WHERE username = ? AND id != ?',
            [$username, $userId]
        );
        
        if ($usernameCheck) {
            ApiResponse::badRequest('Username is already taken');
        }
        
        $updateData['username'] = $username;
    }
    
    // Update email if provided
    if (isset($input['email'])) {
        $email = trim($input['email']);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            ApiResponse::badRequest('Invalid email format');
        }
        
        // Check if email is already taken by another user
        $emailCheck = $db->fetchOne(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [$email, $userId]
        );
        
        if ($emailCheck) {
            ApiResponse::badRequest('Email is already taken');
        }
        
        $updateData['email'] = $email;
    }
    
    // Update password if provided
    if (isset($input['password']) && !empty($input['password'])) {
        if (strlen($input['password']) < 6) {
            ApiResponse::badRequest('Password must be at least 6 characters');
        }
        
        $updateData['password_hash'] = Auth::hashPassword($input['password']);
    }
    
    if (empty($updateData)) {
        ApiResponse::badRequest('No valid fields to update');
    }
    
    // Add updated timestamp
    $updateData['updated_at'] = date('Y-m-d H:i:s');
    
    // Update user
    $db->update('users', $updateData, 'id = ?', [$userId]);
    
    // Get updated user info
    $updatedUser = $db->fetchOne(
        'SELECT id, username, email, updated_at FROM users WHERE id = ?',
        [$userId]
    );
    
    ApiResponse::success($updatedUser, 'Profile updated successfully');
    
} catch (Exception $e) {
    error_log('Update profile error: ' . $e->getMessage());
    ApiResponse::serverError('Failed to update profile');
}
?>
