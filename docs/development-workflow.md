# Development Workflow

This document describes how to extend the microservices starter safely and consistently. The two-service architecture requires touching files in both `api-gateway` and `auth-service` for most endpoint changes.

## Daily Commands

```bash
# Start auth-service first, then gateway
pnpm start:auth       # Terminal 1 — TCP :9012
pnpm start:gateway    # Terminal 2 — HTTP :9011

# Tests
pnpm test             # all unit tests
pnpm test:e2e         # E2E tests

# Code quality
pnpm lint             # ESLint with auto-fix
pnpm format           # Prettier
```

## Multi-File Edit Order for New Endpoints

Always follow this sequence. Each step creates types/interfaces that the next step depends on.

```
1. prisma/schema.prisma          (if DB change needed)
   ↓ pnpm prisma migrate dev --name <description>
   ↓ pnpm prisma generate

2. libs/contracts/src/           (@app/contracts — add pattern + payload interface)

3. apps/auth-service/src/<feature>/dto/   (create/update DTOs)

4. apps/auth-service/src/<feature>/<feature>.repository.ts  (add Prisma query)

5. apps/auth-service/src/<feature>/<feature>.service.ts     (add business logic)

6. apps/auth-service/src/<feature>/<feature>.controller.ts  (add @MessagePattern handler)

7. apps/api-gateway/src/<feature>/<feature>.controller.ts   (add HTTP route + ClientProxy.send)

8. Tests (*.spec.ts + test/*.e2e-spec.ts)
```

## Adding a New Endpoint — Step-by-Step Example

This example adds a `GET /v1/auth/sessions` endpoint that lists active sessions.

### Step 1: Add the pattern and payload to `@app/contracts`

```typescript
// libs/contracts/src/auth/auth.patterns.ts
export const AUTH_PATTERNS = {
  // ... existing patterns
  LIST_SESSIONS: 'auth.listSessions',
} as const;

// libs/contracts/src/auth/auth.payloads.ts
export interface ListSessionsPayload {
  readonly userId: number;
}
```

### Step 2: Add the `@MessagePattern` handler in auth-service

```typescript
// apps/auth-service/src/auth/auth.controller.ts
@MessagePattern(AUTH_PATTERNS.LIST_SESSIONS)
listSessions(@Payload() payload: ListSessionsPayload): Promise<SessionDto[]> {
  return this.authService.listSessions(payload.userId);
}
```

### Step 3: Add the business logic in auth-service service

```typescript
// apps/auth-service/src/auth/auth.service.ts
async listSessions(userId: number): Promise<SessionDto[]> {
  return this.authRepository.findActiveSessionsByUserId(userId);
}
```

### Step 4: Add the Prisma query in auth-service repository

```typescript
// apps/auth-service/src/auth/auth.repository.ts
async findActiveSessionsByUserId(userId: number): Promise<RefreshToken[]> {
  return this.prisma.refreshToken.findMany({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: 'desc' },
  });
}
```

### Step 5: Add the HTTP route in the gateway

```typescript
// apps/api-gateway/src/auth/auth.controller.ts
@Get('sessions')
listSessions(@User() user: AuthContext): Promise<SessionDto[]> {
  return firstValueFrom(
    this.authClient.send(AUTH_PATTERNS.LIST_SESSIONS, { userId: user.userId }),
  );
}
```

No business logic in the gateway controller. Its only job is to extract data from the request, form the payload, send it over TCP, and return the result.

## Adding a New Service (e.g., Notifications)

When a domain grows large enough to warrant its own service:

1. **Add contracts** to `libs/contracts/src/notifications/`:

   ```typescript
   // notifications.patterns.ts
   export const NOTIFICATIONS_PATTERNS = {
     SEND: 'notifications.send',
     LIST: 'notifications.list',
   } as const;
   ```

2. **Create the service directory** `apps/notifications-service/` following the same structure as `auth-service`:
   - `src/main.ts` — TCP bootstrap on a new port
   - `src/app.module.ts`
   - `src/notifications/` — feature module with controller, service, repository, DTOs

3. **Register in `nest-cli.json`**:

   ```json
   {
     "projects": {
       "notifications-service": {
         "type": "application",
         "root": "apps/notifications-service",
         "entryFile": "main",
         "sourceRoot": "apps/notifications-service/src"
       }
     }
   }
   ```

4. **Add the client to `MicroservicesClientModule`** in `api-gateway`:

   ```typescript
   ClientsModule.registerAsync([
     // existing AUTH_SERVICE entry...
     {
       name: NOTIFICATIONS_SERVICE,
       useFactory: (config: ConfigService) => ({
         transport: Transport.TCP,
         options: {
           host: config.get('NOTIFICATIONS_SERVICE_HOST'),
           port: config.get<number>('NOTIFICATIONS_SERVICE_PORT'),
         },
       }),
       inject: [ConfigService],
     },
   ]);
   ```

5. **Add new gateway routes** in `apps/api-gateway/src/notifications/`

## Guard and Access Design

When adding a new endpoint, choose the correct access level:

| Scenario                                            | Decorator         | Effect                        |
| --------------------------------------------------- | ----------------- | ----------------------------- |
| Endpoint must be fully public (OAuth, health)       | `@Open()`         | Skips API key AND JWT         |
| Endpoint is unauthenticated but still API-key-gated | `@Public()`       | Skips JWT; API key required   |
| Endpoint requires a logged-in user                  | _(no decorator)_  | Full guard stack              |
| Endpoint restricted to a specific role              | `@Roles('admin')` | Adds role check on top of JWT |

Never put `@Open()` on business endpoints. Never skip API key on signup/login flows — the `@Public()` decorator is the right choice for those.

## DTO Rules

- Create separate DTOs for each operation: `CreateXxxDto`, `UpdateXxxDto`, `XxxResponseDto`
- Use `PartialType(CreateXxxDto)` for update DTOs
- Annotate all DTO properties with `class-validator` decorators
- Use `class-transformer` `@Transform` for normalization (e.g., lowercasing emails)
- Never parse or validate raw input manually in controllers — rely on the global `ValidationPipe`
- Validate at the HTTP boundary (gateway controller); auth-service controllers trust inputs are already valid

## Testing Approach

### Unit tests — services and repositories

Mock all dependencies. Follow the AAA (Arrange, Act, Assert) pattern.

For gateway controllers, mock `ClientProxy` with `jest.fn()` returning an `Observable`:

```typescript
import { of } from 'rxjs';

const mockAuthClient = {
  send: jest.fn().mockReturnValue(of(mockAuthResponse)),
};

const module = await Test.createTestingModule({
  controllers: [AuthController],
  providers: [{ provide: AUTH_SERVICE, useValue: mockAuthClient }],
}).compile();
```

For auth-service services, mock the repository:

```typescript
const mockAuthRepository = {
  findByEmail: jest.fn(),
  save: jest.fn(),
};

const module = await Test.createTestingModule({
  providers: [
    AuthService,
    { provide: AuthRepository, useValue: mockAuthRepository },
  ],
}).compile();
```

### E2E tests

E2E tests in `test/*.e2e-spec.ts` use `Test.createTestingModule()` with the real `AppModule` of each service and Supertest for HTTP assertions.

For auth-service E2E tests (TCP-only service), boot the service as a microservice and test by connecting a test TCP client, or test through a running gateway.

## Pagination Pattern

Use `PaginationService.paginate()` in auth-service services:

```typescript
return this.paginationService.paginate(
  (skip, take) => this.repository.findMany(skip, take, filters),
  () => this.repository.count(filters),
  { page, size },
);
```

Returns `PaginationResponse<T>`:

```json
{
  "records": [],
  "page": 1,
  "size": 20,
  "count": 0,
  "pages": 0
}
```

## Release Hygiene

Before merging any branch:

1. `pnpm lint` passes (zero errors)
2. `pnpm test` passes (all unit tests green)
3. If API contract changed: update `@app/contracts` and Swagger annotations
4. If Prisma schema changed: migration file must be committed alongside schema change
5. If environment variables changed: update `.env.example`
6. If a new service is added: update `nest-cli.json`, `MicroservicesClientModule`, and `docs/`

## Functional Programming Reminders

- Prefer `const` over `let`; avoid mutation
- Extract pure functions from service methods when business logic is side-effect-free
- Use `Readonly<T>` and `ReadonlyArray<T>` for data that should not be mutated
- Model optional states explicitly — use `T | null` rather than `undefined` where possible
- Use discriminated unions for branching states rather than boolean flags
