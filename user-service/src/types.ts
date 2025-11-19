export interface UserProfile {
  id: number;
  user_id: number;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  preferred_language: string;
  theme_preference: string;
  notification_settings: string;
  privacy_settings: string;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: number;
  user_id: number;
  achievement_type: string;
  achievement_name: string;
  description: string;
  earned_at: string;
  metadata: string;
}

export interface GameStats {
  wins: number;
  losses: number;
  total_games: number;
  winRate: number;
}

export interface LeaderboardUser extends UserProfile {
  wins: number;
  losses: number;
  total_games: number;
  winRate: number;
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
  bio?: string;
  country?: string;
  preferredLanguage?: string;
  themePreference?: string;
}

export interface AddAchievementBody {
  userId: number;
  achievementType: string;
  achievementName: string;
  description?: string;
  metadata?: any;
}

export interface SearchQuery {
  query: string;
  limit?: string;
}

export interface LeaderboardQuery {
  type?: 'wins' | 'games' | 'winrate';
  limit?: string;
}