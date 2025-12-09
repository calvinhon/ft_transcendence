# ✨ FT_TRANSCENDENCE - Quick Reference Card

## 🚀 Getting Started (30 seconds)

```bash
cd /home/honguyen/ft_transcendence

# 1. Start services
make start

# 2. Wait 2-3 minutes for startup
# 3. Open browser: https://localhost (or http://localhost)
# 4. Ignore SSL warning, click "Continue"
```

## 📚 Documentation Guide

**Pick your use case:**

1. **I'm an Evaluator**
   - Read: `documentation/readme/INDEX.md`
   - Then: `documentation/readme/FEATURE_SHOWCASE_GUIDE.md`
   - Duration: 30-45 minutes

2. **I'm Setting Up Fresh**
   - Read: `documentation/readme/INSTALLATION_GUIDE.md`
   - Then: `documentation/readme/EVALUATION_GUIDE.md` (Quick Start section)
   - Duration: 30 minutes

3. **I'm Playing the Game**
   - Read: `documentation/readme/USER_MANUAL.md`
   - Reference: `documentation/readme/FEATURE_SHOWCASE_GUIDE.md`

4. **I'm Debugging Issues**
   - Read: `documentation/readme/FAQ.md`
   - Then: `documentation/readme/FEATURE_SHOWCASE_GUIDE.md` (Troubleshooting)

5. **Security Review**
   - Read: `documentation/readme/INDEX.md` (Security section)
   - Files: HTTPS_VERIFICATION_RESULTS.md, OAUTH_42_SETUP.md

## 🌐 Browser Access

```
URL: https://localhost
Method: HTTPS (self-signed cert is normal)
Port: 443 (HTTPS) or 80 (HTTP redirect)
Browser: Chrome, Firefox, Safari
```

**If you get SSL warning:**
1. Click "Advanced"
2. Click "Accept Risk and Continue"
3. It's safe - just a self-signed certificate for local dev

## 💻 Terminal Testing

### Quick Health Check
```bash
# One-command health check (NEW ⭐)
make health

# Or individual service checks
curl -k https://localhost 2>&1 | head -5  # Frontend

# All services
curl http://localhost:3001/health | jq .  # Auth
curl http://localhost:3002/health | jq .  # Game
curl http://localhost:3004/health | jq .  # User
curl http://localhost:3003/health | jq .  # Tournament
```

### Register & Login
```bash
# 1. Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecurePass123!"
  }' | jq .

# 2. Login
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"SecurePass123!"}' | jq -r '.token')

echo "Your token: $TOKEN"

# 3. Use token
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3004/api/user/profile | jq .
```

## 📊 Feature Showcase (Browser)

Follow these steps in your browser:

1. **Register or Login**
   - Click "Register" or login
   - Use OAuth (42 School) if configured

2. **Enable 2FA** (Optional)
   - Profile → Security
   - Enable 2FA with authenticator app

3. **Play a Game**
   - Arcade Mode: 1v1 quick match
   - Campaign: Beat AI across levels
   - Tournament: Create bracket tournament

4. **View Profile**
   - Click Profile
   - See stats, win rate, history
   - View/edit profile info

5. **Try Social Features**
   - Add friends
   - View leaderboard
   - Check online status

6. **GDPR Features**
   - Profile → Privacy
   - Export your data
   - Delete account (irreversible!)

## 🔧 Service Commands

```bash
# Start services
make start

# Stop services
make stop

# View logs
make logs

# Health check (NEW ⭐)
make health

# Restart specific service
docker compose restart auth-service

# View database
sqlite3 auth-service/database/auth.db

# Access container
docker compose exec auth-service bash
```

## 🐛 Troubleshooting

**Services won't start:**
```bash
docker compose logs -f elasticsearch
# Check Elasticsearch errors

# Rebuild
docker compose build --no-cache
make start
```

**Elasticsearch failed to start:**
```bash
# This is common - Elasticsearch needs more memory
# Check: docker compose logs elasticsearch

# Solution: Restart
docker compose restart elasticsearch
```

**Login fails with 500 error:**
```bash
# Check auth service logs
docker compose logs -f auth-service | tail -50

# Verify database
sqlite3 auth-service/database/auth.db ".tables"

# If needed, clean and restart
docker compose down -v
docker compose up -d auth-service
```

**Frontend won't load:**
```bash
# Verify nginx is running
docker compose ps nginx

# Check nginx logs
docker compose logs nginx

# Try HTTPS
curl -k https://localhost
```

## 📖 All Documentation Files (20 total)

```
documentation/readme/
├── INDEX.md ⭐ START HERE - Navigation & use cases
├── QUICK_REFERENCE.md ← You are here
├── FEATURE_SHOWCASE_GUIDE.md (browser + terminal walkthrough)
├── EVALUATION_GUIDE.md (comprehensive 2-hour evaluation)
├── INSTALLATION_GUIDE.md (setup from scratch)
├── USER_MANUAL.md (how to play the game)
├── COMPLIANCE_REPORT.md (125 points verification)
├── FAQ.md (common questions & solutions)
├── HTTPS_VERIFICATION_RESULTS.md (security verification)
├── OAUTH_42_SETUP.md (OAuth configuration)
├── OAUTH_IMPLEMENTATION.md (OAuth technical details)
├── GDPR_IMPLEMENTATION.md (data privacy features)
├── MONITORING_FIX_GUIDE.md (ELK Stack setup)
├── MODULE_VERIFICATION_REPORT.md (module test status)
├── README_PROFILE_DASHBOARD.md (profile docs index)
├── PROFILE_DASHBOARD_DEBUG.md (technical fixes)
├── PROFILE_DASHBOARD_SESSION_SUMMARY.md (implementation)
├── PROFILE_DASHBOARD_TESTING_GUIDE.md (QA procedures)
└── [4 more specialized files]
```

## ⚡ Quick Links by Scenario

| Scenario | File | Duration |
|----------|------|----------|
| New here? | INDEX.md | 5 min |
| Setup | INSTALLATION_GUIDE.md | 30 min |
| Full eval | EVALUATION_GUIDE.md | 2 hours |
| Feature demo | FEATURE_SHOWCASE_GUIDE.md | 45 min |
| Play game | USER_MANUAL.md | 5 min |
| Issues? | FAQ.md | varies |
| Security? | HTTPS_VERIFICATION_RESULTS.md | 30 min |
| Compliance? | COMPLIANCE_REPORT.md | 1 hour |

## 🎯 Most Used Commands

```bash
# Start everything
make start && sleep 180

# Quick health check (NEW ⭐)
make health

# Test API
curl http://localhost:3001/health | jq .

# View logs
docker compose logs -f auth-service

# Stop everything
make stop

# See what's running
docker compose ps
```

## 🌟 Feature Checklist

- [x] User Registration & Login
- [x] OAuth (42 School)
- [x] Two-Factor Authentication (2FA/TOTP)
- [x] HTTPS/TLS Security
- [x] Arcade Game Mode (1v1)
- [x] Campaign Mode (PvE)
- [x] Tournament Mode (Bracket)
- [x] AI Opponent
- [x] User Profile & Stats
- [x] Friends & Social
- [x] Leaderboard
- [x] Blockchain Integration
- [x] Database Persistence
- [x] GDPR Compliance
- [x] ELK Logging
- [x] Prometheus Metrics

**All 20 features documented and ready to demo!**

## 📞 Need Help?

| Issue | Solution |
|-------|----------|
| SSL warning | Normal for self-signed cert, click "Continue" |
| Services slow | Wait 2-3 min for startup, check logs |
| Elasticsearch failed | Restart: `docker compose restart elasticsearch` |
| Login 500 error | Check: `docker compose logs auth-service` |
| Frontend blank | Verify nginx: `docker compose ps nginx` |
| Don't know what to do | Read: `documentation/readme/FAQ.md` |

## 🔗 Important Links

- **Documentation**: `/home/honguyen/ft_transcendence/documentation/readme/`
- **Source**: `/home/honguyen/ft_transcendence/`
- **Frontend**: https://localhost
- **Grafana**: http://localhost:3000
- **Kibana**: http://localhost:5601

---

**Last Updated:** December 9, 2025  
**Status:** ✅ All services operational  
**Ready for:** Evaluation, Testing, Demonstration

