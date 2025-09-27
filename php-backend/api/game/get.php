<?php
/**
 * Get single game endpoint
 */

$gameId = intval($_PARAMS['id'] ?? 0);

if (!$gameId) {
    ApiResponse::badRequest('Game ID is required');
}

try {
    $db = Database::getInstance();
    
    $game = $db->fetchOne('
        SELECT 
            g.id,
            g.player1_id,
            g.player2_id,
            g.player1_score,
            g.player2_score,
            g.status,
            g.game_mode,
            g.created_at,
            g.started_at,
            g.finished_at,
            g.winner_id,
            u1.username as player1_name,
            u2.username as player2_name,
            uw.username as winner_name
        FROM games g
        LEFT JOIN users u1 ON g.player1_id = u1.id
        LEFT JOIN users u2 ON g.player2_id = u2.id
        LEFT JOIN users uw ON g.winner_id = uw.id
        WHERE g.id = ?
    ', [$gameId]);
    
    if (!$game) {
        ApiResponse::notFound('Game not found');
    }
    
    ApiResponse::success($game, 'Game retrieved successfully');
    
} catch (Exception $e) {
    error_log('Get game error: ' . $e->getMessage());
    ApiResponse::serverError('Failed to retrieve game');
}
?>
