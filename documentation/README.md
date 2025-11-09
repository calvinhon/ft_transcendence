
A full-stack multiplayer Pong game platform built with microservices and Docker. Here’s how it works:

**Frontend:**

- HTML/CSS/JavaScript (see frontend), with a modern UI for login, registration, playing Pong, viewing tournaments, and leaderboards.
- Users interact with the game via the browser. The frontend connects to backend services using REST APIs and WebSockets.

**Microservices:**

- **auth-service:** Handles user registration, login, JWT authentication, and user profiles.
- **game-service:** Manages Pong matches, including matchmaking, game state, and real-time gameplay via WebSockets. Supports both player-vs-player and player-vs-bot matches.
- **user-service:** Manages extended user profiles, friends, achievements, and leaderboards.
- **tournament-service:** Handles tournament creation, joining, match results, and tournament progress.

**API Gateway (nginx):**

- Proxies requests from the frontend to the correct backend service.
- Handles WebSocket connections for real-time Pong gameplay.

**Database:**

- Each service uses its own SQLite database for persistence (users, games, tournaments, etc.).

**Docker Compose:**

- Orchestrates all services, frontend, and nginx for easy local development and deployment.

**Gameplay Flow:**

1. User registers and logs in.
2. User clicks "Find Match" to start a Pong game.
3. If another player is available, a match starts; if not, a bot opponent is created.
4. Game state is synchronized in real-time via WebSockets.
5. Results, stats, and achievements are stored and displayed.
