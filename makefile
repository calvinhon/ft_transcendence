# Makefile for auto-starting Docker Desktop, Docker Compose, and opening browser

OS := $(shell uname)

.PHONY: start check-docker check-compose clean clean-host up open stop restart rebuild

start: check-docker check-compose clean-host clean up open

restart: check-docker check-compose
	@echo "🔄 Restarting services without rebuild..."
	docker compose down
	docker compose up -d
	@echo "✅ Services restarted!"

rebuild: check-docker check-compose
	@echo "🔨 Rebuilding and restarting services with clean build..."
	docker compose down
	docker compose build --no-cache
	docker compose up -d
	@echo "✅ Services rebuilt and started!"

check-compose:
	@echo "🔍 Checking Docker Compose..."
	@if docker compose version >/dev/null 2>&1; then \
		echo "✅ Docker Compose (new syntax) is available."; \
	elif command -v docker-compose >/dev/null 2>&1; then \
		echo "✅ Docker Compose (legacy syntax) is available."; \
	else \
		echo "❌ Docker Compose not found. Please install Docker Compose."; \
		exit 1; \
	fi

clean-host:
	@echo "🧹 Cleaning host build directories and frontend compiled files..."
	@# Clean general build directories
	@find . -type d \( -name "dist" -o -name "build" -o -name ".next" -o -name ".nuxt" -o -name ".vuepress" -o -name "node_modules" \) -exec rm -rf {} + 2>/dev/null || true
	@# Clean TypeScript build info files
	@find . -name "*.tsbuildinfo" -delete 2>/dev/null || true
	@# Clean frontend specific build artifacts
	@if [ -d "frontend" ]; then \
		echo "🧹 Cleaning frontend build artifacts..."; \
		cd frontend && rm -rf dist node_modules/.vite node_modules/.cache 2>/dev/null || true; \
		find . -name "*.tsbuildinfo" -delete 2>/dev/null || true; \
	fi
	@echo "✅ Host build directories, node_modules, and frontend compiled files cleaned."

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

up:
	@echo "🚀 Running docker compose up --build..."
	docker compose build
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
