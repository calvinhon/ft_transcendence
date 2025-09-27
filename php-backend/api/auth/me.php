<?php
/**
 * Get current user info endpoint
 */

$user = Auth::requireAuth();

try {
    $db = Database::getInstance();
    
    $userInfo = $db->fetchOne(
        'SELECT id, username, email, created_at FROM users WHERE id = ?',
        [$user['userId']]
    );
    
    if (!$userInfo) {
        ApiResponse::notFound('User not found');
    }
    
    ApiResponse::success($userInfo, 'User info retrieved');
    
} catch (Exception $e) {
    error_log('Get user error: ' . $e->getMessage());
    ApiResponse::serverError('Failed to get user info');
}
?>
