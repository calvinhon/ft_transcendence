# Makefile for auto-starting Docker Desktop, Docker Compose, and opening browser
# Ensures all development artifacts (node_modules, dist, build files) are cleaned from host
# since everything should run inside containers

OS := $(shell uname)

.PHONY: start check-docker check-compose clean clean-dev up open stop restart rebuild

start: check-docker check-compose clean-dev clean up open

restart: check-docker check-compose
	@echo "🔄 Restarting services without rebuild..."
	docker compose down
	docker compose up -d
	@echo "✅ Services restarted!"

rebuild: check-docker check-compose clean-dev
	@echo "🔨 Rebuilding and restarting services..."
	docker compose down
	docker compose build --no-cache
	docker compose up -d
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
	@find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
	@find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
	@find . -name "*.tsbuildinfo" -type f -delete 2>/dev/null || true
	@find . -name ".vite" -type d -exec rm -rf {} + 2>/dev/null || true
	@find . -name ".next" -type d -exec rm -rf {} + 2>/dev/null || true
	@find . -name "build" -type d -exec rm -rf {} + 2>/dev/null || true
	@find . -name ".cache" -type d -exec rm -rf {} + 2>/dev/null || true
	@find . -name ".nuxt" -type d -exec rm -rf {} + 2>/dev/null || true
	@echo "✅ Development artifacts cleaned from host"

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

up: clean-dev
	@echo "🚀 Running docker compose up --build --no-cache..."
	docker compose build --no-cache
	docker compose up -d

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
