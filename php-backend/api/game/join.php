<?php
/**
 * Join game endpoint
 */

$user = Auth::requireAuth();
$gameId = intval($_PARAMS['id'] ?? 0);

if (!$gameId) {
    ApiResponse::badRequest('Game ID is required');
}

try {
    $db = Database::getInstance();
    
    // Get game info
    $game = $db->fetchOne(
        'SELECT id, player1_id, player2_id, status, game_mode FROM games WHERE id = ?',
        [$gameId]
    );
    
    if (!$game) {
        ApiResponse::notFound('Game not found');
    }
    
    if ($game['status'] !== 'waiting') {
        ApiResponse::badRequest('Game is not waiting for players');
    }
    
    if ($game['player1_id'] === $user['userId']) {
        ApiResponse::badRequest('Cannot join your own game');
    }
    
    if ($game['player2_id']) {
        ApiResponse::badRequest('Game is already full');
    }
    
    // Check if user has another active game
    $activeGame = $db->fetchOne(
        'SELECT id FROM games WHERE (player1_id = ? OR player2_id = ?) AND status IN ("waiting", "active") AND id != ?',
        [$user['userId'], $user['userId'], $gameId]
    );
    
    if ($activeGame) {
        ApiResponse::badRequest('You already have an active game');
    }
    
    // Join the game
    $db->update('games', [
        'player2_id' => $user['userId'],
        'status' => 'active',
        'started_at' => date('Y-m-d H:i:s')
    ], 'id = ?', [$gameId]);
    
    // Get updated game info
    $updatedGame = $db->fetchOne('
        SELECT 
            g.id, g.player1_id, g.player2_id, g.status, g.game_mode, g.started_at,
            u1.username as player1_name, u2.username as player2_name
        FROM games g
        LEFT JOIN users u1 ON g.player1_id = u1.id
        LEFT JOIN users u2 ON g.player2_id = u2.id
        WHERE g.id = ?
    ', [$gameId]);
    
    ApiResponse::success($updatedGame, 'Successfully joined game');
    
} catch (Exception $e) {
    error_log('Join game error: ' . $e->getMessage());
    ApiResponse::serverError('Failed to join game');
}
?>
