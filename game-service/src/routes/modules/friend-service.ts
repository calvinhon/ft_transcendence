import { db } from './database';
import { logger } from './logger';
import { matchmakingService } from './matchmaking-service';

export interface Friend {
    userId: number;
    username: string;
    avatarUrl?: string; // Optional, might need to fetch from profile service or join
    isOnline: boolean;
}

class FriendService {

    // Add a friend (bidirectional - both directions are stored)
    addFriend(userId: number, friendId: number): Promise<void> {
        return new Promise((resolve, reject) => {
            if (userId === friendId) {
                return reject(new Error("Cannot add self as friend"));
            }

            // Insert both directions for bidirectional friendship
            db.serialize(() => {
                db.run(
                    'INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)',
                    [userId, friendId],
                    (err) => {
                        if (err && !err.message.includes('UNIQUE constraint failed')) {
                            logger.error(`Error adding friend ${userId} -> ${friendId}`, err);
                        }
                    }
                );
                db.run(
                    'INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)',
                    [friendId, userId],
                    (err) => {
                        if (err && !err.message.includes('UNIQUE constraint failed')) {
                            logger.error(`Error adding reverse friend ${friendId} -> ${userId}`, err);
                        }
                    }
                );
            });

            logger.debug(`User ${userId} and ${friendId} are now friends (bidirectional)`);
            resolve();
        });
    }

    // Remove a friend (bidirectional - removes both directions)
    removeFriend(userId: number, friendId: number): Promise<void> {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run(
                    'DELETE FROM friends WHERE user_id = ? AND friend_id = ?',
                    [userId, friendId]
                );
                db.run(
                    'DELETE FROM friends WHERE user_id = ? AND friend_id = ?',
                    [friendId, userId]
                );
            });
            logger.debug(`Friendship between ${userId} and ${friendId} removed (bidirectional)`);
            resolve();
        });
    }

    // Get all friends for a user
    // Note: This requires joining with a users table or fetching user details.
    // Since we don't have a direct 'users' table access in this microservice structure easily exposed sometimes,
    // we'll assume we can join on `users` if it exists in the same SQLite DB (which it seems to, based on FKs).
    getFriends(userId: number): Promise<Friend[]> {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT friend_id, created_at
                FROM friends
                WHERE user_id = ?
            `;

            db.all(query, [userId], (err, rows: any[]) => {
                if (err) {
                    logger.error(`Error fetching friends for ${userId}`, err);
                    reject(err);
                    return;
                }

                // We only have IDs now since 'users' table doesn't exist in this DB
                const friends: Friend[] = rows.map(row => ({
                    userId: row.friend_id,
                    username: `User ${row.friend_id}`, // Placeholder, frontend must fetch or we need to store it
                    avatarUrl: undefined,
                    isOnline: this.isUserOnline(row.friend_id)
                }));

                resolve(friends);
            });
        });
    }

    // Check if a specific user is online
    isUserOnline(userId: number): boolean {
        // We can check matchmaking service's connected players or a global connection map
        // matchmakingservice tracks queued players, but not generic connected users?
        // Let's check how we track connected users.
        // We need access to the WebSocket map or similar.
        // For now, let's assume we can export a way to check from websocket module or similar.
        // Actually, let's implement a rudimentary check if we don't have a global map yet.
        // CHECK: matchmaking-service doesn't track ALL users, only queued ones.
        // We probably need a ConnectedUserManager.
        // For simpler implementation, we can ask the `websocket.ts` module if we can export the `clients` map or similar.
        // But `websocket.ts` logic is inside `handleWebSocketMessage`.

        // TEMPORARY: Return false until we wire up presence.
        // Wait, I should implement presence properly.
        return activeConnections.has(userId);
    }
}

// Global active connections set (managed by websocket callbacks)
export const activeConnections = new Set<number>();

export const friendService = new FriendService();
