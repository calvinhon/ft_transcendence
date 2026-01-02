# Makefile for auto-starting Docker Desktop, Docker Compose, and opening browser
# Ensures all development artifacts (node_modules, dist, build files) are cleaned from host
# since everything should run inside containers

OS := $(shell uname)

.PHONY: dev clean-start check-docker check-compose clean clean-dev purge nuke open stop restart rebuild ensure-database-folders help health test logs ps

.DEFAULT_GOAL := help

help:
	@echo "📚 FT_TRANSCENDENCE - Available Commands:"
	@echo ""
	@echo "🚀 Main Commands:"
	@echo "  make dev                - 🚀 DEV: Quick start with cached builds (~30s)"
	@echo "  make clean-start        - 🧹 CLEAN: Remove images/volumes + fresh build (~2-3min)"
	@echo "  make restart            - 🔄 RESTART: Restart containers without rebuild (~5s)"
	@echo "  make rebuild            - 🔨 REBUILD: Rebuild from scratch, keep volumes (~2min)"
	@echo "  make stop               - 🛑 STOP: Stop all services"
	@echo "  make logs               - 📋 LOGS: View service logs"
	@echo "  make health             - 🏥 HEALTH: Check all services status ⭐ NEW"
	@echo ""
	@echo "🔧 Maintenance:"
	@echo "  make clean              - Remove containers, images, volumes"
	@echo "  make clean-dev          - Clean node_modules and build artifacts"
	@echo "  make purge              - 🔥 PURGE: Stop/remove ALL project containers + images"
	@echo "  make nuke               - 🔥 NUKE: Stop all containers + prune + delete ALL images"
	@echo "  make ps                 - Show container status"
	@echo "  make test               - Show test documentation"
	@echo ""
	@echo "💡 Quick dev cycle: 'make dev' → code → 'make restart'"
	@echo "💡 Fresh start: 'make clean-start' (removes everything)"
	@echo "💡 Architecture: Microservices with SQLite (no external DB needed)"
	@echo ""

# Dev mode - quick development start with cached builds
dev: check-docker check-compose ensure-database-folders
	@echo "🛑 Stopping any running containers first..."
	@docker compose down --remove-orphans 2>/dev/null || true
	@docker ps -q | xargs -r docker stop 2>/dev/null || true
	@echo "🚀 Starting all services for development (uses build cache)..."
	docker compose up -d --build --force-recreate
	@$(MAKE) open
	@echo "✅ All services started! Visit http://localhost"

# Clean start - complete reset: removes images, volumes, host artifacts + fresh build
clean-start: check-docker check-compose clean-dev clean ensure-database-folders
	@echo "� Clean start with fresh build (after removing images & volumes)..."
	docker compose build --no-cache
	docker compose up -d --force-recreate
	@$(MAKE) open
	@echo "✅ Services started! Visit http://localhost"

# Restart - quick restart of existing containers without rebuilding
restart: check-docker check-compose
	@echo "🔄 Restarting services without rebuild..."
	docker compose restart
	@echo "✅ Services restarted!"

# Rebuild - rebuild images from scratch (no cache) but keep data volumes
rebuild: check-docker check-compose clean-dev ensure-database-folders
	@echo "🔨 Rebuilding and restarting services from scratch..."
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
	@docker ps -q | xargs -r docker stop 2>/dev/null || true
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

# Purge - completely stop and remove ALL containers and images for this project only
purge: check-docker check-compose
	@echo "🔥 PURGING all containers and images for this project..."
	@if [ -f docker-compose.yml ]; then \
		echo "🛑 Stopping and removing project containers..."; \
		docker compose down --remove-orphans 2>/dev/null || true; \
		echo "🗑️  Removing project containers..."; \
		docker compose rm -f 2>/dev/null || true; \
		echo "🖼️  Removing project images..."; \
		docker compose down --rmi all 2>/dev/null || true; \
		PROJECT=$$(basename "$$(pwd)"); \
		echo "🔍 Finding any remaining project containers..."; \
		CONTAINERS=$$(docker ps -a --filter "label=com.docker.compose.project=$$PROJECT" -q 2>/dev/null || true); \
		if [ -n "$$CONTAINERS" ]; then \
			echo "🗑️  Force removing remaining containers: $$CONTAINERS"; \
			docker rm -f $$CONTAINERS >/dev/null 2>&1 || true; \
		fi; \
		echo "🔍 Finding project images..."; \
		IMAGES=$$(docker images --filter "label=com.docker.compose.project=$$PROJECT" -q 2>/dev/null || true); \
		if [ -n "$$IMAGES" ]; then \
			echo "🗑️  Removing project images: $$IMAGES"; \
			docker rmi $$IMAGES >/dev/null 2>&1 || true; \
		fi; \
		echo "✅ Project purge completed for: $$PROJECT"; \
	else \
		echo "⚠️  No docker-compose.yml found in this directory."; \
	fi

# Nuke - aggressive cleanup: stop all containers, prune system, delete ALL images
nuke: check-docker
	@echo "🔥 NUKING Docker environment - this will stop ALL containers and delete ALL images!"
	@echo "⚠️  This is destructive and will affect ALL Docker containers/images on your system."
	@read -p "Are you sure? Type 'yes' to continue: " confirm && [ "$$confirm" = "yes" ] || (echo "❌ Operation cancelled." && exit 1)
	@echo "🛑 Stopping ALL running containers..."
	@docker stop $$(docker ps -q) 2>/dev/null || true
	@echo "🧹 Pruning Docker system (containers, networks, volumes)..."
	@docker system prune -f --volumes
	@echo "🗑️  Deleting ALL Docker images..."
	@docker rmi $$(docker images -q) 2>/dev/null || true
	@echo "💥 Docker environment completely nuked!"
	@echo "💡 To rebuild: make clean-start"
	@$(MAKE) ensure-database-folders

# Ensure database folders and required files exist
ensure-database-folders:
	@echo "📁 Ensuring database folders exist for all services..."
	@mkdir -p auth-service/database
	@mkdir -p game-service/database
	@mkdir -p tournament-service/database
	@mkdir -p user-service/database
	@mkdir -p vault/data
	@touch auth-service/database/.gitkeep
	@touch game-service/database/.gitkeep
	@touch tournament-service/database/.gitkeep
	@touch user-service/database/.gitkeep
	@if [ ! -f .env ]; then \
		echo "📝 Creating empty .env file..."; \
		touch .env; \
		echo "✅ .env file created"; \
	fi
	@echo "🔐 Setting vault permissions..."
	@if [ -d vault/data ]; then \
		if [ -f vault/data/vault.db ] || [ -d vault/data/raft ]; then \
			if ! find vault/data -type f -o -type d >/dev/null 2>&1; then \
				echo "🔑 Vault data exists but has wrong permissions (cannot access files)"; \
				echo "🔑 Need sudo access to fix vault permissions..."; \
				if sudo -n true 2>/dev/null; then \
					echo "✅ Sudo access available, fixing permissions..."; \
					sudo chown -R $$(whoami):$$(whoami) vault/data; \
					echo "✅ Vault permissions fixed"; \
				else \
					echo "🔑 Please enter your sudo password to fix vault permissions:"; \
					sudo chown -R $$(whoami):$$(whoami) vault/data && \
					echo "✅ Vault permissions fixed" || \
					(echo "❌ Failed to fix vault permissions. Please run: sudo chown -R $$(whoami):$$(whoami) vault/data" && exit 1); \
				fi; \
			else \
				CURRENT_OWNER=$$(find vault/data -type f -o -type d | head -1 | xargs stat -c '%U' 2>/dev/null || find vault/data -type f -o -type d | head -1 | xargs stat -f '%Su' 2>/dev/null || echo "unknown"); \
				if [ "$$CURRENT_OWNER" != "$$(whoami)" ] && [ "$$CURRENT_OWNER" != "unknown" ]; then \
					echo "🔑 Vault data exists but has wrong permissions (owned by $$CURRENT_OWNER)"; \
					echo "🔑 Need sudo access to fix vault permissions..."; \
					if sudo -n true 2>/dev/null; then \
						echo "✅ Sudo access available, fixing permissions..."; \
						sudo chown -R $$(whoami):$$(whoami) vault/data; \
						echo "✅ Vault permissions fixed"; \
					else \
						echo "🔑 Please enter your sudo password to fix vault permissions:"; \
						sudo chown -R $$(whoami):$$(whoami) vault/data && \
						echo "✅ Vault permissions fixed" || \
						(echo "❌ Failed to fix vault permissions. Please run: sudo chown -R $$(whoami):$$(whoami) vault/data" && exit 1); \
					fi; \
				else \
					echo "✅ Vault permissions are correct"; \
				fi; \
			fi; \
		else \
			if command -v chown >/dev/null 2>&1; then \
				sudo chown -R 100:1000 vault/data 2>/dev/null || \
				chown -R 100:1000 vault/data 2>/dev/null || \
				echo "⚠️  Could not change vault permissions (may need sudo)"; \
			else \
				echo "⚠️  chown command not available"; \
			fi; \
		fi; \
	fi
	@echo "✅ Database folders, .env file, and vault permissions ensured"

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
	@docker ps -q | xargs -r docker stop 2>/dev/null || true

logs:
	@echo "📋 Showing service logs (Ctrl+C to exit)..."
	docker compose logs -f

down:
	@echo "🛑 Stopping and removing containers..."
	docker compose down --remove-orphans

ps:
	@echo "📊 Container status:"
	@docker compose ps

health:
	@echo "🏥 Checking service health..."
	@echo ""
	@echo "🔍 Frontend (HTTPS):"
	@curl -sk https://localhost 2>&1 | grep -q "DOCTYPE" && echo "  ✅ Frontend responding" || echo "  ❌ Frontend not responding"
	@echo ""
	@echo "🔍 Microservices (HTTPS via Nginx):"
	@echo "  Auth Service:"
	@curl -sk https://localhost/api/auth/health 2>/dev/null | grep -q '"status":"ok"' && echo "    ✅ Healthy" || echo "    ⚠️  Not responding"
	@echo "  Game Service:"
	@curl -sk https://localhost/api/game/health 2>/dev/null | grep -q '"status":"ok"' && echo "    ✅ Healthy" || echo "    ⚠️  Not responding"
	@echo "  User Service:"
	@curl -sk https://localhost/api/user/health 2>/dev/null | grep -q '"status":"ok"' && echo "    ✅ Healthy" || echo "    ⚠️  Not responding"
	@echo "  Tournament Service:"
	@curl -sk https://localhost/api/tournament/health 2>/dev/null | grep -q '"status":"ok"' && echo "    ✅ Healthy" || echo "    ⚠️  Not responding"
	@echo ""
	@echo "📦 Database Check:"
	@echo "  Auth DB: $(shell [ -f auth-service/database/auth.db ] && echo '✅ Exists' || echo '❌ Missing')"
	@echo "  Game DB: $(shell [ -f game-service/database/games.db ] && echo '✅ Exists' || echo '❌ Missing')"
	@echo "  User DB: $(shell [ -f user-service/database/users.db ] && echo '✅ Exists' || echo '❌ Missing')"
	@echo "  Tournament DB: $(shell [ -f tournament-service/database/tournaments.db ] && echo '✅ Exists' || echo '❌ Missing')"
	@echo ""
	@echo "📊 Running containers:"
	@docker compose ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null | head -15 || echo "  No containers running"


test:
	@echo "🧪 Running tests..."
	@echo "Test infrastructure available - see documentation/readme/EVALUATION_GUIDE.md for details"
	cd tester && ./run-containerized-tests.sh
	cd tester && ./run-all-tests.sh
	@echo "✅ Tests completed"
