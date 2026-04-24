# Getting Started

This guide takes you from a fresh clone to two running services in the fewest steps.

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL (local instance or hosted, e.g., Neon)

## Installation

```bash
pnpm install
```

## Environment Setup

```bash
cp .env.example .env
```

Open `.env` and fill in every required variable. The table below explains each one:

### Service Networking

| Variable            | Description           | Default     |
| ------------------- | --------------------- | ----------- |
| `PORT`              | api-gateway HTTP port | `9011`      |
| `AUTH_SERVICE_HOST` | auth-service TCP host | `localhost` |
| `AUTH_SERVICE_PORT` | auth-service TCP port | `9012`      |

Both services must agree on `AUTH_SERVICE_HOST` and `AUTH_SERVICE_PORT`. In Docker or Kubernetes environments, replace `localhost` with the service name or internal DNS entry.

### Database (used only by auth-service)

| Variable       | Description                                              |
| -------------- | -------------------------------------------------------- |
| `DATABASE_URL` | Full PostgreSQL connection string                        |
| `DB_HOST`      | Database host                                            |
| `DB_PORT`      | Database port (typically `5432`)                         |
| `DB_USER`      | Database username                                        |
| `DB_PASSWORD`  | Database password                                        |
| `DB_DATABASE`  | Database name                                            |
| `DB_ADAPTER`   | `pg` for standard PostgreSQL, `neon` for Neon serverless |

### Security

| Variable     | Description                                               |
| ------------ | --------------------------------------------------------- |
| `X_API_KEY`  | API key checked by `ApiKeyGuard` on every gateway request |
| `JWT_SECRET` | Secret used to sign and verify JWT tokens                 |

### Google OAuth (gateway-level)

| Variable                     | Description                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `GOOGLE_CLIENT_ID`           | Google OAuth 2.0 client ID                                                                                            |
| `GOOGLE_CLIENT_SECRET`       | Google OAuth 2.0 client secret                                                                                        |
| `GOOGLE_CALLBACK_URL`        | Must match an authorized redirect URI in Google Cloud Console (e.g., `http://localhost:9011/v1/auth/google/callback`) |
| `FRONTEND_AUTH_CALLBACK_URL` | Frontend URL to redirect to after OAuth completes (e.g., `http://localhost:3000/auth/callback`)                       |

## Prisma Setup

Generate the Prisma client to `generated/prisma/`:

```bash
pnpm prisma generate
```

Create and apply all pending migrations:

```bash
pnpm prisma migrate dev
```

These commands only need to be run once on a fresh checkout, and again whenever `prisma/schema.prisma` changes.

## Starting Both Services

The two services are independent processes. Open two terminal windows:

**Terminal 1 — auth-service (TCP :9012):**

Start the auth-service first. The gateway will attempt to connect to it on startup.

```bash
pnpm start:auth
```

Expected output:

```
[auth-service] Microservice is listening on port 9012
```

**Terminal 2 — api-gateway (HTTP :9011):**

```bash
pnpm start:gateway
```

Expected output:

```
[api-gateway] HTTP server listening on port 9011
[api-gateway] Swagger docs available at /api-docs
```

Both services use watch mode in development and will restart automatically when source files change.

## Verify Both Services Are Running

### Root status

```bash
curl http://localhost:9011/
# {"message":"OK!"}
```

### Health check

```bash
curl http://localhost:9011/health
# {"status":"ok","uptime":...,"memory":...}
```

### Swagger UI

Open `http://localhost:9011/api-docs` in a browser. You should see the full API documentation.

## First Authenticated Request

Most versioned endpoints require either a valid JWT or a valid API key.

**Using API key:**

```bash
curl -H "x-api-key: $X_API_KEY" http://localhost:9011/v1/users
```

**Using JWT (after login):**

```bash
TOKEN=$(curl -s -X POST http://localhost:9011/v1/auth/login \
  -H "x-api-key: $X_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret"}' \
  | jq -r '.accessToken')

curl -H "Authorization: Bearer $TOKEN" http://localhost:9011/v1/auth/me
```

Routes marked `@Open()` (like the Google OAuth initiation) require neither header.

## Production Build

Compile each service independently:

```bash
pnpm build:auth
pnpm build:gateway
```

Run the compiled output:

```bash
pnpm start:prod:auth      # start auth-service from dist
pnpm start:prod:gateway   # start api-gateway from dist
```

## Troubleshooting

### auth-service fails to connect to PostgreSQL

- Verify `DATABASE_URL`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_DATABASE`
- Confirm the PostgreSQL server is running and reachable from the auth-service host
- Confirm `DB_ADAPTER` is `pg` or `neon` (exactly, lowercase)

### Gateway cannot reach auth-service

- Confirm auth-service started successfully and is listening on `AUTH_SERVICE_PORT`
- Confirm `AUTH_SERVICE_HOST` and `AUTH_SERVICE_PORT` in `.env` match where auth-service is actually listening
- In Docker: use the container/service name for `AUTH_SERVICE_HOST`, not `localhost`

### Environment validation fails on boot

- Both services validate env vars on startup via `ConfigModule`
- Read the error output carefully — it will name the missing or invalid variable

### 401 Unauthorized on a route

- Confirm the route is not `@Open()` (those need no credentials)
- For `@Public()` routes: provide `x-api-key` header or a Bearer token
- For protected routes: provide `Authorization: Bearer <valid-jwt>`
- JWT tokens expire after 7 days; obtain a new one via `/v1/auth/refresh`

### RpcException errors (502-style responses from gateway)

- These originate in auth-service and are unwrapped by `RpcExceptionFilter` in the gateway
- Check auth-service logs for the underlying error message

### Prisma client not found

- Run `pnpm prisma generate` to generate the client to `generated/prisma/`
- If using a clean Docker image, ensure the generate step runs as part of the container build
