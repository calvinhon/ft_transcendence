// Wrapper service for PlayerManager (migration bridge)
import { playerManager as existingPlayerManager } from '../managers/player-manager';

// Re-export the existing PlayerManager instance as `playerService`.
// During migration, consumers should import from here.
export const playerService = existingPlayerManager;
