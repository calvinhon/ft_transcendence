import { FastifyReply, FastifyRequest } from 'fastify';
import { sendError, sendSuccess } from '@ft-transcendence/common';
import { AuthService } from '../../services/authService';
import { getQuery } from '../../utils/database';

type SessionWithLocalPlayers = {
  authenticated?: boolean;
  userId?: number;
  localPlayers?: StoredLocalPlayer[];
  oauthLastUserId?: number;
  oauthLastAt?: number;
};

type StoredLocalPlayer = {
  id: string;
  userId: number;
  username: string;
  team?: number;
  avatarUrl?: string;
  isBot?: boolean;
};

function requireHostSession(request: FastifyRequest, reply: FastifyReply): SessionWithLocalPlayers | null {
  const session = request.session as any as SessionWithLocalPlayers;
  if (!session?.authenticated || !session?.userId) {
    sendError(reply, 'Unauthorized', 401);
    return null;
  }
  if (!Array.isArray(session.localPlayers)) session.localPlayers = [];
  return session;
}

function normalizePlayer(p: StoredLocalPlayer): StoredLocalPlayer {
  return {
    id: String(p.id ?? p.userId),
    userId: Number(p.userId),
    username: String(p.username),
    team: typeof p.team === 'number' ? p.team : undefined,
    avatarUrl: typeof p.avatarUrl === 'string' ? p.avatarUrl : undefined,
    isBot: !!p.isBot
  };
}

export async function getLocalPlayersHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const session = requireHostSession(request, reply);
  if (!session) return;
  const players = (session.localPlayers || []).map(normalizePlayer);
  sendSuccess(reply, { players }, 'Local players');
}

export async function clearLocalPlayersHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const session = requireHostSession(request, reply);
  if (!session) return;
  session.localPlayers = [];
  await (request.session as any).save();
  sendSuccess(reply, { players: [] }, 'Cleared local players');
}

export async function deleteLocalPlayerHandler(
  request: FastifyRequest<{ Params: { userId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const session = requireHostSession(request, reply);
  if (!session) return;

  const userId = Number(request.params.userId);
  if (!Number.isFinite(userId)) return sendError(reply, 'Invalid userId', 400);

  session.localPlayers = (session.localPlayers || []).filter(p => Number(p.userId) !== userId);
  await (request.session as any).save();
  sendSuccess(reply, { players: (session.localPlayers || []).map(normalizePlayer) }, 'Removed local player');
}

export async function updateLocalPlayerHandler(
  request: FastifyRequest<{ Body: { userId: number; team?: number; avatarUrl?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const session = requireHostSession(request, reply);
  if (!session) return;

  const { userId, team, avatarUrl } = request.body || ({} as any);
  if (!Number.isFinite(userId)) return sendError(reply, 'Invalid userId', 400);

  const player = (session.localPlayers || []).find(p => Number(p.userId) === Number(userId));
  if (!player) return sendError(reply, 'Local player not found', 404);

  if (typeof team === 'number') player.team = team;
  if (typeof avatarUrl === 'string') player.avatarUrl = avatarUrl;

  await (request.session as any).save();
  sendSuccess(reply, { player: normalizePlayer(player) }, 'Updated local player');
}

export async function addLocalPlayerWithPasswordHandler(
  request: FastifyRequest<{ Body: { username: string; password: string } }>,
  reply: FastifyReply
): Promise<void> {
  const session = requireHostSession(request, reply);
  if (!session) return;

  const { username, password } = request.body || ({} as any);
  if (!username || !password) return sendError(reply, 'Username and password required', 400);

  const authService = new AuthService();
  try {
    const user = await authService.login(username, password);

    // Don’t allow adding the host as a "local player"
    if (Number(user.userId) === Number(session.userId)) {
      return sendError(reply, 'User is already the Host', 409);
    }

    const existing = (session.localPlayers || []).find(p => Number(p.userId) === Number(user.userId) || p.username === user.username);
    if (existing) {
      return sendError(reply, 'User already added', 409);
    }

    const stored: StoredLocalPlayer = { id: String(user.userId), userId: Number(user.userId), username: user.username };
    session.localPlayers = [...(session.localPlayers || []), stored];
    await (request.session as any).save();

    sendSuccess(reply, { player: normalizePlayer(stored) }, 'Added local player');
  } catch (e: any) {
    return sendError(reply, e?.message === 'Invalid credentials' ? 'Invalid credentials' : 'Failed to add local player', 401);
  }
}

export async function registerLocalPlayerHandler(
  request: FastifyRequest<{ Body: { username: string; email: string; password: string } }>,
  reply: FastifyReply
): Promise<void> {
  const session = requireHostSession(request, reply);
  if (!session) return;

  const { username, email, password } = request.body || ({} as any);
  if (!username || !email || !password) return sendError(reply, 'Username, email and password required', 400);

  // Enforce 16 char limit
  if (username.length > 16) {
    return sendError(reply, 'Username must be 16 characters or less', 400);
  }

  try {
    const authService = new AuthService();
    const result = await authService.register(username, email, password);

    const stored: StoredLocalPlayer = { id: String(result.userId), userId: Number(result.userId), username };
    session.localPlayers = [...(session.localPlayers || []), stored];
    await (request.session as any).save();

    sendSuccess(reply, { player: normalizePlayer(stored) }, 'Registered and added local player', 201);
  } catch (e: any) {
    if (e?.message?.includes('UNIQUE constraint failed')) {
      return sendError(reply, 'Username or email already exists', 409);
    }
    return sendError(reply, 'Failed to register local player', 500);
  }
}

export async function addLocalPlayerFromOAuthHandler(
  request: FastifyRequest<{ Body: { userId: number } }>,
  reply: FastifyReply
): Promise<void> {
  const session = requireHostSession(request, reply);
  if (!session) return;

  const { userId } = request.body || ({} as any);
  if (!Number.isFinite(userId)) return sendError(reply, 'Invalid userId', 400);

  // Only allow adding the user that was most recently verified via OAuth in this session.
  const now = Date.now();
  const lastId = session.oauthLastUserId;
  const lastAt = session.oauthLastAt || 0;
  const maxAgeMs = 5 * 60 * 1000;
  if (!lastId || Number(lastId) !== Number(userId) || now - lastAt > maxAgeMs) {
    return sendError(reply, 'OAuth verification required', 403);
  }

  // Verify user exists and is OAuth user
  const dbUser = await getQuery<any>('SELECT id, username, oauth_provider FROM users WHERE id = ?', [userId]);
  if (!dbUser) return sendError(reply, 'User not found', 404);
  if (!dbUser.oauth_provider) return sendError(reply, 'User is not an OAuth account', 403);

  if (Number(dbUser.id) === Number(session.userId)) {
    return sendError(reply, 'User is already the Host', 409);
  }

  const exists = (session.localPlayers || []).some(p => Number(p.userId) === Number(dbUser.id) || p.username === dbUser.username);
  if (exists) return sendError(reply, 'User already added', 409);

  const stored: StoredLocalPlayer = { id: String(dbUser.id), userId: Number(dbUser.id), username: String(dbUser.username) };
  session.localPlayers = [...(session.localPlayers || []), stored];
  await (request.session as any).save();

  sendSuccess(reply, { player: normalizePlayer(stored) }, 'Added OAuth local player');
}

export async function addBotLocalPlayerHandler(
  request: FastifyRequest<{ Body: { userId: number; username: string; avatarUrl?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const session = requireHostSession(request, reply);
  if (!session) return;

  const { userId, username, avatarUrl } = request.body || ({} as any);
  if (!Number.isFinite(userId) || userId >= 0) return sendError(reply, 'Bot userId must be a negative number', 400);
  if (!username) return sendError(reply, 'Bot username required', 400);

  const exists = (session.localPlayers || []).some(p => Number(p.userId) === Number(userId));
  if (exists) return sendError(reply, 'Bot already added', 409);

  const stored: StoredLocalPlayer = {
    id: String(userId),
    userId: Number(userId),
    username: String(username),
    avatarUrl: typeof avatarUrl === 'string' ? avatarUrl : undefined,
    isBot: true
  };

  session.localPlayers = [...(session.localPlayers || []), stored];
  await (request.session as any).save();

  sendSuccess(reply, { player: normalizePlayer(stored) }, 'Added bot');
}
