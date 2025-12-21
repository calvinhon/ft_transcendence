# Database Schemas Documentation

This document details the database schemas for each microservice in the ft_transcendence project. All services use SQLite3 databases for data persistence.

## Overview

The project consists of 4 microservices, each with its own isolated SQLite database:

- **Auth Service**: User authentication, registration, and OAuth
- **Game Service**: Game sessions, history, and real-time events
- **User Service**: User profiles, achievements, and social features
- **Tournament Service**: Tournament management and bracket generation

## Auth Service Database (`auth.db`)

### Tables

#### `users`
Stores user account information and authentication data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique user identifier |
| `username` | TEXT | UNIQUE NOT NULL | User's chosen username |
| `email` | TEXT | UNIQUE NOT NULL | User's email address |
| `password_hash` | TEXT | NOT NULL | Bcrypt-hashed password |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Account creation timestamp |
| `last_login` | DATETIME | - | Last login timestamp |

#### `password_reset_tokens`
Manages password reset functionality.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Token identifier |
| `user_id` | INTEGER | NOT NULL | Reference to users.id |
| `token` | TEXT | NOT NULL UNIQUE | Reset token string |
| `expires_at` | DATETIME | NOT NULL | Token expiration time |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Token creation time |
| `used` | BOOLEAN | DEFAULT FALSE | Whether token has been used |

**Foreign Keys:**
- `user_id` REFERENCES `users(id)`

## Game Service Database (`games.db`)

### Tables

#### `games`
Records completed game sessions with scores and metadata.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Game session identifier |
| `player1_id` | INTEGER | NOT NULL | First player's user ID |
| `player2_id` | INTEGER | NOT NULL | Second player's user ID |
| `player1_score` | INTEGER | DEFAULT 0 | Player 1's final score |
| `player2_score` | INTEGER | DEFAULT 0 | Player 2's final score |
| `status` | TEXT | DEFAULT 'active' | Game status (active/finished) |
| `started_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Game start time |
| `finished_at` | DATETIME | - | Game completion time |
| `winner_id` | INTEGER | - | Winning player's user ID |
| `game_mode` | TEXT | DEFAULT 'coop' | Game mode (coop/arcade/tournament) |
| `team1_players` | TEXT | - | JSON array of team 1 player IDs (arcade mode) |
| `team2_players` | TEXT | - | JSON array of team 2 player IDs (arcade mode) |
| `tournament_id` | INTEGER | - | Associated tournament ID |
| `tournament_match_id` | INTEGER | - | Tournament match identifier |

#### `game_events`
Logs real-time events during game sessions for analytics.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Event identifier |
| `game_id` | INTEGER | NOT NULL | Reference to games.id |
| `event_type` | TEXT | NOT NULL | Type of game event |
| `event_data` | TEXT | - | JSON event data |
| `timestamp` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Event timestamp |

**Foreign Keys:**
- `game_id` REFERENCES `games(id)`

## User Service Database (`users.db`)

### Tables

#### `user_profiles`
Extended user profile information and statistics.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Profile identifier |
| `user_id` | INTEGER | UNIQUE NOT NULL | Reference to auth service user ID |
| `display_name` | TEXT | - | User's display name |
| `avatar_url` | TEXT | - | Profile picture URL |
| `bio` | TEXT | - | User biography |
| `country` | TEXT | - | User's country |
| `preferred_language` | TEXT | DEFAULT 'en' | Language preference |
| `theme_preference` | TEXT | DEFAULT 'dark' | UI theme preference |
| `notification_settings` | TEXT | DEFAULT '{}' | JSON notification preferences |
| `privacy_settings` | TEXT | DEFAULT '{}' | JSON privacy settings |
| `campaign_level` | INTEGER | DEFAULT 1 | Campaign progress level |
| `wins` | INTEGER | DEFAULT 0 | Total wins |
| `total_games` | INTEGER | DEFAULT 0 | Total games played |
| `games_played` | INTEGER | DEFAULT 0 | Games played (detailed) |
| `games_won` | INTEGER | DEFAULT 0 | Games won |
| `games_lost` | INTEGER | DEFAULT 0 | Games lost |
| `win_streak` | INTEGER | DEFAULT 0 | Current win streak |
| `tournaments_won` | INTEGER | DEFAULT 0 | Tournaments won |
| `friends_count` | INTEGER | DEFAULT 0 | Number of friends |
| `xp` | INTEGER | DEFAULT 0 | Experience points |
| `level` | INTEGER | DEFAULT 1 | User level |
| `winRate` | REAL | DEFAULT 0 | Win rate percentage |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Profile creation time |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last profile update |

#### `achievements`
Predefined achievement definitions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Achievement identifier |
| `name` | TEXT | NOT NULL | Achievement name |
| `description` | TEXT | NOT NULL | Achievement description |
| `icon_url` | TEXT | - | Achievement icon |
| `reward_points` | INTEGER | DEFAULT 0 | XP reward for achievement |

#### `user_achievements`
Links users to their unlocked achievements.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | User achievement identifier |
| `user_id` | INTEGER | NOT NULL | Reference to user_profiles.user_id |
| `achievement_id` | INTEGER | NOT NULL | Reference to achievements.id |
| `unlocked_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | When achievement was unlocked |

**Foreign Keys:**
- `achievement_id` REFERENCES `achievements(id)`
- `UNIQUE(user_id, achievement_id)` - Users can unlock each achievement only once

## Tournament Service Database (`tournaments.db`)

### Tables

#### `tournaments`
Tournament metadata and status.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Tournament identifier |
| `name` | TEXT | NOT NULL | Tournament name |
| `current_participants` | INTEGER | DEFAULT 0 | Number of current participants |
| `status` | TEXT | DEFAULT 'open' | Tournament status (open/started/finished) |
| `created_by` | INTEGER | NOT NULL | User ID of tournament creator |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `started_at` | DATETIME | - | Tournament start time |
| `finished_at` | DATETIME | - | Tournament completion time |
| `winner_id` | INTEGER | - | Winning user's ID |

#### `tournament_participants`
Links users to tournaments with participation status.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Participation identifier |
| `tournament_id` | INTEGER | NOT NULL | Reference to tournaments.id |
| `user_id` | INTEGER | NOT NULL | Participating user's ID |
| `joined_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Join timestamp |
| `eliminated_at` | DATETIME | - | Elimination timestamp |
| `final_rank` | INTEGER | - | Final ranking position |

**Foreign Keys:**
- `tournament_id` REFERENCES `tournaments(id)`
- `UNIQUE(tournament_id, user_id)` - Users can join each tournament only once

#### `tournament_matches`
Individual matches within tournament brackets.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Match identifier |
| `tournament_id` | INTEGER | NOT NULL | Reference to tournaments.id |
| `round` | INTEGER | NOT NULL | Tournament round number |
| `match_number` | INTEGER | NOT NULL | Match number within round |
| `player1_id` | INTEGER | - | First player in match |
| `player2_id` | INTEGER | - | Second player in match |
| `winner_id` | INTEGER | - | Match winner's user ID |
| `player1_score` | INTEGER | DEFAULT 0 | Player 1's score |
| `player2_score` | INTEGER | DEFAULT 0 | Player 2's score |
| `status` | TEXT | DEFAULT 'pending' | Match status (pending/playing/finished) |
| `played_at` | DATETIME | - | Match completion time |

**Foreign Keys:**
- `tournament_id` REFERENCES `tournaments(id)`

## Database Relationships

```
Auth Service (auth.db)
├── users (primary user data)
└── password_reset_tokens → users

Game Service (games.db)
├── games (game sessions)
└── game_events → games

User Service (users.db)
├── user_profiles (extended profiles)
├── achievements (achievement definitions)
└── user_achievements → user_profiles, achievements

Tournament Service (tournaments.db)
├── tournaments (tournament metadata)
├── tournament_participants → tournaments
└── tournament_matches → tournaments
```

## Notes

- All databases use SQLite3 with foreign key constraints enabled.
- Tables are created with `IF NOT EXISTS` to handle migrations.
- Some services include dynamic column additions for backward compatibility.
- Tournament service uses in-memory database for tests.
- Data types follow SQLite conventions (INTEGER, TEXT, REAL, DATETIME).</content>
<parameter name="filePath">/home/honguyen/ft_transcendence/documentation/readme/DATABASE_SCHEMAS.md