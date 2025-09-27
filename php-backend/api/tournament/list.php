<?php
/**
 * List tournaments endpoint
 */

try {
    $db = Database::getInstance();
    
    $tournaments = $db->fetchAll('
        SELECT 
            t.id,
            t.name,
            t.description,
            t.max_participants,
            t.current_participants,
            t.status,
            t.created_at,
            u.username as creator_name
        FROM tournaments t
        LEFT JOIN users u ON t.created_by = u.id
        ORDER BY t.created_at DESC
    ');
    
    ApiResponse::success($tournaments, 'Tournaments retrieved successfully');
    
} catch (Exception $e) {
    error_log('List tournaments error: ' . $e->getMessage());
    ApiResponse::serverError('Failed to retrieve tournaments');
}
?>
