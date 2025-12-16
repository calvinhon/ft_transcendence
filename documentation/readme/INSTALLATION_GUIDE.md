# FT_TRANSCENDENCE - Installation & Setup Guide

**Version:** 1.0.0  
**Platform:** Docker + Docker Compose  
**Requirements:** Linux, macOS, or Windows with WSL2  
**Last Updated:** December 6, 2025

---

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Prerequisites Installation](#prerequisites-installation)
3. [Project Setup](#project-setup)
4. [Configuration](#configuration)
5. [Deployment Options](#deployment-options)
6. [Service Management](#service-management)
7. [Troubleshooting](#troubleshooting)
8. [Advanced Configuration](#advanced-configuration)

---

## System Requirements

### Minimum Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 2 cores | 4+ cores |
| **RAM** | 8 GB | 16 GB |
| **Storage** | 20 GB free | 50 GB free |
| **OS** | Linux 64-bit, macOS 10.15+, Windows 10 with WSL2 | Ubuntu 20.04+, macOS 12+, Windows 11 |
| **Internet** | 10 Mbps | 50+ Mbps |

### Software Requirements

- **Docker**: 20.10+ 
- **Docker Compose**: 2.0+
- **Git**: 2.0+
- **Node.js**: 18+ (for local development only)
- **Make**: GNU Make 4.0+

---

## Prerequisites Installation

### Linux (Ubuntu/Debian)

```bash
# Update package list
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git and Make
sudo apt install -y git make

# Log out and back in for group changes
```

### macOS

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Docker Desktop
brew install --cask docker

# Open Docker Desktop once to initialize
open /Applications/Docker.app

# Install Git (if not installed)
brew install git

# Make is pre-installed on macOS
```

### Windows (WSL2)

```powershell
# Install WSL2 (PowerShell as Administrator)
wsl --install

# Restart computer

# Open Ubuntu from Start Menu
# Then follow Linux instructions above

# Install Docker Desktop for Windows
# Download from: https://www.docker.com/products/docker-desktop
# Enable WSL2 backend in Docker Desktop settings
```

### Verify Installation

```bash
# Check Docker
docker --version
# Expected: Docker version 20.10.0 or higher

# Check Docker Compose
docker-compose --version
# Expected: Docker Compose version v2.0.0 or higher

# Check Git
git --version
# Expected: git version 2.0.0 or higher

# Check Make
make --version
# Expected: GNU Make 4.0 or higher

# Test Docker
docker run hello-world
# Should download and run successfully
```

---

## Project Setup

### Step 1: Clone Repository

```bash
# Clone the repository
git clone https://github.com/calvinhon/ft_transcendence.git

# Navigate to project directory
cd ft_transcendence

# Check current branch
git branch
# Should show: * develop or * main
```

### Step 2: Environment Configuration

```bash
# Copy example environment file
cp .env.example .env

# Edit environment file
nano .env  # or vim, code, etc.
```

**Required Environment Variables:**

```bash
# ===================
# OAUTH CREDENTIALS
# ===================

# Google OAuth (Required for OAuth login)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost/api/auth/oauth/callback

# GitHub OAuth (Optional)
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_CALLBACK_URL=http://localhost/api/auth/oauth/callback

# 42 School OAuth (Optional)
SCHOOL42_CLIENT_ID=your_42_client_id_here
SCHOOL42_CLIENT_SECRET=your_42_client_secret_here
SCHOOL42_CALLBACK_URL=http://localhost/api/auth/oauth/callback

# ===================
# JWT CONFIGURATION
# ===================
JWT_SECRET=your_secure_random_string_here_min_32_chars
JWT_EXPIRY=7d

# ===================
# BLOCKCHAIN
# ===================
BLOCKCHAIN_URL=http://hardhat-node:8545
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
TOURNAMENT_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3

# ===================
# VAULT
# ===================
VAULT_ADDR=http://vault:8200
VAULT_TOKEN=dev-token

# ===================
# DATABASE
# ===================
DB_PATH=/app/database
NODE_ENV=development

# ===================
# SERVICES
# ===================
AUTH_SERVICE_URL=http://auth-service:3000
GAME_SERVICE_URL=http://game-service:3000
USER_SERVICE_URL=http://user-service:3000
TOURNAMENT_SERVICE_URL=http://tournament-service:3000
```

### Step 3: Obtain OAuth Credentials (Optional but Recommended)

#### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure consent screen:
   - User Type: External
   - App name: FT Transcendence
   - Support email: your email
   - Authorized domains: localhost
6. Application type: **Web application**
7. Authorized redirect URIs:
   ```
   http://localhost/api/auth/oauth/callback
   ```
8. Copy **Client ID** and **Client Secret** to `.env`

#### GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
   - Application name: FT Transcendence
   - Homepage URL: http://localhost
   - Authorization callback URL: http://localhost/api/auth/oauth/callback
4. Click **Register application**
5. Generate a client secret
6. Copy **Client ID** and **Client Secret** to `.env`

#### 42 School OAuth Setup

1. Go to [42 API Applications](https://profile.intra.42.fr/oauth/applications)
2. Click **New Application**
3. Fill in:
   - Name: FT Transcendence
   - Redirect URI: http://localhost/api/auth/oauth/callback
4. Copy **UID** (Client ID) and **Secret** to `.env`

---

## Deployment Options

### Quick Start (Recommended for First Time)

Fastest way to get everything running:

```bash
# Start all services with cached builds
make start

# Wait for all services to be healthy (1-2 minutes)
# Application will be available at: http://localhost
```

### Development Mode (Recommended)

For daily development and production:

```bash
# Start all services
make dev

# Starts in ~15 seconds
# Includes all core services
# Optimized for development
```

### Full Stack (Complete Environment)

For comprehensive testing with all services:

```bash
# Start complete environment
make full

# Takes 2-3 minutes
# Includes all services and dependencies
# Production-like setup
```

### What Each Command Does

| Command | Services Started | Build Time | RAM Usage | Use Case |
|---------|------------------|------------|-----------|----------|
| `make start` | All (cached) | ~30s | 4 GB | Quick testing |
| `make dev` | All services | ~15s | 4 GB | Daily development |
| `make full` | Complete stack | ~3min | 6 GB | Full testing |

---

## Service Management

### Starting Services

```bash
# Quick start (fastest)
make start

# Development mode (core only)
make dev

# Full stack with monitoring
make full

# Start specific services only
docker-compose up -d auth-service game-service
```

### Stopping Services

```bash
# Stop all services (preserves data)
make stop

# Or
docker-compose down
```

### Restarting Services

```bash
# Restart without rebuilding (fast, ~10s)
make restart

# Restart specific service
docker-compose restart auth-service
```

### Rebuilding Services

```bash
# Force rebuild all (slow, ~5-7 min)
make rebuild

# Rebuild specific service
docker-compose up -d --build auth-service
```

### Viewing Logs

```bash
# View all logs
make logs

# Follow logs in real-time
docker-compose logs -f

# View specific service logs
docker-compose logs -f auth-service

# View last 100 lines
docker-compose logs --tail=100 game-service

# Save logs to file
docker-compose logs > logs-$(date +%Y%m%d).txt
```

### Checking Service Status

```bash
# List all containers
make ps

# Or
docker-compose ps

# Check health status
docker ps --format "table {{.Names}}\t{{.Status}}"

# Check resource usage
docker stats
```

### Accessing Service Endpoints

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost | Main application |
| **Auth API** | http://localhost/api/auth | Authentication endpoints |
| **Game API** | http://localhost/api/game | Game endpoints |
| **User API** | http://localhost/api/user | User endpoints |
| **Tournament API** | http://localhost/api/tournament | Tournament endpoints |
| **Vault** | http://localhost:8200 | Secrets management |

### Health Checks

```bash
# Check all service health
curl http://localhost:3001/health  # Auth
curl http://localhost:3002/health  # Game
curl http://localhost:3003/health  # User
curl http://localhost:3004/health  # Tournament

# Expected response:
# {"status":"ok","timestamp":"2025-12-06T..."}

# Check database connectivity
docker exec auth-service ls -lah /app/database/
docker exec game-service ls -lah /app/database/
docker exec user-service ls -lah /app/database/
docker exec tournament-service ls -lah /app/database/
```

---

## Configuration

### Nginx Configuration

Main reverse proxy configuration:

```bash
# Edit Nginx config
nano frontend/nginx/nginx.conf

# Test configuration
docker exec nginx nginx -t

# Reload Nginx (without downtime)
docker exec nginx nginx -s reload

# View Nginx logs
docker logs nginx
```

**Key Configuration Sections:**

```nginx
# SSL/TLS Configuration
server {
    listen 443 ssl;
    ssl_certificate /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;
}

# Service Routing
location /api/auth/ {
    proxy_pass http://auth-service:3000/;
}

# WebSocket Configuration
location /api/game/ws {
    proxy_pass http://game-service:3000/ws;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

### Database Configuration

Each service has its own SQLite database:

```bash
# View database files
ls -lah */database/*.db

# Access database directly
docker exec -it auth-service sqlite3 /app/database/auth.db

# Run SQL query
docker exec auth-service sqlite3 /app/database/auth.db "SELECT COUNT(*) FROM users;"

# Backup database
docker exec auth-service cat /app/database/auth.db > backups/auth-$(date +%Y%m%d).db

# Restore database
docker exec -i auth-service sh -c 'cat > /app/database/auth.db' < backups/auth-20251206.db
```

### Monitoring Configuration

#### Prometheus

```bash
# Edit Prometheus config
nano prometheus/prometheus.yml

# Reload configuration
curl -X POST http://localhost:9090/-/reload

# Check targets
curl http://localhost:9090/api/v1/targets
```

#### Grafana

```bash
# Access Grafana
open http://localhost:3000

# Default credentials:
# Username: admin
# Password: admin

# Import dashboards
# Go to: Dashboards → Import → Upload JSON
```

#### Elasticsearch

```bash
# Check cluster health
curl http://localhost:9200/_cluster/health?pretty

# View indices
curl http://localhost:9200/_cat/indices?v

# Delete old indices (cleanup)
make cleanup-logs
```

### Vault Configuration

```bash
# Initialize Vault (first time only)
docker exec vault vault operator init

# Unseal Vault (after restart)
docker exec vault vault operator unseal <unseal_key>

# Login to Vault
docker exec vault vault login <root_token>

# Store secret
docker exec vault vault kv put secret/api-key value=your_secret_here

# Retrieve secret
docker exec vault vault kv get secret/api-key
```

---

## Troubleshooting

### Common Issues

#### Issue: Port Already in Use

**Error:** `Bind for 0.0.0.0:80 failed: port is already allocated`

**Solution:**
```bash
# Find process using port 80
sudo lsof -i :80
# or
sudo netstat -tlnp | grep :80

# Kill the process
sudo kill -9 <PID>

# Or change port in docker-compose.yml
ports:
  - "8080:80"  # Use 8080 instead
```

#### Issue: Container Keeps Restarting

**Symptom:** Container status shows "Restarting"

**Solutions:**
```bash
# Check logs for error
docker logs <container_name>

# Check container exit code
docker inspect <container_name> | grep ExitCode

# Common causes:
# - Missing environment variables
# - Database connection failure
# - Port conflicts
# - Out of memory

# Fix and restart
docker-compose restart <service_name>
```

#### Issue: Database Not Found

**Error:** `ENOENT: no such file or directory, open '/app/database/auth.db'`

**Solution:**
```bash
# Create database directories
make ensure-database-folders

# Or manually:
mkdir -p auth-service/database
mkdir -p game-service/database
mkdir -p user-service/database
mkdir -p tournament-service/database

# Rebuild containers
docker-compose up -d --build
```

#### Issue: OAuth Not Working

**Symptoms:** 
- Redirect fails
- "Invalid redirect URI" error
- OAuth button doesn't work

**Solutions:**
```bash
# 1. Check environment variables
docker exec auth-service env | grep GOOGLE

# 2. Verify callback URL matches exactly:
#    http://localhost/api/auth/oauth/callback
#    (no trailing slash, must be lowercase)

# 3. Check OAuth provider settings:
#    - Callback URL registered
#    - Application not suspended
#    - Credentials correct

# 4. Check logs
docker logs auth-service | grep -i oauth

# 5. Test OAuth endpoint
curl http://localhost/api/auth/oauth/init?provider=google
```

#### Issue: WebSocket Connection Fails

**Error:** `WebSocket connection to 'ws://localhost/api/game/ws' failed`

**Solutions:**
```bash
# 1. Check game service
curl http://localhost:3002/health

# 2. Check Nginx WebSocket proxy
docker exec nginx cat /etc/nginx/nginx.conf | grep -A 10 "location.*ws"

# 3. Test WebSocket endpoint
wscat -c ws://localhost/api/game/ws
# (install: npm install -g wscat)

# 4. Check firewall
sudo ufw status
sudo ufw allow 80/tcp

# 5. Restart services
docker-compose restart game-service nginx
```

#### Issue: Blockchain Not Connected

**Error:** `Error: could not detect network`

**Solutions:**
```bash
# 1. Check Hardhat node
docker logs hardhat-node

# 2. Restart Hardhat
docker-compose restart hardhat-node

# 3. Redeploy contract
docker exec hardhat-node npx hardhat run scripts/deploy-rankings.cjs --network localhost

# 4. Check contract address
docker exec tournament-service cat /app/blockchain-contract-address.txt
```

### Performance Issues

#### Slow Application Load

**Solutions:**
```bash
# 1. Check resource usage
docker stats

# 2. Increase Docker resources
# Docker Desktop → Settings → Resources
# - CPUs: 4+
# - Memory: 8GB+

# 3. Optimize monitoring stack
make optimize-monitoring

# 4. Use dev mode (no monitoring)
make stop
make dev

# 5. Clean unused Docker resources
docker system prune -a
```

#### High Memory Usage

**Solutions:**
```bash
# 1. Check which services use most memory
docker stats --no-stream

# 2. Limit container memory if needed
# Edit docker-compose.yml:
services:
  auth-service:
    mem_limit: 256m
```

### Logging & Debugging

#### Enable Debug Logging

```bash
# Set environment variable
echo "LOG_LEVEL=debug" >> .env

# Restart services
docker-compose restart

# View detailed logs
docker-compose logs -f auth-service
```

#### Access Container Shell

```bash
# Access container bash
docker exec -it auth-service /bin/sh

# Check files
ls -lah /app/
cat /app/dist/server.js

# Check environment
env | grep -i jwt

# Exit
exit
```

#### Database Inspection

```bash
# SQLite CLI
docker exec -it auth-service sqlite3 /app/database/auth.db

# List tables
.tables

# Describe table
.schema users

# Query data
SELECT * FROM users LIMIT 5;

# Exit
.exit
```

---

## Advanced Configuration

### SSL/TLS Setup (Production)

#### Generate Self-Signed Certificate (Development)

```bash
# Create certificates directory
mkdir -p nginx/certs

# Generate certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/certs/key.pem \
  -out nginx/certs/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Restart Nginx
docker-compose restart nginx
```

#### Use Let's Encrypt (Production)

```bash
# Install Certbot
sudo apt install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy to nginx/certs/
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/certs/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/certs/key.pem

# Update nginx.conf with domain
# Restart
docker-compose restart nginx
```

### Custom Domain Setup

```bash
# 1. Update .env
DOMAIN=yourdomain.com

# 2. Update OAuth callback URLs
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/oauth/callback

# 3. Update nginx.conf
server_name yourdomain.com;

# 4. Configure DNS
# A record: yourdomain.com → your_server_ip

# 5. Generate SSL certificate (see above)

# 6. Restart services
make rebuild
```

### Scaling Services

#### Horizontal Scaling

```bash
# Scale specific service
docker-compose up -d --scale game-service=3

# With load balancer
# Edit docker-compose.yml:
services:
  game-service:
    deploy:
      replicas: 3
```

#### Vertical Scaling

```bash
# Increase resources for specific service
# Edit docker-compose.yml:
services:
  game-service:
    mem_limit: 1024m
    cpus: 2.0

# Apply changes
docker-compose up -d
```

### Backup & Restore

#### Automated Backup Script

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup databases
for service in auth-service game-service user-service tournament-service; do
    docker exec $service cat /app/database/*.db > "$BACKUP_DIR/${service}.db"
done

# Backup environment
cp .env "$BACKUP_DIR/.env"

# Compress
tar -czf "$BACKUP_DIR.tar.gz" "$BACKUP_DIR"
rm -rf "$BACKUP_DIR"

echo "Backup created: $BACKUP_DIR.tar.gz"
EOF

chmod +x backup.sh

# Run backup
./backup.sh

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /path/to/ft_transcendence/backup.sh
```

#### Restore from Backup

```bash
# Extract backup
tar -xzf backups/20251206_020000.tar.gz

# Stop services
make stop

# Restore databases
for service in auth-service game-service user-service tournament-service; do
    cp "backups/20251206_020000/${service}.db" "${service}/database/"
done

# Restore environment
cp backups/20251206_020000/.env .env

# Start services
make start
```

### Migration Scripts

#### Update Database Schema

```bash
# Create migration script
cat > auth-service/migrations/001_add_2fa.sql << 'EOF'
ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN two_factor_secret TEXT;
EOF

# Run migration
docker exec auth-service sqlite3 /app/database/auth.db < auth-service/migrations/001_add_2fa.sql
```

### Monitoring & Alerts

#### Configure Email Alerts (Prometheus)

```yaml
# Edit prometheus/alert.rules.yml
groups:
  - name: services
    rules:
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"

# Configure Alertmanager
# prometheus/alertmanager.yml
receivers:
  - name: email
    email_configs:
      - to: admin@example.com
        from: alerts@example.com
        smarthost: smtp.gmail.com:587
        auth_username: alerts@example.com
        auth_password: your_app_password
```

---

## Maintenance

### Regular Maintenance Tasks

```bash
# Weekly

# 1. Update containers
docker-compose pull
make rebuild

# 2. Clean old logs
make cleanup-logs

# 3. Backup databases
./backup.sh

# 4. Check disk space
df -h

# Monthly

# 1. Update system packages
sudo apt update && sudo apt upgrade

# 2. Review security logs
docker logs nginx | grep -i "denied\|blocked"

# 3. Audit user accounts
docker exec user-service sqlite3 /app/database/users.db "SELECT COUNT(*) FROM users;"

# 4. Archive old data
# See backup scripts above
```

### Updates & Upgrades

```bash
# Pull latest changes
git pull origin main

# Review changes
git log --oneline -10

# Update dependencies
docker-compose build --no-cache

# Apply updates
make rebuild

# Run tests
cd tester && ./run-all-tests.sh
```

---

## Next Steps

After successful installation:

1. ✅ **Test the Application**: Access http://localhost
2. ✅ **Create Admin Account**: Register first user
3. ✅ **Configure OAuth**: Add OAuth credentials
4. ✅ **Run Test Suite**: `cd tester && ./run-all-tests.sh`
5. ✅ **Review Logs**: Check for any errors
6. ✅ **Set Up Monitoring**: Access Grafana and Kibana
7. ✅ **Configure Backups**: Set up automated backups
8. ✅ **Read User Manual**: Familiarize with features

---

## Support

- **Documentation**: `/documentation` folder
- **Issues**: https://github.com/calvinhon/ft_transcendence/issues
- **Email**: support@ft-transcendence.com

---

**Installation Guide Complete** ✅

*For user instructions, see USER_MANUAL.md*  
*For development setup, see DEVELOPER_GUIDE.md*  
*Last Updated: December 6, 2025*
