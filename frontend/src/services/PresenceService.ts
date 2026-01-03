import { AuthService } from './AuthService';

/**
 * PresenceService - Maintains a WebSocket connection to track user online status.
 * Connects on app start when user is logged in.
 */
export class PresenceService {
    private static instance: PresenceService;
    private ws: WebSocket | null = null;
    private reconnectInterval: ReturnType<typeof setTimeout> | null = null;

    private constructor() { }

    public static getInstance(): PresenceService {
        if (!PresenceService.instance) {
            PresenceService.instance = new PresenceService();
        }
        return PresenceService.instance;
    }

    /**
     * Connect to the game WebSocket for presence tracking.
     * Should be called after successful login/session restore.
     */
    public connect(): void {
        const user = AuthService.getInstance().getCurrentUser();
        if (!user) {
            console.log('[Presence] No user logged in, skipping presence connection');
            return;
        }

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('[Presence] Already connected');
            return;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/api/game/ws`;

        console.log('[Presence] Connecting to', wsUrl);

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('[Presence] Connected, sending userConnect');
            this.ws?.send(JSON.stringify({
                type: 'userConnect',
                userId: user.userId,
                username: user.username
            }));
        };

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === 'connectionAck') {
                    console.log('[Presence] Acknowledged as online');
                }
            } catch (e) {
                // Ignore parse errors for non-JSON messages
            }
        };

        this.ws.onclose = () => {
            console.log('[Presence] Disconnected');
            // Attempt to reconnect after 5 seconds
            if (!this.reconnectInterval) {
                this.reconnectInterval = setTimeout(() => {
                    this.reconnectInterval = null;
                    this.connect();
                }, 5000);
            }
        };

        this.ws.onerror = (err) => {
            console.error('[Presence] WebSocket error', err);
        };
    }

    /**
     * Disconnect presence WebSocket (e.g., on logout).
     */
    public disconnect(): void {
        if (this.reconnectInterval) {
            clearTimeout(this.reconnectInterval);
            this.reconnectInterval = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        console.log('[Presence] Disconnected');
    }
}
