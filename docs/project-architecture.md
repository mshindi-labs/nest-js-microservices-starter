# Project Architecture

This project is a NestJS monorepo implementing a microservices architecture. Client HTTP requests are received by `api-gateway`, which validates them and proxies business-logic calls over TCP to `auth-service`. Only `auth-service` touches the database.

## Monorepo Layout

```text
nestjs-starter/
├── apps/
│   ├── api-gateway/                  # HTTP server — port 9011
│   │   └── src/
│   │       ├── main.ts               # Bootstrap: HTTP server, global middleware, Swagger
│   │       ├── app.module.ts         # Root module: Config, Throttler, MicroservicesClientModule
│   │       ├── auth/
│   │       │   ├── auth.controller.ts     # HTTP routes: /v1/auth/**
│   │       │   ├── auth.module.ts
│   │       │   └── strategies/
│   │       │       ├── jwt.strategy.ts    # LOCAL JWT validation — no TCP hop
│   │       │       └── google.strategy.ts # Google OAuth (HTTP-facing)
│   │       ├── users/
│   │       │   ├── users.controller.ts    # HTTP routes: /v1/users/**
│   │       │   └── users.module.ts
│   │       └── common/
│   │           ├── guards/
│   │           │   ├── api-key.guard.ts
│   │           │   ├── jwt-auth.guard.ts
│   │           │   ├── roles.guard.ts
│   │           │   └── google-auth.guard.ts
│   │           ├── filters/
│   │           │   └── rpc-exception.filter.ts
│   │           └── modules/
│   │               └── microservices-client.module.ts  # @Global() AUTH_SERVICE client
│   └── auth-service/                 # TCP microservice — port 9012
│       └── src/
│           ├── main.ts               # Bootstrap: TCP transport, no HTTP
│           ├── app.module.ts         # Root module: Config, PrismaModule
│           ├── auth/
│           │   ├── auth.controller.ts     # @MessagePattern handlers for auth.*
│           │   ├── auth.service.ts        # Business logic
│           │   ├── auth.repository.ts     # Prisma queries
│           │   ├── auth.module.ts
│           │   └── dto/
│           └── users/
│               ├── users.controller.ts    # @MessagePattern handlers for users.*
│               ├── users.service.ts       # Business logic
│               ├── users.repository.ts    # Prisma queries
│               ├── users.module.ts
│               └── dto/
├── libs/
│   ├── common/                       # @app/common
│   │   └── src/
│   │       ├── decorators/           # @User(), @Roles(), @Public(), @Open()
│   │       ├── dto/                  # Shared DTOs (pagination, responses)
│   │       ├── filters/              # Exception filters
│   │       ├── pipes/                # Validation pipes
│   │       └── utils/               # raiseHttpError and other utilities
│   ├── prisma/                       # @app/prisma
│   │   └── src/
│   │       ├── prisma.module.ts      # Global PrismaModule
│   │       └── prisma.service.ts     # Client lifecycle + adapter selection
│   └── contracts/                    # @app/contracts
│       └── src/
│           ├── tokens.ts             # AUTH_SERVICE injection token
│           ├── auth/
│           │   ├── auth.patterns.ts  # AUTH_PATTERNS const object
│           │   └── auth.payloads.ts  # JwtPayload, AuthContext, Signup/LoginPayload, ...
│           └── users/
│               ├── users.patterns.ts # USERS_PATTERNS const object
│               └── users.payloads.ts # FindAllPayload, CreateUserPayload, ...
├── prisma/
│   └── schema.prisma                 # Shared schema (used only by auth-service)
├── generated/
│   └── prisma/                       # Generated client output
└── test/
    └── *.e2e-spec.ts                 # End-to-end tests
```

## Request Flow

```
Client
  │
  │  HTTP request (port 9011)
  ▼
api-gateway
  │  1. ApiKeyGuard          — checks x-api-key header
  │  2. JwtAuthGuard         — validates JWT locally from JWT_SECRET
  │  3. RolesGuard           — checks @Roles() metadata vs request.user.roleName
  │  4. ValidationPipe       — validates request body against DTO
  │
  │  TCP send (port 9012)
  │  authClient.send(PATTERN, payload)
  ▼
auth-service
  │  @MessagePattern(PATTERN) handler
  │  → delegates to service
  │  → service calls repository
  │  → repository runs Prisma query
  ▼
PostgreSQL
```

Key property: **JWT validation is local in the gateway**. The JWT payload embeds `name`, `roleId`, `roleName`, and `organizationId` at sign-in time. Guards read `request.user` (populated by Passport's `jwt` strategy) without contacting auth-service. This eliminates a TCP hop on every authenticated request.

## Contracts Library (`@app/contracts`)

`libs/contracts` is the shared schema between both services. It is the single source of truth for:

- Injection tokens
- Message pattern strings
- Payload interfaces for each TCP call

```typescript
// libs/contracts/src/tokens.ts
export const AUTH_SERVICE = 'AUTH_SERVICE';

// libs/contracts/src/auth/auth.patterns.ts
export const AUTH_PATTERNS = {
  SIGNUP: 'auth.signup',
  LOGIN: 'auth.login',
  REFRESH: 'auth.refresh',
  ME: 'auth.me',
  PASSWORD_UPDATE: 'auth.password.update',
  PASSWORD_RESET_REQUEST: 'auth.password.reset.request',
  PASSWORD_RESET: 'auth.password.reset',
  OTP_REQUEST: 'auth.otp.request',
  OTP_RESEND: 'auth.otp.resend',
  OTP_VERIFY: 'auth.otp.verify',
  GOOGLE_CALLBACK: 'auth.google.callback',
} as const;

// libs/contracts/src/auth/auth.payloads.ts
export interface JwtPayload {
  sub: number;
  accountId: string;
  name: string;
  roleId: number;
  roleName: string;
  organizationId: number | null;
  email?: string;
  msisdn?: string;
  iat?: number;
  exp?: number;
}

export interface AuthContext {
  readonly userId: number;
  readonly accountId: string;
  readonly name: string;
  readonly roleId: number;
  readonly roleName: string;
  readonly organizationId: number | null;
  readonly email?: string;
  readonly msisdn?: string;
}

// libs/contracts/src/users/users.patterns.ts
export const USERS_PATTERNS = {
  FIND_ALL: 'users.findAll',
  FIND_BY_ID: 'users.findById',
  PROFILE_STATUS: 'users.profileStatus',
  CREATE: 'users.create',
  UPDATE: 'users.update',
  DELETE: 'users.delete',
} as const;
```

When adding a new endpoint, **always define the pattern and payload in `@app/contracts` first** before touching either service.

## Gateway Bootstrap (`api-gateway/src/main.ts`)

The gateway boots as a standard NestJS HTTP application with these global concerns registered in order:

1. CORS enabled
2. `morgan('dev')` request logging
3. `helmet()` security headers
4. Global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`, `enableImplicitConversion`)
5. URI versioning (default `v1`)
6. Swagger setup (`/api-docs`, `/api-docs/json`)
7. Global `RpcExceptionFilter` — converts `RpcException` payloads from auth-service into proper HTTP responses
8. Global guards: `ApiKeyGuard` → `JwtAuthGuard` → `RolesGuard`

The gateway **does not** bootstrap a TCP transport. It is a pure HTTP application that consumes the auth-service via `ClientProxy`.

## Auth-Service Bootstrap (`auth-service/src/main.ts`)

The auth-service boots as a NestJS microservice with TCP transport only. It does not expose any HTTP port. Configuration:

```typescript
const app = await NestFactory.createMicroservice<MicroserviceOptions>(
  AppModule,
  {
    transport: Transport.TCP,
    options: {
      host: process.env.AUTH_SERVICE_HOST ?? 'localhost',
      port: Number(process.env.AUTH_SERVICE_PORT) ?? 9012,
    },
  },
);
```

No global HTTP middleware (no CORS, no Swagger, no HTTP guards) is applied here. Input validation happens at the gateway before messages are sent over TCP.

## `MicroservicesClientModule` — Global Client Pattern

`api-gateway` defines a `@Global()` module that registers the `AUTH_SERVICE` `ClientProxy`:

```typescript
@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: AUTH_SERVICE,
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get('AUTH_SERVICE_HOST'),
            port: config.get<number>('AUTH_SERVICE_PORT'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class MicroservicesClientModule {}
```

Because this module is `@Global()`, any gateway feature module can inject `AUTH_SERVICE` without importing `MicroservicesClientModule` again:

```typescript
@Injectable()
export class AuthController {
  constructor(@Inject(AUTH_SERVICE) private readonly authClient: ClientProxy) {}

  @Post('login')
  login(@Body() dto: LoginDto): Observable<AuthResponse> {
    return this.authClient.send(AUTH_PATTERNS.LOGIN, dto);
  }
}
```

## Module Compositions

### `api-gateway` root module

- `ConfigModule` (global + env validation)
- `ThrottlerModule` presets: `short` (10 req/1s), `medium` (30 req/10s), `long` (100 req/60s)
- `MicroservicesClientModule` (global — injects `AUTH_SERVICE`)
- `AuthModule` (gateway auth controller + strategies)
- `UsersModule` (gateway users controller)

### `auth-service` root module

- `ConfigModule` (global + env validation)
- `PrismaModule` (from `@app/prisma`, global — injects `PrismaService`)
- `AuthModule` (auth `@MessagePattern` handlers, service, repository)
- `UsersModule` (users `@MessagePattern` handlers, service, repository)

## Layering Pattern

Both services follow the same vertical slice per feature:

```
Controller  — transport boundary only (HTTP in gateway, @MessagePattern in auth-service)
     ↓
Service     — business logic, orchestration, validation, exception throwing
     ↓
Repository  — Prisma queries only; no business logic
     ↓
PrismaService — db client lifecycle (auth-service only)
```

Controllers trust that inputs are already validated by the global `ValidationPipe` in the gateway. Services throw NestJS HTTP exceptions (`NotFoundException`, `ConflictException`, etc.), which are serialized as `RpcException` over TCP and unwrapped back to HTTP by `RpcExceptionFilter` in the gateway.

## Shared Library Design

| Library          | Path                  | Purpose                                                                                                                                             |
| ---------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@app/common`    | `libs/common/src/`    | Decorators (`@User`, `@Roles`, `@Public`, `@Open`), shared DTOs, pagination service, utility functions (`raiseHttpError`), global pipes and filters |
| `@app/prisma`    | `libs/prisma/src/`    | `PrismaModule` (global), `PrismaService` (adapter selection, lifecycle hooks)                                                                       |
| `@app/contracts` | `libs/contracts/src/` | Injection tokens, message pattern strings, payload interfaces — the shared API between gateway and auth-service                                     |

Only `auth-service` imports `@app/prisma`. The gateway never touches the database directly.

## Data Model Snapshot

Primary Prisma models (`prisma/schema.prisma`):

- `Organization`
- `Roles`
- `User`
- `Account`
- `OTP`
- `RefreshToken`

Important enums:

- `AccountType`: `EMAIL`, `MSISDN`, `GOOGLE`
- `OTPType`: `EMAIL_VERIFICATION`, `MSISDN_VERIFICATION`, `LOGIN`, `PASSWORD_RESET`

Relationships:

- `User → Roles` (many-to-one)
- `User → Organization` (optional many-to-one)
- `User → Account` (one-to-many)
- `Account → OTP` (one-to-many)
- `Account → RefreshToken` (one-to-many)
