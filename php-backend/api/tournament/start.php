<?php
/**
 * Start tournament endpoint
 */

$user = Auth::requireAuth();
$tournamentId = intval($_PARAMS['id'] ?? 0);

if (!$tournamentId) {
    ApiResponse::badRequest('Tournament ID is required');
}

try {
    $db = Database::getInstance();
    
    // Get tournament info
    $tournament = $db->fetchOne(
        'SELECT id, name, max_participants, current_participants, status, created_by FROM tournaments WHERE id = ?',
        [$tournamentId]
    );
    
    if (!$tournament) {
        ApiResponse::notFound('Tournament not found');
    }
    
    // Check if user is the creator
    if ($tournament['created_by'] !== $user['userId']) {
        ApiResponse::forbidden('Only the tournament creator can start the tournament');
    }
    
    if ($tournament['status'] !== 'open') {
        ApiResponse::badRequest('Tournament is not in open status');
    }
    
    // Check if we have enough participants (at least 2)
    if ($tournament['current_participants'] < 2) {
        ApiResponse::badRequest('Need at least 2 participants to start tournament');
    }
    
    // For proper tournament bracket, participant count should be power of 2
    $participants = $tournament['current_participants'];
    $validSizes = [2, 4, 8, 16, 32, 64];
    
    if (!in_array($participants, $validSizes)) {
        // Find the next lower valid size
        $adjustedSize = 2;
        foreach ($validSizes as $size) {
            if ($size <= $participants) {
                $adjustedSize = $size;
            } else {
                break;
            }
        }
        
        if ($adjustedSize < $participants) {
            ApiResponse::badRequest("Tournament can start with {$adjustedSize} participants (next valid bracket size). Current: {$participants}");
        }
    }
    
    // Start the tournament
    $db->update('tournaments', [
        'status' => 'active',
        'started_at' => date('Y-m-d H:i:s')
    ], 'id = ?', [$tournamentId]);
    
    // Get participants for bracket generation
    $participantsList = $db->fetchAll('
        SELECT tp.user_id, u.username
        FROM tournament_participants tp
        LEFT JOIN users u ON tp.user_id = u.id
        WHERE tp.tournament_id = ?
        ORDER BY tp.joined_at ASC
        LIMIT ?
    ', [$tournamentId, $adjustedSize]);
    
    // Generate first round matches (simplified bracket)
    $matches = [];
    for ($i = 0; $i < count($participantsList); $i += 2) {
        if (isset($participantsList[$i + 1])) {
            $player1 = $participantsList[$i];
            $player2 = $participantsList[$i + 1];
            
            // Create game for this match
            $gameId = $db->insert('games', [
                'player1_id' => $player1['user_id'],
                'player2_id' => $player2['user_id'],
                'tournament_id' => $tournamentId,
                'status' => 'waiting',
                'game_mode' => 'tournament',
                'created_at' => date('Y-m-d H:i:s')
            ]);
            
            $matches[] = [
                'game_id' => $gameId,
                'player1' => $player1,
                'player2' => $player2,
                'round' => 1
            ];
        }
    }
    
    ApiResponse::success([
        'tournament_id' => $tournamentId,
        'tournament_name' => $tournament['name'],
        'status' => 'active',
        'participants' => count($participantsList),
        'first_round_matches' => $matches
    ], 'Tournament started successfully');
    
} catch (Exception $e) {
    error_log('Start tournament error: ' . $e->getMessage());
    ApiResponse::serverError('Failed to start tournament');
}
?>
