# ft_transcendence — Multiplayer Pong Platform

ft_transcendence is a full‑stack web application built as the 42 school capstone project. It delivers a modern **Pong** experience with real‑time multiplayer, tournaments, social features, and a production‑like deployment using Docker.

The goal of the subject is to design and ship a complete web product (not just a game): authentication, user management, security, a smooth UX, and reliable real‑time gameplay.

## What’s in this repository

This project is organized as a Docker‑orchestrated microservice stack.

### Services

- **Frontend (`/frontend`)** — TypeScript SPA with real‑time gameplay rendering (Babylon.js) and WebSocket communication.
- **Auth Service (`/auth-service`)** — Registration/login, sessions, and account security.
- **User Service (`/user-service`)** — Profiles, avatars, social graph, stats/leaderboards.
- **Game Service (`/game-service`)** — Real‑time Pong matches, game state synchronization, match history.
- **Tournament Service (`/tournament-service`)** — Tournament creation, brackets, match progression and results.
- **Blockchain (`/blockchain`, `/blockchain-service`)** — Smart contracts + service for recording/verifying tournament results.
- **Vault (`/vault`)** — Secrets management / PKI support.
- **Redis (`/redis`)** — Caching/session support.

### Shared package

- **`/packages/common`** — Shared TypeScript utilities used across services (standard responses, health checks, SQLite helpers).

## Implemented modules (subject coverage)

Based on the ft_transcendence subject (see `documentation/readme/subject_full.txt`), this repository covers the mandatory web platform requirements and multiple optional modules, including:

- **Web**: SPA frontend, HTTPS-ready reverse proxy, and real-time communication.
- **User Management**: accounts, profiles, stats and social features.
- **Gameplay & UX**: multiple game modes (solo/campaign, quick match, tournaments) with live updates.
- **AI / Algo**: bot opponent(s) for training and progression.
- **Cybersecurity**: hardened deployment practices (e.g., secrets management) and typical web protections.
- **DevOps**: containerized multi-service deployment with Docker Compose.
- **Graphics**: 3D Pong rendering using Babylon.js.
- **Server-Side Pong**: authoritative real-time game synchronization via WebSockets.

> Note: exact module scoring/selection depends on the evaluation grid, but the above reflects the major areas implemented in this codebase.

## Quick start

### Prerequisites

- Docker + Docker Compose
- (Optional for local development) Node.js 18+

### Run with Docker

```bash
git clone https://github.com/calvinhon/ft_transcendence.git
cd ft_transcendence

# Start the stack
make start

# Then open the app
# https://localhost:8443
```

### Common commands

```bash
make dev        # core/dev mode
make full       # full stack
make rebuild    # rebuild images
make stop       # stop services
make logs       # follow logs
make ps         # container status
```

## Documentation

- Subject reference: `documentation/readme/subject_full.txt`
- Project report sources: `documentation/project-report/`

## License

See `LICENSE` (if present) for licensing information.