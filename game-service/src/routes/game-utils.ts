
// game-utils.ts
// Utility functions, shared state, and types for game logic

import sqlite3 from 'sqlite3';
/// <reference types="node" />

export const db = new sqlite3.Database('./database/games.db');
export const waitingPlayers: any[] = [];
export const activeGames: Map<number, any> = new Map();
export const matchTimers: Map<any, NodeJS.Timeout> = new Map();

// Online user tracking
export const onlineUsers = new Map<number, {
  username: string;
  sockets: Set<any>;
  lastSeen: Date;
}>();

export function addOnlineUser(userId: number, username: string, socket: any): void {
  if (onlineUsers.has(userId)) {
    const userData = onlineUsers.get(userId)!;
    userData.sockets.add(socket);
    userData.lastSeen = new Date();
  } else {
    onlineUsers.set(userId, {
      username: username,
      sockets: new Set([socket]),
      lastSeen: new Date()
    });
  }
}

export function removeOnlineUser(socket: any): void {
  for (const [userId, userData] of onlineUsers) {
    if (userData.sockets.has(socket)) {
      userData.sockets.delete(socket);
      if (userData.sockets.size === 0) {
        onlineUsers.delete(userId);
      }
      break;
    }
  }
}

export function getOnlineUsers(): any[] {
  return Array.from(onlineUsers.entries()).map(([userId, userData]) => ({
    user_id: userId,
    username: userData.username,
    display_name: userData.username,
    status: 'online',
    last_seen: userData.lastSeen.toISOString(),
    is_bot: false
  }));
}
