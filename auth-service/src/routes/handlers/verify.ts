import { FastifyRequest, FastifyReply } from 'fastify';
import { sendSuccess, sendError } from '@ft-transcendence/common';
import { getQuery } from '../../utils/database';

export async function verifySessionHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    console.log('Verify request, session:', {
        authenticated: request.session.authenticated,
        userId: request.session.userId,
        sessionId: request.session.sessionId
    });
    // Check if user has an active session
    if (request.session.authenticated && request.session.userId) {
        // Session is valid, return user data
        const userId = request.session.userId;

        try {
            const user = await getQuery('SELECT id, username, email FROM users WHERE id = ?', [userId]);
            if (user) {
                sendSuccess(reply, {
                    valid: true,
                    user: {
                        userId: user.id,
                        username: user.username,
                        email: user.email
                    }
                }, 'Session valid');
            } else {
                sendSuccess(reply, { valid: false }, 'User not found');
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            sendSuccess(reply, { valid: false }, 'Database error');
        }
    } else {
        // No valid session
        sendSuccess(reply, { valid: false }, 'No active session');
    }
}

export async function establishSessionHandler(request: FastifyRequest<{ Body: { userId: number } }>, reply: FastifyReply): Promise<void> {
    const { userId } = request.body;

    if (!userId) {
        sendError(reply, 'User ID required');
        return;
    }

    try {
        const user = await getQuery('SELECT id, username, email FROM users WHERE id = ?', [userId]);
        if (!user) {
            sendError(reply, 'User not found');
            return;
        }

        // Establish session for this user
        console.log('Establishing session for user:', userId);
        request.session.userId = user.id;
        request.session.authenticated = true;
        await request.session.save();
        console.log('Session saved, sessionId:', request.session.sessionId);

        sendSuccess(reply, {
            valid: true,
            user: {
                userId: user.id,
                username: user.username,
                email: user.email
            }
        }, 'Session established');
    } catch (error) {
        console.error('Error establishing session:', error);
        sendError(reply, 'Failed to establish session');
    }
}
