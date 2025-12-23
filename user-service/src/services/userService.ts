// user-service/src/services/userService.ts
import { db } from '../database';
import { UserProfile, UpdateProfileBody } from '../types';
import { promisifyDbGet, promisifyDbRun } from '@ft-transcendence/common';

export class UserService {
  static async getOrCreateProfile(userId: number): Promise<UserProfile> {
    let profile = await promisifyDbGet<UserProfile>(db, 'SELECT * FROM user_profiles WHERE user_id = ?', [userId]);
    if (!profile) {
      await promisifyDbRun(db, 'INSERT INTO user_profiles (user_id) VALUES (?)', [userId]);
      profile = await promisifyDbGet<UserProfile>(db, 'SELECT * FROM user_profiles WHERE user_id = ?', [userId]);
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