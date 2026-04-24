# Auth and Security

All authentication and authorization logic is enforced in `api-gateway`. The gateway never delegates guard decisions to `auth-service` — it validates JWTs locally, checks API keys, and enforces role requirements before any TCP message is sent.

## Global Guard Stack

Guards are applied globally in `api-gateway/src/main.ts` in this order:

```
1. ApiKeyGuard
2. JwtAuthGuard
3. RolesGuard
```

Order matters. API key checking runs first; if a request carries a Bearer token instead of an API key, `ApiKeyGuard` passes it through to `JwtAuthGuard` for JWT validation.

## Guard Behavior

### `ApiKeyGuard`

Defined in `apps/api-gateway/src/common/guards/api-key.guard.ts`.

Logic:

1. If the route has `@Open()` metadata → pass immediately (skip all guards)
2. If the request has an `Authorization: Bearer ...` header → pass (JWT guard will validate it)
3. Otherwise, require `x-api-key` header to equal `X_API_KEY` env var

```
x-api-key: <X_API_KEY>
```

### `JwtAuthGuard`

Extends Passport's `AuthGuard('jwt')`. Defined in `apps/api-gateway/src/common/guards/jwt-auth.guard.ts`.

Logic:

1. If the route has `@Open()` metadata → pass immediately
2. If the route has `@Public()` metadata → pass immediately
3. Otherwise, require a valid `Authorization: Bearer <jwt>` header

On success, Passport populates `request.user` with the decoded `JwtPayload` (cast to `AuthContext`). This `request.user` object is what `@User()` decorator extracts in gateway controllers.

### `RolesGuard`

Defined in `apps/api-gateway/src/common/guards/roles.guard.ts`.

Logic:

1. If no `@Roles(...)` metadata on the handler → pass (no role restriction)
2. If `request.user.roleName` is in the required roles array → pass
3. Otherwise → throw `ForbiddenException`

### `GoogleAuthGuard`

Extends `AuthGuard('google')`. Used explicitly on OAuth endpoints with `@UseGuards(GoogleAuthGuard)`. Initiates and handles the Google OAuth 2.0 redirect flow.

## Route Access Decorators

| Decorator            | Effect                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------- |
| _(none)_             | Full guard stack applies — API key or JWT required, roles checked if `@Roles()` present |
| `@Public()`          | Skips JWT check; API key still required unless Bearer token is present                  |
| `@Open()`            | Skips API key AND JWT — use only for OAuth handshake endpoints                          |
| `@Roles('roleName')` | Requires `request.user.roleName` to match                                               |

## JWT Model — Local Validation

JWT tokens are signed by `auth-service` at login time but **validated locally in the gateway**. The token payload embeds all information the gateway needs to authorize a request:

```typescript
export interface JwtPayload {
  sub: number; // user numeric id
  accountId: string; // account UUID
  name: string; // display name
  roleId: number;
  roleName: string; // used by RolesGuard
  organizationId: number | null;
  email?: string;
  msisdn?: string;
  iat?: number;
  exp?: number;
}
```

`JwtStrategy` in the gateway verifies the token signature against `JWT_SECRET` and maps the payload to `AuthContext`. No TCP call to auth-service is made for JWT validation. This keeps latency low and prevents a single point of failure from breaking all authenticated requests.

Key JWT constants:

| Constant             | Value        |
| -------------------- | ------------ |
| JWT expiration       | `7d`         |
| Refresh token window | `90 days`    |
| Max login attempts   | `5`          |
| Lockout duration     | `15 minutes` |
| bcrypt rounds        | `10`         |

## `RpcExceptionFilter`

When `auth-service` throws a NestJS HTTP exception (e.g., `NotFoundException`, `ConflictException`), the NestJS microservices layer serializes it into an `RpcException` before sending it back over TCP.

`RpcExceptionFilter` in the gateway catches these and reconstructs the original HTTP response shape:

```typescript
@Catch(RpcException)
export class RpcExceptionFilter implements ExceptionFilter {
  catch(exception: RpcException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const error = exception.getError();
    // reconstruct status code and message from the serialized error object
    response.status(error.statusCode).json(error);
  }
}
```

This filter is registered globally in `api-gateway/src/main.ts`. Developers never need to manually catch `RpcException` in gateway controllers — simply `return firstValueFrom(this.authClient.send(...))` and the filter handles failure cases.

## Google OAuth Flow

Google OAuth lives entirely in the gateway because it is HTTP-facing (OAuth requires browser redirects). The auth-service only handles the final account lookup/creation over TCP.

Full flow:

```
1. Client visits GET /v1/auth/google (@Open(), GoogleAuthGuard)
   → Gateway redirects browser to Google consent screen

2. Google redirects back to GET /v1/auth/google/callback (@Open(), GoogleAuthGuard)
   → GoogleStrategy.validate() receives profile data

3. Gateway sends TCP message to auth-service:
   authClient.send(AUTH_PATTERNS.GOOGLE_CALLBACK, googleProfile)

4. auth-service looks up or creates account, returns auth tokens

5. Gateway redirects browser to FRONTEND_AUTH_CALLBACK_URL
   with hash fragment: #accessToken=...&refreshToken=...
```

`GoogleStrategy` is defined in `apps/api-gateway/src/auth/strategies/google.strategy.ts`. It handles only the OAuth handshake. All persistence is delegated to auth-service via `AUTH_PATTERNS.GOOGLE_CALLBACK`.

## Rate Limiting

Global throttler presets registered in `api-gateway/src/app.module.ts`:

| Preset   | Limit                     |
| -------- | ------------------------- |
| `short`  | 10 requests / 1 second    |
| `medium` | 30 requests / 10 seconds  |
| `long`   | 100 requests / 60 seconds |

Auth endpoints (login, OTP request, password reset) apply stricter per-route throttle decorators on top of the global presets.

## Validation and Input Hardening

Global `ValidationPipe` is configured in the gateway:

```typescript
new ValidationPipe({
  whitelist: true, // strip unknown properties
  forbidNonWhitelisted: true, // reject requests with unknown properties
  transform: true, // transform payloads to DTO class instances
  transformOptions: {
    enableImplicitConversion: true,
  },
});
```

This means all DTO class-validator rules are enforced at the HTTP boundary, before any data is sent over TCP to auth-service. Auth-service controllers trust that incoming payloads are already valid.

## Secure Usage Checklist

- Set a strong, random `JWT_SECRET` (minimum 32 characters)
- Set a strong, random `X_API_KEY`
- Use HTTPS in non-local environments (gateway behind a TLS-terminating proxy)
- Restrict CORS origins (current config enables CORS globally — tighten for production)
- Keep `GOOGLE_CALLBACK_URL` environment-specific and exact-match what is registered in Google Cloud Console
- Rotate `JWT_SECRET` and `X_API_KEY` on a schedule
- In Docker/Kubernetes: `AUTH_SERVICE_HOST` should be the internal service name, not `localhost`
- Never expose auth-service TCP port (9012) to the public internet
