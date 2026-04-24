---
name: fp-ts-do-notation
description: >
  Use Do notation (Do + bind + apS + bindTo) to sequence fp-ts computations
  that depend on earlier results while keeping all intermediate values in scope.
  Applies to Either, Option, TaskEither, and ReaderTaskEither.
impact: MEDIUM-HIGH
category: fp-ts Library
---

# fp-ts-do-notation — Sequential Computation with Named Bindings

**Impact: MEDIUM-HIGH** — the idiomatic alternative to async/await inside
fp-ts containers; keeps all named values in scope without manual tuple threading

## When to use Do notation

Use it when:

- A step needs a value produced by an **earlier** step in the same pipeline
- You need to carry **multiple** named values forward
- Mid-pipeline validation (filterOrElse) depends on already-bound values

Do not use it for a single chain — plain `chain`/`flatMap` is cleaner there.

## Core combinators

| Combinator                   | Purpose                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| `TE.Do`                      | Start a Do block — injects `{}` as the initial value                      |
| `TE.bind('key', ctx => ...)` | Run a computation, add result to context as `key`; can reference `ctx`    |
| `TE.apS('key', operation)`   | Like `bind` but **independent** — runs in parallel with other `apS` calls |
| `TE.bindTo('key')`           | Lift an existing computation into a single-key context `{ key: ... }`     |

## Incorrect (threading tuples manually)

```typescript
// Hard to read — tuples grow and destructuring is fragile
const result = pipe(
  fetchUser(id),
  TE.chain((user) =>
    pipe(
      fetchTeam(user.teamId),
      TE.map((team) => [user, team] as const),
    ),
  ),
  TE.chain(([user, team]) =>
    pipe(
      fetchOrg(team.orgId),
      TE.map((org) => ({ user, team, org })),
    ),
  ),
);
```

## Correct (Do notation — all values stay in scope)

```typescript
const getUserContext = (userId: string) =>
  pipe(
    TE.Do,
    TE.bind('user', () => fetchUser(userId)),
    TE.bind('team', ({ user }) => fetchTeam(user.teamId)), // depends on user
    TE.bind('org', ({ team }) => fetchOrg(team.orgId)), // depends on team
    TE.map(({ user, team, org }) => buildContext(user, team, org)),
  );
```

## Independent values — use apS (parallel)

`apS` does not receive the accumulated context, so it cannot reference previous
bindings — but it may execute in parallel with other `apS` calls:

```typescript
const enrichOrder = (orderId: string) =>
  pipe(
    TE.Do,
    TE.bind('order', () => fetchOrder(orderId)), // must run first
    // These are independent — run in parallel:
    TE.apS('config', fetchAppConfig()),
    TE.apS('features', fetchFeatureFlags()),
    // Depends on order — must be bind, not apS:
    TE.bind('user', ({ order }) => fetchUser(order.userId)),
    TE.map(({ order, config, features, user }) =>
      applyFeatureFlags({ order, config, features, user }),
    ),
  );
```

## Mid-pipeline validation with filterOrElse

```typescript
const processCheckout = (userId: string, cartId: string) =>
  pipe(
    TE.Do,
    TE.bind('user', () => fetchUser(userId)),
    TE.bind('cart', () => fetchCart(cartId)),
    TE.filterOrElse(
      // validate before continuing
      ({ cart }) => cart.items.length > 0,
      () => ({ code: 'EMPTY_CART' as const, message: 'Cart is empty' }),
    ),
    TE.bind('payment', ({ user }) => getDefaultPayment(user.id)),
    TE.bind('total', ({ cart }) => TE.right(calculateTotal(cart))),
    TE.filterOrElse(
      ({ payment, total }) => payment.limit >= total,
      ({ total }) => ({
        code: 'LIMIT_EXCEEDED' as const,
        message: `Total ${total} exceeds limit`,
      }),
    ),
    TE.chain((ctx) => createOrder(ctx)),
  );
```

## bindTo — lift an existing TE into Do context

When you already have a value from outside the Do block and want to merge it in:

```typescript
const enrichUser = (userId: string) =>
  pipe(
    fetchUser(userId), // TE<Error, User>
    TE.bindTo('user'), // TE<Error, { user: User }>
    TE.apS('config', fetchAppConfig()),
    TE.bind('prefs', ({ user }) => fetchPreferences(user.id)),
    TE.map(({ user, config, prefs }) => merge(user, config, prefs)),
  );
```

## Either and Option also support Do notation

```typescript
// Either Do
const parseUser = (data: unknown): E.Either<string, User> =>
  pipe(
    E.Do,
    E.bind('email', () => validateEmail(data)),
    E.bind('age', () => validateAge(data)),
    E.map(({ email, age }) => ({ email, age })),
  );

// Option Do
const getAddress = (id: string): O.Option<Address> =>
  pipe(
    O.Do,
    O.bind('user', () => findUser(id)),
    O.bind('address', ({ user }) => O.fromNullable(user.address)),
    O.map(({ address }) => address),
  );
```

## Anti-patterns

```typescript
// ❌ Using bind for values that don't depend on context — use apS
pipe(
  TE.Do,
  TE.bind('a', () => fetchA()),
  TE.bind('b', () => fetchB()), // independent of 'a' but written as bind
);

// ✓ Use apS for independent values — communicates intent and enables parallelism
pipe(TE.Do, TE.apS('a', fetchA()), TE.apS('b', fetchB()));

// ❌ Nesting Do blocks unnecessarily
pipe(
  TE.Do,
  TE.bind('x', () =>
    pipe(
      TE.Do,
      TE.bind('inner', () => fetch()),
      TE.map(({ inner }) => inner),
    ),
  ),
);

// ✓ Flatten — extract helper functions instead
const fetchInner = (): TE.TaskEither<Error, Inner> =>
  pipe(
    TE.Do,
    TE.bind('inner', () => fetch()),
    TE.map((ctx) => ctx.inner),
  );

pipe(TE.Do, TE.bind('x', fetchInner));
```
