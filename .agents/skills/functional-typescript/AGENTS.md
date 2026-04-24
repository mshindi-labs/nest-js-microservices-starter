# Functional TypeScript Best Practices

Version 1.0.0 — mshindi-labs

Comprehensive guide to writing idiomatic functional TypeScript and JavaScript.
20 rules across 7 categories, ordered by impact. Grounded in
[_You Don't Know JS Yet_](https://github.com/getify/you-dont-know-js) by Kyle Simpson,
with TypeScript type system extensions.

---

## 1. Core Principles (CRITICAL)

These three rules are the foundation. All other FP patterns flow from them.

---

### core-pure-functions — Write Pure Functions

**Impact: CRITICAL** — eliminates the entire class of bugs caused by shared mutable state

A pure function returns the same output for the same inputs and produces no
side effects. Pure functions are trivially testable, safely parallelisable,
and trivially composable. Any function that touches external state — globals,
`Date.now()`, `Math.random()`, the DOM, network, filesystem — is impure and
must be treated as a boundary, not a building block.

**Incorrect (reads external mutable state):**

```typescript
let taxRate = 0.1;

function calculateTotal(price: number): number {
  return price * (1 + taxRate); // depends on mutable external variable
}

calculateTotal(100); // 110
taxRate = 0.2;
calculateTotal(100); // 120 — same input, different output
```

**Correct (all inputs explicit):**

```typescript
function calculateTotal(price: number, taxRate: number): number {
  return price * (1 + taxRate);
}

calculateTotal(100, 0.1); // always 110
calculateTotal(100, 0.2); // always 120
```

**Incorrect (mutates external array):**

```typescript
const log: string[] = [];

function processUser(name: string): string {
  const result = name.trim().toLowerCase();
  log.push(`processed: ${result}`); // side effect
  return result;
}
```

**Correct (return data, let caller decide):**

```typescript
type ProcessResult = { value: string; logEntry: string };

function processUser(name: string): ProcessResult {
  const value = name.trim().toLowerCase();
  return { value, logEntry: `processed: ${value}` };
}

const { value, logEntry } = processUser('  Alice  ');
log.push(logEntry); // caller owns the side effect
```

---

### core-side-effect-isolation — Isolate Side Effects at the Boundaries

**Impact: CRITICAL** — keeps the pure core testable and the impure shell auditable

Side effects (I/O, network, DOM, randomness, time) are unavoidable but should
be pushed to the outermost layer of your program. The pattern is called
**Functional Core, Imperative Shell**: a pure inner core does all computation;
a thin outer shell calls the core and performs side effects with the results.

**Incorrect (logic and side effects interleaved):**

```typescript
async function syncUsers(apiUrl: string): Promise<void> {
  const response = await fetch(apiUrl);
  const data = await response.json();

  const users = data.users
    .filter((u: any) => u.active)
    .map((u: any) => ({ id: u.id, name: u.name.trim() }));

  for (const user of users) {
    await db.upsert('users', user);
    console.log(`synced: ${user.id}`);
  }
}
// Untestable without mocking fetch and db
```

**Correct (pure core, impure shell):**

```typescript
type RawUser = { id: string; name: string; active: boolean };
type User = { id: string; name: string };

// Pure core — zero side effects, fully testable
function selectActiveUsers(rawUsers: readonly RawUser[]): User[] {
  return rawUsers
    .filter((u) => u.active)
    .map((u) => ({ id: u.id, name: u.name.trim() }));
}

// Impure shell — side effects only, no logic
async function syncUsers(apiUrl: string): Promise<void> {
  const response = await fetch(apiUrl);
  const { users: rawUsers } = await response.json();
  const users = selectActiveUsers(rawUsers);
  for (const user of users) {
    await db.upsert('users', user);
    console.log(`synced: ${user.id}`);
  }
}
```

---

### core-referential-transparency — Maintain Referential Transparency

**Impact: CRITICAL** — enables safe substitution, caching, and parallel execution

A function call is referentially transparent if you can replace it with its
return value without changing the program's behaviour. Violated by hidden
inputs (`Date.now()`, `Math.random()`) and hidden outputs (mutations, I/O).

**Incorrect (hidden input):**

```typescript
function isExpired(expiryTimestamp: number): boolean {
  return Date.now() > expiryTimestamp; // untestable, non-deterministic
}
```

**Correct (inject the dependency):**

```typescript
function isExpired(expiryTimestamp: number, now: number): boolean {
  return now > expiryTimestamp;
}

isExpired(1000, 500); // always false
isExpired(1000, 2000); // always true

// Production: isExpired(token.exp, Date.now())
```

**Incorrect (non-deterministic):**

```typescript
function assignTeam(users: string[]): Record<string, string> {
  return Object.fromEntries(
    users.map((u) => [u, Math.random() > 0.5 ? 'red' : 'blue']),
  );
}
```

**Correct (inject randomness):**

```typescript
type RNG = () => number;

function assignTeam(
  users: readonly string[],
  rng: RNG = Math.random,
): Record<string, string> {
  return Object.fromEntries(
    users.map((u) => [u, rng() > 0.5 ? 'red' : 'blue']),
  );
}

const seededRng = () => 0.3;
assignTeam(['Alice', 'Bob'], seededRng); // deterministic test
```

---

## 2. Immutability (CRITICAL)

---

### immut-avoid-mutation — Never Mutate Arguments or External State

**Impact: CRITICAL** — prevents an entire class of shared-state bugs and unexpected re-renders

**Incorrect:**

```typescript
function addItem(cart: CartItem[], item: CartItem): CartItem[] {
  cart.push(item); // mutates caller's array
  return cart;
}
```

**Correct:**

```typescript
function addItem(cart: readonly CartItem[], item: CartItem): CartItem[] {
  return [...cart, item];
}
```

**Incorrect (nested mutation):**

```typescript
function updateUserCity(
  state: AppState,
  userId: string,
  city: string,
): AppState {
  state.users[userId].address.city = city;
  return state;
}
```

**Correct (immutable deep update):**

```typescript
function updateUserCity(
  state: Readonly<AppState>,
  userId: string,
  city: string,
): AppState {
  return {
    ...state,
    users: {
      ...state.users,
      [userId]: {
        ...state.users[userId],
        address: { ...state.users[userId].address, city },
      },
    },
  };
}
```

---

### immut-readonly-types — Use Readonly Types on Function Parameters

**Impact: CRITICAL** — turns mutation from a runtime bug into a compile-time error

**Incorrect (mutation goes undetected):**

```typescript
function sortByName(users: User[]): User[] {
  return users.sort((a, b) => a.name.localeCompare(b.name)); // mutates in place!
}
```

**Correct (readonly forces a copy):**

```typescript
function sortByName(users: readonly User[]): User[] {
  return [...users].sort((a, b) => a.name.localeCompare(b.name));
}
```

---

### immut-const-assertion — Use `as const` for Immutable Literal Values

**Impact: HIGH** — creates narrowest possible literal types; replaces `enum`

**Incorrect:**

```typescript
const ROLES = ['admin', 'viewer', 'editor'];
type Role = (typeof ROLES)[number]; // string — useless
```

**Correct:**

```typescript
const ROLES = ['admin', 'viewer', 'editor'] as const;
type Role = (typeof ROLES)[number]; // "admin" | "viewer" | "editor"
```

**Replace `enum` with `as const`:**

```typescript
const Status = { Active: 'active', Inactive: 'inactive' } as const;
type Status = (typeof Status)[keyof typeof Status]; // "active" | "inactive"
```

---

### immut-spread-over-push — Use Spread and Map Instead of Mutating Array Methods

**Impact: CRITICAL** — eliminates mutation bugs from array operations

```typescript
const xs = [3, 1, 2];

xs.push(4); // mutates ❌
const appended = [...xs, 4]; // new array ✓

xs.sort(); // mutates ❌
const sorted = xs.toSorted(); // new array ✓ (ES2023)
const sorted2 = [...xs].sort(); // new array ✓ (ES2020+)

xs.reverse(); // mutates ❌
const reversed = xs.toReversed(); // new array ✓ (ES2023)
```

---

## 3. Closures & Scope (HIGH)

---

### closure-encapsulate-state — Use Closures to Encapsulate Private State

**Impact: HIGH** — enforces invariants without a class system

**Incorrect (state is publicly accessible):**

```typescript
const counter = {
  count: 0,
  increment() {
    this.count++;
  },
};
counter.count = -999; // invariant violated
```

**Correct (state is private via closure):**

```typescript
function makeCounter(initial = 0) {
  let count = initial;

  return {
    increment(): void {
      count++;
    },
    decrement(): void {
      count--;
    },
    reset(): void {
      count = initial;
    },
    value(): number {
      return count;
    },
  };
}

const a = makeCounter();
const b = makeCounter(10);
a.increment();
a.value(); // 1
b.value(); // 10 — independent
```

---

### closure-loop-pitfall — Use `let` in Loops to Avoid Shared Closure Bindings

**Impact: HIGH** — prevents the classic loop-closure bug

**Incorrect (`var` — all callbacks share one `i`):**

```typescript
for (var i = 0; i < 5; i++) {
  setTimeout(() => console.log(i), 0);
}
// logs: 5 5 5 5 5
```

**Correct (`let` — fresh binding per iteration):**

```typescript
for (let i = 0; i < 5; i++) {
  setTimeout(() => console.log(i), 0);
}
// logs: 0 1 2 3 4
```

**Best — prefer array methods, no loop variable at all:**

```typescript
Array.from({ length: 5 }, (_, i) => i).forEach((i) =>
  setTimeout(() => console.log(i), 0),
);
```

---

### closure-memoize — Memoize Expensive Pure Functions with Closure Caches

**Impact: HIGH** — eliminates redundant computation while preserving referential transparency

```typescript
function memoize<A extends unknown[], R>(
  fn: (...args: A) => R,
): (...args: A) => R {
  const cache = new Map<string, R>();
  return (...args: A): R => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key)!;
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

const fib = memoize(function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
});
```

Only memoize pure functions — impure functions will return stale results.

---

## 4. Function Patterns (HIGH)

---

### fn-partial-application — Use Partial Application to Pre-Fill Arguments

**Impact: HIGH** — creates reusable specialisations without repetition

**Incorrect (same argument repeated):**

```typescript
request('GET', 'https://api.example.com', '/users');
request('POST', 'https://api.example.com', '/users');
request('GET', 'https://api.example.com', '/products');
```

**Correct (partial application pre-loads the base URL):**

```typescript
const apiRequest = partial(request, 'GET', 'https://api.example.com');
apiRequest('/users');
apiRequest('/products');
```

**Real-world pattern — pre-loaded event handlers (from [You Don't Know JS Yet](https://github.com/getify/you-dont-know-js)):**

```typescript
function defineHandler(requestURL: string, requestData: unknown) {
  return function makeRequest(_evt: Event): void {
    fetch(requestURL, { method: 'POST', body: JSON.stringify(requestData) });
  };
}
btn.addEventListener('click', defineHandler('/api/users', payload));
```

---

### fn-currying — Curry Multi-Argument Functions for Pipeline Compatibility

**Impact: HIGH** — makes functions composable one argument at a time

**Config first, data last — the golden rule of currying:**

```typescript
// Wrong order — needs a wrapper for pipelines
const filterWrong = (items: T[], pred: (x: T) => boolean) => items.filter(pred);

// Right order — data flows through naturally
const filter =
  <T>(pred: (x: T) => boolean) =>
  (items: readonly T[]): T[] =>
    items.filter(pred);

const onlyEvens = filter((n: number) => n % 2 === 0)[(1, 2, 3, 4, 5)].map(
  onlyEvens,
); // [2, 4]... wait, pass to pipe:
pipe(
  filter((n) => n > 0),
  filter((n) => n % 2 === 0),
)([-1, 0, 1, 2, 3]); // [2]
```

---

### fn-composition-pipe — Compose Small Functions with `pipe`

**Impact: HIGH** — replaces nested calls with readable data pipelines

**Incorrect (nested — inside-out reading order):**

```typescript
const result = encodeURIComponent(JSON.stringify(stripNulls(normalise(data))));
```

**Correct (`pipe` — top-to-bottom execution order):**

```typescript
const prepare = pipe(normalise, stripNulls, JSON.stringify, encodeURIComponent);
const result = prepare(data);
```

**Implementation:**

```typescript
function pipe<T>(...fns: Array<(x: T) => T>): (x: T) => T {
  return (x: T) => fns.reduce((v, fn) => fn(v), x);
}
```

---

### fn-higher-order — Use Higher-Order Functions Instead of Imperative Loops

**Impact: HIGH** — eliminates loop variables and mutation

**Incorrect:**

```typescript
const result: string[] = [];
for (let i = 0; i < users.length; i++) {
  if (users[i].active) result.push(users[i].name.trim());
}
```

**Correct:**

```typescript
const result = users.filter((u) => u.active).map((u) => u.name.trim());
```

**Cheat sheet:**

```typescript
items.filter(pred); // select elements
items.map(transform); // transform each element
items.reduce(reducer, initial); // accumulate to a single value
items.find(pred); // first matching element
items.some(pred); // any match?
items.every(pred); // all match?
items.flatMap(fn); // map + flatten (one level)
```

---

### fn-point-free — Prefer Point-Free Style to Eliminate Unnecessary Arguments

**Impact: LOW-MEDIUM** — reduces noise; encourages reusable named functions

**Incorrect:**

```typescript
users.map((user) => getName(user));
numbers.filter((n) => isEven(n));
```

**Correct:**

```typescript
users.map(getName);
numbers.filter(isEven);
```

---

## 5. Module Pattern (MEDIUM-HIGH)

---

### module-iife-singleton — Use an IIFE for Singleton Module Instances

**Impact: MEDIUM-HIGH** — enforces public/private without a class or build step

Three requirements for a valid module:

1. An outer scope (the IIFE body)
2. Hidden state (at least one private variable)
3. A public API function that closes over that state

**Correct:**

```typescript
const cache = (() => {
  const store = new Map<string, unknown>(); // private

  return {
    get<T>(key: string): T | undefined {
      return store.get(key) as T;
    },
    set<T>(key: string, value: T): void {
      store.set(key, value);
    },
    has(key: string): boolean {
      return store.has(key);
    },
    size(): number {
      return store.size;
    },
  };
})();
```

---

### module-factory — Use Factory Functions for Multiple Module Instances

**Impact: MEDIUM-HIGH** — independent private state per instance, no classes

```typescript
function makeStack<T>() {
  const items: T[] = []; // private

  return {
    push(item: T): void {
      items.push(item);
    },
    pop(): T | undefined {
      return items.pop();
    },
    peek(): T | undefined {
      return items[items.length - 1];
    },
    size(): number {
      return items.length;
    },
    toArray(): T[] {
      return [...items];
    },
  };
}

const a = makeStack<number>();
const b = makeStack<string>();
// completely independent state
```

---

### module-esm-private — Use ES Modules for File-Level Encapsulation

**Impact: MEDIUM-HIGH** — unexported = private; zero runtime cost

**Incorrect (exports mutable state):**

```typescript
export let users: User[] = []; // anyone can replace it
```

**Correct (exports only controlled functions):**

```typescript
const users: User[] = []; // private

export function addUser(user: User): void {
  users.push({ ...user });
}
export function getUsers(): readonly User[] {
  return users;
}
export function findUser(id: string) {
  return users.find((u) => u.id === id);
}
```

---

## 6. TypeScript FP Types (MEDIUM)

---

### types-result — Use `Result<T, E>` Instead of Throwing for Expected Errors

**Impact: MEDIUM** — makes error paths visible in the type signature

```typescript
type Ok<T> = { readonly ok: true; readonly value: T };
type Err<E> = { readonly ok: false; readonly error: E };
type Result<T, E = string> = Ok<T> | Err<E>;

const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
const err = <E>(error: E): Err<E> => ({ ok: false, error });

function divide(a: number, b: number): Result<number> {
  if (b === 0) return err('Division by zero');
  return ok(a / b);
}

const result = divide(10, 2);
if (result.ok)
  console.log(result.value); // TS narrows to number
else console.error(result.error);
```

---

### types-option — Use `Option<T>` to Make Absence Explicit

**Impact: MEDIUM** — forces callers to handle the absent case

```typescript
type Some<T> = { readonly tag: 'some'; readonly value: T };
type None = { readonly tag: 'none' };
type Option<T> = Some<T> | None;

const some = <T>(value: T): Some<T> => ({ tag: 'some', value });
const none: None = { tag: 'none' };

function findUser(id: string): Option<User> {
  const user = users.find((u) => u.id === id);
  return user ? some(user) : none;
}

const result = findUser('123');
if (result.tag === 'some') console.log(result.value.name);

// Filter arrays — remove None with full type safety
function catOptions<T>(opts: Option<T>[]): T[] {
  return opts.flatMap((o) => (o.tag === 'some' ? [o.value] : []));
}
```

---

### types-discriminated-union — Use Discriminated Unions Instead of Class Hierarchies

**Impact: MEDIUM** — makes illegal states unrepresentable; exhaustiveness checked

```typescript
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rect'; width: number; height: number }
  | { kind: 'triangle'; base: number; height: number };

function assertNever(x: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(x)}`);
}

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'rect':
      return shape.width * shape.height;
    case 'triangle':
      return 0.5 * shape.base * shape.height;
    default:
      return assertNever(shape); // TS error if a case is missing
  }
}
```

---

### types-type-guard — Write Reusable Type Guard Functions

**Impact: MEDIUM** — centralises narrowing logic; composable with `filter`

```typescript
const isString = (x: unknown): x is string => typeof x === 'string';
const isNumber = (x: unknown): x is number =>
  typeof x === 'number' && !Number.isNaN(x);
function isDefined<T>(x: T | null | undefined): x is T {
  return x != null;
}

// Combine with filter — typed results
const mixed: Array<string | null> = ['a', null, 'b'];
const strings: string[] = mixed.filter(isDefined).filter(isString);

// Structural type guard
function isUser(x: unknown): x is User {
  return (
    typeof x === 'object' &&
    x !== null &&
    typeof (x as any).id === 'string' &&
    typeof (x as any).name === 'string'
  );
}
```

---

### types-hof-generics — Type Higher-Order Functions with Generics

**Impact: MEDIUM** — preserves precise types through transformation pipelines

```typescript
type Predicate<T> = (value: T) => boolean;
type Transform<A, B = A> = (input: A) => B;
type Reducer<S, A> = (state: S, action: A) => S;

function filter<T>(arr: readonly T[], pred: Predicate<T>): T[] {
  return arr.filter(pred);
}

function pluck<T, K extends keyof T>(items: readonly T[], key: K): Array<T[K]> {
  return items.map((item) => item[key]);
}

const names = pluck(users, 'name'); // string[]
// pluck(users, 'typo')             // TS error
```

---

## 7. Code Style (LOW-MEDIUM)

---

### style-prefer-functions-over-classes — Prefer Functions Over Classes for FP Code

**Impact: LOW-MEDIUM** — avoids `this`-binding bugs

**Incorrect (method detached from class loses `this`):**

```typescript
class Counter {
  private count = 0;
  increment() {
    this.count++;
  }
}
const c = new Counter();
const inc = c.increment;
inc(); // TypeError or wrong context
```

**Correct (factory function — closures, not `this`):**

```typescript
function makeCounter() {
  let count = 0;
  return {
    increment: () => {
      count++;
    },
    value: () => count,
  };
}
const c = makeCounter();
const inc = c.increment;
inc(); // works — closes over `count`, not `this`
```

---

### style-naming-conventions — Follow FP Naming Conventions

**Impact: LOW-MEDIUM** — makes intent self-evident

```typescript
// Transforms — verb phrases
const toSlug    = (s: string) => s.toLowerCase().replace(/\s+/g, '-')
const parseDate = (s: string) => new Date(s)

// Predicates — is/has/can prefix
const isActive      = (u: User): boolean => u.active
const hasPermission = (u: User, action: string): boolean => u.permissions.includes(action)

// Factories — make/create prefix
const makeCounter = (start = 0) => { ... }
const createLogger = (prefix: string) => { ... }

// HOF creators — describe the result
const multiplyBy = (factor: number) => (n: number) => n * factor
const filterBy   = <T>(pred: Predicate<T>) => (xs: T[]) => xs.filter(pred)

// Type params — T for single, descriptive for multiple
function zip<TLeft, TRight>(left: TLeft[], right: TRight[]): [TLeft, TRight][]
```

---

## 8. fp-ts Library Patterns (HIGH — when fp-ts is present)

Apply these rules whenever the codebase imports from `fp-ts/*`. They replace
the vanilla `Result`/`Option` discriminated unions and hand-rolled `pipe`
with the richer fp-ts combinator API.

---

### fp-ts-pipe-flow — Compose with `pipe` and `flow`

**Impact: HIGH** — eliminates nested call expressions; creates linear data flows

`pipe(value, fn1, fn2)` executes immediately.
`flow(fn1, fn2)` creates a reusable function.
All fp-ts module functions are curried (config first, data last) so they slot
directly into `pipe` without wrapper lambdas.

**Incorrect (nested — inside-out order):**

```typescript
const result = encodeURIComponent(JSON.stringify(stripNulls(normalise(raw))));
```

**Correct (pipe — top-to-bottom):**

```typescript
import { pipe } from 'fp-ts/function';

const result = pipe(
  raw,
  normalise,
  stripNulls,
  JSON.stringify,
  encodeURIComponent,
);
```

**Reusable transform — use flow:**

```typescript
import { flow } from 'fp-ts/function';
import * as S from 'fp-ts/string';

const toSlug = flow(S.trim, S.toLowerCase, (s: string) =>
  s.replace(/\s+/g, '-'),
);
```

**Composing with fp-ts data types:**

```typescript
import * as A from 'fp-ts/Array';

const result = pipe(
  users,
  A.filter((u) => u.active),
  A.map((u) => u.name),
);
```

---

### fp-ts-option-either — Option and Either

**Impact: HIGH** — nullable values and errors are visible in signatures

#### When to use which

- **`Option<T>`** — value may be absent; reason doesn't matter
- **`Either<E, A>`** — operation can fail; error reason matters

**Option — core pattern:**

```typescript
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';

// Stay in Option context — map, flatMap, filter
const getUserCity = (user: User | null): string =>
  pipe(
    O.fromNullable(user),
    O.flatMap((u) => O.fromNullable(u.address)),
    O.flatMap((a) => O.fromNullable(a.city)),
    O.getOrElse(() => 'Unknown'), // extract only at the edge
  );
```

**Either — core pattern:**

```typescript
import * as E from 'fp-ts/Either';

function parseAge(input: string): E.Either<string, number> {
  const age = parseInt(input, 10);
  if (isNaN(age)) return E.left('Invalid age');
  if (age < 0) return E.left('Age cannot be negative');
  return E.right(age);
}

// Chain multiple fallible steps
pipe(
  parseAge(input),
  E.chain(validateAgeRange),
  E.fold(
    (err) => handleError(err),
    (age) => processAge(age),
  ),
);
```

**Validation — collect ALL errors:**

```typescript
import * as NEA from 'fp-ts/NonEmptyArray';
import { sequenceS } from 'fp-ts/Apply';

const V = E.getApplicativeValidation(NEA.getSemigroup<string>());

const result = sequenceS(V)({
  email: validateEmail(data.email),
  age: validateAge(data.age),
});
// Either<NonEmptyArray<string>, { email: string; age: number }>
```

**Anti-patterns:**

```typescript
// ❌ isSome/isRight for control flow
if (O.isSome(result)) { ... }

// ✓ fold/match ensures both branches handled
pipe(result, O.fold(() => handleNone(), v => handleSome(v)))

// ❌ Nesting Option<Option<T>>
pipe(user, O.map(u => O.fromNullable(u.email)))

// ✓ flatMap flattens
pipe(user, O.flatMap(u => O.fromNullable(u.email)))
```

---

### fp-ts-taskeither — Async with Typed Errors

**Impact: HIGH** — eliminates async/await try-catch ladders

`TaskEither<E, A>` ≡ `() => Promise<Either<E, A>>` — lazy, typed, composable.

**Incorrect (async/await + scattered try-catch):**

```typescript
async function processOrder(id: string): Promise<Receipt> {
  const order = await fetchOrder(id);
  if (!order) throw new Error('Order not found');
  // ...
}
```

**Correct (TaskEither — errors in the type):**

```typescript
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

const processOrder = (id: string): TE.TaskEither<OrderError, Receipt> =>
  pipe(
    fetchOrderTE(id),
    TE.chain(validateOrderTE),
    TE.chain(processPaymentTE),
    TE.map(generateReceipt),
  );
```

**Lifting a Promise:**

```typescript
const fetchUser = (id: string): TE.TaskEither<ApiError, User> =>
  TE.tryCatch(
    () => fetch(`/api/users/${id}`).then((r) => r.json()),
    (e): ApiError => ({ code: 'FETCH_ERROR', message: String(e), status: 500 }),
  );
```

**Parallel execution:**

```typescript
import { sequenceT } from 'fp-ts/Apply';

// Array
pipe(ids, TE.traverseArray(fetchUser));

// Tuple of independent operations
sequenceT(TE.ApplyPar)(fetchUsers(), fetchOrders(), fetchMetrics());
```

**Error recovery:**

```typescript
pipe(
  fetchFromPrimary(id),
  TE.orElse(() => fetchFromBackup(id)),
  TE.alt(() => TE.right(defaultValue)),
);
```

**Execute at the edge:**

```typescript
const result = await pipe(
  processOrder('ord-123'),
  TE.fold(
    (err) => T.of(errorResponse(err)),
    (data) => T.of(successResponse(data)),
  ),
)();
```

---

### fp-ts-do-notation — Bind Named Values Across Steps

**Impact: MEDIUM-HIGH** — threads multiple named values through a computation
without manual tuple accumulation

| Combinator                 | When to use                                |
| -------------------------- | ------------------------------------------ |
| `TE.Do`                    | Start a Do block                           |
| `TE.bind('k', ctx => ...)` | Step depends on earlier bindings in `ctx`  |
| `TE.apS('k', operation)`   | Step is independent — can run in parallel  |
| `TE.bindTo('k')`           | Lift existing TE into `{ k: ... }` context |

```typescript
const checkout = (userId: string, cartId: string) =>
  pipe(
    TE.Do,
    TE.bind('user', () => fetchUser(userId)),
    TE.bind('cart', () => fetchCart(cartId)),
    TE.filterOrElse(
      ({ cart }) => cart.items.length > 0,
      () => ({ code: 'EMPTY_CART' as const, message: 'Cart is empty' }),
    ),
    TE.apS('config', fetchAppConfig()), // independent — use apS
    TE.bind('payment', ({ user }) => getDefaultPayment(user.id)),
    TE.bind('total', ({ cart }) => TE.right(calculateTotal(cart))),
    TE.chain((ctx) => createOrder(ctx)),
  );
```

**Use `apS` for independent values** — it communicates intent and enables
parallel execution. Use `bind` only when the step needs an earlier result.

---

## References

- [_You Don't Know JS Yet_](https://github.com/getify/you-dont-know-js) by Kyle Simpson — Scope & Closures (Chapters 5, 7, 8) and Objects & Classes (Chapter 3)
- [Professor Frisby's Mostly Adequate Guide to FP](https://mostly-adequate.gitbook.io/mostly-adequate-guide/)
- [TypeScript Handbook — Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [TypeScript Handbook — Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [Destroy All Software — Boundaries](https://www.destroyallsoftware.com/talks/boundaries)
- [fp-ts documentation](https://gcanti.github.io/fp-ts/)
- [fp-ts function module](https://gcanti.github.io/fp-ts/modules/function.ts.html)
- [fp-ts Option module](https://gcanti.github.io/fp-ts/modules/Option.ts.html)
- [fp-ts Either module](https://gcanti.github.io/fp-ts/modules/Either.ts.html)
- [fp-ts TaskEither module](https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html)
