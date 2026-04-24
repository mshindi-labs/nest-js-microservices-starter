# API Reference

All routes are served by `api-gateway` on port 9011. For routes that proxy to `auth-service`, the TCP message pattern used is noted in each entry. The gateway sends `authClient.send(PATTERN, payload)` and returns the result directly to the client.

## Base URL and Versioning

- URI versioning is enabled with default version `v1`
- Most controllers resolve under `/v1/...`
- `AppController` (`/` and `/health`) is version-neutral

## Auth Header Reference

| Scenario              | Header Required                                           |
| --------------------- | --------------------------------------------------------- |
| Route is `@Open()`    | None                                                      |
| Route is `@Public()`  | `x-api-key: <X_API_KEY>` (unless Bearer token present)    |
| Protected route       | `Authorization: Bearer <jwt>` or `x-api-key: <X_API_KEY>` |
| Role-restricted route | Valid JWT with matching `roleName` in payload             |

---

## Utility Endpoints (version-neutral, no auth)

### `GET /`

- Guard: `@Open()`
- TCP pattern: none (handled directly in gateway `AppController`)
- Response: `{ "message": "OK!" }`

### `GET /health`

- Guard: `@Open()`
- TCP pattern: none (handled directly in gateway)
- Response includes:
  - `status`
  - `uptime`, `uptimePretty`
  - `timestamp`
  - `memory` (process memory usage)
  - `cpu` (platform/load summary)

---

## Auth Endpoints (`/v1/auth`)

All auth routes proxy to `auth-service` using the patterns defined in `AUTH_PATTERNS` (`@app/contracts`).

### `POST /v1/auth/signup`

- Guard: `@Public()` + throttled (medium preset)
- TCP pattern: `auth.signup`
- Body: `SignupDto` (email or msisdn, password, name, roleId optional)
- Response: `{ accessToken, refreshToken, user }`

### `POST /v1/auth/login`

- Guard: `@Public()` + throttled (short preset)
- TCP pattern: `auth.login`
- Body: `LoginDto` (email/msisdn + password)
- Response: `{ accessToken, refreshToken, user }`
- Throws `401` after `MAX_LOGIN_ATTEMPTS` (5) consecutive failures; lockout lasts 15 minutes

### `POST /v1/auth/refresh`

- Guard: `@Public()`
- TCP pattern: `auth.refresh`
- Body: `{ refreshToken: string }`
- Response: `{ accessToken, refreshToken, user }`
- Refresh tokens expire after 90 days

### `GET /v1/auth/me`

- Guard: JWT required
- TCP pattern: `auth.me`
- Payload sent to auth-service: derived from `request.user` (`AuthContext`)
- Response: current account with nested user profile

### `PATCH /v1/auth/password/update`

- Guard: JWT required
- TCP pattern: `auth.password.update`
- Body: `{ currentPassword: string, newPassword: string }`
- Response: success confirmation

### `POST /v1/auth/password/reset/request`

- Guard: `@Public()` + throttled (long preset)
- TCP pattern: `auth.password.reset.request`
- Body: `{ email: string }` or `{ msisdn: string }`
- Response: success confirmation (OTP is sent via email/SMS)

### `PATCH /v1/auth/password/reset`

- Guard: `@Public()`
- TCP pattern: `auth.password.reset`
- Body: `{ otp: string, newPassword: string, email?: string, msisdn?: string }`
- Response: success confirmation

### `POST /v1/auth/otp/request`

- Guard: `@Public()` + throttled (short preset)
- TCP pattern: `auth.otp.request`
- Body: `{ email?: string, msisdn?: string, type: OTPType }`
- Response: success confirmation

### `POST /v1/auth/otp/resend`

- Guard: `@Public()` + throttled (short preset)
- TCP pattern: `auth.otp.resend`
- Body: `{ email?: string, msisdn?: string, type: OTPType }`
- Response: success confirmation (invalidates previous OTP before issuing new one)

### `POST /v1/auth/otp/verify`

- Guard: `@Public()` + throttled (short preset)
- TCP pattern: `auth.otp.verify`
- Body: `{ otp: string, email?: string, msisdn?: string, type: OTPType }`
- Response: `{ accessToken, refreshToken, user }` (on `LOGIN` type) or success flag

### `GET /v1/auth/google`

- Guard: `@Open()` + `@UseGuards(GoogleAuthGuard)`
- TCP pattern: none at this step
- Behavior: redirects browser to Google OAuth consent screen
- Note: `GoogleStrategy` in gateway handles the OAuth initiation

### `GET /v1/auth/google/callback`

- Guard: `@Open()` + `@UseGuards(GoogleAuthGuard)`
- TCP pattern: `auth.google.callback`
- Behavior: receives Google profile from `GoogleStrategy.validate()`, sends to auth-service, then redirects browser to `FRONTEND_AUTH_CALLBACK_URL#accessToken=...&refreshToken=...`
- Note: auth-service handles account lookup/creation; gateway handles the redirect

---

## Users Endpoints (`/v1/users`)

All users routes proxy to `auth-service` using the patterns defined in `USERS_PATTERNS` (`@app/contracts`).

### `GET /v1/users`

- Guard: JWT required
- TCP pattern: `users.findAll`
- Query params:
  - `page` (number, default: 1)
  - `size` (number, default: 20)
  - `role_id` (number, optional filter)
  - `search` (string, optional — matches against name, email, or msisdn)
- Response shape:

```json
{
  "records": [],
  "page": 1,
  "size": 20,
  "count": 0,
  "pages": 0
}
```

### `GET /v1/users/user/:user_id`

- Guard: JWT required
- TCP pattern: `users.findById`
- Path param: `user_id` (numeric id)
- Response: single user object with nested account and role

### `GET /v1/users/user/:user_id/profile-status`

- Guard: JWT required
- TCP pattern: `users.profileStatus`
- Path param: `user_id` (numeric id)
- Response:

```json
{
  "isProfileComplete": true,
  "hasDefaultName": false,
  "hasDefaultRole": false
}
```

### `POST /v1/users`

- Guard: JWT required
- TCP pattern: `users.create`
- Body: `CreateUserDto` (name, email/msisdn, roleId optional — falls back to default role)
- Response: created user object

### `PATCH /v1/users/user/:user_id`

- Guard: JWT required
- TCP pattern: `users.update`
- Path param: `user_id` (numeric id)
- Body: `UpdateUserDto` (partial fields)
- Note: email/msisdn updates run in a Prisma transaction and check uniqueness conflicts
- Response: updated user object

### `DELETE /v1/users/user/:user_id`

- Guard: JWT required
- TCP pattern: `users.delete`
- Path param: `user_id` (numeric id)
- Response: `204 No Content`

---

## Swagger

- UI: `http://localhost:9011/api-docs`
- JSON schema: `http://localhost:9011/api-docs/json`

Swagger is configured with Bearer auth named `access-token`. Use the "Authorize" button in the Swagger UI to provide your JWT for interactive testing.

---

## OTP Type Reference

`OTPType` enum values used in OTP endpoints:

| Value                 | Purpose                     |
| --------------------- | --------------------------- |
| `EMAIL_VERIFICATION`  | Verify email address        |
| `MSISDN_VERIFICATION` | Verify phone number         |
| `LOGIN`               | OTP-based login             |
| `PASSWORD_RESET`      | Password reset confirmation |

---

## Error Response Shape

All errors (including those originating in `auth-service` and unwrapped by `RpcExceptionFilter`) follow this shape:

```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

Validation errors return:

```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be longer than 8 characters"
  ],
  "error": "Bad Request"
}
```
