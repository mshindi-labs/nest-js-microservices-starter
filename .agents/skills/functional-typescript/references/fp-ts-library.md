# fp-ts Library Reference

Practical patterns for the `fp-ts` ecosystem. Use this when the codebase imports
from `fp-ts/*`.

---

## pipe vs flow — Decision Rule

|           | `pipe`            | `flow`                        |
| --------- | ----------------- | ----------------------------- |
| First arg | a **value**       | a **function**                |
| Executes  | immediately       | deferred (returns a function) |
| Use when  | you have data now | building a reusable transform |

```typescript
// pipe — transform data now
const result = pipe(rawInput, S.trim, S.toLowerCase, (s) =>
  s.replace(/\s+/g, '-'),
);

// flow — build a reusable function
const toSlug = flow(S.trim, S.toLowerCase, (s: string) =>
  s.replace(/\s+/g, '-'),
);

users.map((u) => toSlug(u.displayName));
```

**Golden rule for pipelines:** Config/predicate first, data last — curried fp-ts
functions follow this convention so they slot directly into `pipe`/`flow`.

```typescript
// fp-ts curried style: predicate first, array last
pipe(
  numbers,
  A.filter((n) => n > 0),
); // ✓
pipe(
  numbers,
  A.map((n) => n * 2),
); // ✓
```

---

## Option — Nullable Without null

### When to use

Use `Option` when a value may legitimately be absent and **the reason doesn't matter**.
If the reason matters, use `Either` instead.

### Core API

```typescript
// Constructors
O.some(42); // Some<number>
O.none; // None
O.fromNullable(user); // None if null/undefined, Some otherwise
O.fromPredicate((n) => n > 0)(value); // Some if predicate passes

// Transform (stays in Option context)
pipe(
  maybeUser,
  O.map((u) => u.name),
); // Option<string>
pipe(
  maybeUser,
  O.flatMap((u) => O.fromNullable(u.email)),
); // Option<string>, no nesting

// Extract (leaves Option context)
pipe(
  maybeUser,
  O.getOrElse(() => defaultUser),
);
pipe(
  maybeUser,
  O.fold(
    () => 'none',
    (u) => u.name,
  ),
);
pipe(
  maybeUser,
  O.match(
    () => 'none',
    (u) => u.name,
  ),
); // alias of fold

// Filter
pipe(
  maybeUser,
  O.filter((u) => u.age >= 18),
);

// Combine
O.sequenceArray([O.some(1), O.some(2)]); // Some([1, 2])
O.sequenceArray([O.some(1), O.none]); // None
```

### Anti-patterns

```typescript
// ❌ Don't use isSome/isNone for control flow — use fold/match
if (O.isSome(user)) { ... }

// ✓ Use fold to handle both branches
pipe(user, O.fold(() => handleAbsent(), u => handlePresent(u)))

// ❌ Don't map and then nest
pipe(user, O.map(u => O.fromNullable(u.email)))  // Option<Option<string>>

// ✓ Use flatMap to flatten
pipe(user, O.flatMap(u => O.fromNullable(u.email)))  // Option<string>

// ❌ Don't extract too early
const u = pipe(maybeUser, O.getOrElse(() => default)).email

// ✓ Stay in Option context
pipe(maybeUser, O.map(u => u.email), O.getOrElse(() => ''))
```

---

## Either — Typed Error Handling

### When to use

Use `Either` when an operation can fail and the **reason for failure matters**.
`Right` = success, `Left` = failure.

### Core API

```typescript
// Constructors
E.right(42); // Right<number>
E.left('not found'); // Left<string>
E.tryCatch(
  () => JSON.parse(s),
  (e) => String(e),
); // wraps throwing code
E.fromNullable('missing')(nullable); // Left if null
E.fromPredicate(
  (n) => n >= 0,
  (n) => `negative: ${n}`,
)(n);

// Transform
pipe(
  result,
  E.map((n) => n * 2),
); // maps Right
pipe(
  result,
  E.mapLeft((e) => new AppError(e)),
); // maps Left
pipe(result, E.bimap(mapErr, mapVal)); // maps both

// Chain (flatMap)
pipe(
  result,
  E.chain((n) => divide(n, 2)),
); // sequences Either-returning fns
pipe(r1, E.chainW(r2fn)); // W = widens error union type

// Extract
pipe(result, E.fold(onLeft, onRight));
pipe(
  result,
  E.getOrElse((e) => defaultValue),
);

// Validation — accumulate ALL errors (not fail-fast)
const V = E.getApplicativeValidation(NEA.getSemigroup<string>());
const allErrors = sequenceS(V)({
  name: validateName(name),
  age: validateAge(age),
});
// Either<NonEmptyArray<string>, { name: string; age: number }>
```

### Sequential validation with Do notation

```typescript
const validateUser = (data: unknown): E.Either<string, User> =>
  pipe(
    E.Do,
    E.bind('email', () => validateEmail(data)),
    E.bind('age', () => validateAge(data)),
    E.map(({ email, age }) => ({ email, age })),
  );
```

---

## TaskEither — Async with Typed Errors

`TaskEither<E, A>` ≡ `() => Promise<Either<E, A>>`

- **Lazy**: nothing runs until you call `operation()`
- **Composable**: chain without try/catch
- `E` = error type (Left), `A` = success type (Right)

### Core API

```typescript
// Constructors
TE.right(value); // successful TE
TE.left(error); // failed TE
TE.tryCatch(() => fetch(url).then((r) => r.json()), toError); // lift Promise

// Transform
pipe(
  te,
  TE.map((v) => transform(v)),
); // maps success
pipe(
  te,
  TE.mapLeft((e) => wrapError(e)),
); // maps error
pipe(te, TE.bimap(mapErr, mapVal));

// Chain
pipe(
  te,
  TE.chain((v) => nextOperation(v)),
); // sequential
pipe(
  te,
  TE.chainW((v) => nextOperation(v)),
); // widens error union

// Error recovery
pipe(
  te,
  TE.orElse((e) => fallback()),
); // try alternative on error
pipe(
  te,
  TE.alt(() => alternative()),
); // try next if left

// Parallel
pipe(ids, TE.traverseArray(fetchById)); // parallel map
sequenceT(TE.ApplyPar)(fetchA(), fetchB(), fetchC()); // parallel tuple
A.traverse(TE.ApplicativeSeq)(fetchById)(ids); // sequential (rate limiting)

// Extract / execute
pipe(te, TE.fold(onError, onSuccess))(); // execute → Task<R>
pipe(te, TE.match(onError, onSuccess))(); // alias
const either = await operation(); // execute → Either<E, A>
```

### Typed API client pattern

```typescript
interface ApiError {
  code: string;
  message: string;
  status: number;
}

const createApiClient = (baseUrl: string) => {
  const request = <T>(
    method: string,
    path: string,
    body?: unknown,
  ): TE.TaskEither<ApiError, T> =>
    TE.tryCatch(
      async () => {
        const res = await fetch(`${baseUrl}${path}`, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw { status: res.status, ...err };
        }
        return res.json() as T;
      },
      (e): ApiError => ({
        code: 'API_ERROR',
        message: e instanceof Error ? e.message : 'Request failed',
        status: (e as any)?.status ?? 500,
      }),
    );

  return {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
    put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
    delete: <T>(path: string) => request<T>('DELETE', path),
  };
};
```

### Retry pattern

```typescript
const retry = <E, A>(
  te: TE.TaskEither<E, A>,
  retries: number,
  delayMs: number,
): TE.TaskEither<E, A> =>
  pipe(
    te,
    TE.orElse((error) =>
      retries > 0
        ? pipe(
            T.delay(delayMs)(T.of(undefined)),
            T.chain(() => retry(te, retries - 1, delayMs * 2)),
          )
        : TE.left(error),
    ),
  );
```

---

## Do Notation — Complex Workflows

Use Do notation when steps **depend on previous results** and you need to carry
values forward. Prefer `TE.apS` (not `bind`) when a step doesn't need earlier values.

```typescript
// apS = parallel-safe, no dependency on prior bindings
// bind = sequential, can reference prior bindings
const getOrderDetails = (orderId: string) =>
  pipe(
    TE.Do,
    TE.bind('order', () => fetchOrder(orderId)),
    // parallel — these don't depend on each other:
    TE.apS('config', fetchAppConfig()),
    TE.apS('features', fetchFeatureFlags()),
    // sequential — depends on order:
    TE.bind('user', ({ order }) => fetchUser(order.userId)),
    TE.bind('items', ({ order }) => fetchItems(order.itemIds)),
    // validate mid-pipeline:
    TE.filterOrElse(
      ({ order }) => order.items.length > 0,
      () => ({ code: 'EMPTY_ORDER', message: 'No items' }),
    ),
    TE.map(({ order, user, items }) => ({ order, user, items })),
  );
```

### bindTo — lift a plain value into Do context

```typescript
pipe(
  fetchUser(id),
  TE.bindTo('user'), // { user: User }
  TE.bind('profile', ({ user }) => fetchProfile(user.id)),
  TE.map(({ user, profile }) => merge(user, profile)),
);
```

---

## ReaderTaskEither — Dependency Injection

`RTE.ReaderTaskEither<Deps, E, A>` ≡ `(deps: Deps) => TaskEither<E, A>`

Use when you need to thread dependencies through a computation without
passing them explicitly to every function.

```typescript
interface Deps {
  userRepo: UserRepository;
  emailService: EmailService;
  logger: Logger;
}

const getUser =
  (id: string): RTE.ReaderTaskEither<Deps, Error, User> =>
  ({ userRepo }) =>
    userRepo.findById(id);

const sendWelcome =
  (user: User): RTE.ReaderTaskEither<Deps, Error, void> =>
  ({ emailService }) =>
    emailService.send(user.email, 'Welcome!');

const onboardUser = (id: string): RTE.ReaderTaskEither<Deps, Error, User> =>
  pipe(getUser(id), RTE.tap(sendWelcome));

// Execute by providing dependencies:
const result = await onboardUser('123')({ userRepo, emailService, logger })();
```

---

## Option ↔ Either ↔ TaskEither Conversions

```typescript
// Option → Either (provide error for None)
pipe(
  maybeValue,
  E.fromOption(() => 'was missing'),
);

// Either → Option (discards error)
pipe(eitherValue, E.toOption);

// Either → TaskEither
TE.fromEither(E.right(42));

// Option → TaskEither
pipe(
  maybeValue,
  TE.fromOption(() => new Error('missing')),
);

// TaskEither → Task (handle error, return default)
pipe(
  te,
  TE.getOrElse((e) => T.of(defaultValue)),
);
```

---

## Quick Cheat Sheet

| Goal                  | fp-ts idiom                                  |
| --------------------- | -------------------------------------------- |
| Wrap nullable         | `O.fromNullable(x)`                          |
| Chain nullable steps  | `O.flatMap(fn)`                              |
| Default if absent     | `O.getOrElse(() => d)`                       |
| Wrap throwing code    | `E.tryCatch(fn, onErr)`                      |
| Chain fallible steps  | `E.chain(fn)` / `E.flatMap(fn)`              |
| Widen error union     | `E.chainW`, `TE.chainW`                      |
| Accumulate all errors | `sequenceS(E.getApplicativeValidation(...))` |
| Lift async to TE      | `TE.tryCatch(() => promise, toError)`        |
| Parallel array        | `TE.traverseArray(fn)`                       |
| Sequential array      | `A.traverse(TE.ApplicativeSeq)(fn)`          |
| Recover from error    | `TE.orElse(fn)`                              |
| Pattern match result  | `TE.fold(onErr, onOk)` or `TE.match(...)`    |
| Complex workflow      | `pipe(TE.Do, TE.bind(...), TE.apS(...))`     |
| DI without classes    | `ReaderTaskEither`                           |
