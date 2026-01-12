import { FastifyRequest, FastifyReply } from 'fastify';
import { sendSuccess, sendError } from '@ft-transcendence/common';
import { getQuery } from '../../utils/database';
import axios from 'axios';

let sessionSecret: any = null;

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
                // Fetch session secret if not already fetched
                if (!sessionSecret) {
                    try {
                        const vaultResponse = await axios.get(`${process.env.VAULT_ADDR}/v1/kv/data/Server_Session`, { headers: { 'X-Vault-Token': process.env.VAULT_TOKEN } });
                        const secrets = vaultResponse.data.data.data;
                        if (secrets && secrets.Secret) {
                            sessionSecret = secrets.Secret;
                        }
                    } catch (err: any) {
                        console.warn('Failed to fetch session secret:', err.message);
                    }
                }

                // Fetch user profile including campaign_level
                //Hoach added
                let campaignLevel = 1; // default
                if (sessionSecret) {
                    try {
                        const profileResponse = await axios.get(`https://user-service:3000/profile/${userId}`, { 
                            timeout: 5000, 
                            headers: { 'X-Microservice-Secret': sessionSecret } 
                        });
                        if (profileResponse.data && typeof profileResponse.data.campaign_level === 'number') {
                            campaignLevel = profileResponse.data.campaign_level;
                        }
                    } catch (err: any) {
                        console.warn('Failed to fetch user profile for campaign level:', err.message);
                    }
                }
                // Hoach add ended

                sendSuccess(reply, {
                    valid: true,
                    user: {
                        userId: user.id,
                        username: user.username,
                        email: user.email,
                        //Hoach added
                        campaign_level: campaignLevel
                        // Hoach add ended
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

        // Fetch session secret if not already fetched
        if (!sessionSecret) {
            try {
                const vaultResponse = await axios.get(`${process.env.VAULT_ADDR}/v1/kv/data/Server_Session`, { headers: { 'X-Vault-Token': process.env.VAULT_TOKEN } });
                const secrets = vaultResponse.data.data.data;
                if (secrets && secrets.Secret) {
                    sessionSecret = secrets.Secret;
                }
            } catch (err: any) {
                console.warn('Failed to fetch session secret:', err.message);
            }
        }

        // Fetch user profile including campaign_level
        //Hoach added
        let campaignLevel = 1; // default
        if (sessionSecret) {
            try {
                const profileResponse = await axios.get(`https://user-service:3000/profile/${userId}`, { 
                    timeout: 5000, 
                    headers: { 'X-Microservice-Secret': sessionSecret } 
                });
                if (profileResponse.data && typeof profileResponse.data.campaign_level === 'number') {
                    campaignLevel = profileResponse.data.campaign_level;
                }
            } catch (err: any) {
                console.warn('Failed to fetch user profile for campaign level:', err.message);
            }
        }
        // Hoach add ended

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
                email: user.email,
                //Hoach added
                campaign_level: campaignLevel
                // Hoach add ended
            }
        }, 'Session established');
    } catch (error) {
        console.error('Error establishing session:', error);
        sendError(reply, 'Failed to establish session');
    }
}
