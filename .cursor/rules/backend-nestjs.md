# Cursor Rules: NestJS Microservices Backend

## Project Context

- **Type**: NestJS 11 Monorepo — two independently deployable services
- **Architecture**: `api-gateway` (HTTP, port 9011) + `auth-service` (TCP microservice, port 9012)
- **Database**: PostgreSQL + Prisma 7 — accessed only from `auth-service` via `@app/prisma`
- **Transport**: TCP via `@nestjs/microservices`
- **Shared libraries**: `@app/common`, `@app/prisma`, `@app/contracts`
- **Testing**: Jest (unit) + Supertest (E2E)
- **Package manager**: pnpm

---

## Cursor-Specific Features

### Multi-File Editing

When modifying or adding features, Cursor should edit files in this order. Each step creates types that the next step depends on.

1. **Prisma schema** (`prisma/schema.prisma`) — if database changes needed, followed by `pnpm prisma migrate dev` and `pnpm prisma generate`
2. **`@app/contracts`** (`libs/contracts/src/`) — add new pattern string to `*.patterns.ts` and payload interface to `*.payloads.ts`
3. **DTOs** (`apps/auth-service/src/<feature>/dto/`) — create/update DTO classes
4. **Repository** (`apps/auth-service/src/<feature>/<feature>.repository.ts`) — add Prisma query
5. **Service** (`apps/auth-service/src/<feature>/<feature>.service.ts`) — add business logic
6. **Auth-service controller** (`apps/auth-service/src/<feature>/<feature>.controller.ts`) — add `@MessagePattern` handler
7. **Gateway controller** (`apps/api-gateway/src/<feature>/<feature>.controller.ts`) — add HTTP route with `ClientProxy.send`
8. **Tests** (`*.spec.ts` unit tests + `test/*.e2e-spec.ts`)

**Critical**: Steps 6 and 7 both need to be completed for an endpoint to work end-to-end. Cursor should never write only the gateway route without also writing the auth-service handler, and vice versa.

### Symbol Navigation

- Feature modules live in `apps/<service>/src/<feature>/` — not in `src/`
- Shared code lives in `libs/<lib>/src/` — imported as `@app/<lib>`
- Repositories inject `PrismaService` from `@app/prisma`
- Services inject repositories via constructor
- Gateway controllers inject `AUTH_SERVICE` token (typed as `ClientProxy`) via constructor
- Auth-service controllers inject services via constructor
- Prisma-generated types import from `generated/prisma/client`

### Code Generation

**User**: "Generate notifications feature"

**Cursor should create**:

In `libs/contracts/src/notifications/`:

- `notifications.patterns.ts` — `NOTIFICATIONS_PATTERNS` const object
- `notifications.payloads.ts` — payload interfaces for each pattern

In `apps/auth-service/src/notifications/`:

- `notifications.module.ts`
- `notifications.controller.ts` — `@MessagePattern` handlers
- `notifications.service.ts` — business logic
- `notifications.repository.ts` — Prisma queries
- `dto/create-notification.dto.ts`
- `dto/update-notification.dto.ts`
- `dto/notification-response.dto.ts`
- `notifications.service.spec.ts`

In `apps/api-gateway/src/notifications/`:

- `notifications.module.ts`
- `notifications.controller.ts` — HTTP routes with `ClientProxy.send`
- `notifications.controller.spec.ts`

Register in both `app.module.ts` files.

**User**: "Generate unit test for this file"

**Cursor should create**:

- `*.spec.ts` colocated with the source file
- For gateway controllers: mock `ClientProxy` with `jest.fn().mockReturnValue(of(mockResponse))`
- For auth-service services: mock repository with `jest.fn()`
- AAA pattern (Arrange, Act, Assert)
- Test both success and error/exception cases

---

## Part 1: Core Development Rules

### 1. Feature-Led Architecture (CRITICAL)

Organize by **feature**, NOT by technical layer. Each feature is self-contained within its service directory.

**Correct**:

```
apps/auth-service/src/
├── auth/
│   ├── dto/
│   ├── auth.controller.ts     @MessagePattern handlers
│   ├── auth.service.ts        business logic
│   ├── auth.repository.ts     Prisma queries
│   └── auth.module.ts
└── users/
    ├── dto/
    ├── users.controller.ts
    ├── users.service.ts
    ├── users.repository.ts
    └── users.module.ts

apps/api-gateway/src/
├── auth/
│   ├── auth.controller.ts     HTTP routes + ClientProxy.send
│   └── auth.module.ts
└── users/
    ├── users.controller.ts
    └── users.module.ts
```

**Incorrect**:

```
src/
├── controllers/
├── services/
├── repositories/
```

### 2. Gateway Controllers — HTTP Proxy Only

Gateway controllers do **exactly three things**: extract data from the request, send a TCP message to auth-service, and return the result. No business logic, no validation logic, no Prisma calls.

```typescript
// apps/api-gateway/src/auth/auth.controller.ts

// CORRECT
@Post('login')
@Public()
login(
  @Body() dto: LoginDto,
): Promise<AuthResponse> {
  return firstValueFrom(
    this.authClient.send<AuthResponse>(AUTH_PATTERNS.LOGIN, dto),
  );
}

// INCORRECT — business logic in gateway
@Post('login')
async login(@Body() dto: LoginDto): Promise<AuthResponse> {
  const user = await this.userRepository.findByEmail(dto.email); // NEVER
  if (!user) throw new UnauthorizedException();                   // NEVER
  return this.jwtService.sign(user);                             // NEVER
}
```

### 3. Auth-Service Controllers — TCP Handlers Only

Auth-service controllers use `@MessagePattern` and delegate immediately to the service. No direct Prisma access, no HTTP concerns.

```typescript
// apps/auth-service/src/auth/auth.controller.ts

@MessagePattern(AUTH_PATTERNS.LOGIN)
login(@Payload() payload: LoginPayload): Promise<AuthResponse> {
  return this.authService.login(payload);
}
```

### 4. Contracts First

Before adding any endpoint, define its pattern and payload in `@app/contracts`. Both services import from this library — it is the contract that keeps them in sync.

```typescript
// libs/contracts/src/auth/auth.patterns.ts
export const AUTH_PATTERNS = {
  // existing...
  NEW_FEATURE: 'auth.newFeature',
} as const;

// libs/contracts/src/auth/auth.payloads.ts
export interface NewFeaturePayload {
  readonly userId: number;
  readonly data: string;
}
```

### 5. Variable Naming (7 Principles)

- **Intention-revealing**: `getUserById()` not `getData()`
- **No disinformation**: `users` (array) not `userList`
- **Meaningful**: `UserEntity` vs `UserDto` (clear distinction)
- **Pronounceable**: `createdAt` not `crtdAt`
- **Searchable**: `MAX_LOGIN_ATTEMPTS = 5` not magic number
- **No encodings**: `email` not `strEmail`
- **No mental mapping**: `user` not `u`

```typescript
// Correct
async findActiveSessionsByUserId(userId: number): Promise<RefreshToken[]>
const MAX_LOGIN_ATTEMPTS = 5;

// Incorrect
async getSess(id: number)
if (attempts > 5)  // magic number
```

### 6. TypeScript Strict Mode

- Explicit return types on all public methods
- No `any` type
- Use `interface` for object shapes (prefer over `type` for DTOs)
- `Readonly<T>` and `ReadonlyArray<T>` for immutable data
- Import types with `import type` when no runtime value is needed

```typescript
// Correct
async findById(id: number): Promise<User | null> {
  return this.prisma.user.findUnique({ where: { id } });
}

// Incorrect
async findById(id) {
  return this.prisma.user.findUnique({ where: { id } });
}
```

### 7. Dependency Injection — Constructor Only

```typescript
// Correct
@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}
}

// Incorrect — property injection
@Injectable()
export class UsersService {
  @Inject()
  private repository: UsersRepository;
}
```

Gateway controllers inject `AUTH_SERVICE` with the `@Inject` decorator (not constructor shorthand) because the injection token is a string, not a class:

```typescript
constructor(
  @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
) {}
```

### 8. Repository Pattern

Prisma queries live in repositories only. Services never call `this.prisma.*` directly.

```typescript
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async save(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }
}
```

### 9. Input Validation

All DTOs use `class-validator`. The global `ValidationPipe` in `api-gateway` enforces these before any TCP message is sent.

```typescript
export class CreateUserDto {
  @IsEmail()
  @Transform(({ value }) => (value as string).toLowerCase().trim())
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
```

### 10. Error Handling

Auth-service services throw NestJS HTTP exceptions. These are serialized to `RpcException` over TCP and unwrapped to HTTP by `RpcExceptionFilter` in the gateway.

```typescript
// In auth-service service — throw HTTP exceptions normally
async findUserById(id: number): Promise<User> {
  const user = await this.repository.findById(id);
  if (!user) throw new NotFoundException(`User ${id} not found`);
  return user;
}

// In gateway controller — no try/catch needed for RpcException
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number): Promise<User> {
  return firstValueFrom(
    this.authClient.send(USERS_PATTERNS.FIND_BY_ID, { id }),
  );
}
```

---

## Part 2: Testing

### Unit Tests — Gateway Controllers

Mock `ClientProxy` to return an `Observable`:

```typescript
import { of } from 'rxjs';
import { AUTH_SERVICE } from '@app/contracts';

describe('AuthController', () => {
  let controller: AuthController;
  const mockAuthClient = { send: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AUTH_SERVICE, useValue: mockAuthClient }],
    }).compile();

    controller = module.get(AuthController);
  });

  it('should forward login to auth-service', async () => {
    // Arrange
    const dto: LoginDto = { email: 'a@b.com', password: 'pass' };
    mockAuthClient.send.mockReturnValue(of({ accessToken: 'jwt' }));

    // Act
    const result = await controller.login(dto);

    // Assert
    expect(mockAuthClient.send).toHaveBeenCalledWith(AUTH_PATTERNS.LOGIN, dto);
    expect(result).toEqual({ accessToken: 'jwt' });
  });
});
```

### Unit Tests — Auth-Service Services

Mock repositories:

```typescript
describe('AuthService', () => {
  let service: AuthService;
  let repository: jest.Mocked<AuthRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: {
            findByEmail: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    repository = module.get(AuthRepository);
  });

  it('should throw ConflictException when email already exists', async () => {
    // Arrange
    repository.findByEmail.mockResolvedValue({ id: 1 } as Account);

    // Act & Assert
    await expect(
      service.signup({ email: 'a@b.com', password: 'pass' }),
    ).rejects.toThrow(ConflictException);
  });
});
```

### E2E Tests

```typescript
// test/auth.e2e-spec.ts
describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Apply same global setup as main.ts
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(() => app.close());

  it('POST /v1/auth/signup — creates account', () => {
    return request(app.getHttpServer())
      .post('/v1/auth/signup')
      .set('x-api-key', process.env.X_API_KEY)
      .send({ email: 'test@test.com', password: 'password123', name: 'Test' })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('accessToken');
      });
  });
});
```

---

## Part 3: Cursor Workflows

### Workflow: Add Endpoint to Existing Feature

**User request**: "Add a GET /v1/users/user/:id/sessions endpoint"

**Cursor should**:

1. Add `LIST_SESSIONS: 'users.sessions'` to `libs/contracts/src/users/users.patterns.ts`
2. Add `ListSessionsPayload` interface to `libs/contracts/src/users/users.payloads.ts`
3. Add `findActiveSessionsByUserId()` to `apps/auth-service/src/users/users.repository.ts`
4. Add `listSessions()` to `apps/auth-service/src/users/users.service.ts`
5. Add `@MessagePattern(USERS_PATTERNS.LIST_SESSIONS)` handler to `apps/auth-service/src/users/users.controller.ts`
6. Add `@Get('user/:user_id/sessions')` to `apps/api-gateway/src/users/users.controller.ts` using `ClientProxy.send`
7. Add unit tests for service and both controllers

### Workflow: Modify Database Schema

**User request**: "Add `lastLoginAt` field to Account"

**Cursor should**:

1. Edit `prisma/schema.prisma` — add `last_login_at DateTime?` to Account model
2. Run `pnpm prisma migrate dev --name add_last_login_at_to_account`
3. Update `apps/auth-service/src/auth/auth.repository.ts` — include field in relevant queries
4. Update DTOs that include Account data
5. Update affected tests

### Workflow: Add a New Service

**User request**: "Create a notifications service"

**Cursor should**:

1. Create `libs/contracts/src/notifications/notifications.patterns.ts` and `notifications.payloads.ts`
2. Create `apps/notifications-service/src/` directory structure with `main.ts`, `app.module.ts`, and feature module
3. Add `notifications-service` entry to `nest-cli.json`
4. Add `NOTIFICATIONS_SERVICE` token to `libs/contracts/src/tokens.ts`
5. Register notifications client in `MicroservicesClientModule` in `api-gateway`
6. Create `apps/api-gateway/src/notifications/` gateway controller

---

## Part 4: NestJS Best Practices Reference

**Skills index**: `.agents/skills/nestjs-best-practices/SKILL.md`

Key rule files:

- `.agents/skills/nestjs-best-practices/rules/arch-feature-modules.md` — feature organization
- `.agents/skills/nestjs-best-practices/rules/arch-use-repository-pattern.md` — repository pattern
- `.agents/skills/nestjs-best-practices/rules/arch-avoid-circular-deps.md` — avoiding circular deps
- `.agents/skills/nestjs-best-practices/rules/di-constructor-injection.md` — constructor injection
- `.agents/skills/nestjs-best-practices/rules/security-validate-all-input.md` — input validation
- `.agents/skills/nestjs-best-practices/rules/error-exception-filters.md` — exception filters
- `.agents/skills/nestjs-best-practices/rules/test-use-testing-module.md` — unit testing
- `.agents/skills/nestjs-best-practices/rules/test-e2e-supertest.md` — E2E testing

---

## Part 5: Key Files by Category

### Entry Points

| File                            | Purpose                    |
| ------------------------------- | -------------------------- |
| `apps/api-gateway/src/main.ts`  | Gateway HTTP bootstrap     |
| `apps/auth-service/src/main.ts` | Auth-service TCP bootstrap |

### Root Modules

| File                                  | Purpose                                                            |
| ------------------------------------- | ------------------------------------------------------------------ |
| `apps/api-gateway/src/app.module.ts`  | Gateway root module (Config, Throttler, MicroservicesClientModule) |
| `apps/auth-service/src/app.module.ts` | Auth-service root module (Config, PrismaModule, feature modules)   |

### Contracts (shared between services)

| File                                         | Purpose                                                        |
| -------------------------------------------- | -------------------------------------------------------------- |
| `libs/contracts/src/tokens.ts`               | `AUTH_SERVICE` injection token                                 |
| `libs/contracts/src/auth/auth.patterns.ts`   | `AUTH_PATTERNS` const object                                   |
| `libs/contracts/src/auth/auth.payloads.ts`   | `JwtPayload`, `AuthContext`, and per-action payload interfaces |
| `libs/contracts/src/users/users.patterns.ts` | `USERS_PATTERNS` const object                                  |
| `libs/contracts/src/users/users.payloads.ts` | Per-action payload interfaces for users                        |

### Auth-Service Feature Files

| File                                              | Purpose                                  |
| ------------------------------------------------- | ---------------------------------------- |
| `apps/auth-service/src/auth/auth.controller.ts`   | `@MessagePattern` handlers for `auth.*`  |
| `apps/auth-service/src/auth/auth.service.ts`      | Auth business logic                      |
| `apps/auth-service/src/auth/auth.repository.ts`   | Auth Prisma queries                      |
| `apps/auth-service/src/users/users.controller.ts` | `@MessagePattern` handlers for `users.*` |
| `apps/auth-service/src/users/users.service.ts`    | Users business logic                     |
| `apps/auth-service/src/users/users.repository.ts` | Users Prisma queries                     |

### Gateway Feature Files

| File                                                                 | Purpose                     |
| -------------------------------------------------------------------- | --------------------------- |
| `apps/api-gateway/src/auth/auth.controller.ts`                       | HTTP routes: `/v1/auth/**`  |
| `apps/api-gateway/src/users/users.controller.ts`                     | HTTP routes: `/v1/users/**` |
| `apps/api-gateway/src/auth/strategies/jwt.strategy.ts`               | Local JWT validation        |
| `apps/api-gateway/src/auth/strategies/google.strategy.ts`            | Google OAuth handshake      |
| `apps/api-gateway/src/common/guards/api-key.guard.ts`                | API key enforcement         |
| `apps/api-gateway/src/common/guards/jwt-auth.guard.ts`               | JWT enforcement             |
| `apps/api-gateway/src/common/guards/roles.guard.ts`                  | Role enforcement            |
| `apps/api-gateway/src/common/filters/rpc-exception.filter.ts`        | TCP→HTTP error unwrapping   |
| `apps/api-gateway/src/common/modules/microservices-client.module.ts` | Global AUTH_SERVICE client  |

### Schema and Infrastructure

| File                                | Purpose                                     |
| ----------------------------------- | ------------------------------------------- |
| `prisma/schema.prisma`              | Shared Prisma schema                        |
| `generated/prisma/`                 | Generated Prisma client output              |
| `libs/prisma/src/prisma.service.ts` | Prisma client lifecycle + adapter selection |
| `.env`                              | Local environment (not in git)              |
| `.env.example`                      | Template for required env vars              |

---

## Part 6: Development Commands

```bash
# Start services (in order)
pnpm start:auth          # auth-service TCP :9012
pnpm start:gateway       # api-gateway HTTP :9011

# Build
pnpm build:auth
pnpm build:gateway

# Production
pnpm start:prod:auth
pnpm start:prod:gateway

# Testing
pnpm test                # all unit tests
pnpm test:watch          # watch mode
pnpm test:cov            # coverage
pnpm test:e2e            # E2E tests

# Run a single test file
pnpm test -- --testPathPattern=auth.service

# Database
pnpm prisma generate
pnpm prisma migrate dev --name <description>
pnpm prisma studio

# Code quality
pnpm lint
pnpm format
```
