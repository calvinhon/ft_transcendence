// auth-service/src/routes/handlers/twoFactorHandlers.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { twoFactorService } from '../../services/twoFactorService.js';
import { sendSuccess, sendError } from '@ft-transcendence/common';

/**
 * POST /auth/2fa/setup
 * Generate a new TOTP secret and QR code for the authenticated user
 */
export async function handleSetup2FA(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Extract JWT from cookie
    const token = (request.cookies as any).token;
    if (!token) {
      return sendError(reply, 'Not authenticated', 401);
    }

    // Verify JWT
    let decoded: any;
    try {
      decoded = await request.server.jwt.verify(token);
    } catch (error) {
      return sendError(reply, 'Invalid token', 401);
    }

    const { secret, qrCode, otpauth_url } = await twoFactorService.generateSecret(decoded.userId);

    return sendSuccess(reply, {
      message: '2FA setup initiated. Scan QR code with authenticator app',
      secret,
      qrCode,
      otpauth_url,
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    return sendError(reply, 'Failed to setup 2FA', 500);
  }
}

/**
 * POST /auth/2fa/verify
 * Verify TOTP token and enable 2FA
 */
export async function handleVerify2FA(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const jwtToken = (request.cookies as any).token;
    if (!jwtToken) {
      return sendError(reply, 'Not authenticated', 401);
    }

    let decoded: any;
    try {
      decoded = await request.server.jwt.verify(jwtToken);
    } catch (error) {
      return sendError(reply, 'Invalid token', 401);
    }

    const body = request.body as { token: string };
    const { token } = body;

    if (!token) {
      return sendError(reply, 'Token is required', 400);
    }

    const verified = await twoFactorService.verifyAndEnable(decoded.userId, token);

    if (!verified) {
      return sendError(reply, 'Invalid token', 400);
    }

    return sendSuccess(reply, {
      message: '2FA enabled successfully',
      enabled: true,
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to verify 2FA';
    return sendError(reply, errorMessage, 500);
  }
}

/**
 * POST /auth/2fa/disable
 * Disable 2FA for the authenticated user
 */
export async function handleDisable2FA(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const token = (request.cookies as any).token;
    if (!token) {
      return sendError(reply, 'Not authenticated', 401);
    }

    let decoded: any;
    try {
      decoded = await request.server.jwt.verify(token);
    } catch (error) {
      return sendError(reply, 'Invalid token', 401);
    }

    const body = request.body as { password: string };
    const { password } = body;

    if (!password) {
      return sendError(reply, 'Password is required', 400);
    }

    // TODO: Verify password before disabling 2FA
    // For now, we'll just disable it
    await twoFactorService.disable(decoded.userId);

    return sendSuccess(reply, {
      message: '2FA disabled successfully',
      enabled: false,
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    return sendError(reply, 'Failed to disable 2FA', 500);
  }
}

/**
 * GET /auth/2fa/status
 * Get 2FA status for the authenticated user
 */
export async function handleGet2FAStatus(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const token = (request.cookies as any).token;
    if (!token) {
      return sendError(reply, 'Not authenticated', 401);
    }

    let decoded: any;
    try {
      decoded = await request.server.jwt.verify(token);
    } catch (error) {
      return sendError(reply, 'Invalid token', 401);
    }

    const status = await twoFactorService.getStatus(decoded.userId);

    return sendSuccess(reply, status);
  } catch (error) {
    console.error('2FA status error:', error);
    return sendError(reply, 'Failed to get 2FA status', 500);
  }
}
