// tournament-service/routes/tournament.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/tournaments.db');

// Initialize database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to Tournaments SQLite database');
    
    // Create tournaments table
    db.run(`
      CREATE TABLE IF NOT EXISTS tournaments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        max_participants INTEGER DEFAULT 8,
        current_participants INTEGER DEFAULT 0,
        status TEXT DEFAULT 'open',
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        finished_at DATETIME,
        winner_id INTEGER
      )
    `);

    // Create tournament participants table
    db.run(`
      CREATE TABLE IF NOT EXISTS tournament_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        eliminated_at DATETIME,
        FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
        UNIQUE(tournament_id, user_id)
      )
    `);

    // Create tournament matches table
    db.run(`
      CREATE TABLE IF NOT EXISTS tournament_matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER NOT NULL,
        round INTEGER NOT NULL,
        match_number INTEGER NOT NULL,
        player1_id INTEGER,
        player2_id INTEGER,
        winner_id INTEGER,
        player1_score INTEGER DEFAULT 0,
        player2_score INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        played_at DATETIME,
        FOREIGN KEY (tournament_id) REFERENCES tournaments (id)
      )
    `);
  }
});

async function routes(fastify, options) {
  // Create tournament
  fastify.post('/create', async (request, reply) => {
    const { name, description, maxParticipants, createdBy } = request.body;
    
    if (!name || !createdBy) {
      return reply.status(400).send({ error: 'Name and creator required' });
    }

    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO tournaments (name, description, max_participants, created_by) VALUES (?, ?, ?, ?)',
        [name, description || '', maxParticipants || 8, createdBy],
        function(err) {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else {
            reply.send({ 
              message: 'Tournament created successfully',
              tournamentId: this.lastID
            });
            resolve();
          }
        }
      );
    });
  });

  // Join tournament
  fastify.post('/join', async (request, reply) => {
    const { tournamentId, userId } = request.body;
    
    if (!tournamentId || !userId) {
      return reply.status(400).send({ error: 'Tournament ID and User ID required' });
    }

    return new Promise((resolve, reject) => {
      // First check if tournament exists and is open
      db.get(
        'SELECT * FROM tournaments WHERE id = ? AND status = "open"',
        [tournamentId],
        (err, tournament) => {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else if (!tournament) {
            reply.status(404).send({ error: 'Tournament not found or not open' });
            resolve();
          } else if (tournament.current_participants >= tournament.max_participants) {
            reply.status(409).send({ error: 'Tournament is full' });
            resolve();
          } else {
            // Add participant
            db.run(
              'INSERT INTO tournament_participants (tournament_id, user_id) VALUES (?, ?)',
              [tournamentId, userId],
              function(err) {
                if (err) {
                  if (err.code === 'SQLITE_CONSTRAINT') {
                    reply.status(409).send({ error: 'Already joined this tournament' });
                  } else {
                    reply.status(500).send({ error: 'Database error' });
                  }
                  reject(err);
                } else {
                  // Update participant count
                  db.run(
                    'UPDATE tournaments SET current_participants = current_participants + 1 WHERE id = ?',
                    [tournamentId],
                    (err) => {
                      if (!err) {
                        reply.send({ message: 'Successfully joined tournament' });
                      }
                      resolve();
                    }
                  );
                }
              }
            );
          }
        }
      );
    });
  });

  // Start tournament
  fastify.post('/start/:tournamentId', async (request, reply) => {
    const { tournamentId } = request.params;

    return new Promise((resolve, reject) => {
      // Get tournament and participants
      db.get(
        'SELECT * FROM tournaments WHERE id = ? AND status = "open"',
        [tournamentId],
        (err, tournament) => {
          if (err || !tournament) {
            reply.status(404).send({ error: 'Tournament not found' });
            reject(err);
            return;
          }

          if (tournament.current_participants < 2) {
            reply.status(400).send({ error: 'Need at least 2 participants' });
            resolve();
            return;
          }

          // Get participants
          db.all(
            'SELECT user_id FROM tournament_participants WHERE tournament_id = ? ORDER BY joined_at',
            [tournamentId],
            (err, participants) => {
              if (err) {
                reply.status(500).send({ error: 'Database error' });
                reject(err);
                return;
              }

              // Create first round matches
              const matches = [];
              for (let i = 0; i < participants.length; i += 2) {
                if (i + 1 < participants.length) {
                  matches.push({
                    player1: participants[i].user_id,
                    player2: participants[i + 1].user_id,
                    round: 1,
                    matchNumber: Math.floor(i / 2) + 1
                  });
                }
              }

              // Insert matches into database
              const insertPromises = matches.map(match => {
                return new Promise((resolveMatch, rejectMatch) => {
                  db.run(
                    'INSERT INTO tournament_matches (tournament_id, round, match_number, player1_id, player2_id) VALUES (?, ?, ?, ?, ?)',
                    [tournamentId, match.round, match.matchNumber, match.player1, match.player2],
                    (err) => {
                      if (err) rejectMatch(err);
                      else resolveMatch();
                    }
                  );
                });
              });

              Promise.all(insertPromises).then(() => {
                // Update tournament status
                db.run(
                  'UPDATE tournaments SET status = "active", started_at = CURRENT_TIMESTAMP WHERE id = ?',
                  [tournamentId],
                  (err) => {
                    if (err) {
                      reply.status(500).send({ error: 'Failed to start tournament' });
                    } else {
                      reply.send({ message: 'Tournament started successfully' });
                    }
                    resolve();
                  }
                );
              }).catch(err => {
                reply.status(500).send({ error: 'Failed to create matches' });
                reject(err);
              });
            }
          );
        }
      );
    });
  });

  // Get tournament details
  fastify.get('/details/:tournamentId', async (request, reply) => {
    const { tournamentId } = request.params;

    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM tournaments WHERE id = ?',
        [tournamentId],
        (err, tournament) => {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else if (!tournament) {
            reply.status(404).send({ error: 'Tournament not found' });
            resolve();
          } else {
            // Get participants
            db.all(
              `SELECT tp.user_id, tp.joined_at, tp.eliminated_at 
               FROM tournament_participants tp 
               WHERE tp.tournament_id = ?`,
              [tournamentId],
              (err, participants) => {
                if (err) {
                  reply.status(500).send({ error: 'Database error' });
                  reject(err);
                } else {
                  // Get matches
                  db.all(
                    'SELECT * FROM tournament_matches WHERE tournament_id = ? ORDER BY round, match_number',
                    [tournamentId],
                    (err, matches) => {
                      if (err) {
                        reply.status(500).send({ error: 'Database error' });
                        reject(err);
                      } else {
                        reply.send({
                          tournament,
                          participants,
                          matches
                        });
                        resolve();
                      }
                    }
                  );
                }
              }
            );
          }
        }
      );
    });
  });

  // Get all tournaments (with mock data for testing)
  fastify.get('/list', async (request, reply) => {
    const { status, limit = 50 } = request.query;

    // For now, return mock tournaments for testing
    // In a real system, this would query the actual database
    const mockTournaments = [
      {
        id: 1,
        name: 'Weekly Championship',
        description: 'Join our weekly championship tournament! Winner takes glory and bragging rights.',
        max_participants: 8,
        current_participants: 3,
        status: 'open',
        created_by: 1,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        started_at: null,
        finished_at: null,
        winner_id: null
      },
      {
        id: 2,
        name: 'Speed Pong Masters',
        description: 'Fast-paced tournament for skilled players. Quick matches, intense competition!',
        max_participants: 16,
        current_participants: 7,
        status: 'open',
        created_by: 2,
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
        started_at: null,
        finished_at: null,
        winner_id: null
      },
      {
        id: 3,
        name: 'Beginner Friendly Cup',
        description: 'Perfect for newcomers! Learn the ropes in a friendly competitive environment.',
        max_participants: 8,
        current_participants: 2,
        status: 'open',
        created_by: 3,
        created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
        started_at: null,
        finished_at: null,
        winner_id: null
      },
      {
        id: 4,
        name: 'Elite Tournament',
        description: 'For the most skilled players only. High stakes, ultimate bragging rights.',
        max_participants: 4,
        current_participants: 4,
        status: 'full',
        created_by: 4,
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        started_at: null,
        finished_at: null,
        winner_id: null
      }
    ];

    // Filter by status if specified
    let filteredTournaments = mockTournaments;
    if (status) {
      filteredTournaments = mockTournaments.filter(t => t.status === status);
    }

    // Apply limit
    const limitedTournaments = filteredTournaments.slice(0, parseInt(limit));

    reply.send(limitedTournaments);
  });

  // Get user's tournaments (mock data for testing)
  fastify.get('/user/:userId', async (request, reply) => {
    const { userId } = request.params;

    // Mock user tournaments - tournaments the user has joined or created
    const mockUserTournaments = [
      {
        id: 1,
        name: 'Weekly Championship',
        description: 'Join our weekly championship tournament! Winner takes glory and bragging rights.',
        max_participants: 8,
        current_participants: 3,
        status: 'open',
        created_by: 1,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        user_role: 'participant', // participant or creator
        joined_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 5,
        name: 'My Custom Tournament',
        description: 'A tournament I created for my friends.',
        max_participants: 4,
        current_participants: 2,
        status: 'open',
        created_by: parseInt(userId), // User is the creator
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        user_role: 'creator',
        joined_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      }
    ];

    reply.send(mockUserTournaments);
  });

  // Update match result
  fastify.post('/match/result', async (request, reply) => {
    const { matchId, winnerId, player1Score, player2Score } = request.body;

    if (!matchId || !winnerId || player1Score === undefined || player2Score === undefined) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }

    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE tournament_matches SET winner_id = ?, player1_score = ?, player2_score = ?, status = "completed", played_at = CURRENT_TIMESTAMP WHERE id = ?',
        [winnerId, player1Score, player2Score, matchId],
        function(err) {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else {
            // Check if we need to create next round matches
            checkAndCreateNextRound(matchId);
            reply.send({ message: 'Match result updated successfully' });
            resolve();
          }
        }
      );
    });
  });

  function checkAndCreateNextRound(matchId) {
    // Get match details
    db.get(
      'SELECT * FROM tournament_matches WHERE id = ?',
      [matchId],
      (err, match) => {
        if (err || !match) return;

        // Check if all matches in current round are completed
        db.all(
          'SELECT * FROM tournament_matches WHERE tournament_id = ? AND round = ? AND status != "completed"',
          [match.tournament_id, match.round],
          (err, incompleteMatches) => {
            if (err || incompleteMatches.length > 0) return;

            // All matches in round completed, create next round
            db.all(
              'SELECT winner_id FROM tournament_matches WHERE tournament_id = ? AND round = ? ORDER BY match_number',
              [match.tournament_id, match.round],
              (err, winners) => {
                if (err) return;

                if (winners.length === 1) {
                  // Tournament finished
                  db.run(
                    'UPDATE tournaments SET status = "finished", finished_at = CURRENT_TIMESTAMP, winner_id = ? WHERE id = ?',
                    [winners[0].winner_id, match.tournament_id]
                  );
                } else if (winners.length > 1) {
                  // Create next round matches
                  const nextRound = match.round + 1;
                  const nextMatches = [];

                  for (let i = 0; i < winners.length; i += 2) {
                    if (i + 1 < winners.length) {
                      nextMatches.push({
                        player1: winners[i].winner_id,
                        player2: winners[i + 1].winner_id,
                        round: nextRound,
                        matchNumber: Math.floor(i / 2) + 1
                      });
                    }
                  }

                  nextMatches.forEach(nextMatch => {
                    db.run(
                      'INSERT INTO tournament_matches (tournament_id, round, match_number, player1_id, player2_id) VALUES (?, ?, ?, ?, ?)',
                      [match.tournament_id, nextMatch.round, nextMatch.matchNumber, nextMatch.player1, nextMatch.player2]
                    );
                  });
                }
              }
            );
          }
        );
      }
    );
  }

  // Get user tournaments
  fastify.get('/user/:userId', async (request, reply) => {
    const { userId } = request.params;

    return new Promise((resolve, reject) => {
      db.all(
        `SELECT t.*, tp.joined_at, tp.eliminated_at
         FROM tournaments t
         JOIN tournament_participants tp ON t.id = tp.tournament_id
         WHERE tp.user_id = ?
         ORDER BY t.created_at DESC`,
        [userId],
        (err, tournaments) => {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else {
            reply.send(tournaments);
            resolve();
          }
        }
      );
    });
  });
}

module.exports = routes;