<?php
/**
 * Create game endpoint
 */

$user = Auth::requireAuth();
$input = ApiResponse::getJsonInput();

$gameMode = $input['gameMode'] ?? 'classic';
$isPrivate = $input['isPrivate'] ?? false;

// Validate input
$validModes = ['classic', 'speed', 'power'];
if (!in_array($gameMode, $validModes)) {
    ApiResponse::badRequest('Invalid game mode. Must be: ' . implode(', ', $validModes));
}

try {
    $db = Database::getInstance();
    
    // Check if user already has an active game
    $activeGame = $db->fetchOne(
        'SELECT id FROM games WHERE (player1_id = ? OR player2_id = ?) AND status IN ("waiting", "active")',
        [$user['userId'], $user['userId']]
    );
    
    if ($activeGame) {
        ApiResponse::badRequest('You already have an active game');
    }
    
    // Create new game
    $gameId = $db->insert('games', [
        'player1_id' => $user['userId'],
        'game_mode' => $gameMode,
        'status' => 'waiting',
        'created_at' => date('Y-m-d H:i:s')
    ]);
    
    ApiResponse::success([
        'id' => $gameId,
        'player1_id' => $user['userId'],
        'game_mode' => $gameMode,
        'status' => 'waiting',
        'created_at' => date('Y-m-d H:i:s')
    ], 'Game created successfully', 201);
    
} catch (Exception $e) {
    error_log('Create game error: ' . $e->getMessage());
    ApiResponse::serverError('Failed to create game');
}
?>
