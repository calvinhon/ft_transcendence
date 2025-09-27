<?php
/**
 * List games endpoint
 */

try {
    $db = Database::getInstance();
    
    // Get query parameters
    $status = $_GET['status'] ?? null;
    $userId = $_GET['user_id'] ?? null;
    $limit = min(intval($_GET['limit'] ?? 50), 100); // Max 100 results
    $offset = intval($_GET['offset'] ?? 0);
    
    $whereClause = [];
    $params = [];
    
    if ($status) {
        $whereClause[] = 'g.status = ?';
        $params[] = $status;
    }
    
    if ($userId) {
        $whereClause[] = '(g.player1_id = ? OR g.player2_id = ?)';
        $params[] = $userId;
        $params[] = $userId;
    }
    
    $whereSQL = !empty($whereClause) ? 'WHERE ' . implode(' AND ', $whereClause) : '';
    
    $games = $db->fetchAll("
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
        {$whereSQL}
        ORDER BY g.created_at DESC
        LIMIT ? OFFSET ?
    ", array_merge($params, [$limit, $offset]));
    
    ApiResponse::success($games, 'Games retrieved successfully');
    
} catch (Exception $e) {
    error_log('List games error: ' . $e->getMessage());
    ApiResponse::serverError('Failed to retrieve games');
}
?>
