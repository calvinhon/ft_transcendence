<?php
/**
 * Get user statistics endpoint
 */

$userId = intval($_PARAMS['id'] ?? 0);

if (!$userId) {
    ApiResponse::badRequest('User ID is required');
}

try {
    $db = Database::getInstance();
    
    // Verify user exists
    $user = $db->fetchOne('SELECT id, username FROM users WHERE id = ? AND is_active = 1', [$userId]);
    if (!$user) {
        ApiResponse::notFound('User not found');
    }
    
    // Detailed game statistics
    $gameStats = $db->fetchOne('
        SELECT 
            COUNT(*) as total_games,
            SUM(CASE WHEN winner_id = ? THEN 1 ELSE 0 END) as wins,
            SUM(CASE WHEN winner_id IS NOT NULL AND winner_id != ? THEN 1 ELSE 0 END) as losses,
            SUM(CASE WHEN status = "finished" AND winner_id IS NULL THEN 1 ELSE 0 END) as draws,
            AVG(CASE WHEN player1_id = ? THEN player1_score ELSE player2_score END) as avg_score,
            MAX(CASE WHEN player1_id = ? THEN player1_score ELSE player2_score END) as best_score
        FROM games 
        WHERE (player1_id = ? OR player2_id = ?) AND status = "finished"
    ', [$userId, $userId, $userId, $userId, $userId, $userId]);
    
    // Game mode statistics
    $modeStats = $db->fetchAll('
        SELECT 
            game_mode,
            COUNT(*) as games_played,
            SUM(CASE WHEN winner_id = ? THEN 1 ELSE 0 END) as wins
        FROM games 
        WHERE (player1_id = ? OR player2_id = ?) AND status = "finished"
        GROUP BY game_mode
    ', [$userId, $userId, $userId]);
    
    // Tournament statistics
    $tournamentStats = $db->fetchOne('
        SELECT 
            COUNT(DISTINCT tp.tournament_id) as tournaments_joined,
            COUNT(DISTINCT CASE WHEN t.winner_id = ? THEN t.id END) as tournaments_won,
            COUNT(DISTINCT CASE WHEN t.created_by = ? THEN t.id END) as tournaments_created
        FROM tournament_participants tp
        LEFT JOIN tournaments t ON tp.tournament_id = t.id
        WHERE tp.user_id = ?
    ', [$userId, $userId, $userId]);
    
    // Recent activity (last 30 days)
    $recentActivity = $db->fetchOne('
        SELECT 
            COUNT(DISTINCT DATE(g.created_at)) as active_days,
            COUNT(*) as recent_games
        FROM games g
        WHERE (g.player1_id = ? OR g.player2_id = ?) 
        AND g.created_at >= DATE("now", "-30 days")
    ', [$userId, $userId]);
    
    // Calculate additional metrics
    $totalGames = intval($gameStats['total_games']);
    $wins = intval($gameStats['wins']);
    $winRate = $totalGames > 0 ? round(($wins / $totalGames) * 100, 2) : 0;
    $avgScore = $gameStats['avg_score'] ? round(floatval($gameStats['avg_score']), 2) : 0;
    
    $response = [
        'user_id' => $userId,
        'username' => $user['username'],
        'overall_stats' => [
            'total_games' => $totalGames,
            'wins' => $wins,
            'losses' => intval($gameStats['losses']),
            'draws' => intval($gameStats['draws']),
            'win_rate' => $winRate,
            'average_score' => $avgScore,
            'best_score' => intval($gameStats['best_score'])
        ],
        'game_modes' => $modeStats,
        'tournament_stats' => [
            'tournaments_joined' => intval($tournamentStats['tournaments_joined']),
            'tournaments_won' => intval($tournamentStats['tournaments_won']),
            'tournaments_created' => intval($tournamentStats['tournaments_created'])
        ],
        'recent_activity' => [
            'active_days_last_30' => intval($recentActivity['active_days']),
            'games_last_30' => intval($recentActivity['recent_games'])
        ]
    ];
    
    ApiResponse::success($response, 'User statistics retrieved successfully');
    
} catch (Exception $e) {
    error_log('Get user stats error: ' . $e->getMessage());
    ApiResponse::serverError('Failed to retrieve user statistics');
}
?>
