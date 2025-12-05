# Selected Modules Implementation Plan

**Date:** December 5, 2025

---

## Objective

Implement the following modules to maximize subject compliance and points, with minimal modification to existing code and core Pong/frontend features.

---

## Selected Modules & Tasks

| Module/Task                                    | Status/Action         | Minimal Modification Strategy |
|------------------------------------------------|----------------------|------------------------------|
| Backend framework, DB, blockchain, microservices| Already complete     | No action needed             |
| Remote authentication (OAuth, SSO, etc.)        | To be completed      | Add Fastify plugin or middleware for OAuth; do not alter core auth logic, just extend endpoints |
| WAF/ModSecurity + Vault                        | To be completed      | Add Docker/nginx configs for WAF; use Vault for secrets in Docker Compose; no code changes needed |
| Log management (ELK/EFK stack)                 | To be completed      | Add ELK/EFK stack as separate Docker services; configure log output in services, no core code change |
| Monitoring system (Prometheus/Grafana)         | To be completed      | Add Prometheus/Grafana as Docker services; expose metrics endpoints, no core code change |
| GDPR compliance                                | To be completed      | Add endpoints for anonymization/deletion; minimal UI, mostly backend logic |
| 2FA + JWT                                      | Complete TOTP/2FA    | Add TOTP (e.g., speakeasy) to auth-service; add endpoints, minimal UI change |
| SSR integration                                | To be completed      | Add Vite SSR or similar, keep SPA as fallback; do not alter main UI logic |
| Pong via CLI                                   | To be completed      | Add simple CLI client (Node.js script) that uses existing API; no change to Pong logic |
| User mgmt, remote, multiplayer, device/browser | Complete all features| Add/fix endpoints, improve WebSocket handling, add mobile CSS if needed |

---

## Implementation Steps

1. Add remote authentication (OAuth/SSO) to auth-service.
2. Add WAF/ModSecurity config to nginx/Docker; integrate Vault for secrets.
3. Add ELK/EFK stack to Docker Compose; configure log output in services.
4. Add Prometheus/Grafana to Docker Compose; expose metrics endpoints.
5. Implement GDPR endpoints (anonymization, deletion) in user-service.
6. Add TOTP/2FA to auth-service; update endpoints and minimal UI.
7. Integrate SSR (Vite SSR or similar) as an option.
8. Create a CLI client for Pong API (Node.js script, no game logic change).
9. Complete/fix user management, remote play, multiplayer, device/browser support (backend and config only).

---

*This plan is designed to maximize points and compliance with minimal risk to existing core features.*
