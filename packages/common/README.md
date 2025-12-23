# @ft-transcendence/common

Shared utilities package for FT Transcendence microservices.

## Overview

This package provides consolidated utilities that are shared across all microservices in the FT Transcendence project. It eliminates code duplication and ensures consistency across services.

## Installation

The package is automatically installed as a tarball dependency in each service's `package.json`:

```json
{
  "dependencies": {
    "@ft-transcendence/common": "^1.0.0"
  }
}
```

## API Reference

### Response Utilities

#### `sendSuccess<T>(reply, data?, message?, statusCode?)`

Sends a standardized success response.

```typescript
import { sendSuccess } from '@ft-transcendence/common';

sendSuccess(reply, { id: 1, name: 'Tournament' }, 'Tournament created', 201);
```

#### `sendError(reply, error, statusCode?, additionalData?)`

Sends a standardized error response.

```typescript
import { sendError } from '@ft-transcendence/common';

sendError(reply, 'Invalid tournament data', 400, { field: 'name' });
```

#### `validateRequiredFields(body, fields)`

Validates that required fields are present and non-empty.

```typescript
import { validateRequiredFields } from '@ft-transcendence/common';

const error = validateRequiredFields(request.body, ['name', 'maxParticipants']);
if (error) {
  return sendError(reply, error, 400);
}
```

#### `validateEmail(email)`

Validates email format.

```typescript
import { validateEmail } from '@ft-transcendence/common';

if (!validateEmail(email)) {
  return sendError(reply, 'Invalid email format', 400);
}
```

### Health Check Utilities

#### `sendHealthCheck(reply, serviceName, options?)`

Sends a standardized health check response.

```typescript
import { sendHealthCheck } from '@ft-transcendence/common';

fastify.get('/health', async (request, reply) => {
  sendHealthCheck(reply, 'my-service', {
    version: '1.0.0',
    modules: ['database', 'cache']
  });
});
```

### Database Utilities

#### `createDatabaseConfig(serviceName, dbFileName, options?)`

Creates a standardized database configuration.

```typescript
import { createDatabaseConfig, createDatabaseConnection } from '@ft-transcendence/common';

const dbConfig = createDatabaseConfig('my-service', 'data.db');
const dbConnection = createDatabaseConnection(dbConfig);
```

#### `promisifyDbRun(db, sql, params?)`

Promise wrapper for SQLite run operations.

```typescript
import { promisifyDbRun } from '@ft-transcendence/common';

const result = await promisifyDbRun(db, 'INSERT INTO users (name) VALUES (?)', ['John']);
```

#### `promisifyDbGet<T>(db, sql, params?)`

Promise wrapper for SQLite get operations.

```typescript
import { promisifyDbGet } from '@ft-transcendence/common';

const user = await promisifyDbGet(db, 'SELECT * FROM users WHERE id = ?', [1]);
```

#### `promisifyDbAll<T>(db, sql, params?)`

Promise wrapper for SQLite all operations.

```typescript
import { promisifyDbAll } from '@ft-transcendence/common';

const users = await promisifyDbAll(db, 'SELECT * FROM users');
```

### Server Bootstrap

#### `createServer(config, routes, options?)`

Creates a standardized Fastify server instance.

```typescript
import { createServer, createServiceConfig } from '@ft-transcendence/common';

const config = createServiceConfig('my-service', 3000);

const server = await createServer(config, async (fastify) => {
  // Register routes here
  fastify.get('/', async () => ({ message: 'Hello World' }));
});

await server.start();
```

#### `createServiceConfig(serviceName, defaultPort?)`

Creates a standardized service configuration.

```typescript
import { createServiceConfig } from '@ft-transcendence/common';

const config = createServiceConfig('my-service', 3000);
// Uses PORT and HOST environment variables if available
```

### Logging

#### `createLogger(serviceName)`

Creates a standardized logger instance.

```typescript
import { createLogger } from '@ft-transcendence/common';

const logger = createLogger('my-service');
logger.info('Service started');
logger.error('Database connection failed', error);
```

### Middleware

#### `applyCommonMiddleware(fastify)`

Applies common middleware to Fastify instance.

```typescript
import { applyCommonMiddleware } from '@ft-transcendence/common';

await applyCommonMiddleware(fastify);
```

## Migration Guide

### From Individual Service Utilities

When migrating from individual service utilities to shared utilities:

1. **Remove local utility files** (e.g., `src/shared/responses.ts`)
2. **Update imports** to use `@ft-transcendence/common`
3. **Update function calls** if signatures have changed
4. **Test thoroughly** to ensure compatibility

### Example Migration

**Before:**
```typescript
// src/shared/responses.ts (local file)
export function sendSuccess(reply, data) {
  reply.send({ success: true, data });
}

// In route handler
import { sendSuccess } from '../shared/responses';
sendSuccess(reply, data);
```

**After:**
```typescript
// In route handler
import { sendSuccess } from '@ft-transcendence/common';
sendSuccess(reply, data);
```

## Testing

Run tests with:
```bash
npm test
```

The package includes comprehensive unit tests for all utilities.

## Contributing

When adding new utilities:

1. Add the utility to the appropriate module in `src/`
2. Export it from `src/index.ts`
3. Add comprehensive tests in `tests/`
4. Update this documentation
5. Ensure all existing tests still pass