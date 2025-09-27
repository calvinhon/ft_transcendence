<?php
/**
 * Create tournament endpoint
 */

$user = Auth::requireAuth();
$input = ApiResponse::getJsonInput();
ApiResponse::validateRequired($input, ['name', 'maxParticipants']);

$name = trim($input['name']);
$description = trim($input['description'] ?? '');
$maxParticipants = intval($input['maxParticipants']);

// Validate input
if (strlen($name) < 3 || strlen($name) > 100) {
    ApiResponse::badRequest('Tournament name must be between 3 and 100 characters');
}

if ($maxParticipants < 2 || $maxParticipants > 64) {
    ApiResponse::badRequest('Max participants must be between 2 and 64');
}

// Ensure max participants is a power of 2 for proper tournament bracket
$validSizes = [2, 4, 8, 16, 32, 64];
if (!in_array($maxParticipants, $validSizes)) {
    ApiResponse::badRequest('Max participants must be 2, 4, 8, 16, 32, or 64');
}

try {
    $db = Database::getInstance();
    
    // Create tournament
    $tournamentId = $db->insert('tournaments', [
        'name' => $name,
        'description' => $description,
        'max_participants' => $maxParticipants,
        'current_participants' => 1, // Creator joins automatically
        'status' => 'open',
        'created_by' => $user['userId'],
        'created_at' => date('Y-m-d H:i:s')
    ]);
    
    // Add creator as first participant
    $db->insert('tournament_participants', [
        'tournament_id' => $tournamentId,
        'user_id' => $user['userId'],
        'joined_at' => date('Y-m-d H:i:s')
    ]);
    
    ApiResponse::success([
        'id' => $tournamentId,
        'name' => $name,
        'description' => $description,
        'max_participants' => $maxParticipants,
        'current_participants' => 1,
        'status' => 'open'
    ], 'Tournament created successfully', 201);
    
} catch (Exception $e) {
    error_log('Create tournament error: ' . $e->getMessage());
    ApiResponse::serverError('Failed to create tournament');
}
?>
