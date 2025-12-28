// packages/common/src/types.ts
export interface User {
  userId: number;
  username: string;
  email: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfile extends User {
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  country?: string;
  preferred_language?: string;
  theme_preference?: string;
  notification_settings?: string;
  privacy_settings?: string;
  campaign_level?: number;
  games_played?: number;
  games_won?: number;
  win_streak?: number;
  tournaments_won?: number;
  friends_count?: number;
  xp?: number;
  level?: number;
}

export interface DatabaseUser {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  created_at: string;
  last_login?: string;
}