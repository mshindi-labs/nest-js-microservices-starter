# NestJS Microservices Starter

Production-oriented NestJS monorepo with a microservices architecture. Two independently deployable services communicate over TCP: an HTTP API gateway handles all client-facing concerns, and a dedicated auth/users service owns business logic and database access.

## What This Starter Includes

- **Two services**: `api-gateway` (HTTP, port 9011) and `auth-service` (TCP microservice, port 9012)
- **NestJS v11** monorepo with shared libraries (`@app/common`, `@app/prisma`, `@app/contracts`)
- **Prisma v7** client generated to `generated/prisma`, accessed only from `auth-service`
- **PostgreSQL** support with pluggable Prisma adapter (`pg` or `neon`)
- **Authentication stack**:
  - JWT access + refresh token flow (tokens are self-contained — no per-request TCP hop)
  - Email/password + MSISDN/OTP support
  - Google OAuth (`/v1/auth/google`) handled in gateway, account creation delegated to auth-service
- **Global security layer** (all enforced in `api-gateway`):
  - API key guard (`x-api-key` header)
  - JWT guard with local validation (no round-trip to auth-service)
  - Role-based guard (`@Roles(...)`)
  - `RpcExceptionFilter` — unwraps `RpcException` from auth-service into proper HTTP responses
  - Throttling presets (`short`, `medium`, `long`)
- **Swagger** docs at `/api-docs` (served by gateway)
- `MicroservicesClientModule` is `@Global()` — `AUTH_SERVICE` `ClientProxy` is available across all gateway modules without per-module imports
- Shared pagination service and DTO patterns via `@app/common`

## Tech Stack

| Concern         | Technology                          |
| --------------- | ----------------------------------- |
| Framework       | NestJS 11                           |
| Transport       | TCP (`@nestjs/microservices`)       |
| Database        | PostgreSQL + Prisma 7               |
| Auth            | Passport (`jwt`, `google-oauth20`)  |
| Validation      | class-validator / class-transformer |
| Testing         | Jest + Supertest                    |
| Package manager | pnpm                                |

## Project Structure

```text
nestjs-starter/
├── apps/
│   ├── api-gateway/          # HTTP server (port 9011)
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── auth/         # Gateway auth controller + Google strategy
│   │       ├── users/        # Gateway users controller
│   │       └── common/       # Gateway-specific guards, filters, strategies
│   └── auth-service/         # TCP microservice (port 9012)
│       └── src/
│           ├── main.ts
│           ├── app.module.ts
│           ├── auth/         # @MessagePattern handlers + auth business logic
│           └── users/        # @MessagePattern handlers + users business logic
├── libs/
│   ├── common/               # @app/common — pipes, filters, decorators, utils
│   ├── prisma/               # @app/prisma — PrismaModule, PrismaService
│   └── contracts/            # @app/contracts — patterns, payloads, JwtPayload
├── prisma/                   # Shared Prisma schema
├── generated/prisma/         # Generated Prisma client (git-ignored)
└── test/                     # E2E tests
```

## Request Flow

```
Client → HTTP (port 9011) → api-gateway → TCP (port 9012) → auth-service → PostgreSQL
```

JWT validation happens **locally in the gateway** — tokens embed `name`, `roleId`, `roleName`, and `organizationId`, so no TCP hop is needed per authenticated request.

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in all required values (see [Environment Variables](#environment-variables) below).

### 3. Generate Prisma client

```bash
pnpm prisma generate
```

### 4. Apply migrations

```bash
pnpm prisma migrate dev
```

### 5. Start both services (two terminals)

**Terminal 1 — auth-service (TCP :9012):**

```bash
pnpm start:auth
```

**Terminal 2 — api-gateway (HTTP :9011):**

```bash
pnpm start:gateway
```

### 6. Verify

- `GET http://localhost:9011/` returns `{ "message": "OK!" }`
- `GET http://localhost:9011/health` returns runtime health info
- Swagger UI: `http://localhost:9011/api-docs`

## Scripts

### Development

| Command                   | Description                                     |
| ------------------------- | ----------------------------------------------- |
| `pnpm start:auth`         | Start auth-service TCP microservice (port 9012) |
| `pnpm start:gateway`      | Start api-gateway HTTP server (port 9011)       |
| `pnpm build:auth`         | Compile auth-service                            |
| `pnpm build:gateway`      | Compile api-gateway                             |
| `pnpm start:prod:auth`    | Run compiled auth-service                       |
| `pnpm start:prod:gateway` | Run compiled api-gateway                        |

### Testing

| Command           | Description                                           |
| ----------------- | ----------------------------------------------------- |
| `pnpm test`       | Unit tests (`apps/**/*.spec.ts`, `libs/**/*.spec.ts`) |
| `pnpm test:watch` | Watch mode                                            |
| `pnpm test:cov`   | Coverage report                                       |
| `pnpm test:e2e`   | E2E tests (`test/**/*.e2e-spec.ts`)                   |

### Code Quality

| Command       | Description          |
| ------------- | -------------------- |
| `pnpm lint`   | ESLint with auto-fix |
| `pnpm format` | Prettier format      |

### Database

| Command                   | Description                |
| ------------------------- | -------------------------- |
| `pnpm prisma generate`    | Regenerate Prisma client   |
| `pnpm prisma migrate dev` | Create and apply migration |
| `pnpm prisma studio`      | Database GUI               |

## Environment Variables

```bash
# Service ports
PORT=9011                          # api-gateway HTTP port
AUTH_SERVICE_HOST=localhost        # auth-service host
AUTH_SERVICE_PORT=9012             # auth-service TCP port

# Database (used only by auth-service)
DATABASE_URL=postgresql://...
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=secret
DB_DATABASE=mydb
DB_ADAPTER=pg                      # pg | neon

# Security
X_API_KEY=your-api-key
JWT_SECRET=your-jwt-secret

# Google OAuth (gateway-level)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:9011/v1/auth/google/callback
FRONTEND_AUTH_CALLBACK_URL=http://localhost:3000/auth/callback
```

## API Surface

Versioning is URI-based with default version `v1`. All routes are served through `api-gateway`.

### Open Utility Endpoints

| Method | Path      | Guard | Description            |
| ------ | --------- | ----- | ---------------------- |
| `GET`  | `/`       | None  | Root status            |
| `GET`  | `/health` | None  | Runtime health details |

### Auth Endpoints (`/v1/auth`)

| Method  | Path                      | Guard       | TCP Pattern                                    |
| ------- | ------------------------- | ----------- | ---------------------------------------------- |
| `POST`  | `/signup`                 | `@Public()` | `auth.signup`                                  |
| `POST`  | `/login`                  | `@Public()` | `auth.login`                                   |
| `POST`  | `/refresh`                | `@Public()` | `auth.refresh`                                 |
| `GET`   | `/me`                     | JWT         | `auth.me`                                      |
| `PATCH` | `/password/update`        | JWT         | `auth.password.update`                         |
| `POST`  | `/password/reset/request` | `@Public()` | `auth.password.reset.request`                  |
| `PATCH` | `/password/reset`         | `@Public()` | `auth.password.reset`                          |
| `POST`  | `/otp/request`            | `@Public()` | `auth.otp.request`                             |
| `POST`  | `/otp/resend`             | `@Public()` | `auth.otp.resend`                              |
| `POST`  | `/otp/verify`             | `@Public()` | `auth.otp.verify`                              |
| `GET`   | `/google`                 | `@Open()`   | Google OAuth initiation                        |
| `GET`   | `/google/callback`        | `@Open()`   | Google OAuth callback → `auth.google.callback` |

### Users Endpoints (`/v1/users`)

| Method   | Path                            | Guard | TCP Pattern           |
| -------- | ------------------------------- | ----- | --------------------- |
| `GET`    | `/`                             | JWT   | `users.findAll`       |
| `GET`    | `/user/:user_id`                | JWT   | `users.findById`      |
| `GET`    | `/user/:user_id/profile-status` | JWT   | `users.profileStatus` |
| `POST`   | `/`                             | JWT   | `users.create`        |
| `PATCH`  | `/user/:user_id`                | JWT   | `users.update`        |
| `DELETE` | `/user/:user_id`                | JWT   | `users.delete`        |

## Authentication and Access Model

Global guards applied in this order on every request through `api-gateway`:

1. `ApiKeyGuard` — checks `x-api-key` header; passes if Bearer token already present
2. `JwtAuthGuard` — skips `@Open()` and `@Public()` routes; validates JWT locally
3. `RolesGuard` — checks `@Roles(...)` metadata against `request.user.roleName`

Decorator summary:

- `@Open()` — skips all guards (used for OAuth endpoints)
- `@Public()` — skips JWT validation but not API key check

## Swagger

- UI: `http://localhost:9011/api-docs`
- JSON: `http://localhost:9011/api-docs/json`

Swagger is configured with Bearer auth definition named `access-token`.

## Documentation Index

Additional docs live in `docs/`:

- [`docs/getting-started.md`](docs/getting-started.md) — install, env setup, two-service startup
- [`docs/project-architecture.md`](docs/project-architecture.md) — monorepo layout, request flow, module design
- [`docs/api-reference.md`](docs/api-reference.md) — full route catalog with TCP patterns
- [`docs/auth-and-security.md`](docs/auth-and-security.md) — guards, JWT model, Google OAuth, RpcExceptionFilter
- [`docs/database-and-prisma.md`](docs/database-and-prisma.md) — Prisma setup, shared-DB pattern, migration workflow
- [`docs/development-workflow.md`](docs/development-workflow.md) — adding endpoints, new services, testing patterns

## License

MIT
