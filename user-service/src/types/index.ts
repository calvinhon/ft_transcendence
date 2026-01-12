// user-service/src/types/index.ts
export interface UserProfile {
  id: number;
  user_id: number;
  username: string; // From auth service
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  // Hoach edited
  campaign_level?: number;
  campaign_mastered?: number;
  wins?: number;
  total_games?: number;
  lost?: number;
  xp?: number;
  level?: number;
  // Hoach edit ended
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: number;
  name: string;
  description: string;
  icon_url: string;
  reward_points: number;
}

export interface UserAchievement {
  id: number;
  user_id: number;
  achievement_id: number;
  unlocked_at: string;
  name: string;
  description: string;
  icon_url: string;
  reward_points: number;
}

export interface OnlineUser {
  user_id: number | string;
  username: string;
  display_name: string;
  status: 'online';
  is_bot: boolean;
  last_seen: string;
}

export interface UpdateProfileBody {
  displayName?: string;
  avatarUrl?: string; // Add this
  bio?: string;
  country?: string;

  customAvatar?: number
}

export interface SearchQuery {
  query: string;
  limit?: string;
}