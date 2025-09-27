<?php
/**
 * Get tournament details endpoint
 */

$tournamentId = intval($_PARAMS['id'] ?? 0);

if (!$tournamentId) {
    ApiResponse::badRequest('Tournament ID is required');
}

try {
    $db = Database::getInstance();
    
    // Get tournament info
    $tournament = $db->fetchOne('
        SELECT 
            t.id,
            t.name,
            t.description,
            t.max_participants,
            t.current_participants,
            t.status,
            t.created_at,
            t.started_at,
            t.finished_at,
            t.winner_id,
            u1.username as creator_name,
            u2.username as winner_name
        FROM tournaments t
        LEFT JOIN users u1 ON t.created_by = u1.id
        LEFT JOIN users u2 ON t.winner_id = u2.id
        WHERE t.id = ?
    ', [$tournamentId]);
    
    if (!$tournament) {
        ApiResponse::notFound('Tournament not found');
    }
    
    // Get participants
    $participants = $db->fetchAll('
        SELECT 
            tp.id,
            tp.user_id,
            tp.joined_at,
            tp.eliminated_at,
            u.username
        FROM tournament_participants tp
        LEFT JOIN users u ON tp.user_id = u.id
        WHERE tp.tournament_id = ?
        ORDER BY tp.joined_at ASC
    ', [$tournamentId]);
    
    // Get tournament games if any
    $games = $db->fetchAll('
        SELECT 
            g.id,
            g.player1_id,
            g.player2_id,
            g.player1_score,
            g.player2_score,
            g.status,
            g.winner_id,
            u1.username as player1_name,
            u2.username as player2_name
        FROM games g
        LEFT JOIN users u1 ON g.player1_id = u1.id
        LEFT JOIN users u2 ON g.player2_id = u2.id
        WHERE g.tournament_id = ?
        ORDER BY g.created_at ASC
    ', [$tournamentId]);
    
    $response = [
        'tournament' => $tournament,
        'participants' => $participants,
        'games' => $games
    ];
    
    ApiResponse::success($response, 'Tournament details retrieved successfully');
    
} catch (Exception $e) {
    error_log('Get tournament error: ' . $e->getMessage());
    ApiResponse::serverError('Failed to retrieve tournament details');
}
?>
