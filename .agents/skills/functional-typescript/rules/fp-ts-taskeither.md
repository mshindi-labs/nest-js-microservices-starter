---
name: fp-ts-taskeither
description: >
  Use TaskEither<E, A> for async operations that can fail. It is lazy
  (nothing runs until called), composable (chain without try/catch), and
  typed (errors are in the signature). Covers tryCatch, chain, parallel,
  error recovery, Do notation, and when to use Task vs TaskEither.
impact: HIGH
category: fp-ts Library
---

# fp-ts-taskeither — Async with Typed Errors

**Impact: HIGH** — eliminates async/await try-catch ladders; keeps error types
explicit and composable throughout the entire call chain

`TaskEither<E, A>` ≡ `() => Promise<Either<E, A>>`

- **Lazy** — nothing executes until you call the returned function
- **Typed errors** — Left = failure, Right = success, both in the signature
- **Composable** — chain, parallel, recover without nested try/catch

## Incorrect (async/await + try-catch ladder)

```typescript
async function processOrder(orderId: string): Promise<Receipt> {
  const order = await fetchOrder(orderId);
  if (!order) throw new Error('Order not found');

  const validated = await validateOrder(order);
  if (!validated.success) throw new Error(validated.error);

  const payment = await processPayment(validated.order);
  if (!payment.success) throw new Error('Payment failed');

  return generateReceipt(payment);
}
// Caller has no idea what can throw or what the error shape is
```

## Correct (TaskEither — errors in the type, no try/catch)

```typescript
const processOrder = (orderId: string): TE.TaskEither<OrderError, Receipt> =>
  pipe(
    fetchOrderTE(orderId),
    TE.chain(validateOrderTE),
    TE.chain(processPaymentTE),
    TE.map(generateReceipt),
  );

// Execute and pattern match at the edge
const result = await pipe(
  processOrder('ord-123'),
  TE.fold(
    (err) => T.of(handleError(err)),
    (data) => T.of(renderReceipt(data)),
  ),
)();
```

## Lifting a Promise into TaskEither

```typescript
// Primary constructor: wrap any throwing async code
const fetchUser = (id: string): TE.TaskEither<ApiError, User> =>
  TE.tryCatch(
    async () => {
      const res = await fetch(`/api/users/${id}`);
      if (!res.ok) throw { status: res.status };
      return res.json() as User;
    },
    (e): ApiError => ({
      code: 'FETCH_ERROR',
      message: e instanceof Error ? e.message : 'Unknown',
      status: (e as any)?.status ?? 500,
    }),
  );
```

## Chaining sequential operations

```typescript
// Each step receives the value from the previous Right
const getUserOrg = (userId: string): TE.TaskEither<Error, Org> =>
  pipe(
    fetchUser(userId),
    TE.chain((user) => fetchTeam(user.teamId)),
    TE.chain((team) => fetchOrg(team.orgId)),
  );

// chainW widens the error union (different error types per step)
const result = pipe(
  validateInput(raw), // TE<ValidationError, Input>
  TE.chainW(callApi), // TE<ValidationError | ApiError, Response>
  TE.chainW(saveToDb), // TE<ValidationError | ApiError | DbError, Record>
);
```

## Parallel execution

```typescript
// traverseArray — parallel map over an array (fail-fast)
const fetchAll = (ids: string[]): TE.TaskEither<Error, readonly User[]> =>
  pipe(ids, TE.traverseArray(fetchUser));

// sequenceT — parallel tuple of independent operations
const fetchDashboard = sequenceT(TE.ApplyPar)(
  fetchUsers(),
  fetchOrders(),
  fetchMetrics(),
); // TE<Error, [User[], Order[], Metric[]]>

// Sequential array (for rate limiting / ordered side effects)
const fetchSequential = pipe(ids, A.traverse(TE.ApplicativeSeq)(fetchUser));

// Batched parallel (process N at a time)
const fetchInBatches = (
  ids: string[],
  batchSize: number,
): TE.TaskEither<Error, User[]> => {
  const chunks = (arr: string[]) =>
    Array.from({ length: Math.ceil(arr.length / batchSize) }, (_, i) =>
      arr.slice(i * batchSize, (i + 1) * batchSize),
    );
  return pipe(
    chunks(ids),
    A.traverse(TE.ApplicativeSeq)((batch) =>
      pipe(batch, TE.traverseArray(fetchUser)),
    ),
    TE.map((batches) => batches.flatMap((b) => Array.from(b))),
  );
};
```

## Error recovery

```typescript
// orElse — try an alternative when the primary fails
const fetchWithFallback = pipe(
  fetchFromPrimaryApi(id),
  TE.orElse(() => fetchFromBackupApi(id)),
);

// Conditional recovery — only handle specific errors
const recoverNotFound = pipe(
  fetchUser(id),
  TE.orElse(
    (error) =>
      error.code === 'NOT_FOUND'
        ? TE.right(createDefaultUser(id))
        : TE.left(error), // re-raise other errors
  ),
);

// Alt chain — waterfall of fallbacks
const getConfig = pipe(
  fetchRemoteConfig(),
  TE.alt(() => loadLocalConfig()),
  TE.alt(() => TE.right(defaultConfig)),
);
```

## Do notation for multi-step workflows

Use `TE.bind` when a step depends on earlier values, `TE.apS` for independent values:

```typescript
const processCheckout = (userId: string, cartId: string) =>
  pipe(
    TE.Do,
    TE.bind('user', () => fetchUser(userId)),
    TE.bind('cart', () => fetchCart(cartId)),
    // Validate before continuing
    TE.filterOrElse(
      ({ cart }) => cart.items.length > 0,
      () => ({ code: 'EMPTY_CART' as const, message: 'Cart is empty' }),
    ),
    // Independent values — use apS (no dependency on earlier binds)
    TE.apS('config', fetchAppConfig()),
    // Dependent
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

## Retry with exponential backoff

```typescript
const withRetry = <E, A>(
  operation: TE.TaskEither<E, A>,
  maxRetries: number,
  delayMs: number,
): TE.TaskEither<E, A> =>
  pipe(
    operation,
    TE.orElse((err) =>
      maxRetries > 0
        ? pipe(
            T.delay(delayMs)(T.of(undefined)),
            T.chain(() => withRetry(operation, maxRetries - 1, delayMs * 2)),
          )
        : TE.left(err),
    ),
  );
```

## Task vs TaskEither — when to use which

| Use `Task<A>`             | Use `TaskEither<E, A>`          |
| ------------------------- | ------------------------------- |
| Operation cannot fail     | Operation can fail              |
| Errors handled elsewhere  | Errors are part of the contract |
| Fire-and-forget analytics | API calls, DB queries, file I/O |
| Delay / sleep             | Auth, validation, payments      |

```typescript
// Task — infallible async
const delay =
  (ms: number): T.Task<void> =>
  () =>
    new Promise((resolve) => setTimeout(resolve, ms));

// TaskEither to Task — handle error and provide default
const safeUser = pipe(
  fetchUser(id),
  TE.getOrElse(() => T.of(anonymousUser)),
); // Task<User>

// Task to TaskEither — promote infallible to fallible context
const liftedDelay: TE.TaskEither<never, void> = pipe(
  delay(1000),
  T.map(E.right),
);
```

## Executing TaskEither

```typescript
// Pattern match at the entry point (HTTP handler, CLI, etc.)
const handler = async (req: Request): Promise<Response> => {
  const result = await pipe(
    processRequest(req),
    TE.fold(
      (err) => T.of(errorResponse(err)),
      (data) => T.of(successResponse(data)),
    ),
  )();
  return result;
};

// Or get the Either and handle imperatively
const either = await fetchUser('123')();
if (E.isLeft(either)) return console.error(either.left);
console.log(either.right.name);
```

## Repository pattern

```typescript
interface DbError { code: 'NOT_FOUND' | 'DUPLICATE' | 'CONNECTION'; message: string }

const userRepo = (db: Database) => ({
  findById: (id: string): TE.TaskEither<DbError, User> =>
    pipe(
      TE.tryCatch(
        () => db.query('SELECT * FROM users WHERE id = ?', [id]),
        (e): DbError => ({ code: 'CONNECTION', message: String(e) })
      ),
      TE.chain(rows =>
        rows.length === 0
          ? TE.left({ code: 'NOT_FOUND', message: `User ${id} not found` })
          : TE.right(rows[0] as User)
      )
    ),

  save: (user: User): TE.TaskEither<DbError, User> =>
    TE.tryCatch(
      () => db.query('INSERT INTO users ... ON CONFLICT DO UPDATE ...', [...]),
      (e): DbError =>
        String(e).includes('UNIQUE')
          ? { code: 'DUPLICATE', message: 'Email already exists' }
          : { code: 'CONNECTION', message: String(e) }
    ),
})
```
