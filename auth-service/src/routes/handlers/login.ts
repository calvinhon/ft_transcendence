// auth-service/src/routes/handlers/login.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../../services/authService';
import { validateRequiredFields, sendError, sendSuccess, createLogger, ERROR_MESSAGES } from '@ft-transcendence/common';
import axios from 'axios';

const logger = createLogger('AUTH-SERVICE');

let sessionSecret: any = null;

export async function loginHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authService = new AuthService();
  let identifier = 'unknown';
  try {
    const body = request.body as { username: string; password: string };
    identifier = body.username;
    const { password } = body;

    logger.info('Login attempt for identifier:', identifier);

    const validationError = validateRequiredFields(request.body, ['username', 'password']);
    if (validationError) {
      logger.info('Validation failed for', identifier, 'error:', validationError);
      return sendError(reply, validationError, 400);
    }

    logger.info('Validation passed for', identifier);

    const user = await authService.login(identifier, password);

    logger.info('Login successful for', identifier);

    // Fetch campaign_level from user profile
    //Hoach added
    let campaignLevel = 1; // default
    if (!sessionSecret) {
      try {
        const vaultResponse = await axios.get(`${process.env.VAULT_ADDR}/v1/kv/data/Server_Session`, { headers: { 'X-Vault-Token': process.env.VAULT_TOKEN } });
        const secrets = vaultResponse.data.data.data;
        if (secrets && secrets.Secret) {
          sessionSecret = secrets.Secret;
        }
      } catch (err: any) {
        logger.warn('Failed to fetch session secret:', err.message);
      }
    }
    if (sessionSecret) {
      try {
        const profileResponse = await axios.get(`https://user-service:3000/profile/${user.userId}`, { 
          timeout: 5000, 
          headers: { 'X-Microservice-Secret': sessionSecret } 
        });
        if (profileResponse.data && typeof profileResponse.data.campaign_level === 'number') {
          campaignLevel = profileResponse.data.campaign_level;
        }
      } catch (err: any) {
        logger.warn('Failed to fetch user profile for campaign level:', err.message);
      }
    }
    // Hoach add ended

    if (!request.session.authenticated) {
      request.session.userId = Number(user.userId);
      request.session.authenticated = true;
      await request.session.save();
    }
    sendSuccess(reply, {
      user: {
        ...user,
        //Hoach added
        campaign_level: campaignLevel
        // Hoach add ended
      }
    }, 'Login successful');

  } catch (error: any) {
    logger.warn('Login failed for', identifier, 'with error:', error.message);
    if (error.message === 'Invalid credentials') {
      sendError(reply, 'Invalid credentials', 401);
    } else {
      logger.error('Login error:', error);
      sendError(reply, ERROR_MESSAGES.INTERNAL_SERVER_ERROR, 500);
    }
  }
}