# CLAUDE.md - AI Coding Guidelines

**Stack**: NestJS 11.0.1 | PostgreSQL + Prisma 7.3.0 | Jest + Supertest | pnpm

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with code in this repository. It acts as the ultimate source of truth for architectural, functional, and testing patterns.

## ⚡ Commands

```bash
# Development — run both services together
pnpm start:auth          # Auth-service TCP microservice (port 9012)
pnpm start:gateway       # API Gateway HTTP server (port 9011)

# Build
pnpm build:auth          # Compile auth-service
pnpm build:gateway       # Compile api-gateway
pnpm start:prod:auth     # Run compiled auth-service
pnpm start:prod:gateway  # Run compiled api-gateway

# Testing
pnpm test                # Unit tests (apps/**/*.spec.ts, libs/**/*.spec.ts)
pnpm test:watch          # Watch mode
pnpm test:cov            # Coverage report
pnpm test:e2e            # E2E tests (test/**/*.e2e-spec.ts)

# Run a single test file
pnpm test -- --testPathPattern=auth.controller

# Database
pnpm prisma migrate dev   # Create and apply migration
pnpm prisma studio        # Database GUI
pnpm prisma generate      # Regenerate client

# Code quality
pnpm lint             # ESLint with auto-fix
pnpm format           # Prettier format
```

## 📐 Project Overview & Key Principles

This is a NestJS monorepo with a microservices architecture.

```
nestjs-starter/
├── apps/
│   ├── api-gateway/     # HTTP server (port 9011) — thin proxy, guards, Swagger
│   └── auth-service/    # TCP microservice (port 9012) — Auth + Users domains
├── libs/
│   ├── common/          # @app/common — pipes, filters, decorators, DTOs, utils
│   ├── prisma/          # @app/prisma — PrismaModule, PrismaService
│   └── contracts/       # @app/contracts — message patterns + payload interfaces
└── prisma/              # Shared schema
```

**Port allocation**: api-gateway=9011 (HTTP), auth-service=9012 (TCP). Future services increment from 9013.

**Request flow:**

```
Client → HTTP → api-gateway (validates JWT, guards) → TCP → auth-service (business logic + DB)
```

**JWT is validated locally in the gateway.** The token embeds `name`, `roleId`, `roleName`, and `organizationId` at sign-in time so guards can read `request.user` without a TCP hop per request.

- **Architecture**: NestJS Monorepo. Feature-led per service — each domain has co-located controller, service, repo, DTOs, tests.
- **Transport**: TCP (`Transport.TCP`) via `@nestjs/microservices`. Auth-service uses `@MessagePattern`. Gateway uses `ClientProxy.send()`.
- **Shared code**: Always goes in `libs/`. Use `@app/common`, `@app/prisma`, `@app/contracts` imports.
- **Functional Programming**: Mandatory strict adherence to immutability, pure functions, closures, and discriminated unions.
- **Dependency Injection**: Use constructor injection exclusively. Scope providers as `DEFAULT` (singleton).

### Code Organization & Layer Separation

- **Feature-Led (NOT Technical Layer)**: E.g. `apps/auth-service/src/users/` containing controller, service, repo, dto, tests.
- **Gateway Controller** — HTTP proxy only; validates input, injects `@Inject(AUTH_SERVICE) authClient: ClientProxy`, calls `authClient.send(PATTERN, payload)`. Zero business logic.
- **Auth-service Controller** — TCP handler only; uses `@MessagePattern`, delegates to service. No HTTP concepts.
- **Service** — Business logic + validation; calls repositories.
- **Repository** — Data access layer; Prisma queries only. No business logic.
- **Shared Utils**: Decorators, guards, pipes, filters, utils live in `libs/common/src/`.

### `MicroservicesClientModule` — Global DI Pattern

`api-gateway` registers `AUTH_SERVICE` `ClientProxy` once in `apps/api-gateway/src/microservices-client.module.ts` as a `@Global()` module. All gateway feature modules can inject `AUTH_SERVICE` without re-importing `ClientsModule`. When adding a new microservice, add its client entry here — **never** register `ClientsModule` directly in feature modules.

```typescript
// apps/api-gateway/src/microservices-client.module.ts
@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: AUTH_SERVICE,
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get<string>('AUTH_SERVICE_HOST', 'localhost'),
            port: config.get<number>('AUTH_SERVICE_PORT', 9012),
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

### Error Handling Across the TCP Boundary

Auth-service services throw NestJS HTTP exceptions (`NotFoundException`, `ConflictException`, etc.). These are serialized as `RpcException` over TCP. The gateway's global `RpcExceptionFilter` (`libs/common/src/filters/rpc-exception.filter.ts`) unwraps them back to proper HTTP responses with the original status code.

- Services throw HTTP exceptions — never throw `RpcException` directly in services.
- Use the existing `raiseHttpError` utility in `libs/common/src/utils/`.
- In gateway tests, mock `ClientProxy` not the service directly.

### Functional Programming Principles (Mandatory)

- **Immutability First:** Embrace immutable architectures. Avoid `let` and prevent mutation. Heavily utilize `Readonly<T>`, `ReadonlyArray<T>`, and standard immutable methods mapping.
- **Pure Functions:** Decouple core business logic into pure functions extracted from side-effects or stateful service instances where possible.
- **Function Composition:** Actively implement higher-order functions (HOFs), closures, and partial application/currying where it enhances reusability and declarative logic.
- **Explicit States:** Make illegal states unrepresentable using Discriminated Unions (like `Result<T, E>` or `Option<T>` patterns).
- **Exhaustive Handling:** Leverage `switch` statements or matchers for strict compile-time exhaustiveness checks over discriminated unions.

### TypeScript Standards

- Strict mode is on (`nodenext` module resolution, `isolatedModules: true`).
- Always declare explicit types for variables, parameters, and return values.
- Avoid `any` type completely.
- Use explicit return types on all public methods.
- Prefer interfaces over types for object definitions.
- Use enums for fixed sets of values.
- Import types with `import type` when possible.

### Naming Principles

- **Intention-revealing**: `getUserById()` not `getData()`.
- **Pronounceable**: `createdAt` not `crtdAt`.
- **Searchable**: `MAX_LOGIN_ATTEMPTS = 5` not magic numbers.
- **No encodings**: `email` not `strEmail`.
- **Conventions**:
  - Files: `kebab-case` (e.g., `user-profile.service.ts`)
  - Classes/Interfaces: `PascalCase`
  - Variables/Methods: `camelCase`
  - Constants: `SCREAMING_SNAKE_CASE`

### Security & Input Validation

- Validate all inputs using `class-validator` decorators on DTOs.
- Extend `PartialType` for update DTOs.
- Create separate DTOs for different operations (create, update, response).
- Validate at the HTTP boundary (gateway controller); auth-service controllers trust inputs are already valid.
- Global `ValidationPipe` is registered in api-gateway only — not in auth-service.
- Apply guards (`@Open()`, `@Public()`, `@Roles()`) at the gateway controller level.

### Database & Prisma Patterns

- Use UUID for all primary keys (`@id @default(uuid())`).
- Include audit fields on all models: `created_by`, `updated_by`, `created_at`, `updated_at`.
- Establish proper relations with foreign keys. Use Prisma enums.
- Use transactions (`prisma.$transaction()`) for operations that must succeed or fail atomically.
- Generate client to `generated/prisma/` (not default location). Import from `generated/prisma/client`.
- `@app/prisma` is only imported in `auth-service/src/app.module.ts` — never in the gateway.

## 🧠 Procedural Knowledge & `@skills` Integration

This repository leverages the **`@skills` directory** extensively (located in `.agents/skills/`) as the source of truth for programmatic standards.

> **MANDATORY**: Consult the procedural knowledge mapped to these skills _before_ generating or refactoring code. Do not hallucinate patterns; read the skill files to fetch the correct patterns and principles.

| Skill                               | Path                                                       | Procedural Application / When to consult                                                                       |
| ----------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Functional TypeScript**           | `.agents/skills/functional-typescript/SKILL.md`            | **Mandatory default.** Functional paradigms, higher-order functions, currying, pure functions, closures.       |
| **TypeScript Best Practices**       | `.agents/skills/typescript-best-practices/SKILL.md`        | Type-first design, making illegal states unrepresentable, discriminated unions, runtime validation guardrails. |
| **TypeScript Expert**               | `.agents/skills/typescript-expert/SKILL.md`                | Advanced typing, optimizations, and deep language tooling.                                                     |
| **NestJS Best Practices** (index)   | `.agents/skills/nestjs-best-practices/SKILL.md`            | Quick rule-name lookup for architecture, dependency injection, architecture patterns.                          |
| **NestJS Expert**                   | `.agents/skills/nestjs-expert/SKILL.md`                    | Advanced patterns — microservices, TCP transport, `@MessagePattern`, `ClientProxy`, `RpcException`.            |
| **Testing with Jest**               | `.agents/skills/javascript-typescript-jest/SKILL.md`       | AAA testing pattern, exact Mock procedures, mocking `ClientProxy` in gateway tests.                            |
| **Architecture Modules** `arch-*`   | `.agents/skills/nestjs-best-practices/rules/arch-*.md`     | Restructuring modules, `@Global()` module pattern, repository patterns, logic decoupling.                      |
| **Dependency Injection** `di-*`     | `.agents/skills/nestjs-best-practices/rules/di-*.md`       | Constructor injection, `@Inject()` tokens, `@Global()` scope, `MicroservicesClientModule` pattern.             |
| **Error Handling** `error-*`        | `.agents/skills/nestjs-best-practices/rules/error-*.md`    | `RpcExceptionFilter`, HTTP exceptions in services, TCP error propagation.                                      |
| **Security Standards** `security-*` | `.agents/skills/nestjs-best-practices/rules/security-*.md` | JWT self-contained payload, `ApiKeyGuard`, `JwtAuthGuard`, `RolesGuard` ordering.                              |
| **Performance Patterns** `perf-*`   | `.agents/skills/nestjs-best-practices/rules/perf-*.md`     | DB indexing, async hooks, caching strategies.                                                                  |
| **Find Skills Utility**             | `.agents/skills/find-skills/SKILL.md`                      | When looking for an installable capability or new workflow.                                                    |

### How to apply skill rules

1. **Identify the category** of the task (architecture change → `arch-*`, new auth flow → `security-*`, etc.)
2. **Open the matching rule file** and read the _incorrect_ example first — verify the current code doesn't match it.
3. **Generate code that matches the _correct_ example**, adapting to project-specific patterns.
4. **Cross-check impact rating** — CRITICAL rules must never be violated; HIGH rules require justification if deviated from.

## 🔄 Common Claude Workflows

### Multi-File Edit Order

1. Prisma schema → 2. `@app/contracts` (patterns + payloads) → 3. DTOs → 4. Repository → 5. Service → 6. Auth-service Controller (`@MessagePattern`) → 7. Gateway Controller (`ClientProxy.send`) → 8. Tests

### Add a New Endpoint

**1. Add pattern to `libs/contracts/src/auth/auth.patterns.ts`:**

```typescript
export const AUTH_PATTERNS = {
  // ... existing
  NEW_ACTION: 'auth.newAction',
} as const;
```

**2. Add payload interface to `libs/contracts/src/auth/auth.payloads.ts`:**

```typescript
export interface NewActionPayload {
  readonly field: string;
}
```

**3. Auth-service — add `@MessagePattern` handler in `apps/auth-service/src/auth/auth.controller.ts`:**

```typescript
@MessagePattern(AUTH_PATTERNS.NEW_ACTION)
newAction(@Payload() payload: NewActionPayload): Promise<ResultDto> {
  return this.authService.newAction(payload.field);
}
```

**4. Gateway — add HTTP endpoint in `apps/api-gateway/src/auth/auth.controller.ts`:**

```typescript
@Get('new-action')
newAction(@User() user: AuthorizedUser): Promise<ResultDto> {
  return firstValueFrom(
    this.authClient.send(AUTH_PATTERNS.NEW_ACTION, { context: user }),
  );
}
```

### Guard and Access Design

| Scenario                          | Decorator         | Effect                      |
| --------------------------------- | ----------------- | --------------------------- |
| Fully public (OAuth, health)      | `@Open()`         | Skips API key AND JWT       |
| Unauthenticated but API-key-gated | `@Public()`       | Skips JWT; API key required |
| Requires logged-in user           | _(no decorator)_  | Full guard stack            |
| Role-restricted                   | `@Roles('admin')` | JWT + role check            |

### Feature Generation (new domain, e.g., Notifications)

1. Add `NOTIFICATIONS_PATTERNS` and payload interfaces to `libs/contracts/src/notifications/`
2. Create `apps/notifications-service/` following auth-service structure (main.ts → TCP on next port, app.module.ts, feature module)
3. Register new service in `nest-cli.json`
4. Add new client entry to `MicroservicesClientModule` in `apps/api-gateway/src/microservices-client.module.ts`
5. Add notification routes to gateway under `apps/api-gateway/src/notifications/`

### Modify Schema

1. Update `prisma/schema.prisma`
2. `pnpm prisma migrate dev --name <description>`
3. `pnpm prisma generate` (migrate dev runs this automatically; run explicitly to be safe)
4. Update DTOs/repository queries and affected service logic
5. Update tests for changed data shapes

## 🧪 Testing Patterns

**Unit tests** (`*.spec.ts`) use `Test.createTestingModule()` with manually mocked dependencies following the AAA (Arrange / Act / Assert) structure.
**E2E tests** (`test/**/*.e2e-spec.ts`) use the real `NestApplication` + Supertest.

### Unit Test — Auth-service Service (AAA Pattern)

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
          useValue: { findByEmail: jest.fn(), save: jest.fn() },
        },
      ],
    }).compile();
    service = module.get(AuthService);
    repository = module.get(AuthRepository);
  });

  it('should throw ConflictException when email is taken', async () => {
    repository.findByEmail.mockResolvedValue(mockAccount); // Arrange
    await expect(service.signup(mockDto)).rejects.toThrow(ConflictException); // Act + Assert
  });
});
```

### Unit Test — Gateway Controller (mock ClientProxy)

```typescript
import { of } from 'rxjs';

describe('AuthController (gateway)', () => {
  let controller: AuthController;
  let authClient: { send: jest.Mock };

  beforeEach(async () => {
    authClient = { send: jest.fn().mockReturnValue(of(mockAuthResponse)) };
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AUTH_SERVICE, useValue: authClient }],
    }).compile();
    controller = module.get(AuthController);
  });

  it('should forward signup payload to auth-service', async () => {
    const result = await controller.signup(mockSignupDto); // Act
    expect(authClient.send).toHaveBeenCalledWith(
      AUTH_PATTERNS.SIGNUP,
      mockSignupDto,
    ); // Assert
    expect(result).toEqual(mockAuthResponse);
  });
});
```

## 📝 Code Templates

### Gateway Controller (HTTP proxy — no business logic)

```typescript
@Controller('auth')
export class AuthController {
  constructor(@Inject(AUTH_SERVICE) private readonly authClient: ClientProxy) {}

  @Public()
  @Post('signup')
  signup(@Body() dto: SignupDto): Promise<AuthResponseDto> {
    return firstValueFrom(this.authClient.send(AUTH_PATTERNS.SIGNUP, dto));
  }

  @Get('me')
  getCurrentUser(
    @User() user: AuthorizedUser,
  ): Promise<CurrentUserResponseDto> {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.ME, { context: user }),
    );
  }
}
```

### Auth-service Controller (`@MessagePattern` — no HTTP concepts)

```typescript
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern(AUTH_PATTERNS.SIGNUP)
  signup(@Payload() dto: SignupDto): Promise<AuthResponseDto> {
    return this.authService.signup(dto);
  }

  @MessagePattern(AUTH_PATTERNS.ME)
  getMe(
    @Payload() { context }: { context: AuthContext },
  ): Promise<CurrentUserResponseDto> {
    return this.authService.getMe(context.accountId);
  }
}
```

### Service Structure (business logic + HTTP exceptions)

```typescript
@Injectable()
export class AuthService {
  constructor(private readonly repository: AuthRepository) {}

  async signup(dto: SignupDto): Promise<AuthResponseDto> {
    const existing = await this.repository.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const account = await this.repository.createWithUser(dto);
    return this.buildAuthResponse(account);
  }
}
```

### Repository Structure (Prisma queries only)

```typescript
@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<Account | null> {
    return this.prisma.account.findUnique({ where: { email } });
  }

  async createWithUser(dto: SignupDto): Promise<Account> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: dto.name, roleId: dto.roleId },
      });
      return tx.account.create({ data: { email: dto.email, userId: user.id } });
    });
  }
}
```

### Contracts — patterns and payload interfaces

```typescript
// libs/contracts/src/auth/auth.patterns.ts
export const AUTH_PATTERNS = {
  SIGNUP: 'auth.signup',
  LOGIN: 'auth.login',
} as const;

// libs/contracts/src/auth/auth.payloads.ts
export interface SignupPayload {
  readonly email: string;
  readonly password: string;
  readonly name: string;
}

export interface AuthContext {
  readonly userId: number;
  readonly accountId: string;
  readonly roleName: string;
  readonly organizationId: number | null;
}
```

## 🎯 Checklist for Claude

When generating code:

- [ ] Feature-led structure utilized (`apps/<service>/src/<feature>/`)
- [ ] New patterns/payloads added to `libs/contracts/` first
- [ ] Gateway controller uses `ClientProxy.send()` — zero business logic
- [ ] Auth-service controller uses `@MessagePattern` — delegates to service
- [ ] `AUTH_SERVICE` injected via `@Inject(AUTH_SERVICE)` — never imported directly from another module
- [ ] New service clients added to `MicroservicesClientModule`, not to feature modules
- [ ] `@app/prisma` imported only in `auth-service/src/app.module.ts`
- [ ] Followed all 7 Variable Naming Principles
- [ ] Explicit return types implemented without any implicit `any`
- [ ] Functional programming enforced (immutability, logic separation)
- [ ] DTO Validation applied rigorously (gateway boundary only)
- [ ] Input handling bounded by Controller, Business Logic by Service, Queries by Repository
- [ ] Unit + E2E tests authored following the AAA structure
- [ ] Gateway controller tests mock `ClientProxy`, not the service
- [ ] Appropriate procedural knowledge from `.agents/skills/` leveraged
