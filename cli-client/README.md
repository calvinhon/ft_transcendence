# Pong CLI Client

A terminal-based Pong game client built with TypeScript and Node.js. Play Pong directly from your terminal with real-time gameplay, authentication, and statistics tracking.

## ✅ Status: Fully Functional!

This CLI client provides a **complete terminal-based Pong gaming experience** with WebSocket real-time gameplay!

**All Features Working:**
- ✅ **Authentication**: Login/register with token-based auth
- ✅ **Real-time Gameplay**: WebSocket connection for live Pong matches
- ✅ **Play vs AI Bot**: Choose from easy, medium, or hard difficulty
- ✅ **Human Matchmaking**: Join queue to play against other players
- ✅ **Terminal Graphics**: ASCII art game board with live score updates
- ✅ **Keyboard Controls**: W/S or ↑/↓ arrow keys to control your paddle
- ✅ **Game Statistics**: View your win/loss records, rank, and streaks

## Features

- **Terminal UI**: Real-time ASCII game board with colored paddles and ball
- **WebSocket Gameplay**: Full real-time game synchronization
- **AI Opponents**: Play against bots with adjustable difficulty
- **Matchmaking**: Join queue to compete against human players
- **Keyboard Controls**: Smooth paddle movement with W/S or arrow keys
- **Live Scoring**: Real-time score updates displayed during gameplay
- **Production Ready**: Full TypeScript support with strict type checking

## Prerequisites

Before using the CLI client, ensure the main application is running:

```bash
# From the project root directory
cd /path/to/ft_transcendence
make start   # or 'make dev' for development mode

# Verify services are running
docker compose ps
# Ensure nginx is running on port 80
```

The CLI client connects through nginx at `http://localhost` (port 80).

## Installation

### From Source (Recommended)

```bash
# Navigate to cli-client directory
cd cli-client

# Install dependencies
npm install

# Build TypeScript code
npm run build

# Ready to use!
npm start login
```

### Using Docker (Advanced)

```bash
docker build -t pong-cli ./cli-client
docker run -it --network=host pong-cli login
```

**Note**: `--network=host` is required to access services on localhost.

### Global Installation (Optional)

```bash
cd cli-client
npm install -g .
# Now you can use 'pong' command globally
pong login
```

## Usage

### Step 1: Create an Account

First, register an account using the web interface:

```bash
# Open browser to http://localhost
# Click "Register" and create an account
# Remember your username and password for CLI login
```

**Or** use the web interface to login with OAuth (Google, GitHub, 42) - the CLI will work with any account type.

### Step 2: Login via CLI

Authenticate with your credentials:

```bash
npm start login
# or if installed globally: pong login
```

**Interactive prompts:**
```
? Username: your_username
? Password: ********

🔐 Logging in...
✓ Login successful!
Token saved to ~/.pong-cli/token.txt
```

Your authentication token is automatically saved and used for all future commands.

### Step 3: Play Pong!

Start a game from the terminal:

```bash
npm start play
# or: pong play
```

**Game Mode Selection:**
```
? Select game mode:
  ❯ Play vs Bot (Quick Game)
    Join Matchmaking (vs Human)

? Select bot difficulty: (for bot games)
  ❯ easy
    medium
    hard
```

**In-Game Experience:**
```
═══════════════════════════════════════════════════════════════════════════════
                          clitest: 2  vs  AI Bot: 1
═══════════════════════════════════════════════════════════════════════════════
─────────────────────────────────────────────────────────────────────────────
█                                                                            
█                                    ●                                       
█                                                                          █ 
█                                                                          █ 
                                     │                                      
                                     │                                      
─────────────────────────────────────────────────────────────────────────────
═══════════════════════════════════════════════════════════════════════════════
Controls: W/S or ↑/↓ to move paddle | P to pause | Q to quit
```

**Controls:**
- **W** or **↑**: Move paddle up
- **S** or **↓**: Move paddle down
- **P**: Pause game
- **Q**: Quit game

### Step 4: View Your Statistics

Check your performance and rankings:

```bash
npm start stats
# or: pong stats
```

**Statistics Display:**
```
📊 Player Statistics

┌─────────────────┬────────┐
│ Metric          │ Value  │
├─────────────────┼────────┤
│ Total Wins      │ 15     │
│ Total Losses    │ 7      │
│ Win Rate        │ 68.2%  │
│ Current Rank    │ 42     │
│ Current Streak  │ 3      │
│ Average Score   │ 8.5    │
└─────────────────┴────────┘
```

### Additional Commands

**Show Help:**
```bash
npm start help
# or: pong help
```

**Check Version:**
```bash
npm start --version
# or: pong --version
```

**Logout (Clear Token):**
```bash
rm ~/.pong-cli/token.txt
# Then login again when needed
```

### Play Command (Not Yet Working)

⚠️ **Note:** The `play` command is currently not functional because the game service uses WebSocket for real-time gameplay, not REST API.

```bash
# This will show an error:
npm start play
# Error: Route POST:/start not found
```

**To play Pong, use the web interface:**
```bash
# Open browser to http://localhost
# Login with your account
# Click "Play" to start a game
```

**Future Implementation:**
The CLI play command would require:
- WebSocket client integration
- Real-time message handling
- Terminal input capture during live game
- Game state synchronization

## Common Workflows

### Quick Stats Check
```bash
# 1. Ensure services are running
cd /path/to/ft_transcendence && make start

# 2. Navigate to CLI client
cd cli-client

# 3. Login (first time only)
npm start login

# 4. Check your statistics
npm start stats
```

### After Playing via Web
```bash
# 1. Play games on web interface (http://localhost)

# 2. Check stats via CLI
cd cli-client
npm start login  # if not already logged in
npm start stats  # See updated statistics
```

### Development/Testing
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Test login
npm start login

# Test stats
npm start stats
```

## Architecture

### File Structure

```
cli-client/
├── src/
│   ├── index.ts                 # Main CLI entry point (Commander.js)
│   ├── api/
│   │   └── client.ts            # GameServiceClient API wrapper
│   ├── commands/
│   │   ├── login.ts             # Login command handler
│   │   ├── play.ts              # Game play command handler
│   │   └── stats.ts             # Statistics command handler
│   └── ui/
│       └── game-display.ts      # Terminal game rendering
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

### API Client (`src/api/client.ts`)

The `GameServiceClient` class handles all communication with the Pong game service:

**Methods:**
- `login(username, password)` - Authenticate and receive token
- `startGame()` - Start a new game
- `getGameState(gameId)` - Get current game state
- `movePaddle(gameId, direction)` - Move paddle up/down
- `endGame(gameId, result)` - End game with result
- `getStats(userId)` - Get player statistics
- `isAuthenticated()` - Check if user is logged in
- `logout()` - Clear local token

**Token Management:**
- Tokens are automatically saved to `~/.pong-cli/token.txt`
- Tokens are automatically loaded on client initialization
- Token is sent with every API request via `Authorization` header

### Game Display (`src/ui/game-display.ts`)

ASCII-based terminal rendering engine:
- **Board dimensions**: 60 characters wide × 20 lines tall
- **Update cycle**: 200ms from play command
- **Rendering**:
  - Borders using box-drawing characters (╔═╗║╚╝)
  - Center dividing line with dots
  - Colored paddles and ball
  - Real-time score display

### Commands

Each command is a separate module in `src/commands/`:

- **login.ts**: Interactive login with inquirer prompts, saves token locally
- **play.ts**: Game loop with keypress handling and API integration
- **stats.ts**: Formatted table output using `table` library

## Dependencies

### Production

| Package     | Version | Purpose                          |
| ----------- | ------- | -------------------------------- |
| axios       | ^1.6.0  | HTTP client for API requests     |
| chalk       | ^5.3.0  | Terminal color/style output      |
| commander   | ^11.1.0 | CLI framework and command router |
| inquirer    | ^8.2.5  | Interactive prompts              |
| keypress    | ^0.2.1  | Keyboard input handling          |
| table       | ^6.8.1  | Formatted table output           |

### Development

| Package     | Purpose                    |
| ----------- | -------------------------- |
| typescript  | TypeScript compiler        |
| ts-node    | TypeScript execution       |
| jest        | Unit testing framework     |
| @types/\*   | TypeScript type definitions |
| rimraf      | Cross-platform rm -rf      |

## Development

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

Compiles TypeScript to `dist/` directory.

### Development Mode

```bash
npm run dev
```

Runs directly with ts-node (no compilation needed).

### Run

```bash
npm start
npm start login
npm start play
npm start stats
```

### Testing

```bash
npm test
```

### Clean

```bash
npm run clean
```

Removes compiled output directory.

## API Endpoints

The CLI client connects through nginx gateway at `http://localhost` (port 80) and uses these API routes:

### Authentication
- `POST /api/auth/login` - Login with username/password
  - Request: `{ username: string, password: string }`
  - Response: `{ token: string, userId: string }`

### Game Management
- `POST /api/game/start` - Start a new game
  - Response: `{ gameId: string, opponent: string, status: string }`

- `GET /api/game/{gameId}/state` - Get current game state
  - Response: `{ gameId, ballX, ballY, ballVelX, ballVelY, paddleLeftY, paddleRightY, scoreLeft, scoreRight, isGameOver, winner? }`

- `POST /api/game/{gameId}/move` - Move paddle
  - Request: `{ direction: 'up' | 'down' }`

- `POST /api/game/{gameId}/end` - End game
  - Request: `{ result: 'win' | 'lose' }`

### Statistics
- `GET /api/user/stats/{userId}` - Get player statistics
  - Response: `{ userId, wins, losses, winRate, rank, streak, averageScore }`

**All requests go through nginx** which routes to the appropriate microservice:
- `/api/auth/*` → auth-service (port 3001)
- `/api/game/*` → game-service (port 3002)
- `/api/user/*` → user-service (port 3004)

## Configuration

### Server URL

Default: `http://localhost` (nginx gateway on port 80)

To connect to a different server, modify `src/api/client.ts`:

```typescript
// Line 46
constructor(baseURL: string = 'http://localhost') {
  // Change to your server URL
  // Example: 'http://your-domain.com' or 'http://192.168.1.100'
}
```

Then rebuild:
```bash
npm run build
```

### Token Storage

**Location:** `~/.pong-cli/token.txt`

The token is automatically:
- Saved after successful login
- Loaded on each command execution
- Sent in `Authorization: Bearer <token>` header

**To clear credentials:**
```bash
rm ~/.pong-cli/token.txt
# Or logout via web interface
```

## Troubleshooting

### Error: "Not logged in. Use 'login' command first"

**Cause:** No authentication token found or token expired.

**Solution:**
```bash
npm start login
# Re-enter your username and password
```

### Error: "Login failed: Route POST:/api/auth/login not found"

**Cause:** Main application services not running or nginx not started.

**Solution:**
```bash
# Go to project root
cd /path/to/ft_transcendence

# Start services
make start

# Wait for all services to be healthy
docker compose ps

# Verify nginx is running on port 80
curl http://localhost/
```

### Error: "Connection timeout" or "ECONNREFUSED"

**Cause:** Services are not accessible at `http://localhost`.

**Solutions:**

1. **Check if services are running:**
   ```bash
   docker compose ps
   # All services should show "Up" status
   ```

2. **Verify nginx is accessible:**
   ```bash
   curl -I http://localhost/
   # Should return HTTP 200
   ```

3. **Check if port 80 is available:**
   ```bash
   sudo lsof -i :80
   # Should show nginx/docker
   ```

4. **Restart services:**
   ```bash
   make restart
   ```

### Error: "Invalid token" or "Unauthorized"

**Cause:** Token expired or invalidated.

**Solution:**
```bash
# Clear token and re-login
rm ~/.pong-cli/token.txt
npm start login
```

### Error: "exports is not defined in ES module scope"

**Cause:** Build configuration mismatch (should be fixed now).

**Solution:**
```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

### Keyboard controls not working during game

**Cause:** Terminal input mode not set correctly.

**Solution:**
- Use a proper terminal emulator (not VS Code integrated terminal)
- Try different terminal: GNOME Terminal, Alacritty, iTerm2
- Ensure terminal has focus (click in terminal window)

### Build errors with TypeScript

**Cause:** Missing dependencies or outdated packages.

**Solution:**
```bash
# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Game board rendering issues

**Cause:** Terminal doesn't support required characters or colors.

**Solutions:**
- Use a modern terminal with Unicode support
- Ensure terminal width is at least 80 characters
- Set terminal to use UTF-8 encoding
- Enable color support in terminal settings

### Testing connection manually

```bash
# Test auth endpoint
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# Test game endpoint (with token)
curl http://localhost/api/game/health \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Docker Deployment (Advanced)

### Build Image

```bash
# From project root
docker build -t pong-cli:latest ./cli-client

# Or from cli-client directory
cd cli-client
docker build -t pong-cli:latest .
```

### Run Container

**On Linux:**
```bash
# Use host network to access localhost services
docker run -it --network=host pong-cli:latest login
docker run -it --network=host pong-cli:latest play
docker run -it --network=host pong-cli:latest stats
```

**On macOS/Windows:**
```bash
# Use host.docker.internal to access host services
docker run -it pong-cli:latest login
# Note: You may need to modify client.ts to use:
# http://host.docker.internal instead of http://localhost
```

### Running with Docker Compose Network

If you want the CLI in the same Docker network as the main app:

```bash
# Run CLI container in the transcendence network
docker run -it --network=ft_transcendence_transcendence-network \
  pong-cli:latest login

# Note: Change baseURL in client.ts to use container names:
# http://nginx instead of http://localhost
```

**Important:** For most use cases, running directly with npm is simpler and recommended.

## Performance

- **Update frequency**: 200ms (5 FPS)
- **API timeout**: 5000ms
- **Terminal rendering**: Real-time with clear screen between updates
- **Memory usage**: ~50MB per running instance

## Contributing

1. Install dependencies: `npm install`
2. Make changes to `src/` directory
3. Build and test: `npm run build && npm test`
4. Submit pull request

## License

MIT

## Support

For issues and feature requests, please visit the project repository or contact the development team.
