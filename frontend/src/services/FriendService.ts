import { Api } from '../core/Api';

export interface Friend {
    userId: number;
    username: string;
    avatarUrl?: string;
    isOnline: boolean;
}

export class FriendService {
    private static instance: FriendService;

    private constructor() { }

    public static getInstance(): FriendService {
        if (!FriendService.instance) {
            FriendService.instance = new FriendService();
        }
        return FriendService.instance;
    }

    public async addFriend(userId: number, friendId: number): Promise<boolean> {
        try {
            await Api.post('/api/users/friends/add', { userId, friendId });
            return true;
        } catch (e) {
            console.error('Failed to add friend', e);
            return false;
        }
    }

    public async removeFriend(userId: number, friendId: number): Promise<boolean> {
        try {
            await Api.post('/api/users/friends/remove', { userId, friendId });
            return true;
        } catch (e) {
            console.error('Failed to remove friend', e);
            return false;
        }
    }

    public async getFriends(userId: number): Promise<Friend[]> {
        try {
            const res = await Api.get(`/api/users/friends/${userId}`);
            return res.data || [];
        } catch (e) {
            console.error('Failed to fetch friends', e);
            return [];
        }
    }

    public async getOnlineUsers(): Promise<(number | string)[]> {
        try {
            const res = await Api.get('/api/game/online');
            if (res.data && Array.isArray(res.data)) {
                return res.data.map((u: any) => u.user_id);
            }
            return [];
        } catch (e) {
            console.error('Failed to fetch online users', e);
            return [];
        }
    }
}
