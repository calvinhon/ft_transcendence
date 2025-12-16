# FT_TRANSCENDENCE - User Manual

**Version:** 1.0.0  
**Last Updated:** December 6, 2025  
**Platform:** Web-based Multiplayer Pong Game

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Account Management](#account-management)
3. [Game Modes](#game-modes)
4. [Tournament System](#tournament-system)
5. [Social Features](#social-features)
6. [Profile & Statistics](#profile--statistics)
7. [Settings & Preferences](#settings--preferences)
8. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Accessing the Platform

1. Open your web browser (Firefox recommended)
2. Navigate to `http://localhost` (or your configured domain)
3. You'll see the landing page with login/registration options

### First-Time Setup

#### Option 1: Register with Email

1. Click **"Register"** button
2. Fill in the registration form:
   - **Username**: 3-20 characters, alphanumeric
   - **Email**: Valid email address
   - **Password**: Minimum 8 characters
   - **Confirm Password**: Must match password
3. Click **"Create Account"**
4. You'll be automatically logged in

#### Option 2: OAuth Sign-In (Recommended)

1. Click one of the OAuth provider buttons:
   - **Sign in with Google**
   - **Sign in with GitHub**
   - **Sign in with 42**
2. Authorize the application
3. You'll be redirected back and logged in automatically
4. Your profile will be created with your OAuth account info

### Logging In

1. Click **"Login"** button
2. Enter your **username/email** and **password**
3. (Optional) Enter **2FA code** if you have it enabled
4. Click **"Login"**

---

## Account Management

### Profile Setup

After your first login, set up your profile:

1. Navigate to **Profile** from the main menu
2. Click **"Edit Profile"**
3. Customize your profile:
   - **Display Name**: Your in-game name (shown in matches)
   - **Avatar**: Upload a profile picture (or use default)
   - **Bio**: Brief description about yourself
4. Click **"Save Changes"**

### Security Settings

#### Enabling Two-Factor Authentication (2FA)

1. Go to **Profile** → **Security**
2. Click **"Enable 2FA"**
3. Scan the QR code with your authenticator app:
   - Google Authenticator
   - Microsoft Authenticator
   - Authy
4. Enter the 6-digit code from your app
5. Click **"Verify and Enable"**
6. Save your backup codes in a secure location

#### Disabling 2FA

1. Go to **Profile** → **Security**
2. Click **"Disable 2FA"**
3. Enter your current 2FA code
4. Confirm disabling

#### Changing Password

1. Go to **Profile** → **Security**
2. Click **"Change Password"**
3. Enter:
   - Current password
   - New password (min 8 characters)
   - Confirm new password
4. Click **"Update Password"**

#### Forgot Password

1. On login page, click **"Forgot Password?"**
2. Enter your email address
3. Check your email for reset link
4. Click the link and enter your new password

### Privacy & GDPR

#### Export Your Data

1. Go to **Profile** → **Privacy**
2. Click **"Export My Data"**
3. Download will start (JSON format)
4. File contains:
   - Profile information
   - Match history
   - Statistics
   - Friends list
   - Tournament participation

#### Delete Your Account

⚠️ **Warning**: This action is permanent and cannot be undone!

1. Go to **Profile** → **Privacy**
2. Click **"Delete Account"**
3. Read the warning carefully
4. Type "DELETE" to confirm
5. Enter your password
6. Click **"Permanently Delete Account"**

Your data will be:
- Removed from all services
- Anonymized in historical records
- Blockchain records remain (immutable)

---

## Game Modes

### Quick Match (1v1)

Play against another player instantly.

1. Click **"Quick Match"** from main menu
2. Wait for matchmaking (usually 5-30 seconds)
3. Match starts automatically when opponent found
4. Game controls:
   - **W** / **↑**: Move paddle up
   - **S** / **↓**: Move paddle down
   - **ESC**: Pause/Menu

### Campaign Mode

Progressive single-player campaign with increasing difficulty.

1. Click **"Campaign"** from main menu
2. Select your current level or continue from last
3. Complete objectives:
   - **Level 1-5**: Easy opponents (score 5 points)
   - **Level 6-10**: Medium opponents (score 7 points)
   - **Level 11-15**: Hard opponents (score 10 points)
   - **Level 16-20**: Expert opponents (score 15 points)
   - **Level 21**: Final boss challenge
4. Unlock achievements and rewards
5. Progress saved automatically

### Play vs Bot

Practice against AI opponents with adjustable difficulty.

1. Click **"Play vs Bot"** from main menu
2. Select difficulty:
   - **Easy**: Slow reactions, basic strategy
   - **Medium**: Average skill level
   - **Hard**: Fast reactions, predictive AI
3. Choose score limit: 3, 5, 7, or 11 points
4. Click **"Start Game"**

Bot Behavior:
- Simulates human-like reactions
- Makes occasional mistakes (more on easy)
- Uses ball trajectory prediction
- No cheating (follows same physics rules)

### Tournament Mode

Compete in structured tournaments against multiple players.

See [Tournament System](#tournament-system) section below.

---

## Tournament System

### Browsing Tournaments

1. Click **"Tournaments"** from main menu
2. View available tournaments:
   - **Upcoming**: Not started, accepting registrations
   - **In Progress**: Currently running
   - **Completed**: Finished tournaments with results

### Creating a Tournament

1. Click **"Create Tournament"**
2. Configure settings:
   - **Name**: Tournament title
   - **Max Players**: 4, 8, 16, or 32 players
   - **Score Limit**: Points to win each match (3-21)
   - **Privacy**: Public or Private (invite-only)
   - **Prize Pool**: Optional (for display only)
3. Click **"Create"**
4. Share tournament link with friends (for private)

### Joining a Tournament

1. Find tournament in **"Upcoming"** tab
2. Click **"Join Tournament"**
3. Confirm registration
4. Wait for tournament to start (need minimum players)

### Tournament Brackets

Once tournament starts:

1. View bracket visualization
2. See your next opponent
3. Click **"Play Match"** when it's your turn
4. Matches are best-of-1 (or configured)
5. Winners advance to next round

### Tournament Rules

- **Single Elimination**: Lose once, you're out
- **Automatic Progression**: Winners advance automatically
- **Time Limits**: 10 minutes per match
- **Disconnection**: Forfeit if disconnect > 2 minutes
- **Results**: Recorded on blockchain (immutable)

### Viewing Results

1. Go to **"Completed"** tab
2. Click on tournament
3. View:
   - Final bracket
   - Champion
   - All match scores
   - Blockchain transaction hash
4. Verify results on blockchain (if desired)

---

## Social Features

### Finding Friends

#### Search by Username

1. Click **"Friends"** from profile menu
2. Click **"Find Friends"**
3. Type username in search box
4. Click **"Add Friend"** on user card

#### View Profiles

1. Click on any username in:
   - Leaderboards
   - Match history
   - Tournament participants
2. View their profile
3. Click **"Add Friend"**

### Friend Requests

#### Sending Requests

1. Search for user (as above)
2. Click **"Add Friend"**
3. Request sent (they'll be notified)

#### Receiving Requests

1. Red notification badge appears on Friends icon
2. Click **"Friends"** → **"Requests"**
3. View pending requests
4. Click **"Accept"** or **"Decline"**

### Friend List

View your friends:

1. Go to **"Friends"** → **"My Friends"**
2. See online status (green dot = online)
3. Click on friend to:
   - View profile
   - Challenge to match
   - Send message
   - Remove friend

### Challenging Friends

1. From friend list, click friend's name
2. Click **"Challenge to Match"**
3. Friend receives notification
4. Match starts when accepted

### Chat System

Send messages to friends:

1. Click **"Chat"** icon
2. Select friend from list
3. Type message
4. Press Enter to send

Features:
- Real-time messaging
- Online/offline status
- Message history
- Emoji support
- Block/unblock users

### Blocking Users

If you encounter harassment:

1. Go to user's profile or chat
2. Click **"⋮"** (more options)
3. Click **"Block User"**
4. Confirm blocking

Blocked users:
- Cannot send you messages
- Cannot see your online status
- Cannot challenge you to matches
- Hidden from your leaderboard view

---

## Profile & Statistics

### Viewing Your Stats

1. Click **"Profile"** from main menu
2. View dashboard with:

#### Overview Stats
- **Total Matches**: Games played
- **Win Rate**: Percentage of wins
- **Current Streak**: Consecutive wins
- **Rank**: Your global ranking

#### Detailed Statistics
- **Wins/Losses**: Total record
- **Points Scored**: Total points across all matches
- **Points Against**: Points allowed
- **Average Score**: Average points per game
- **Longest Rally**: Most ball bounces in single rally
- **Perfect Games**: Matches won without opponent scoring

#### Match History
- Last 20 matches displayed
- Filter by:
  - Game mode (Quick, Tournament, Campaign, Bot)
  - Date range
  - Opponent
- Click match for detailed breakdown:
  - Score timeline
  - Rally statistics
  - Paddle movement heatmap

### Achievements

Unlock achievements by completing challenges:

#### Beginner Achievements
- **First Win**: Win your first match (🏆 5 points)
- **Campaign Start**: Complete level 1 (⭐ 10 points)
- **Social Butterfly**: Add 5 friends (👥 10 points)

#### Intermediate Achievements
- **Winning Streak**: Win 5 matches in a row (🔥 25 points)
- **Campaign Hero**: Complete all 21 levels (🎯 50 points)
- **Tournament Bronze**: 3rd place finish (🥉 30 points)
- **Sharpshooter**: Score 50 points in single match (🎯 40 points)

#### Advanced Achievements
- **Tournament Silver**: 2nd place finish (🥈 50 points)
- **Tournament Gold**: 1st place finish (🥇 100 points)
- **Unstoppable**: Win 20 matches in a row (⚡ 100 points)
- **Perfect Week**: Win 50 matches in 7 days (🌟 75 points)

#### Master Achievements
- **Legend**: Win 500 total matches (👑 200 points)
- **Tournament Master**: Win 10 tournaments (🏆 300 points)
- **Blockchain King**: Top 10 on blockchain leaderboard (⛓️ 500 points)

### Leaderboards

View global rankings:

1. Click **"Leaderboard"** from main menu
2. Choose category:

#### Global Leaderboard
- Ranked by total wins
- Top 100 players displayed
- Updates in real-time

#### Tournament Champions
- Recent tournament winners
- Blockchain-verified results
- Prize pool totals

#### Weekly Rankings
- Top players this week
- Resets every Monday 00:00 UTC
- Weekly prizes (if configured)

#### Friends Leaderboard
- Compare stats with friends only
- See who's the champion in your circle

---

## Settings & Preferences

### Game Settings

1. Go to **Profile** → **Settings** → **Game**

#### Gameplay Options
- **Paddle Speed**: Slow / Normal / Fast
- **Ball Speed**: Slow / Normal / Fast
- **Score Limit**: Default match score (3-21)
- **Camera Shake**: Enable/disable screen shake on hits
- **Sound Effects**: Enable/disable game sounds

#### Visual Settings
- **Theme**: Light / Dark / Auto
- **Paddle Color**: Choose your paddle color
- **Ball Trail**: Enable/disable ball trail effect
- **Court Style**: Classic / Modern / Neon
- **Background**: Space / Grid / Solid

### Audio Settings

1. Go to **Profile** → **Settings** → **Audio**

Controls:
- **Master Volume**: Overall volume (0-100%)
- **Sound Effects**: Paddle hits, scoring
- **Music**: Background music volume
- **Notifications**: Chat and match invites

### Privacy Settings

1. Go to **Profile** → **Settings** → **Privacy**

Options:
- **Profile Visibility**: Public / Friends Only / Private
- **Online Status**: Show/hide online status
- **Match History**: Public / Friends Only / Private
- **Friend Requests**: Everyone / Friends of Friends / Nobody
- **Chat**: Everyone / Friends Only / Nobody

### Notification Settings

1. Go to **Profile** → **Settings** → **Notifications**

Configure:
- **Friend Requests**: Email / Browser / None
- **Match Invites**: Email / Browser / None
- **Tournament Updates**: Email / Browser / None
- **Chat Messages**: Browser / None
- **Achievement Unlocked**: Browser / None

---

## Troubleshooting

### Connection Issues

#### Cannot Connect to Server

**Symptoms:** "Connection failed" error, infinite loading

**Solutions:**
1. Check internet connection
2. Refresh page (Ctrl+F5 or Cmd+Shift+R)
3. Clear browser cache
4. Try different browser
5. Check if server is running: `curl http://localhost/api/health`

#### WebSocket Disconnects

**Symptoms:** "Disconnected" during match, game freezes

**Solutions:**
1. Check network stability
2. Close other bandwidth-heavy applications
3. Reconnect to match (will resume if < 2 min)
4. Use wired connection instead of Wi-Fi

### Login Problems

#### Forgot Password

1. Click "Forgot Password?" on login page
2. Enter email address
3. Check spam folder if email doesn't arrive
4. Link expires in 1 hour

#### 2FA Code Not Working

**Solutions:**
1. Ensure phone clock is synchronized
2. Generate new code (codes expire after 30 seconds)
3. Check correct authenticator app
4. Use backup codes if available
5. Contact admin to disable 2FA

#### OAuth Login Fails

**Solutions:**
1. Ensure popup blocker is disabled
2. Check OAuth provider status
3. Clear browser cookies
4. Try different OAuth provider
5. Use email registration instead

### Gameplay Issues

#### Game Lag/Stuttering

**Solutions:**
1. Close unnecessary browser tabs
2. Disable browser extensions
3. Lower graphics settings
4. Check system resources (CPU/RAM)
5. Restart browser

#### Paddle Not Responding

**Solutions:**
1. Check keyboard connection
2. Ensure game window has focus (click on it)
3. Try different keys (W/S or Arrow keys)
4. Reload page
5. Check browser console for errors (F12)

#### Score Not Updating

**Solutions:**
1. Refresh page
2. Wait for server sync (may take 5-10 seconds)
3. Check match history for recorded score
4. Report bug if persistent

### Tournament Issues

#### Cannot Join Tournament

**Possible Reasons:**
- Tournament is full
- Tournament already started
- You're already registered
- Account not verified

**Solutions:**
1. Check tournament capacity
2. Verify your email (if required)
3. Try different tournament
4. Create your own tournament

#### Match Not Starting

**Solutions:**
1. Ensure both players are ready
2. Refresh page
3. Check opponent connection status
4. Wait 5 minutes, system will auto-forfeit if opponent doesn't connect

### Browser Compatibility

#### Features Not Working

**Recommended Browsers:**
- Firefox (latest) ✅ Primary
- Chrome (latest) ✅
- Edge (latest) ✅
- Safari (latest) ⚠️ Limited support

**Not Supported:**
- Internet Explorer
- Browsers older than 2 years

#### Clear Cache & Cookies

**Firefox:**
1. Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)
2. Select "Cookies" and "Cache"
3. Choose "Everything" for time range
4. Click "Clear Now"

**Chrome:**
1. Ctrl+Shift+Delete
2. Select "Cookies and other site data" and "Cached images and files"
3. Choose "All time"
4. Click "Clear data"

### Account Issues

#### Account Locked

**Reasons:**
- Too many failed login attempts (locked for 30 minutes)
- Suspicious activity detected
- Terms of service violation

**Solutions:**
1. Wait 30 minutes and try again
2. Reset password
3. Contact administrator

#### Missing Match History

**Solutions:**
1. Check date filter settings
2. Try different game mode filter
3. Refresh page
4. Check if matches are older than retention period (90 days)

### Performance Optimization

#### Improve Game Performance

1. Close unused applications
2. Lower browser zoom level (100%)
3. Disable hardware acceleration (if issues persist)
4. Update graphics drivers
5. Close other browser tabs
6. Restart browser

#### Reduce Data Usage

1. Disable match replays
2. Lower graphics quality
3. Limit chat usage
4. Turn off real-time leaderboard updates

---

## Getting Help

### In-App Support

1. Click **"?"** icon in top-right corner
2. Browse FAQ
3. Submit support ticket

### Contact Information

- **Email**: support@ft-transcendence.com
- **Discord**: discord.gg/ft-transcendence
- **GitHub Issues**: github.com/calvinhon/ft_transcendence/issues

### Report a Bug

1. Go to **Profile** → **Help** → **Report Bug**
2. Fill in:
   - What happened
   - Steps to reproduce
   - Expected behavior
   - Screenshots (if applicable)
3. Click "Submit"

### Feature Requests

1. Go to GitHub repository
2. Open new issue
3. Use "Feature Request" template
4. Describe your idea clearly

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Move Paddle Up | W or ↑ |
| Move Paddle Down | S or ↓ |
| Pause Game | ESC |
| Quick Match | Q |
| Profile | P |
| Friends | F |
| Leaderboard | L |
| Tournament | T |
| Chat | C |
| Settings | , (comma) |
| Logout | Ctrl+L |
| Refresh | F5 |
| Help | F1 |

---

## Tips & Tricks

### Gameplay Tips

1. **Paddle Positioning**: Stay centered, easier to reach both corners
2. **Ball Angles**: Hit with edge of paddle for sharper angles
3. **Prediction**: Watch ball speed and trajectory
4. **Rally Control**: Don't just defend, control the pace
5. **Mind Games**: Vary your return angles

### Ranking Up

1. **Consistency > Streaks**: Regular play beats occasional bursts
2. **Campaign Completion**: Unlock achievements and improve skills
3. **Tournament Participation**: Higher points for tournament wins
4. **Friend Challenges**: Practice with skilled friends
5. **Bot Training**: Use hard AI to improve reaction time

### Social Strategies

1. **Network**: Add players you enjoy playing against
2. **Join Communities**: Discord, forums for team tournaments
3. **Sportsman Conduct**: Positive interactions = better matches
4. **Share Achievements**: Celebrate wins with friends
5. **Learn from Losses**: Ask opponents for tips

---

## Glossary

- **Rally**: Continuous back-and-forth ball exchanges
- **Ace**: Winning point without opponent touching ball
- **Perfect Game**: Winning match without opponent scoring
- **Streak**: Consecutive wins without loss
- **ELO**: Rating system for player ranking
- **Matchmaking**: Automatic opponent finding system
- **Bracket**: Tournament structure diagram
- **Seed**: Player's initial tournament position
- **Forfeit**: Abandoning match (counts as loss)
- **Blockchain**: Immutable tournament record system

---

## Appendix

### Scoring System

**Points per Win:**
- Quick Match: 10 points
- Campaign Level: 5-25 points (based on difficulty)
- Tournament Match: 20-100 points (based on round)
- Tournament Win: 500 points + blockchain verification

**Ranking Calculation:**
```
Rank = (Total Wins × 10) + (Tournament Wins × 100) - (Losses × 5)
```

### Match Rules

- **Standard Match**: First to 11 points
- **Quick Match**: First to 7 points
- **Tournament Match**: First to 11 points
- **Campaign**: Varies by level (5-15 points)

**Ball Physics:**
- Initial speed: 5 pixels/frame
- Speed increase: +0.5 per paddle hit
- Maximum speed: 15 pixels/frame
- Angle range: 15° to 75° from horizontal

### Privacy Policy Summary

Your data:
- ✅ Encrypted in transit (HTTPS)
- ✅ Passwords hashed (never stored plain)
- ✅ OAuth tokens secured
- ✅ Can be exported (GDPR)
- ✅ Can be deleted (GDPR)
- ❌ Never sold to third parties
- ❌ Not shared without consent

### Terms of Service Summary

You agree to:
- ✅ Play fair, no cheating
- ✅ Respect other players
- ✅ Follow community guidelines
- ❌ No harassment or abuse
- ❌ No automated bots/scripts
- ❌ No account sharing

Violations result in:
1. Warning
2. Temporary suspension (24h-30d)
3. Permanent ban

---

**End of User Manual**

*For technical documentation, see Developer Guide.*  
*For system administration, see Admin Manual.*  
*Last Updated: December 6, 2025*
