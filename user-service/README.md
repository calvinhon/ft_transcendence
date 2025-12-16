# User Service - User Profile & Social Features Microservice

A comprehensive user management microservice handling user profiles, achievements, search functionality, and social features. Built with Node.js, TypeScript, and SQLite for scalable user data management.

## 🏗️ Architecture Overview

The user-service provides modular user-centric functionality with a clean separation of concerns:

```
user-service/
├── server.ts              # Server setup & middleware with logging
├── database/
│   └── index.ts           # Database initialization & schema
├── services/
│   └── userService.ts     # Business logic for user operations
├── types/
│   └── index.ts           # TypeScript interfaces & types
├── utils/
│   ├── database.ts        # Database utility functions
│   └── responses.ts       # Response utilities (if applicable)
└── routes/
    ├── index.ts           # Route aggregation & health check
    ├── profile.ts         # User profile management
    ├── achievements.ts    # Achievement system
    └── search.ts          # User search functionality
```

## 👤 Core Features

### **User Profile Management**
- **Profile Creation**: User registration and profile setup
- **Profile Updates**: Personal information management
- **Avatar Management**: Profile picture handling
- **Privacy Settings**: Profile visibility controls

### **Achievement System**
- **Achievement Tracking**: Game performance milestones
- **Badge System**: Visual achievement indicators
- **Progress Tracking**: Achievement completion status
- **Leaderboard Integration**: Achievement-based rankings

### **Search & Discovery**
- **User Search**: Find users by username or email
- **Advanced Filtering**: Search with multiple criteria
- **Pagination Support**: Efficient large dataset handling
- **Real-time Results**: Fast search response times

### **Social Features**
- **Friend System**: Friend requests and management
- **User Statistics**: Gaming performance metrics
- **Activity Feed**: Recent user activities
- **Profile Analytics**: User engagement metrics

## 🔌 API Endpoints

### **Health Check**

#### `GET /health`
Service health status
```json
Response: {
  "status": "healthy",
  "service": "user-service",
  "timestamp": "2023-...",
  "modules": ["profile", "achievements", "search"]
}
```

### **Profile Management**

#### `GET /profile/:userId`
Get user profile information
```json
Response: {
  "id": 1,
  "user_id": 1,
  "display_name": null,
  "avatar_url": null,
  "bio": null,
  "country": null,
  "preferred_language": "en",
  "theme_preference": "dark",
  "notification_settings": "{}",
  "privacy_settings": "{}",
  "campaign_level": 1,
  "wins": 0,
  "total_games": 0,
  "games_played": 0,
  "games_won": 0,
  "games_lost": 0,
  "win_streak": 0,
  "tournaments_won": 0,
  "friends_count": 0,
  "xp": 0,
  "level": 1,
  "winRate": 0,
  "created_at": "2023-...",
  "updated_at": "2023-..."
}
```

#### `PUT /profile/:userId`
Update user profile
```json
Request: {
  "displayName": "NewName",
  "bio": "Updated bio",
  "country": "US",
  "preferredLanguage": "en",
  "themePreference": "light"
}
Response: {
  "message": "Profile updated successfully"
}
```

### **Achievement System**

#### `GET /achievements`
Get all available achievements
```json
Response: [
  {
    "id": 1,
    "name": "First Win",
    "description": "Win your first game",
    "icon_url": "/icons/first-win.png",
    "reward_points": 10
  }
]
```

#### `GET /achievements/:userId`
Get user's achievements
```json
Response: [
  {
    "id": 1,
    "user_id": 1,
    "achievement_id": 1,
    "unlocked_at": "2023-...",
    "name": "First Win",
    "description": "Win your first game",
    "icon_url": "/icons/first-win.png",
    "reward_points": 10
  }
]
```

#### `POST /achievement/unlock`
Unlock achievement for user
```json
Request: {
  "userId": "1",
  "achievementId": 1
}
Response: {
  "message": "Achievement unlocked successfully"
}
```

### **Search Functionality**

#### `GET /search/users?query=test&limit=10`
Search for users by display name or user ID
```json
Response: [
  {
    "user_id": 1,
    "display_name": "TestUser",
    "avatar_url": null,
    "country": "US",
    "games_won": 0,
    "games_played": 0
  }
]
```

#### `GET /users/online`
Get online users (placeholder)
```json
Response: [
  {
    "user_id": 1,
    "display_name": "TestUser",
    "avatar_url": null,
    "status": "online",
    "is_bot": 0,
    "last_seen": "2023-..."
  }
]
```

## 👥 User Data Model

### **User Profile**
```typescript
interface UserProfile {
  userId: number;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  created_at: string;
  last_active: string;
  is_online: boolean;
  privacy_settings: PrivacySettings;
}
```

### **Achievement System**
```typescript
interface Achievement {
  id: number;
  userId: number;
  achievementId: number;
  unlocked_at: string;
  progress: number;
}

interface AchievementDefinition {
  id: number;
  name: string;
  description: string;
  icon: string;
  category: 'game' | 'social' | 'tournament';
  requirements: AchievementRequirement;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}
```

### **Search & Discovery**
```typescript
interface SearchResult {
  userId: number;
  username: string;
  avatar?: string;
  similarity: number;
  last_active: string;
}

interface SearchSuggestion {
  type: 'user' | 'achievement';
  text: string;
  userId?: number;
  achievementId?: number;
}
```

## 🛠️ Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Fastify v4 (high-performance web framework)
- **Language**: TypeScript 5+ (type safety)
- **Database**: SQLite3 (user data persistence)
- **Development**: ts-node-dev (hot reload)
- **Build**: TypeScript compiler
- **Testing**: Custom bash scripts with TARGET support
- **Logging**: Pino logger with built-in request logging

## 📦 Dependencies

### **Production Dependencies**
- `fastify`: ^4.24.3 - High-performance web framework
- `@fastify/cors`: ^9.0.0 - CORS handling
- `@fastify/multipart`: ^8.0.0 - File upload handling
- `sqlite3`: ^5.1.6 - SQLite database driver

### **Development Dependencies**
- `typescript`: ^5.9.3 - TypeScript compiler
- `@types/node`: ^20.0.0 - Node.js type definitions
- `ts-node-dev`: ^2.0.0 - Development server with hot reload
- `rimraf`: ^5.0.0 - Cross-platform rm -rf utility

## ⚙️ Configuration

### **Environment Variables**
```bash
# Database
DATABASE_PATH=./database/users.db

# File Storage
UPLOAD_PATH=./uploads/avatars
MAX_FILE_SIZE=5242880  # 5MB

# Service
PORT=3000
HOST=0.0.0.0

# Search
SEARCH_LIMIT=50
SUGGESTION_LIMIT=10
```

### **Privacy Settings**
```typescript
interface PrivacySettings {
  profile_visible: boolean;
  email_visible: boolean;
  stats_visible: boolean;
  online_status_visible: boolean;
  achievements_visible: boolean;
}
```

## 🏃‍♂️ Development Setup

### **Prerequisites**
- Node.js 18+
- npm or yarn
- SQLite3

### **Installation**
```bash
cd user-service
npm install
```

### **Development**
```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Clean build artifacts
npm run clean
```

### **Testing**
```bash
# Run tests with specific target
./test.sh TARGET=profile
./test.sh TARGET=achievements
./test.sh TARGET=search

# Run all tests
./test.sh
```

## 🐳 Docker Deployment

### **Build & Run**
```bash
# Build container
docker build -t user-service .

# Run container with volume mounts
docker run -p 3004:3000 \
  -v $(pwd)/database:/app/database \
  -v $(pwd)/uploads:/app/uploads \
  user-service
```

## 📊 Database Schema

### **Users Table**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar TEXT,
  bio TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_online BOOLEAN DEFAULT FALSE,
  privacy_profile_visible BOOLEAN DEFAULT TRUE,
  privacy_email_visible BOOLEAN DEFAULT FALSE,
  privacy_stats_visible BOOLEAN DEFAULT TRUE,
  privacy_online_visible BOOLEAN DEFAULT TRUE,
  privacy_achievements_visible BOOLEAN DEFAULT TRUE
);
```

### **Achievements Table**
```sql
CREATE TABLE achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  achievement_id INTEGER NOT NULL,
  unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  progress INTEGER DEFAULT 100,
  FOREIGN KEY (user_id) REFERENCES users (id),
  UNIQUE(user_id, achievement_id)
);
```

### **Achievement Definitions Table**
```sql
CREATE TABLE achievement_definitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,
  requirements TEXT, -- JSON string
  rarity TEXT DEFAULT 'common',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### **User Statistics Table**
```sql
CREATE TABLE user_statistics (
  user_id INTEGER PRIMARY KEY,
  total_games INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  tournaments_played INTEGER DEFAULT 0,
  tournaments_won INTEGER DEFAULT 0,
  achievements_unlocked INTEGER DEFAULT 0,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id)
);
```

## 🔍 Search Implementation

### **Full-Text Search**
- **SQLite FTS5**: Full-text search capabilities
- **Multi-field Search**: Username, email, bio search
- **Ranking Algorithm**: Relevance-based result ordering
- **Performance Optimization**: Indexed search queries

### **Search Features**
- **Fuzzy Matching**: Approximate string matching
- **Prefix Search**: Auto-complete functionality
- **Category Filtering**: Filter by user attributes
- **Pagination**: Efficient large result set handling

## 🏆 Achievement System

### **Achievement Categories**
- **Game Achievements**: Match wins, scores, streaks
- **Social Achievements**: Friends made, tournaments joined
- **Tournament Achievements**: Tournament wins, placements
- **Special Achievements**: Rare milestones and events

### **Progress Tracking**
- **Incremental Progress**: Partial achievement completion
- **Automatic Unlocking**: Event-driven achievement awards
- **Visual Indicators**: Achievement badges and progress bars
- **Sharing Features**: Social achievement broadcasting

## 📈 Analytics & Statistics

### **User Metrics**
- **Gaming Performance**: Win rates, scores, playtime
- **Social Engagement**: Friends, interactions, activity
- **Tournament Success**: Participation, victories, rankings
- **Achievement Progress**: Completion rates, rarity distribution

### **System Analytics**
- **User Growth**: Registration trends, retention rates
- **Feature Usage**: Popular features and engagement
- **Performance Metrics**: Response times, error rates
- **Content Analytics**: Popular achievements, search trends

## 🔒 Security & Privacy

### **Data Protection**
- **Privacy Controls**: Granular privacy settings
- **Data Encryption**: Sensitive data protection
- **Access Controls**: User data access restrictions
- **Audit Logging**: User action tracking

### **File Security**
- **Upload Validation**: File type and size restrictions
- **Image Processing**: Safe image handling with Sharp
- **Storage Security**: Secure file storage practices
- **Access Control**: Avatar access permissions

## 📈 Performance Characteristics

- **Fast Search**: Sub-second user search responses
- **Efficient Queries**: Optimized database queries
- **Caching Strategy**: Frequently accessed data caching
- **Scalable Storage**: File storage for user uploads

## 🔧 Operations

### **Health Monitoring**
- **Service Status**: Overall service health
- **Database Connectivity**: SQLite connection status
- **File System**: Upload directory availability
- **Performance Metrics**: Response times and throughput

### **Logging**
- **User Actions**: Profile updates, searches, achievements
- **System Events**: Service start/stop, errors
- **Performance Logs**: Slow queries, high usage periods
- **Security Events**: Failed access attempts, suspicious activity

## 🤝 Service Integration

### **Authentication Service**
```javascript
// User profile integration
const profile = await fetch(`/user/profile/${userId}`);
const userData = await profile.json();

// Update profile after authentication
await fetch(`/user/profile/${userId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ last_active: new Date() })
});
```

### **Game Service Integration**
```javascript
// Update user statistics after game
await fetch(`/user/stats/${userId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    gameResult: 'win',
    score: 1500,
    gameMode: 'arcade'
  })
});
```

### **Tournament Service Integration**
```javascript
// Achievement unlocking
await fetch(`/user/achievements/${userId}/tournament_win`, {
  method: 'POST'
});
```

## 🚀 Scaling Considerations

### **Database Scaling**
- **Read Replicas**: Statistics and profile queries
- **Search Optimization**: Dedicated search indexes
- **Caching Layer**: Redis for frequently accessed data

### **File Storage Scaling**
- **CDN Integration**: Avatar distribution
- **Cloud Storage**: AWS S3 or similar for uploads
- **Compression**: Image optimization and WebP format

### **Search Scaling**
- **Database Indexing**: Optimized search queries
- **Query Optimization**: Complex search query handling

## 🧪 Testing Strategy

- **Unit Tests**: Individual functions and utilities
- **Integration Tests**: API endpoints with database
- **Search Tests**: Search functionality and performance
- **Upload Tests**: File upload and processing
- **Load Tests**: Concurrent user operations

## 📚 Architecture Principles

This service follows **Modular Monolith** principles with recent refactoring for better maintainability:

1. **Domain Separation**: Profile, achievements, search as distinct modules
2. **Shared Database**: Single database with clear boundaries
3. **API Composition**: Route aggregation for unified API
4. **Independent Deployment**: Service-level deployment units
5. **Shared Infrastructure**: Common logging
6. **Business Logic Layer**: Extracted services for clean separation of concerns

## 🔄 Recent Refactoring (2025)

### **Modularization Changes**
- **File Structure**: Moved types to `src/types/index.ts`, utils to `src/utils/`
- **Service Layer**: Created `src/services/userService.ts` for business logic
- **Database**: Centralized database utilities in `src/database/index.ts`
- **Routes**: Updated imports to use new modular structure

### **Code Quality Improvements**
- **Type Safety**: Enhanced TypeScript interfaces and error handling
- **Testing**: Improved test scripts with TARGET support and assertions
- **Documentation**: Updated README with accurate API documentation
- **Dependencies**: Updated to latest versions with security patches

### **Performance Enhancements**
- **Query Optimization**: Efficient database queries with proper indexing
- **Response Caching**: Strategic caching for frequently accessed data
- **Error Handling**: Comprehensive error handling with proper logging

## 🔮 Future Enhancements

- **Real-time Features**: WebSocket notifications
- **Advanced Search**: Semantic search with AI
- **Social Graph**: Friend recommendations, groups
- **Content Management**: User-generated content
- **Mobile API**: Optimized mobile endpoints
- **Analytics Dashboard**: User behavior insights

---

**Service Port**: `3004` (internal), `3000` (external)  
**Health Check**: `GET /health`  
**Database**: SQLite (auto-initialized)  
**Testing**: `./test.sh TARGET=<module>`  
**Documentation**: This README  
**Last Updated**: November 2025  
**Maintainer**: Development Team</content>
<parameter name="filePath">/home/honguyen/ft_transcendence/user-service/README.md