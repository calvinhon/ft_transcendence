# Fast Development Mode - Skip Large Docker Images

## 🎯 Problem
Pulling monitoring stack images takes too long:
- Kibana: ~400 MB
- Elasticsearch: ~600 MB
- Grafana: ~746 MB
- Filebeat: ~268 MB
- **Total: ~2 GB of images!**

## ✅ Solution: Split Stack

The project now has **two modes**:

### 1. DEV MODE (⚡ Fast - 15 seconds)
**Core services only** - No monitoring stack
```bash
make dev
```

Includes:
- ✅ Frontend (Nginx)
- ✅ Auth Service
- ✅ User Service
- ✅ Game Service
- ✅ Tournament Service
- ✅ All PostgreSQL databases
- ✅ Vault (secrets)
- ✅ Hardhat (blockchain)

**Images needed:** ~500 MB (mostly PostgreSQL, Node, Nginx - small alpine images)

### 2. FULL MODE (📊 Complete - 2-3 minutes)
**All services including monitoring**
```bash
make full
```

Includes everything from DEV MODE plus:
- 📊 Elasticsearch
- 📊 Kibana
- 📊 Prometheus
- 📊 Grafana
- 📊 Filebeat

**Images needed:** ~2.5 GB (all images)

---

## 🚀 Quick Start

### Daily Development (Fast!)
```bash
# Start core services only - no large images
make dev

# Your app is ready at http://localhost
# Startup time: ~15 seconds (vs 3-5 minutes)
```

### When You Need Monitoring
```bash
# Start full stack
make full

# Or add monitoring to running dev mode
make dev               # Start core first
make monitoring-start  # Add monitoring later
```

### Stop Everything
```bash
make stop
```

---

## 📊 Comparison

| Command | Services | Images Size | Startup Time | Use Case |
|---------|----------|-------------|--------------|----------|
| `make dev` | Core only | ~500 MB | 15-30s | Daily coding |
| `make full` | All services | ~2.5 GB | 2-3 min | Testing, demos |
| `make start` | All (legacy) | ~2.5 GB | 30-60s | Legacy command |

---

## 🔧 New Commands

### Development Commands
```bash
make dev              # Start core services only (FASTEST)
make full             # Start everything including monitoring
make monitoring-start # Add monitoring to running dev mode
make monitoring-stop  # Stop only monitoring services
```

### Legacy Commands (still work)
```bash
make start            # Quick start (all services)
make full-start       # Clean start (all services)
make restart          # Restart all
make stop             # Stop all
```

---

## 💡 When to Use Each Mode

### Use `make dev` for:
- ✅ Frontend development
- ✅ Backend API development
- ✅ Database work
- ✅ Quick testing
- ✅ Daily coding (90% of time)

### Use `make full` for:
- 📊 Log analysis (Kibana)
- 📊 Metrics monitoring (Grafana)
- 📊 Performance testing (Prometheus)
- 📊 Production-like environment
- 📊 Debugging complex issues

---

## 📁 File Structure

```
ft_transcendence/
├── docker-compose.yml              # Original (all services)
├── docker-compose.core.yml         # NEW: Core services only
├── docker-compose.monitoring.yml   # NEW: Monitoring services only
└── makefile                        # UPDATED: New dev/full commands
```

### How It Works

**Dev Mode:**
```bash
docker compose -f docker-compose.core.yml up
```

**Full Mode:**
```bash
docker compose -f docker-compose.core.yml -f docker-compose.monitoring.yml up
```

Docker Compose merges the files automatically!

---

## 🎓 Advanced Usage

### Start Core, Add Monitoring Later
```bash
# 1. Start core services (fast)
make dev

# 2. Do your development work...

# 3. Need to check logs? Add monitoring:
make monitoring-start

# 4. Done with monitoring? Remove it:
make monitoring-stop
```

### Check What's Running
```bash
# View all containers
docker ps

# View only core services
docker compose -f docker-compose.core.yml ps

# View only monitoring
docker compose -f docker-compose.monitoring.yml ps
```

### Logs for Specific Stack
```bash
# Core services logs
docker compose -f docker-compose.core.yml logs -f

# Monitoring logs
docker compose -f docker-compose.monitoring.yml logs -f

# Specific service
docker logs frontend -f
```

---

## ⚡ Performance Impact

### Before (Original `make start`)
```
Total images: ~2.5 GB
Download time: 5-10 minutes (first time)
Startup time: 2-3 minutes
```

### After (`make dev`)
```
Total images: ~500 MB
Download time: 1-2 minutes (first time)
Startup time: 15-30 seconds
```

**Result: 10x faster for daily development! 🚀**

---

## 🔍 Troubleshooting

### Issue: "network not found"
```bash
# Create network manually
docker network create transcendence-network

# Then try again
make dev
```

### Issue: Port conflicts
```bash
# Check what's using ports
sudo lsof -i :80,3001,3002,3003,3004

# Stop conflicting services
make stop
```

### Issue: Want to switch modes
```bash
# Stop current mode
make stop

# Start different mode
make dev   # or make full
```

### Issue: Need to rebuild
```bash
# Rebuild dev mode only
docker compose -f docker-compose.core.yml build --no-cache

# Rebuild monitoring only
docker compose -f docker-compose.monitoring.yml build --no-cache
```

---

## 📋 Migration Guide

### If you were using `make start`:

**Option 1: Continue as before**
```bash
make start  # Still works, starts everything
```

**Option 2: Switch to fast dev mode**
```bash
make dev    # Much faster, core only
```

### For CI/CD:

**Testing:**
```bash
make dev    # Fast startup for tests
```

**Full validation:**
```bash
make full   # Test with monitoring
```

---

## ✅ Summary

1. **Problem:** Downloading 2GB of monitoring images takes 5-10 minutes
2. **Solution:** Split into core (500MB) and monitoring (2GB)
3. **Usage:** 
   - `make dev` for daily work (15s startup)
   - `make full` when you need monitoring (2-3min startup)
4. **Result:** 10x faster development workflow!

**Recommendation:** Use `make dev` for 90% of your work, `make full` only when needed.

---

## 🎯 Quick Reference

| Goal | Command |
|------|---------|
| Fastest start | `make dev` |
| Need monitoring | `make full` |
| Add monitoring later | `make monitoring-start` |
| Remove monitoring | `make monitoring-stop` |
| Stop everything | `make stop` |
| View logs | `make logs` |
| See all commands | `make help` |

**Start coding faster! 🚀**
