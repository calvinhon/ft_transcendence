// game-service/src/routes/modules/tournament-notifier.ts
// Centralized service for notifying tournament service of match results

import * as http from 'http';
import { createLogger } from '@ft-transcendence/common';

const logger = createLogger('GAME-SERVICE');

export interface MatchResult {
    matchId: number;
    winnerId: number | null;
    player1Score: number;
    player2Score: number;
}

/**
 * Notify the tournament service of a match result.
 * Returns a Promise that resolves when the notification is sent.
 */
export function notifyTournamentService(
    gameId: number,
    tournamentId: number,
    result: MatchResult
): Promise<void> {
    return new Promise((resolve, reject) => {
        logger.info(`[${gameId}] Notifying tournament service: tournamentId=${tournamentId}, matchId=${result.matchId}`);

        const postData = JSON.stringify({
            matchId: result.matchId,
            winnerId: result.winnerId,
            player1Score: result.player1Score,
            player2Score: result.player2Score
        });

        const req = http.request({
            hostname: 'tournament-service',
            port: 3000,
            path: '/matches/result',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        }, (res) => {
            logger.info(`[${gameId}] Tournament service notified: ${res.statusCode}`);
            resolve();
        });

        req.on('error', (e: Error) => {
            logger.error(`[${gameId}] Problem notifying tournament service: ${e.message}`);
            // Don't reject - tournament notification failure shouldn't break the game flow
            resolve();
        });

        req.write(postData);
        req.end();
    });
}
