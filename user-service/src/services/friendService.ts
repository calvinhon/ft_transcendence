import { db } from '../database';
import { createLogger, promisifyDbGet, promisifyDbRun } from '@ft-transcendence/common';

const logger = createLogger('USER-SERVICE-FRIENDS');

export interface Friend {
    userId: number;
    username: string;
    avatarUrl?: string;
    isOnline: boolean;
}

export class FriendService {

    // Add a friend (bidirectional)
    async addFriend(userId: number, friendId: number): Promise<void> {
        if (userId === friendId) {
            throw new Error("Cannot add self as friend");
        }

        try {
            // Insert bidirectional
            await new Promise<void>((resolve, reject) => {
                db.serialize(() => {
                    db.run(
                        'INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)',
                        [userId, friendId]
                    );
                    db.run(
                        'INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)',
                        [friendId, userId]
                    );
                });
                resolve();
            });
            logger.debug(`User ${userId} and ${friendId} are now friends`);
        } catch (error) {
            logger.error(`Error adding friend ${userId} -> ${friendId}`, error);
            throw error;
        }
    }

    // Remove a friend (bidirectional)
    async removeFriend(userId: number, friendId: number): Promise<void> {
        try {
            await new Promise<void>((resolve, reject) => {
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
                resolve();
            });
            logger.debug(`Friendship between ${userId} and ${friendId} removed`);
        } catch (error) {
            logger.error(`Error removing friend ${userId} -> ${friendId}`, error);
            throw error;
        }
    }

    // Get all friends for a user
    async getFriends(userId: number): Promise<Friend[]> {
        const query = `
            SELECT f.friend_id, p.display_name as username, p.avatar_url, u.username as auth_username
            FROM friends f
            LEFT JOIN user_profiles p ON f.friend_id = p.user_id
            LEFT JOIN auth.users u ON f.friend_id = u.id
            WHERE f.user_id = ?
        `;

        const rows = await new Promise<any[]>((resolve, reject) => {
            db.all(query, [userId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        return rows.map(row => ({
            userId: row.friend_id,
            username: row.username || row.auth_username || `User ${row.friend_id}`,
            avatarUrl: row.avatar_url,
            isOnline: false // TODO: Fetch from online-presence service or game-service
        }));
    }
}

export const friendService = new FriendService();
