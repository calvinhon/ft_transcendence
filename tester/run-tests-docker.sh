#!/bin/bash

# Docker-based test runner
# Runs all tests from within a Docker container to avoid host dependencies

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🐳 Building tester container..."
docker build -t ft_transcendence-tester -f "$SCRIPT_DIR/Dockerfile.tester" "$SCRIPT_DIR"

echo "🚀 Running tests in Docker container..."
docker run --rm \
    --network ft_transcendence_transcendence-network \
    -v "$SCRIPT_DIR:/tests" \
    -v "$PROJECT_ROOT:/project" \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -e PROJECT_ROOT=/project \
    -e AUTH_SERVICE_HOST=ft_transcendence-auth-service-1 \
    -e GAME_SERVICE_HOST=ft_transcendence-game-service-1 \
    -e TOURNAMENT_SERVICE_HOST=ft_transcendence-tournament-service-1 \
    -e USER_SERVICE_HOST=ft_transcendence-user-service-1 \
    ft_transcendence-tester \
    /bin/bash /tests/docker-test-wrapper.sh

echo "✅ Tests completed!"
