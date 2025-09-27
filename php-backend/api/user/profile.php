<?php
/**
 * Get user profile endpoint
 */

$userId = intval($_PARAMS['id'] ?? 0);

if (!$userId) {
    ApiResponse::badRequest('User ID is required');
}

try {
    $db = Database::getInstance();
    
    // Get user basic info
    $user = $db->fetchOne(
        'SELECT id, username, email, created_at FROM users WHERE id = ? AND is_active = 1',
        [$userId]
    );
    
    if (!$user) {
        ApiResponse::notFound('User not found');
    }
    
    // Get user game statistics
    $stats = $db->fetchOne('
        SELECT 
            COUNT(*) as total_games,
            SUM(CASE WHEN winner_id = ? THEN 1 ELSE 0 END) as wins,
            SUM(CASE WHEN winner_id IS NOT NULL AND winner_id != ? THEN 1 ELSE 0 END) as losses,
            SUM(CASE WHEN status = "finished" AND winner_id IS NULL THEN 1 ELSE 0 END) as draws
        FROM games 
        WHERE (player1_id = ? OR player2_id = ?) AND status = "finished"
    ', [$userId, $userId, $userId, $userId]);
    
    $totalGames = intval($stats['total_games']);
    $wins = intval($stats['wins']);
    $losses = intval($stats['losses']);
    $draws = intval($stats['draws']);
    
    $winRate = $totalGames > 0 ? round(($wins / $totalGames) * 100, 2) : 0;
    
    // Get recent games
    $recentGames = $db->fetchAll('
        SELECT 
            g.id,
            g.player1_score,
            g.player2_score,
            g.status,
            g.finished_at,
            g.winner_id,
            CASE 
                WHEN g.player1_id = ? THEN u2.username 
                ELSE u1.username 
            END as opponent_name,
            CASE 
                WHEN g.winner_id = ? THEN "win"
                WHEN g.winner_id IS NULL THEN "draw"
                ELSE "loss"
            END as result
        FROM games g
        LEFT JOIN users u1 ON g.player1_id = u1.id
        LEFT JOIN users u2 ON g.player2_id = u2.id
        WHERE (g.player1_id = ? OR g.player2_id = ?) AND g.status = "finished"
        ORDER BY g.finished_at DESC
        LIMIT 10
    ', [$userId, $userId, $userId, $userId]);
    
    // Get tournament participation
    $tournamentStats = $db->fetchOne('
        SELECT 
            COUNT(DISTINCT tp.tournament_id) as tournaments_joined,
            COUNT(DISTINCT CASE WHEN t.winner_id = ? THEN t.id END) as tournaments_won
        FROM tournament_participants tp
        LEFT JOIN tournaments t ON tp.tournament_id = t.id
        WHERE tp.user_id = ?
    ', [$userId, $userId]);
    
    $response = [
        'user' => $user,
        'stats' => [
            'total_games' => $totalGames,
            'wins' => $wins,
            'losses' => $losses,
            'draws' => $draws,
            'win_rate' => $winRate,
            'tournaments_joined' => intval($tournamentStats['tournaments_joined']),
            'tournaments_won' => intval($tournamentStats['tournaments_won'])
        ],
        'recent_games' => $recentGames
    ];
    
    ApiResponse::success($response, 'User profile retrieved successfully');
    
} catch (Exception $e) {
    error_log('Get profile error: ' . $e->getMessage());
    ApiResponse::serverError('Failed to retrieve user profile');
}
?>
