# Database and Prisma

## Database Access Pattern

Only `auth-service` accesses the database directly. The `api-gateway` never connects to PostgreSQL. This is an intentional boundary in the microservices architecture: the gateway proxies requests to auth-service, which owns all data persistence.

```
api-gateway   →  (TCP)  →  auth-service  →  PostgreSQL
               no DB                      only service
               access                     with DB access
```

This design means `@app/prisma` is only imported in `auth-service/src/app.module.ts`. If you find yourself importing `PrismaModule` in a gateway module, that is a violation of the service boundary.

## `@app/prisma` Library Design

The shared library at `libs/prisma/src/` provides:

- `PrismaModule` — exported as a `@Global()` NestJS module so `PrismaService` is available anywhere in auth-service without per-module imports
- `PrismaService` — wraps the Prisma client lifecycle (connect, disconnect) and selects the runtime adapter from the `DB_ADAPTER` environment variable

```typescript
// libs/prisma/src/prisma.service.ts
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly config: ConfigService) {
    super({
      adapter:
        config.get('DB_ADAPTER') === 'neon'
          ? new PrismaNeon({ connectionString: config.get('DATABASE_URL') })
          : new PrismaPg({ connectionString: config.get('DATABASE_URL') }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

## Prisma Configuration

### Schema file

`prisma/schema.prisma` is the single source of truth for the data model. It is shared across the monorepo but only consumed by auth-service at runtime.

### Generator output

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
  engine   = "client"
}
```

The generated client is written to `generated/prisma/` (not the default `node_modules/.prisma/`). Import from there:

```typescript
import { User, Account } from 'generated/prisma/client';
```

### Datasource

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Runtime Adapter Selection

`PrismaService` reads `DB_ADAPTER` at startup:

- `pg` → `PrismaPg` (standard PostgreSQL via `pg` driver)
- `neon` → `PrismaNeon` (Neon serverless HTTP adapter)

Both adapters use `DATABASE_URL` as the connection string.

## Environment Variables

```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname
DB_ADAPTER=pg          # pg | neon
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=secret
DB_DATABASE=mydb
```

`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_DATABASE` are used to compose the full `DATABASE_URL` in some environments. Ensure at minimum `DATABASE_URL` and `DB_ADAPTER` are set.

## Schema Model Overview

Current domain entities:

| Model          | Description                                               |
| -------------- | --------------------------------------------------------- |
| `Organization` | Top-level tenant/organization                             |
| `Roles`        | Role definitions                                          |
| `User`         | User profile linked to a role and optional organization   |
| `Account`      | Authentication credential (email, MSISDN, or Google)      |
| `OTP`          | One-time passwords for verification and login             |
| `RefreshToken` | Refresh token records with expiry and revocation tracking |

Relationships:

- `User → Roles` — many-to-one (every user has exactly one role)
- `User → Organization` — optional many-to-one
- `User → Account` — one-to-many (a user can have email + MSISDN + Google accounts)
- `Account → OTP` — one-to-many
- `Account → RefreshToken` — one-to-many

Important enums:

```prisma
enum AccountType {
  EMAIL
  MSISDN
  GOOGLE
}

enum OTPType {
  EMAIL_VERIFICATION
  MSISDN_VERIFICATION
  LOGIN
  PASSWORD_RESET
}
```

Schema conventions:

- UUID primary keys: `@id @default(uuid())`
- Audit fields on all models: `created_by`, `updated_by`, `created_at`, `updated_at`
- Prisma enums for fixed value sets

## Typical Prisma Commands

```bash
# Regenerate client after schema changes
pnpm prisma generate

# Create and apply a new migration
pnpm prisma migrate dev --name <description>

# Open Prisma Studio (GUI for inspecting data)
pnpm prisma studio
```

## Migration Workflow

Any time `prisma/schema.prisma` changes:

1. Edit the schema
2. Run `pnpm prisma migrate dev --name <meaningful-description>`
3. Run `pnpm prisma generate` (migrate dev usually does this automatically, but run explicitly to be safe)
4. Update any DTOs, repository queries, or service logic that depend on the changed fields
5. Update tests for changed data shapes
6. Commit the migration file alongside the schema change — never commit a schema change without its migration

## Query Patterns

All Prisma queries are contained in repository classes inside `auth-service`. Services never call `prisma.*` directly.

### Repository structure

```typescript
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findAll(
    skip: number,
    take: number,
    filters: UserFilters,
  ): Promise<User[]> {
    return this.prisma.user.findMany({
      where: buildUserWhereClause(filters),
      skip,
      take,
      orderBy: { created_at: 'desc' },
    });
  }
}
```

### Transactions

Use `prisma.$transaction()` for operations that must succeed or fail together:

```typescript
async updateUserWithAccount(userId: number, dto: UpdateUserDto): Promise<User> {
  return this.prisma.$transaction(async (tx) => {
    const user = await tx.user.update({ where: { id: userId }, data: dto.userFields });
    await tx.account.update({ where: { userId }, data: dto.accountFields });
    return user;
  });
}
```

The users update flow uses a transaction to atomically update both the `User` and `Account` records while checking uniqueness constraints.

## Shared-DB Microservices Pattern — Tradeoffs

This starter uses a **shared database** across all services. Only one service (`auth-service`) accesses it, but if you add a second service (e.g., `notifications-service`) that also needs user data, you have two options:

**Option A: All services share the same DB**

- Simpler to operate — one DB to manage, migrate, and back up
- Risk of schema coupling — a migration for one service can affect another
- Suitable for early-stage products or small teams

**Option B: Each service has its own DB**

- True service isolation — services can migrate schemas independently
- Cross-service data access requires explicit TCP calls (e.g., notifications-service asks auth-service for user info)
- More operational overhead — multiple DBs to provision and monitor

This starter uses Option A for simplicity, with the constraint that only `auth-service` is the DB owner. If you add other services, do not give them direct DB access — route their data needs through auth-service TCP patterns or introduce their own dedicated database.

## Production Notes

- Never commit `DATABASE_URL` or any credentials to source control
- Use a managed PostgreSQL provider (AWS RDS, GCP Cloud SQL, Neon, Supabase) in production
- Commit all migration files — do not use `prisma migrate deploy --force` to reset production
- Index frequently-queried columns (the schema should include `@@index` for search and filter fields)
- Connection pooling: use PgBouncer or the Neon serverless adapter for high-concurrency deployments
- Run `pnpm prisma migrate deploy` (not `dev`) in production environments
