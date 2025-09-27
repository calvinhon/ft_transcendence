<?php
/**
 * Update game score endpoint
 */

$user = Auth::requireAuth();
$gameId = intval($_PARAMS['id'] ?? 0);
$input = ApiResponse::getJsonInput();

if (!$gameId) {
    ApiResponse::badRequest('Game ID is required');
}

ApiResponse::validateRequired($input, ['player1Score', 'player2Score']);

$player1Score = intval($input['player1Score']);
$player2Score = intval($input['player2Score']);
$gameStatus = $input['status'] ?? 'active';

// Validate scores
if ($player1Score < 0 || $player2Score < 0) {
    ApiResponse::badRequest('Scores cannot be negative');
}

if ($player1Score > 100 || $player2Score > 100) {
    ApiResponse::badRequest('Scores cannot exceed 100');
}

try {
    $db = Database::getInstance();
    
    // Get game info
    $game = $db->fetchOne(
        'SELECT id, player1_id, player2_id, status FROM games WHERE id = ?',
        [$gameId]
    );
    
    if (!$game) {
        ApiResponse::notFound('Game not found');
    }
    
    // Check if user is a player in this game
    if ($game['player1_id'] !== $user['userId'] && $game['player2_id'] !== $user['userId']) {
        ApiResponse::forbidden('You are not a player in this game');
    }
    
    if ($game['status'] !== 'active') {
        ApiResponse::badRequest('Game is not active');
    }
    
    // Determine winner if game is finished
    $winnerId = null;
    $finishedAt = null;
    
    if ($gameStatus === 'finished') {
        if ($player1Score > $player2Score) {
            $winnerId = $game['player1_id'];
        } elseif ($player2Score > $player1Score) {
            $winnerId = $game['player2_id'];
        }
        $finishedAt = date('Y-m-d H:i:s');
    }
    
    // Update game
    $updateData = [
        'player1_score' => $player1Score,
        'player2_score' => $player2Score,
        'status' => $gameStatus
    ];
    
    if ($winnerId) {
        $updateData['winner_id'] = $winnerId;
    }
    
    if ($finishedAt) {
        $updateData['finished_at'] = $finishedAt;
    }
    
    $db->update('games', $updateData, 'id = ?', [$gameId]);
    
    // Get updated game info
    $updatedGame = $db->fetchOne('
        SELECT 
            g.id, g.player1_score, g.player2_score, g.status, g.winner_id, g.finished_at,
            u1.username as player1_name, u2.username as player2_name, uw.username as winner_name
        FROM games g
        LEFT JOIN users u1 ON g.player1_id = u1.id
        LEFT JOIN users u2 ON g.player2_id = u2.id
        LEFT JOIN users uw ON g.winner_id = uw.id
        WHERE g.id = ?
    ', [$gameId]);
    
    ApiResponse::success($updatedGame, 'Game score updated successfully');
    
} catch (Exception $e) {
    error_log('Update score error: ' . $e->getMessage());
    ApiResponse::serverError('Failed to update game score');
}
?>
