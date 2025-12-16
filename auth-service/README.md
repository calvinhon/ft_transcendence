# Auth Service - User Authentication Microservice

A modular, production-ready authentication microservice built with Node.js, TypeScript, and Fastify framework. Provides comprehensive user management, JWT authentication, and password reset functionality.

## 🏗️ Architecture Overview

The auth-service follows a clean, modular architecture with clear separation of concerns:

```
auth-service/
├── server.ts              # Server setup & lifecycle management
├── routes/
│   ├── auth.ts           # Route registration hub
│   └── handlers/         # Individual endpoint handlers
│       ├── register.ts
│       ├── login.ts
│       ├── verify.ts
│       ├── profile.ts
│       ├── forgotPassword.ts
│       └── resetPassword.ts
├── services/
│   └── authService.ts    # Business logic layer
├── types/
│   └── index.ts          # TypeScript interfaces
└── utils/
    ├── config.ts         # Configuration management
    ├── database.ts       # Database abstractions
    └── responses.ts      # HTTP response utilities
```

## 📁 File Structure & Responsibilities

### **Server Layer (`server.ts`)**
- Fastify server initialization
- Plugin registration (CORS, JWT)
- Route mounting
- Health check endpoint
- Server lifecycle management

### **Routes Layer (`routes/`)**
- **`auth.ts`**: Central route registry - maps URLs to handlers
- **`handlers/`**: Individual request handlers with validation & error handling

### **Service Layer (`services/authService.ts`)**
- Core business logic for authentication
- User registration, login, profile management
- JWT token operations
- Password reset functionality
- Database interactions via utility layer

### **Utilities Layer (`utils/`)**
- **`config.ts`**: Environment-based configuration
- **`database.ts`**: SQLite database connection & query abstractions
- **`responses.ts`**: Standardized HTTP response formatting & validation

### **Types Layer (`types/index.ts`)**
- TypeScript interfaces for type safety
- API request/response contracts
- Database model definitions

## 🔄 Request Flow Architecture

```
HTTP Request → Route Handler → Validation → AuthService → Database → Response
     ↓              ↓             ↓          ↓            ↓         ↓
  Fastify      Input Sanitization  Business Logic  SQL Queries  JSON     Client
```

## 🚀 API Endpoints

### **Authentication Endpoints**

#### `POST /register`
Register a new user account.
```typescript
Request: { username: string, email: string, password: string }
Response: { success: true, data: { userId: number, username: string }, message: string }
```

#### `POST /login`
Authenticate user and return JWT token.
```typescript
Request: { username: string, password: string }
Response: { success: true, data: { user: User, token: string }, message: string }
```

#### `POST /verify`
Verify JWT token validity.
```typescript
Request: { Authorization: "Bearer <token>" }
Response: { success: true, data: { valid: true, user: JWTPayload } }
```

#### `GET /profile/:userId`
Get user profile information.
```typescript
Response: { success: true, data: User }
```

### **Password Management**

#### `POST /forgot-password`
Initiate password reset process.
```typescript
Request: { email: string }
Response: { success: true, message: string }
```

#### `POST /reset-password`
Reset password using reset token.
```typescript
Request: { token: string, newPassword: string }
Response: { success: true, data: { username: string, email: string }, message: string }
```

### **Health Check**

#### `GET /health`
Service health status.
```typescript
Response: {
  status: "healthy",
  service: "auth-service",
  timestamp: string,
  modules: string[]
}
```

## 🛠️ Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Fastify (high-performance web framework)
- **Language**: TypeScript (type safety)
- **Database**: SQLite3 (file-based database)
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **Container**: Docker

## 📦 Dependencies

### **Production Dependencies**
- `fastify`: Web framework
- `@fastify/cors`: CORS handling
- `@fastify/jwt`: JWT token management
- `bcrypt`: Password hashing
- `sqlite3`: Database driver
- `jsonwebtoken`: JWT utilities

### **Development Dependencies**
- `typescript`: TypeScript compiler
- `@types/*`: Type definitions
- `ts-node-dev`: Development server

## ⚙️ Configuration

Environment variables (with defaults):

```bash
PORT=3000                    # Server port
HOST=0.0.0.0                # Server host
CORS_ORIGIN=true            # CORS origin policy
JWT_SECRET=supersecretkey   # JWT signing secret
JWT_EXPIRES_IN=24h          # JWT expiration time
```

## 🏃‍♂️ Development Setup

### **Prerequisites**
- Node.js 18+
- npm or yarn

### **Installation**
```bash
cd auth-service
npm install
```

### **Development**
```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### **Testing**
```bash
# Run the test script
./test.sh

# Or test specific endpoints
curl -X POST http://localhost:3000/health
```

## 🐳 Docker Deployment

### **Build & Run**
```bash
# Build container
docker build -t auth-service .

# Run container
docker run -p 3001:3000 auth-service
```

### **Docker Compose**
The service is designed to work with the main `docker-compose.yml` in the project root.

## 🔒 Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Comprehensive request validation
- **SQL Injection Protection**: Parameterized queries
- **Error Handling**: Secure error responses (no data leakage)
- **Password Reset Security**: Time-limited tokens, single-use

## 📊 Database Schema

### **Users Table**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);
```

### **Password Reset Tokens Table**
```sql
CREATE TABLE password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  used BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users (id)
);
```

## 🧪 Testing Strategy

- **Unit Tests**: Individual functions and utilities
- **Integration Tests**: API endpoints with database
- **Security Tests**: Authentication and authorization
- **Load Tests**: Performance under concurrent requests

## 📈 Performance Characteristics

- **Fastify Framework**: High-performance HTTP server
- **SQLite Database**: Lightweight, file-based storage
- **JWT Tokens**: Stateless authentication
- **Connection Pooling**: Efficient database connections
- **Caching Ready**: Architecture supports Redis integration

## 🔧 Maintenance & Operations

### **Logging**
- Request/response logging (when enabled)
- Error logging with context
- Database connection status
- Health check monitoring

### **Backup & Recovery**
- SQLite database files can be backed up
- JWT tokens are stateless (no session storage)
- Password reset tokens have expiration

## 🤝 API Integration

### **Frontend Integration**
```javascript
// Login example
const response = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
});

const { data } = await response.json();
// data.token contains JWT for subsequent requests
```

### **Service Integration**
```javascript
// Verify token in other services
const response = await fetch('http://auth-service:3000/verify', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## 📚 Architecture Principles

This service follows **Clean Architecture** principles:

1. **Dependency Inversion**: High-level modules don't depend on low-level modules
2. **Single Responsibility**: Each module has one reason to change
3. **Open/Closed**: Open for extension, closed for modification
4. **Interface Segregation**: Clients depend only on methods they use
5. **Dependency Injection**: Dependencies are injected, not created

## 🚀 Future Enhancements

- **Rate Limiting**: Request throttling
- **OAuth Integration**: Social login support
- **Multi-factor Authentication**: 2FA support
- **Audit Logging**: Comprehensive user action tracking
- **Session Management**: Refresh token rotation
- **Email Service**: SMTP integration for password resets

---

**Service Port**: `3001` (internal), `3000` (external)  
**Health Check**: `GET /health`  
**Documentation**: This README  
**Maintainer**: Development Team</content>
<parameter name="filePath">/home/honguyen/ft_transcendence/auth-service/README.md