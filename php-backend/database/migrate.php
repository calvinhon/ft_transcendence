<?php
/**
 * Database migration script to set up initial tables and data
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../includes/Database.php';
require_once __DIR__ . '/../includes/Auth.php';

echo "🚀 Starting database migration...\n";

try {
    $db = Database::getInstance();
    $pdo = $db->getConnection();
    
    // Add tournament_id column to games table if it doesn't exist
    try {
        $pdo->exec("ALTER TABLE games ADD COLUMN tournament_id INTEGER REFERENCES tournaments(id)");
        echo "✅ Added tournament_id column to games table\n";
    } catch (Exception $e) {
        if (strpos($e->getMessage(), 'duplicate column name') === false) {
            echo "ℹ️  tournament_id column already exists in games table\n";
        }
    }
    
    // Create some sample users
    $sampleUsers = [
        ['username' => 'admin', 'email' => 'admin@transcendence.com', 'password' => 'admin123'],
        ['username' => 'player1', 'email' => 'player1@transcendence.com', 'password' => 'player123'],
        ['username' => 'player2', 'email' => 'player2@transcendence.com', 'password' => 'player123'],
        ['username' => 'testuser', 'email' => 'test@transcendence.com', 'password' => 'test123']
    ];
    
    foreach ($sampleUsers as $userData) {
        // Check if user already exists
        $existing = $db->fetchOne('SELECT id FROM users WHERE username = ?', [$userData['username']]);
        
        if (!$existing) {
            $userId = $db->insert('users', [
                'username' => $userData['username'],
                'email' => $userData['email'],
                'password_hash' => Auth::hashPassword($userData['password']),
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ]);
            echo "✅ Created user: {$userData['username']} (ID: {$userId})\n";
        } else {
            echo "ℹ️  User {$userData['username']} already exists\n";
        }
    }
    
    // Create some sample tournaments
    $adminUser = $db->fetchOne('SELECT id FROM users WHERE username = "admin"');
    if ($adminUser) {
        $sampleTournaments = [
            [
                'name' => 'Weekly Championship',
                'description' => 'Join our weekly championship tournament! Winner takes glory and bragging rights.',
                'max_participants' => 8,
                'status' => 'open'
            ],
            [
                'name' => 'Speed Pong Masters',
                'description' => 'Fast-paced tournament for speed pong enthusiasts. Quick reflexes required!',
                'max_participants' => 16,
                'status' => 'open'
            ],
            [
                'name' => 'Beginner Friendly Cup',
                'description' => 'Perfect tournament for new players to get started. Friendly competition!',
                'max_participants' => 4,
                'status' => 'open'
            ]
        ];
        
        foreach ($sampleTournaments as $tournamentData) {
            // Check if tournament already exists
            $existing = $db->fetchOne('SELECT id FROM tournaments WHERE name = ?', [$tournamentData['name']]);
            
            if (!$existing) {
                $tournamentId = $db->insert('tournaments', [
                    'name' => $tournamentData['name'],
                    'description' => $tournamentData['description'],
                    'max_participants' => $tournamentData['max_participants'],
                    'current_participants' => 1,
                    'status' => $tournamentData['status'],
                    'created_by' => $adminUser['id'],
                    'created_at' => date('Y-m-d H:i:s')
                ]);
                
                // Add admin as first participant
                $db->insert('tournament_participants', [
                    'tournament_id' => $tournamentId,
                    'user_id' => $adminUser['id'],
                    'joined_at' => date('Y-m-d H:i:s')
                ]);
                
                echo "✅ Created tournament: {$tournamentData['name']} (ID: {$tournamentId})\n";
            } else {
                echo "ℹ️  Tournament {$tournamentData['name']} already exists\n";
            }
        }
    }
    
    // Create some sample games
    $player1 = $db->fetchOne('SELECT id FROM users WHERE username = "player1"');
    $player2 = $db->fetchOne('SELECT id FROM users WHERE username = "player2"');
    
    if ($player1 && $player2) {
        $sampleGames = [
            [
                'player1_id' => $player1['id'],
                'player2_id' => $player2['id'],
                'player1_score' => 11,
                'player2_score' => 7,
                'status' => 'finished',
                'game_mode' => 'classic',
                'winner_id' => $player1['id']
            ],
            [
                'player1_id' => $player2['id'],
                'player2_id' => $player1['id'],
                'player1_score' => 11,
                'player2_score' => 9,
                'status' => 'finished',
                'game_mode' => 'speed',
                'winner_id' => $player2['id']
            ]
        ];
        
        foreach ($sampleGames as $gameData) {
            $gameId = $db->insert('games', array_merge($gameData, [
                'created_at' => date('Y-m-d H:i:s', time() - rand(3600, 86400)),
                'started_at' => date('Y-m-d H:i:s', time() - rand(1800, 43200)),
                'finished_at' => date('Y-m-d H:i:s', time() - rand(0, 1800))
            ]));
            
            echo "✅ Created sample game (ID: {$gameId})\n";
        }
    }
    
    echo "\n🎉 Database migration completed successfully!\n";
    echo "\n📋 Sample accounts created:\n";
    echo "   - admin / admin123\n";
    echo "   - player1 / player123\n";
    echo "   - player2 / player123\n";
    echo "   - testuser / test123\n";
    echo "\n🏆 Sample tournaments and games have been created.\n";
    
} catch (Exception $e) {
    echo "❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
?>
