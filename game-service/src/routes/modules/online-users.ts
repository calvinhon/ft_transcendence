// game-service/src/routes/modules/online-users.ts
import { OnlineUserData, OnlineUser } from './types';
import { logger } from './logger';

// Global state for online users
export const onlineUsers = new Map<number, OnlineUserData>();

// Add user to online tracking when they connect
export function addOnlineUser(userId: number, username: string, socket: any): void {
  if (onlineUsers.has(userId)) {
    // User already tracked, just add this socket
    const userData = onlineUsers.get(userId)!;
    userData.sockets.add(socket);
    userData.lastSeen = new Date();
    logger.info(`User ${username} (${userId}) added socket. Total sockets: ${userData.sockets.size}`);
  } else {
    // New user
    onlineUsers.set(userId, {
      username: username,
      sockets: new Set([socket]),
      lastSeen: new Date()
    });
    logger.info(`User ${username} (${userId}) is now online. Total online: ${onlineUsers.size}`);
  }
}

// Remove user from online tracking
export function removeOnlineUser(socket: any): void {
  for (const [userId, userData] of onlineUsers) {
    if (userData.sockets.has(socket)) {
      userData.sockets.delete(socket);
      logger.info(`User ${userData.username} (${userId}) removed socket. Remaining sockets: ${userData.sockets.size}`);

      // Only remove user if they have no more sockets
      if (userData.sockets.size === 0) {
        logger.info(`User ${userData.username} (${userId}) went offline. Total online: ${onlineUsers.size - 1}`);
        onlineUsers.delete(userId);
      }
      break;
    }
  }
}

// Get currently online users
export function getOnlineUsers(): OnlineUser[] {
  const onlineUsersList: OnlineUser[] = Array.from(onlineUsers.entries()).map(([userId, userData]) => ({
    user_id: userId,
    username: userData.username,
    display_name: userData.username,
    status: 'online',
    last_seen: userData.lastSeen.toISOString(),
    is_bot: false
  }));

  // Always include bot players as "online"
  const botPlayers: OnlineUser[] = [
    {
      user_id: 'bot_easy',
      username: 'EasyBot',
      display_name: 'Easy Bot ⚡',
      status: 'online',
      last_seen: new Date().toISOString(),
      is_bot: true
    },
    {
      user_id: 'bot_medium',
      username: 'MediumBot',
      display_name: 'Medium Bot ⚔️',
      status: 'online',
      last_seen: new Date().toISOString(),
      is_bot: true
    },
    {
      user_id: 'bot_hard',
      username: 'HardBot',
      display_name: 'Hard Bot 🔥',
      status: 'online',
      last_seen: new Date().toISOString(),
      is_bot: true
    }
  ];

  const allOnlineUsers = [...onlineUsersList, ...botPlayers];
  logger.info(`Returning ${allOnlineUsers.length} online users (${onlineUsersList.length} real, ${botPlayers.length} bots)`);
  return allOnlineUsers;
}