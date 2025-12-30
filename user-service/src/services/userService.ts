// user-service/src/services/userService.ts
import { db } from '../database';
import { UserProfile, UpdateProfileBody } from '../types';
import { promisifyDbGet, promisifyDbRun } from '@ft-transcendence/common';

export class UserService {
  static async getOrCreateProfile(userId: number): Promise<UserProfile> {
    const query = `
      SELECT p.*, u.username 
      FROM user_profiles p 
      LEFT JOIN auth.users u ON p.user_id = u.id 
      WHERE p.user_id = ?
    `;
    let profile = await promisifyDbGet<UserProfile>(db, query, [userId]);
    if (!profile) {
      await promisifyDbRun(db, 'INSERT INTO user_profiles (user_id) VALUES (?)', [userId]);
      profile = await promisifyDbGet<UserProfile>(db, query, [userId]);
    }

    // Set default avatar if missing
    if (profile && !profile.avatar_url && profile.username) {
      const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username)}&background=0A0A0A&color=29B6F6`;
      await promisifyDbRun(db, 'UPDATE user_profiles SET avatar_url = ? WHERE user_id = ?', [defaultAvatar, userId]);
      profile.avatar_url = defaultAvatar;
    }

    return profile!;
  }

  static async updateProfile(userId: number, updates: UpdateProfileBody): Promise<void> {
    const { displayName, avatarUrl, bio, country, preferredLanguage, themePreference } = updates;
    await promisifyDbRun(db, `UPDATE user_profiles SET
       display_name = COALESCE(?, display_name),
       avatar_url = COALESCE(?, avatar_url),
       bio = COALESCE(?, bio),
       country = COALESCE(?, country),
       preferred_language = COALESCE(?, preferred_language),
       theme_preference = COALESCE(?, theme_preference),
       updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`, [displayName, avatarUrl, bio, country, preferredLanguage, themePreference, userId]);
  }
}