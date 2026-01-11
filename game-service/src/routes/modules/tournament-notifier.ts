// game-service/src/routes/modules/tournament-notifier.ts
// Centralized service for notifying tournament service of match results

import axios from 'axios';
import { createLogger } from '@ft-transcendence/common';

const logger = createLogger('GAME-SERVICE');

let serverSecret: string | null = null;

async function getServerSecret(): Promise<string | null> {
    if (serverSecret) return serverSecret;
    try {
        const vaultResponse = await axios.get(
            `${process.env.VAULT_ADDR}/v1/kv/data/Server_Session`,
            { headers: { 'X-Vault-Token': process.env.VAULT_TOKEN } }
        );
        const secrets = vaultResponse?.data?.data?.data;
        const secret = secrets?.Secret;
        if (!secret) throw new Error('Vault response missing secrets');
        serverSecret = secret;
        return serverSecret;
    } catch (err: any) {
        logger.warn('Failed to retrieve Server_Session secret from Vault', { error: err?.message });
        return null;
    }
}

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
    return (async () => {
        logger.info(`[${gameId}] Notifying tournament service: tournamentId=${tournamentId}, matchId=${result.matchId}`);
        try {
            const secret = await getServerSecret();
            const res = await fetch('https://tournament-service:3000/matches/result', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(secret ? { 'X-Microservice-Secret': secret } : {})
                },
                body: JSON.stringify({
                    matchId: result.matchId,
                    winnerId: result.winnerId,
                    player1Score: result.player1Score,
                    player2Score: result.player2Score
                })
            });

            if (!res.ok) {
                const text = await res.text().catch(() => '');
                logger.warn(`[${gameId}] Tournament notify failed`, { status: res.status, body: text });
            } else {
                logger.info(`[${gameId}] Tournament service notified: ${res.status}`);
            }
        } catch (e: any) {
            logger.warn(`[${gameId}] Problem notifying tournament service`, { error: e?.message });
        }
    })();
}
