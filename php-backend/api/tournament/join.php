<?php
/**
 * Join tournament endpoint
 */

$user = Auth::requireAuth();
$input = ApiResponse::getJsonInput();
ApiResponse::validateRequired($input, ['tournamentId']);

$tournamentId = intval($input['tournamentId']);
$userId = $user['userId'];

try {
    $db = Database::getInstance();
    
    // Check if tournament exists and is open
    $tournament = $db->fetchOne(
        'SELECT id, name, max_participants, current_participants, status FROM tournaments WHERE id = ?',
        [$tournamentId]
    );
    
    if (!$tournament) {
        ApiResponse::notFound('Tournament not found');
    }
    
    if ($tournament['status'] !== 'open') {
        ApiResponse::badRequest('Tournament is not open for registration');
    }
    
    if ($tournament['current_participants'] >= $tournament['max_participants']) {
        ApiResponse::badRequest('Tournament is full');
    }
    
    // Check if user already joined
    $existing = $db->fetchOne(
        'SELECT id FROM tournament_participants WHERE tournament_id = ? AND user_id = ?',
        [$tournamentId, $userId]
    );
    
    if ($existing) {
        ApiResponse::badRequest('Already joined this tournament');
    }
    
    // Add participant
    $db->insert('tournament_participants', [
        'tournament_id' => $tournamentId,
        'user_id' => $userId,
        'joined_at' => date('Y-m-d H:i:s')
    ]);
    
    // Update participant count
    $newCount = $tournament['current_participants'] + 1;
    $db->update('tournaments', 
        ['current_participants' => $newCount],
        'id = ?',
        [$tournamentId]
    );
    
    ApiResponse::success([
        'tournament_id' => $tournamentId,
        'tournament_name' => $tournament['name'],
        'current_participants' => $newCount,
        'max_participants' => $tournament['max_participants']
    ], 'Successfully joined tournament');
    
} catch (Exception $e) {
    error_log('Join tournament error: ' . $e->getMessage());
    ApiResponse::serverError('Failed to join tournament');
}
?>
