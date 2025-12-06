# Pong CLI Client

A terminal-based Pong game client built with TypeScript and Node.js. Play Pong directly from your terminal with real-time gameplay, authentication, and statistics tracking.

## Features

- **Terminal UI**: ASCII-based game board with colored output
- **Real-time Gameplay**: 200ms update cycle for smooth gameplay
- **Authentication**: Login system with token-based authentication
- **Game Statistics**: View your win/loss records, rank, and streaks
- **Keyboard Controls**: Use arrow keys or WASD to control your paddle
- **Production Ready**: Full TypeScript support with strict type checking

## Installation

### From Source

```bash
git clone <repository>
cd cli-client
npm install
npm run build
npm start login
```

### Using Docker

```bash
docker build -t pong-cli .
docker run -it pong-cli login
```

### Global Installation

```bash
npm install -g .
pong login
```

## Usage

### Login

Authenticate with the Pong game server:

```bash
pong login
```

You will be prompted for your username and password. Your authentication token will be saved locally for subsequent commands.

### Play a Game

Start a new game against an AI opponent:

```bash
pong play
```

**Controls during gameplay:**
- `↑` or `W` - Move paddle up
- `↓` or `S` - Move paddle down
- `Q` - Quit game

The game board displays:
- Left paddle (blue `█`) - Your paddle
- Right paddle (red `█`) - Opponent's paddle
- Yellow ball (`●`) - Current ball position
- Center line - Dashed middle line
- Scores - Top of screen

### View Statistics

Display your game statistics and rankings:

```bash
pong stats
```

Shows:
- Total wins and losses
- Win rate percentage
- Current rank
- Current streak
- Average score per game

### Help

Show command help:

```bash
pong help
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

The CLI client expects these endpoints on the game service (default: `http://localhost:3002`):

### Authentication
- `POST /auth/login` - Login with username/password
  - Request: `{ username: string, password: string }`
  - Response: `{ token: string, userId: string }`

### Game Management
- `POST /game/start` - Start a new game
  - Response: `{ gameId: string, opponent: string, status: string }`

- `GET /game/{gameId}/state` - Get current game state
  - Response: `{ gameId, ballX, ballY, ballVelX, ballVelY, paddleLeftY, paddleRightY, scoreLeft, scoreRight, isGameOver, winner? }`

- `POST /game/{gameId}/move` - Move paddle
  - Request: `{ direction: 'up' | 'down' }`

- `POST /game/{gameId}/end` - End game
  - Request: `{ result: 'win' | 'lose' }`

### Statistics
- `GET /stats/{userId}` - Get player statistics
  - Response: `{ userId, wins, losses, winRate, rank, streak, averageScore }`

## Configuration

### Game Service URL

To connect to a different game service, modify the `client.ts` initialization:

```typescript
const gameClient = new GameServiceClient('http://your-server:port');
```

### Token Storage

Tokens are stored at: `~/.pong-cli/token.txt`

To clear cached credentials:

```bash
rm ~/.pong-cli/token.txt
```

## Troubleshooting

### "Not logged in" error

Run the login command first:

```bash
pong login
```

### Connection timeout

Ensure the game service is running at the configured URL (default: `localhost:3002`):

```bash
curl http://localhost:3002/health
```

### Invalid token

Clear the token cache and login again:

```bash
rm ~/.pong-cli/token.txt
pong login
```

### Build errors

Ensure TypeScript is installed:

```bash
npm install
npm run build
```

## Docker Deployment

### Build Image

```bash
docker build -t pong-cli:latest .
```

### Run Container

```bash
docker run -it --network=host pong-cli:latest login
docker run -it --network=host pong-cli:latest play
docker run -it --network=host pong-cli:latest stats
```

Note: Use `--network=host` to connect to services on the host machine.

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
