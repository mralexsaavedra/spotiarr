---
name: spotiarr-docker
description: "Trigger: Docker, docker-compose, deploy, container, volume, DOWNLOADS_DIR, PUID, PGID, update, self-hosted. spotiarr Docker setup: services, volumes, env vars, update flow."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Load when working with docker-compose, deployments, volumes, or self-hosted configuration.

## Hard Rules

- `./config/` is a Docker volume mount (`./config:/spotiarr/config`) — the SQLite database lives there. It is gitignored. Never commit it.
- `compose.override.yml` is gitignored — use it for local port/env overrides, never commit it.
- `spotiarr` service waits for `redis` healthcheck before starting (`depends_on: condition: service_healthy`).
- Traefik is optional — strip it from `compose.override.yml` for direct port-3000 access.

## Services

| Service    | Image                                 | Ports              | Purpose                  |
| ---------- | ------------------------------------- | ------------------ | ------------------------ |
| `spotiarr` | `mralexandersaavedra/spotiarr:latest` | `3000:3000`        | App (frontend + backend) |
| `redis`    | `redis:7-alpine`                      | `6379:6379`        | BullMQ job queues        |
| `traefik`  | `traefik:v3.2`                        | `80:80`, `443:443` | Reverse proxy (optional) |

## Volumes

| Mount                | Container path     | Contents                          |
| -------------------- | ------------------ | --------------------------------- |
| `./config/`          | `/spotiarr/config` | SQLite DB + app data (persistent) |
| `${DOWNLOADS_DIR}`   | `/downloads`       | Downloaded music files            |
| `redis-data` (named) | `/data`            | Redis persistence                 |

## Required Environment Variables

```bash
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/callback

DOWNLOADS_DIR=/absolute/host/path/to/downloads   # must be absolute
```

## Optional Environment Variables

```bash
PUID=1000          # file ownership UID (default: 1000)
PGID=1000          # file ownership GID (default: 1000)
REDIS_HOST=redis   # default: "redis" (service name)
REDIS_PORT=6379    # default: 6379
```

## Instance Auth (Optional)

```bash
SPOTIARR_TOKEN=                   # >=16 chars; omit to disable the gate
SPOTIARR_SESSION_TTL_HOURS=168    # default: 168 (7 days)
SPOTIARR_UNLOCK_RATELIMIT=5       # default: 5 per IP per minute
SPOTIARR_TRUST_PROXY=1            # hop count (e.g. 1) or Express preset; REQUIRED behind Traefik/any
                                  # reverse proxy — otherwise req.ip is the proxy IP and rate-limiting
                                  # locks out everyone together
SPOTIARR_CORS_ORIGIN=             # comma-separated CORS origin allowlist; omit for same-origin (default).
                                  # Wildcard "*" is rejected. Only needed for a separate-origin client.
```

## Offline Audio Caching (Slice 2 — HTTPS required)

The Service Worker audio cache (`spotiarr-audio`, CacheFirst strategy) requires a **secure context** (HTTPS or localhost). On plain HTTP the feature is automatically inert — online playback is unaffected, but tracks are not cached for offline use.

To enable offline caching in production, terminate TLS at the reverse proxy before the container:

- **Traefik** (bundled in `compose.yml`): configure the `websecure` entrypoint + a `CertificateResolver` (Let's Encrypt or manual cert). Set `SPOTIFY_REDIRECT_URI` to your `https://` domain.
- Any other reverse proxy (Nginx, Caddy, etc.) works the same way — just ensure the browser sees HTTPS.

Plain HTTP self-hosted installs continue to work online; they simply receive no offline benefit.

## Update Flow

```bash
docker compose pull
docker compose up -d
```

## References

- Compose file: `compose.yml`
- Env template: `.env.example`
- Entrypoint: `docker-entrypoint.sh`
- Data volume: `./config/` (gitignored)
