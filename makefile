# Makefile for auto-starting Docker Desktop, Docker Compose, and opening browser
# Ensures all development artifacts (node_modules, dist, build files) are cleaned from host
# since everything should run inside containers

OS := $(shell uname)

.PHONY: start full-start check-docker check-compose clean clean-dev up open stop restart rebuild ensure-database-folders help health test logs ps

.DEFAULT_GOAL := help

help:
	@echo "📚 FT_TRANSCENDENCE - Available Commands:"
	@echo ""
	@echo "🚀 Main Commands:"
	@echo "  make start              - Quick start (FASTEST - uses cache)"
	@echo "  make dev                - ⚡ DEV MODE: Core only (7 services, ~15s)"
	@echo "  make full               - Full stack with monitoring (12 services, ~2-3min)"
	@echo "  make full-start         - Full clean start (slower, fresh build)"
	@echo "  make restart            - Restart services without rebuild"
	@echo "  make rebuild            - Force rebuild from scratch (slowest)"
	@echo "  make stop               - Stop all services"
	@echo "  make logs               - View service logs"
	@echo "  make health             - Check health of all services ⭐ NEW"
	@echo ""
	@echo "🔧 Maintenance:"
	@echo "  make clean              - Remove containers, images, volumes"
	@echo "  make clean-dev          - Clean node_modules and build artifacts"
	@echo "  make optimize-monitoring - Apply monitoring stack optimizations"
	@echo "  make cleanup-logs       - Delete old Elasticsearch indices"
	@echo "  make ps                 - Show container status"
	@echo "  make test               - Show test documentation"
	@echo ""
	@echo "💡 Tip: Use 'make dev' for daily coding (7 services, SQLite DB)"
	@echo "💡 Use 'make full' when you need monitoring/logging (12 services)"
	@echo "💡 Run 'make optimize-monitoring' after first 'make full'"
	@echo "💡 Architecture: Microservices with SQLite (no external DB needed)"
	@echo ""

# Quick start - fastest option (use cached builds)
start: check-docker check-compose ensure-database-folders
	@echo "🛑 Stopping any running containers first..."
	@docker compose down --remove-orphans 2>/dev/null || true
	@docker ps -q | xargs -r docker stop 2>/dev/null || true
	@echo "🚀 Quick starting services with cache..."
	docker compose up -d --build --force-recreate
	@$(MAKE) open
	@echo "✅ Services started! Visit http://localhost"

# Dev mode - core services only (no monitoring stack)
dev: check-docker check-compose ensure-database-folders
	@echo "🛑 Stopping any running containers first..."
	@docker compose down --remove-orphans 2>/dev/null || true
	@docker compose -f docker-compose.core.yml down --remove-orphans 2>/dev/null || true
	@docker ps -q | xargs -r docker stop 2>/dev/null || true
	@echo "⚡ Starting DEV MODE (core services only, no monitoring)..."
	docker compose -f docker-compose.core.yml up -d --build --force-recreate
	@$(MAKE) open
	@echo "✅ Core services started! Visit http://localhost"
	@echo "💡 To add monitoring: make monitoring-start"

# Full stack with monitoring
full: check-docker check-compose ensure-database-folders
	@echo "🛑 Stopping any running containers first..."
	@docker compose down --remove-orphans 2>/dev/null || true
	@docker compose -f docker-compose.core.yml -f docker-compose.monitoring.yml down --remove-orphans 2>/dev/null || true
	@docker ps -q | xargs -r docker stop 2>/dev/null || true
	@echo "🚀 Starting FULL STACK (with monitoring)..."
	docker compose -f docker-compose.core.yml -f docker-compose.monitoring.yml up -d --build --force-recreate
	@$(MAKE) open
	@echo "✅ Full stack started! Visit http://localhost"
	@echo "📊 Monitoring: Kibana (5601), Grafana (3000), Prometheus (9090)"

# Start only monitoring services (assumes core is running)
monitoring-start: check-docker check-compose
	@echo "📊 Starting monitoring services..."
	docker compose -f docker-compose.monitoring.yml up -d
	@echo "✅ Monitoring started!"
	@echo "📊 Kibana: http://localhost:5601"
	@echo "📊 Grafana: http://localhost:3000 (admin/admin)"
	@echo "📊 Prometheus: http://localhost:9090"

# Stop only monitoring services
monitoring-stop: check-docker check-compose
	@echo "🛑 Stopping monitoring services..."
	docker compose -f docker-compose.monitoring.yml down
	@echo "✅ Monitoring stopped!"

# Full start with clean (slower but ensures fresh build)
full-start: check-docker check-compose clean-dev clean ensure-database-folders
	@echo "🛑 Stopping any running containers first..."
	@docker ps -q | xargs -r docker stop 2>/dev/null || true
	@echo "🚀 Full start with clean build..."
	docker compose build
	docker compose up -d --force-recreate
	@$(MAKE) open
	@echo "✅ Services started! Visit http://localhost"

restart: check-docker check-compose
	@echo "🔄 Restarting services without rebuild..."
	docker compose restart
	@echo "✅ Services restarted!"

rebuild: check-docker check-compose clean-dev ensure-database-folders
	@echo "🔨 Rebuilding and restarting services..."
	docker compose down
	docker compose build --no-cache
	docker compose up -d --force-recreate
	@echo "✅ Services rebuilt and started!"

check-docker:
	@echo "🔍 Checking Docker Desktop..."
	@if ! docker info >/dev/null 2>&1; then \
		echo "⚠️  Docker is not running. Starting Docker Desktop..."; \
		if [ "$(OS)" = "Darwin" ]; then \
			open -a Docker; \
			echo "⏳ Waiting for Docker to start..."; \
			while ! docker info >/dev/null 2>&1; do sleep 2; done; \
		else \
			if command -v systemctl >/dev/null 2>&1; then \
				sudo systemctl start docker; \
			else \
				echo "❌ Cannot auto-start Docker on this Linux. Please start it manually."; \
				exit 1; \
			fi \
		fi \
	else \
		echo "✅ Docker is already running."; \
	fi

check-compose:
	@echo "🔍 Checking Docker Compose v2..."
	@if ! docker compose version >/dev/null 2>&1; then \
		echo "❌ Docker Compose v2 not found. Please install it."; \
		exit 1; \
	else \
		echo "✅ Docker Compose v2 available."; \
	fi

clean-dev:
	@echo "🧹 Cleaning development artifacts from host..."
	@find . -name "node_modules" -type d -prune -exec rm -rf {} + 2>/dev/null || true
	@find . -name "dist" -type d -prune -exec rm -rf {} + 2>/dev/null || true
	@find . -name "*.tsbuildinfo" -type f -delete 2>/dev/null || true
	@find . -name ".vite" -type d -prune -exec rm -rf {} + 2>/dev/null || true
	@find . -name ".next" -type d -prune -exec rm -rf {} + 2>/dev/null || true
	@find . -name "build" -type d -prune -exec rm -rf {} + 2>/dev/null || true
	@find . -name ".cache" -type d -prune -exec rm -rf {} + 2>/dev/null || true
	@find . -name ".nuxt" -type d -prune -exec rm -rf {} + 2>/dev/null || true
	@echo "✅ Development artifacts cleaned"

clean:
	@echo "🧹 Completely deleting and resetting containers, images, and volumes for this project..."
	@if [ -f docker-compose.yml ]; then \
		if docker compose version >/dev/null 2>&1; then \
			docker compose down --rmi all --volumes --remove-orphans; \
			docker compose rm -f >/dev/null 2>&1 || true; \
		elif command -v docker-compose >/dev/null 2>&1; then \
			docker-compose down --rmi all --volumes --remove-orphans; \
			docker-compose rm -f >/dev/null 2>&1 || true; \
		else \
			echo "❌ Docker Compose not found. Cannot clean."; \
			exit 1; \
		fi; \
		PROJECT=$$(basename "$$(pwd)"); \
		CONTAINERS=$$(docker ps -a --filter "label=com.docker.compose.project=$$PROJECT" -q 2>/dev/null || true); \
		if [ -n "$$CONTAINERS" ]; then docker rm -f $$CONTAINERS >/dev/null 2>&1 || true; fi; \
		echo "✅ Complete removal done for compose project: $$PROJECT"; \
	else \
		echo "⚠️  No docker-compose.yml found in this directory."; \
	fi

up: ensure-database-folders
	@echo "🚀 Running docker compose up with build cache..."
	docker compose up -d --build

ensure-database-folders:
	@echo "📁 Ensuring database folders exist for all services..."
	@mkdir -p auth-service/database
	@mkdir -p game-service/database
	@mkdir -p tournament-service/database
	@mkdir -p user-service/database
	@touch auth-service/database/.gitkeep
	@touch game-service/database/.gitkeep
	@touch tournament-service/database/.gitkeep
	@touch user-service/database/.gitkeep
	@if [ ! -f .env ]; then \
		echo "📝 Creating empty .env file..."; \
		touch .env; \
		echo "✅ .env file created"; \
	fi
	@echo "✅ Database folders and .env file ensured"

open:
	@echo "🌐 Opening browser at http://localhost:80 ..."
	@if [ "$(OS)" = "Darwin" ]; then \
		open http://localhost:80; \
	elif echo "$(OS)" | grep -q "MINGW\|MSYS"; then \
		if command -v firefox >/dev/null 2>&1; then \
			start firefox http://localhost:80; \
		else \
			start http://localhost:80; \
		fi \
	elif grep -qEi "(Microsoft|WSL)" /proc/version 2>/dev/null; then \
		echo "🪟 Detected WSL environment, using Windows browser..."; \
		if command -v wslview >/dev/null 2>&1; then \
			wslview http://localhost:80 2>/dev/null || \
			(echo "⚠️  wslview failed, trying cmd.exe fallback..." && \
			cmd.exe /c start http://localhost:80 2>/dev/null || \
			powershell.exe -c "Start-Process 'http://localhost:80'" 2>/dev/null || \
			echo "❌ Could not auto-open browser. Please visit http://localhost:80 manually."); \
		else \
			cmd.exe /c start http://localhost:80 2>/dev/null || \
			powershell.exe -c "Start-Process 'http://localhost:80'" 2>/dev/null || \
			echo "❌ Could not auto-open browser. Please visit http://localhost:80 manually."; \
		fi \
	elif command -v xdg-open >/dev/null 2>&1; then \
		xdg-open http://localhost:80; \
	else \
		echo "❌ Could not auto-open browser. Please visit http://localhost:80 manually."; \
	fi

stop:
	@echo "🛑 Stopping running containers..."
	docker compose down --remove-orphans

logs:
	@echo "📋 Showing service logs (Ctrl+C to exit)..."
	docker compose logs -f

down:
	@echo "🛑 Stopping and removing containers..."
	docker compose down --remove-orphans

optimize-monitoring:
	@echo "🔧 Applying monitoring stack optimizations..."
	@if ! docker ps | grep -q elasticsearch; then \
		echo "⚠️  Services not running. Start services first with 'make start'"; \
		exit 1; \
	fi
	@./scripts/apply-elasticsearch-optimization.sh
	@echo "✅ Optimizations applied!"

cleanup-logs:
	@echo "🧹 Cleaning up old Elasticsearch data..."
	@if ! docker ps | grep -q elasticsearch; then \
		echo "⚠️  Elasticsearch not running. Start services first with 'make start'"; \
		exit 1; \
	fi
	@./scripts/cleanup-elasticsearch.sh
	@echo "✅ Cleanup complete!"

ps:
	@echo "📊 Container status:"
	@docker compose ps

health:
	@echo "🏥 Checking service health..."
	@echo ""
	@echo "🔍 Frontend (HTTPS):"
	@curl -sk https://localhost 2>&1 | grep -q "DOCTYPE" && echo "  ✅ Frontend responding" || echo "  ❌ Frontend not responding"
	@echo ""
	@echo "🔍 Microservices (HTTP):"
	@echo "  Auth Service (3001):"
	@curl -s http://localhost:3001/health 2>/dev/null | jq . 2>/dev/null && echo "    ✅ Healthy" || echo "    ⚠️  Not responding"
	@echo "  Game Service (3002):"
	@curl -s http://localhost:3002/health 2>/dev/null | jq . 2>/dev/null && echo "    ✅ Healthy" || echo "    ⚠️  Not responding"
	@echo "  User Service (3004):"
	@curl -s http://localhost:3004/health 2>/dev/null | jq . 2>/dev/null && echo "    ✅ Healthy" || echo "    ⚠️  Not responding"
	@echo "  Tournament Service (3003):"
	@curl -s http://localhost:3003/health 2>/dev/null | jq . 2>/dev/null && echo "    ✅ Healthy" || echo "    ⚠️  Not responding"
	@echo ""
	@echo "📦 Database Check:"
	@echo "  Auth DB: $(shell [ -f auth-service/database/auth.db ] && echo '✅ Exists' || echo '❌ Missing')"
	@echo "  Game DB: $(shell [ -f game-service/database/games.db ] && echo '✅ Exists' || echo '❌ Missing')"
	@echo "  User DB: $(shell [ -f user-service/database/users.db ] && echo '✅ Exists' || echo '❌ Missing')"
	@echo "  Tournament DB: $(shell [ -f tournament-service/database/tournaments.db ] && echo '✅ Exists' || echo '❌ Missing')"
	@echo ""
	@echo "📊 Running containers:"
	@docker compose ps --format "table {{.Names}}\t{{.Status}}" 2>/dev/null | head -15 || echo "  No containers running"

test:
	@echo "🧪 Running tests..."
	@echo "Test infrastructure available - see documentation/readme/EVALUATION_GUIDE.md for details"