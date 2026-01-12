// user-service/src/routes/profile.ts
import axios from 'axios';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from '../services/userService';
import { UpdateProfileBody } from '../types';
import { db } from '../database';
import { promisifyDbRun, sendError } from '@ft-transcendence/common';

let serverSecret: any = null;

export async function setupProfileRoutes(fastify: FastifyInstance): Promise<void> {

  try {
    const response = await axios.get(`${process.env.VAULT_ADDR}/v1/kv/data/Server_Session`, { headers: { 'X-Vault-Token': process.env.VAULT_TOKEN } });
    console.log("Successfully retrieved server secret.");
    serverSecret = response.data.data.data.Secret;
  } catch (err: any) {
    console.log("Error encounter while attempting to retrieve session secret: ", err.message);
  }

  // Get user profile
  fastify.get<{
    Params: { userId: string };
  }>('/profile/:userId', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    const { userId } = request.params;

    const serverCheck = request.headers['x-microservice-secret'];

    if (serverCheck !== serverSecret && (!request.session || !request.session.userId))
      return console.log('Profile Get'), sendError(reply, "Unauthorized", 401);

    try {
      const profile = await UserService.getOrCreateProfile(parseInt(userId));
      reply.send(profile);
    } catch (err: any) {
      console.error('Profile Fetch Error:', err);
      reply.status(500).send({ error: `Database error: ${err.message}` });
    }
  });

  // Update user profile
  fastify.put<{
    Params: { userId: string };
    Body: UpdateProfileBody;
  }>('/profile/:userId', async (request: FastifyRequest<{ Params: { userId: string }; Body: UpdateProfileBody }>, reply: FastifyReply) => {
    const { userId } = request.params;
    const updates = request.body;

    // Enforce 16 char limit for display name
    if (updates.displayName && updates.displayName.length > 16) {
      return reply.status(400).send({ error: 'Display name must be 16 characters or less' });
    }


    const serverCheck = request.headers['x-microservice-secret'];

    if (serverCheck !== serverSecret && (!request.session || !request.session.userId))
      return console.log('Profile Put'), sendError(reply, "Unauthorized", 401);

    try {
      await UserService.updateProfile(parseInt(userId), updates);
      reply.send({ message: 'Profile updated successfully' });
    } catch (err) {
      reply.status(500).send({ error: 'Database error' });
    }
  });

  // Update game stats (only verifiable data; levels calculated server-side)
  // Hoach edited
  fastify.post<{
    Params: { userId: string };
    Body: {
      gameResult?: 'win' | 'loss';  // Verifiable outcome
      xpGained?: number;  // XP from game
      [key: string]: any;
    };
  }>('/game/update-stats/:userId', async (request: FastifyRequest<{ Params: { userId: string }; Body: { gameResult?: 'win' | 'loss'; xpGained?: number; [key: string]: any; } }>, reply: FastifyReply) => {
    const { userId } = request.params;
    const { gameResult, xpGained } = request.body;

    const serverCheck = request.headers['x-microservice-secret'];
    if (serverCheck !== serverSecret && (!request.session || request.session.userId !== parseInt(userId))) {
      return sendError(reply, "Unauthorized", 401);
    }

    try {
      // Fetch current profile
      const profile = await UserService.getOrCreateProfile(parseInt(userId));

      // Update verifiable stats
      const updates: any = { updated_at: 'CURRENT_TIMESTAMP' };
      if (gameResult === 'win') {
        updates.wins = (profile.wins || 0) + 1;
        updates.total_games = (profile.total_games || 0) + 1;
      } else if (gameResult === 'loss') {
        updates.lost = (profile.lost || 0) + 1;
        updates.total_games = (profile.total_games || 0) + 1;
      }
      if (typeof xpGained === 'number' && xpGained > 0) {
        updates.xp = (profile.xp || 0) + xpGained;
      }

      // Calculate level server-side (e.g., based on XP)
      // Hoach added
      const newXp = updates.xp || profile.xp || 0;
      updates.level = Math.floor(newXp / 100) + 1;  // Example: level = floor(xp/100) + 1
      // Hoach add ended

      // Update database
      const fields = Object.keys(updates).map(key => `${key} = ?`);
      const values = Object.values(updates);
      values.push(userId);
      const sql = `UPDATE user_profiles SET ${fields.join(', ')} WHERE user_id = ?`;
      await promisifyDbRun(db, sql, values);
      reply.send({ message: 'Game stats updated successfully' });
    } catch (err) {
      reply.status(500).send({ error: 'Database error', details: err });
    }
  });
  // Hoach edit ended

  // Update campaign level (server-side validation only)
  // Hoach added
  fastify.post<{
    Params: { userId: string };
    Body: { missionId?: number; completed?: boolean };
  }>('/game/update-campaign/:userId', async (request: FastifyRequest<{ Params: { userId: string }; Body: { missionId?: number; completed?: boolean } }>, reply: FastifyReply) => {
    const { userId } = request.params;
    const { missionId, completed } = request.body;

    const serverCheck = request.headers['x-microservice-secret'];
    if (serverCheck !== serverSecret && (!request.session || request.session.userId !== parseInt(userId))) {
      return sendError(reply, "Unauthorized", 401);
    }

    if (!missionId || completed !== true) {
      return reply.status(400).send({ error: 'Invalid mission completion data' });
    }

    try {
      // Fetch current profile
      const profile = await UserService.getOrCreateProfile(parseInt(userId));

      // Validate and update campaign level
      // Hoach edited - Check if missionId is the current level being completed
      let newCampaignLevel = profile.campaign_level || 1;
      // Advance to next level when completing the current level
      if (missionId === newCampaignLevel && completed) {
        newCampaignLevel = newCampaignLevel + 1;
      }
      
      // Calculate campaign_mastered server-side (user masters campaign when reaching max level)
      const campaignMastered = newCampaignLevel >= 3 ? 1 : 0;
      // Hoach edit ended

      await promisifyDbRun(db, 'UPDATE user_profiles SET campaign_level = ?, campaign_mastered = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [newCampaignLevel, campaignMastered, userId]);
      // Hoach edited - Return new campaign level so frontend can update
      reply.send({ 
        message: 'Campaign updated successfully', 
        campaign_level: newCampaignLevel,
        campaign_mastered: campaignMastered 
      });
      // Hoach edit ended
    } catch (err) {
      reply.status(500).send({ error: 'Database error', details: err });
    }
  });
  // Hoach add ended

}