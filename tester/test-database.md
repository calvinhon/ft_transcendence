# Test Suite: Database (SQLite)

## Module: Use a Database for the Backend
**Points:** 5 (Minor)  
**Database:** SQLite  
**Date:** December 5, 2025

---

## Test 1: Database Files Creation

### Objective
Verify database files are created for each service.

### Test Steps
1. Check database files exist
2. Verify file permissions
3. Check file size (should be > 0)
4. Verify SQLite format

### Test Commands
```bash
# Check database files
ls -lah auth-service/database/auth.db
ls -lah game-service/database/game.db
ls -lah tournament-service/database/tournament.db
ls -lah user-service/database/user.db

# Verify SQLite format
file auth-service/database/auth.db
file game-service/database/game.db
file tournament-service/database/tournament.db
file user-service/database/user.db

# Check database info
sqlite3 auth-service/database/auth.db ".tables"
```

### Expected Results
```
auth.db: SQLite 3.x database...
game.db: SQLite 3.x database...
tournament.db: SQLite 3.x database...
user.db: SQLite 3.x database...
```

### Pass Criteria
- All 4 database files exist
- Files are valid SQLite3 format
- File size > 10KB (after initialization)
- Read/write permissions set

---

## Test 2: Schema Creation

### Objective
Verify database schemas are created correctly.

### Test Steps
1. Check users table exists
2. Verify column definitions
3. Check constraints
4. Verify table structure

### Test Commands
```bash
# Check users table schema
sqlite3 auth-service/database/auth.db ".schema users"

# Expected output:
# CREATE TABLE users (
#   id INTEGER PRIMARY KEY AUTOINCREMENT,
#   username TEXT UNIQUE NOT NULL,
#   email TEXT UNIQUE NOT NULL,
#   password_hash TEXT NOT NULL,
#   avatar_url TEXT,
#   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
#   last_login DATETIME
# );

# List all tables
sqlite3 auth-service/database/auth.db ".tables"

# Check games table
sqlite3 game-service/database/game.db ".schema games"

# Check tournaments table
sqlite3 tournament-service/database/tournament.db ".schema tournaments"
```

### Expected Tables
- **auth.db:** users, password_reset_tokens
- **game.db:** games, game_records
- **tournament.db:** tournaments, tournament_rankings
- **user.db:** user_profiles, gdpr_actions

### Pass Criteria
- All expected tables exist
- Columns match specification
- Primary keys defined
- Unique constraints enforced

---

## Test 3: User Creation

### Objective
Verify users can be created in database.

### Test Steps
1. Register a new user via API
2. Query database for user
3. Verify user data stored correctly
4. Check password hashing

### Test Commands
```bash
# Register new user via API
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "dbtest",
    "email": "dbtest@example.com",
    "password": "SecurePass123!"
  }'

# Query database
sqlite3 auth-service/database/auth.db \
  "SELECT id, username, email, created_at FROM users WHERE username='dbtest';"

# Verify password is hashed (not plaintext)
sqlite3 auth-service/database/auth.db \
  "SELECT password_hash FROM users WHERE username='dbtest';"
```

### Expected Results
```
1|dbtest|dbtest@example.com|2025-12-05...
$2b$10$... (bcrypt hash, not plaintext)
```

### Pass Criteria
- User record inserted
- Username and email stored
- Password is hashed (bcrypt format)
- created_at timestamp set
- email is unique constraint

---

## Test 4: User Queries

### Objective
Verify users can be queried from database.

### Test Steps
1. Query user by ID
2. Query user by username
3. Query user by email
4. Verify query performance

### Test Commands
```bash
# Query by ID
sqlite3 auth-service/database/auth.db \
  "SELECT * FROM users WHERE id=1;"

# Query by username
sqlite3 auth-service/database/auth.db \
  "SELECT * FROM users WHERE username='dbtest';"

# Query by email
sqlite3 auth-service/database/auth.db \
  "SELECT * FROM users WHERE email='dbtest@example.com';"

# Count users
sqlite3 auth-service/database/auth.db \
  "SELECT COUNT(*) FROM users;"
```

### Pass Criteria
- All query methods return correct data
- No SQL errors
- Query results contain expected columns
- Empty result handled gracefully

---

## Test 5: Password Verification

### Objective
Verify password hashing and verification works correctly.

### Test Steps
1. Register user with password
2. Verify stored password is hashed
3. Test login with correct password
4. Test login with incorrect password

### Test Commands
```bash
# Register user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "passtest",
    "email": "passtest@example.com",
    "password": "MyPassword123!"
  }'

# Login with correct password
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "passtest",
    "password": "MyPassword123!"
  }' | jq .

# Login with wrong password
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "passtest",
    "password": "WrongPassword"
  }' | jq .
```

### Expected Results
- Correct password: returns token
- Wrong password: returns 401 Unauthorized
- Hash in database: bcrypt format ($2b$...)

### Pass Criteria
- Correct password accepted
- Wrong password rejected
- No plaintext passwords stored
- Password comparison works

---

## Test 6: Data Persistence

### Objective
Verify data persists across service restarts.

### Test Steps
1. Create user and data
2. Stop service
3. Start service
4. Query same data
5. Verify data unchanged

### Test Commands
```bash
# Create user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "persisttest",
    "email": "persist@example.com",
    "password": "PersistPass123!"
  }'

# Verify in database
sqlite3 auth-service/database/auth.db \
  "SELECT username FROM users WHERE username='persisttest';"

# Restart service
docker-compose restart auth-service
sleep 5

# Verify user still exists
sqlite3 auth-service/database/auth.db \
  "SELECT username FROM users WHERE username='persisttest';"

# Try login still works
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "persisttest",
    "password": "PersistPass123!"
  }'
```

### Pass Criteria
- Data exists before restart
- Data exists after restart
- Login works after restart
- No data corruption

---

## Test 7: Transaction Integrity

### Objective
Verify database transactions maintain data integrity.

### Test Steps
1. Simulate concurrent operations
2. Check for data consistency
3. Verify no partial writes
4. Check transaction rollback

### Test Commands
```bash
# Create test data
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "transtest",
    "email": "trans@example.com",
    "password": "TransPass123!"
  }'

# Query transaction logs (if available)
sqlite3 auth-service/database/auth.db \
  "PRAGMA integrity_check;"

# Expected: ok
```

### Pass Criteria
- Integrity check returns "ok"
- No orphaned records
- All foreign keys valid
- Transaction logs clean

---

## Test 8: Unique Constraints

### Objective
Verify unique constraints are enforced.

### Test Steps
1. Create user with unique field
2. Try to create duplicate
3. Verify error
4. Check no duplicate created

### Test Commands
```bash
# Register first user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "uniquetest",
    "email": "unique@example.com",
    "password": "UniquePass123!"
  }'

# Try to register duplicate username
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "uniquetest",
    "email": "different@example.com",
    "password": "UniquePass123!"
  }'

# Verify only 1 record
sqlite3 auth-service/database/auth.db \
  "SELECT COUNT(*) FROM users WHERE username='uniquetest';"

# Expected: 1
```

### Expected Response
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Username already exists"
}
```

### Pass Criteria
- Duplicate rejected with 400 error
- Only one record created
- Error message is clear
- Database constraint enforced

---

## Test 9: Timestamp Tracking

### Objective
Verify timestamps are recorded correctly.

### Test Steps
1. Create user
2. Check created_at timestamp
3. Login and check last_login
4. Verify timestamp format

### Test Commands
```bash
# Register user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "timetest",
    "email": "time@example.com",
    "password": "TimePass123!"
  }'

# Check timestamps
sqlite3 auth-service/database/auth.db \
  "SELECT username, created_at, last_login FROM users WHERE username='timetest';"

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "timetest",
    "password": "TimePass123!"
  }'

# Check last_login updated
sqlite3 auth-service/database/auth.db \
  "SELECT username, created_at, last_login FROM users WHERE username='timetest';"
```

### Expected Results
```
timetest|2025-12-05T10:30:00Z|2025-12-05T10:30:05Z
```

### Pass Criteria
- created_at is set on creation
- last_login is set on login
- Timestamps are ISO format
- Timestamps are accurate

---

## Test 10: Data Relationships

### Objective
Verify relationships between tables work correctly.

### Test Steps
1. Create user
2. Create game record linked to user
3. Query with JOIN
4. Verify foreign key relationship

### Test Commands
```bash
# Get user ID
USER_ID=$(sqlite3 game-service/database/game.db \
  "SELECT id FROM users WHERE username='dbtest' LIMIT 1;")

# Check game records for user
sqlite3 game-service/database/game.db \
  "SELECT g.id, g.score, u.username FROM games g 
   JOIN users u ON g.player_id = u.id 
   WHERE u.id=$USER_ID;"

# Count relationships
sqlite3 game-service/database/game.db \
  "SELECT COUNT(*) FROM games WHERE player_id=$USER_ID;"
```

### Pass Criteria
- JOINs work correctly
- Foreign key references valid
- No orphaned records
- Relationship data accurate

---

## Test 11: Database Backup

### Objective
Verify database can be backed up.

### Test Steps
1. Create backup of database
2. Verify backup is valid
3. Check backup contains all data
4. Test restore from backup

### Test Commands
```bash
# Create backup
sqlite3 auth-service/database/auth.db \
  ".backup auth-backup.db"

# Verify backup
file auth-backup.db
sqlite3 auth-backup.db ".tables"

# Compare data
sqlite3 auth-service/database/auth.db "SELECT COUNT(*) FROM users;" > original.txt
sqlite3 auth-backup.db "SELECT COUNT(*) FROM users;" > backup.txt
diff original.txt backup.txt

# Cleanup
rm auth-backup.db original.txt backup.txt
```

### Pass Criteria
- Backup file created
- Backup is valid SQLite3
- Data matches original
- Tables present in backup

---

## Test 12: Performance Verification

### Objective
Verify database queries have acceptable performance.

### Test Steps
1. Create index on frequently queried columns
2. Measure query time
3. Verify indexes used
4. Check query plans

### Test Commands
```bash
# Check existing indexes
sqlite3 auth-service/database/auth.db ".indexes users"

# Profile a query
sqlite3 auth-service/database/auth.db \
  "EXPLAIN QUERY PLAN SELECT * FROM users WHERE username='dbtest';"

# Create index if missing
sqlite3 auth-service/database/auth.db \
  "CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);"

# Verify index created
sqlite3 auth-service/database/auth.db ".indexes users"
```

### Pass Criteria
- Indexes exist on frequently queried columns
- Query plans show index usage
- Query performance acceptable
- No full table scans

---

## Summary

**Database:** SQLite ✅  
**Services:** 4 separate databases  
**Total Tests:** 12  
**Pass Criteria:** All 12 must pass

### Quick Test Command
```bash
# Verify all databases
for db in auth-service/database/*.db game-service/database/*.db \
          tournament-service/database/*.db user-service/database/*.db; do
  echo "Testing $db..."
  sqlite3 "$db" ".tables"
  sqlite3 "$db" "PRAGMA integrity_check;"
done
```

---

*Test Suite Created: December 5, 2025*
