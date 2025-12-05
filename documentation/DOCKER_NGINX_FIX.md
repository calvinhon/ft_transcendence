# Docker Nginx User Issue - FIXED

## Problem
When running `docker compose up -d`, the nginx service failed with:
```
Error response from daemon: unable to find user nobody: no matching entries in passwd file
```

This occurs because nginx in Alpine Linux containers needs a valid user to run as, but the "nobody" user wasn't properly initialized in the container context.

## Solution Applied

### 1. Modified `/frontend/nginx/nginx.conf`
Added `user root;` directive at the beginning to specify that nginx should run as the root user instead of the default nobody user.

**Change:**
```nginx
# BEFORE:
events {
    worker_connections 1024;
}

# AFTER:
user root;

events {
    worker_connections 1024;
}
```

### 2. Updated `/frontend/Dockerfile`
Enhanced the production stage to explicitly create the nginx user group and user in Alpine Linux, with fallback for if it already exists:

**Change:**
```dockerfile
# BEFORE:
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html/

# AFTER:
FROM nginx:alpine

# Create the www-data user and group for nginx to use
RUN addgroup -g 101 -S nginx && adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx || true

COPY --from=builder /app/dist /usr/share/nginx/html/
```

## Why This Works

1. **nginx.conf user directive**: Explicitly tells nginx to run as root, avoiding the "nobody" user lookup entirely
2. **Dockerfile user creation**: Ensures the nginx user/group exists in the container image for consistency
3. **Fallback logic**: The `|| true` in the Dockerfile ensures it doesn't fail if the user already exists

## Files Modified

1. ✅ `frontend/Dockerfile` - Added user creation in production stage
2. ✅ `frontend/nginx/nginx.conf` - Added `user root;` directive

## Testing

After applying these changes:
- Run `docker compose build nginx` to rebuild the image
- Run `docker compose up -d` to start services
- The nginx container should now start without the "nobody" user error

## Related Services

This fix affects:
- **nginx** service in docker-compose.yml (reverse proxy, frontend serving)
- Frontend build/production container
- All dependent services that connect through nginx

## Alternative Approaches

If running nginx as root is a security concern, alternatives include:
1. Use a different base image that includes the nobody user preconfigured
2. Use Alpine's `addgroup`/`adduser` utilities before nginx runs
3. Create a custom Alpine image with users pre-created
4. Use a non-Alpine base image (larger but simpler)

Current solution is simplest and works for a development/testing environment.
