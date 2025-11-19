// frontend/src/local-player-storage.ts
// Local storage management for local players

import { LocalPlayer } from './types';

export class LocalPlayerStorage {
  private readonly STORAGE_KEY = 'localPlayers';

  public loadLocalPlayers(): LocalPlayer[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('✅ [LocalPlayerStorage] Loaded local players:', parsed.length);
        return parsed;
      }
    } catch (error) {
      console.error('❌ [LocalPlayerStorage] Failed to parse local players from storage:', error);
    }

    console.log('📝 [LocalPlayerStorage] No stored players found, returning empty array');
    return [];
  }

  public saveLocalPlayers(players: LocalPlayer[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(players));
      console.log('💾 [LocalPlayerStorage] Saved local players:', players.length);
    } catch (error) {
      console.error('❌ [LocalPlayerStorage] Failed to save local players:', error);
    }
  }

  public addLocalPlayer(player: LocalPlayer): LocalPlayer[] {
    const players = this.loadLocalPlayers();

    // Check for duplicate email
    const existingPlayer = players.find(p => p.email === player.email);
    if (existingPlayer) {
      console.warn('⚠️ [LocalPlayerStorage] Player with email already exists:', player.email);
      throw new Error('A player with this email already exists');
    }

    players.push(player);
    this.saveLocalPlayers(players);
    console.log('✅ [LocalPlayerStorage] Added local player:', player.username);

    return players;
  }

  public removeLocalPlayer(playerId: string): LocalPlayer[] {
    const players = this.loadLocalPlayers();
    const filteredPlayers = players.filter(p => p.id !== playerId);

    if (filteredPlayers.length !== players.length) {
      this.saveLocalPlayers(filteredPlayers);
      console.log('🗑️ [LocalPlayerStorage] Removed local player:', playerId);
    } else {
      console.warn('⚠️ [LocalPlayerStorage] Player not found for removal:', playerId);
    }

    return filteredPlayers;
  }

  public updateLocalPlayer(playerId: string, updates: Partial<LocalPlayer>): LocalPlayer[] {
    const players = this.loadLocalPlayers();
    const index = players.findIndex(p => p.id === playerId);

    if (index !== -1) {
      players[index] = { ...players[index], ...updates };
      this.saveLocalPlayers(players);
      console.log('✏️ [LocalPlayerStorage] Updated local player:', playerId);
    } else {
      console.warn('⚠️ [LocalPlayerStorage] Player not found for update:', playerId);
    }

    return players;
  }

  public getLocalPlayer(playerId: string): LocalPlayer | undefined {
    const players = this.loadLocalPlayers();
    return players.find(p => p.id === playerId);
  }

  public getLocalPlayersByEmail(email: string): LocalPlayer[] {
    const players = this.loadLocalPlayers();
    return players.filter(p => p.email === email);
  }

  public clearAllLocalPlayers(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('🧹 [LocalPlayerStorage] Cleared all local players');
  }

  public exportLocalPlayers(): string {
    const players = this.loadLocalPlayers();
    return JSON.stringify(players, null, 2);
  }

  public importLocalPlayers(jsonData: string): { success: boolean; error?: string } {
    try {
      const imported = JSON.parse(jsonData);

      if (!Array.isArray(imported)) {
        return { success: false, error: 'Invalid data format. Expected an array.' };
      }

      // Validate each player object
      for (const player of imported) {
        if (!player.id || !player.username) {
          return { success: false, error: 'Invalid player data. Missing required fields.' };
        }
      }

      this.saveLocalPlayers(imported);
      console.log('📥 [LocalPlayerStorage] Imported local players:', imported.length);

      return { success: true };
    } catch (error) {
      console.error('❌ [LocalPlayerStorage] Failed to import local players:', error);
      return { success: false, error: 'Failed to parse imported data.' };
    }
  }

  public getStorageStats(): {
    totalPlayers: number;
    storageSize: number;
    lastModified?: Date;
  } {
    const players = this.loadLocalPlayers();
    const storageData = localStorage.getItem(this.STORAGE_KEY);
    const storageSize = storageData ? new Blob([storageData]).size : 0;

    return {
      totalPlayers: players.length,
      storageSize,
      // Note: localStorage doesn't provide modification timestamps
    };
  }

  public migrateLegacyData(): void {
    // Handle migration from old storage formats if needed
    const oldKeys = ['localPlayers_v1', 'players']; // Add old keys as needed

    for (const oldKey of oldKeys) {
      const oldData = localStorage.getItem(oldKey);
      if (oldData) {
        try {
          const parsed = JSON.parse(oldData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log('🔄 [LocalPlayerStorage] Migrating legacy data from:', oldKey);
            this.saveLocalPlayers(parsed);
            localStorage.removeItem(oldKey);
            console.log('✅ [LocalPlayerStorage] Migration completed');
            break; // Only migrate from the first found legacy key
          }
        } catch (error) {
          console.warn('⚠️ [LocalPlayerStorage] Failed to migrate legacy data from:', oldKey, error);
        }
      }
    }
  }
}