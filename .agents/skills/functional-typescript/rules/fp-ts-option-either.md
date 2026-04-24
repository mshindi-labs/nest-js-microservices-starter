---
name: fp-ts-option-either
description: >
  Use fp-ts Option for absent values and Either for typed errors. Stay in the
  container context as long as possible; extract at the edge. Covers when to
  use each, core API, anti-patterns, and conversions between the two types.
impact: HIGH
category: fp-ts Library
---

# fp-ts-option-either — Option and Either from fp-ts

**Impact: HIGH** — makes nullable values and error paths visible in the type
signature, eliminating silent null dereferences and swallowed exceptions

## When to use which

| Use `Option<T>`                   | Use `Either<E, T>`         |
| --------------------------------- | -------------------------- |
| Value may be absent               | Operation may fail         |
| Reason for absence doesn't matter | Reason for failure matters |
| Array lookups, optional fields    | Parsing, validation, I/O   |

## Option — core API

```typescript
// Constructors
O.some(42); // Some<number>
O.none; // None
O.fromNullable(maybeValue); // None if null/undefined
O.fromPredicate((n) => n > 0)(value); // Some if predicate passes

// Stay in context (don't extract)
pipe(
  maybeUser,
  O.map((u) => u.name),
); // Option<string>
pipe(
  maybeUser,
  O.flatMap((u) => O.fromNullable(u.email)),
); // Option<string>
pipe(
  maybeUser,
  O.filter((u) => u.age >= 18),
); // Option<User>

// Extract (at the edge only)
pipe(
  opt,
  O.getOrElse(() => defaultValue),
);
pipe(
  opt,
  O.fold(
    () => handleNone(),
    (v) => handleSome(v),
  ),
);
pipe(
  opt,
  O.match(
    () => 'absent',
    (v) => `present: ${v}`,
  ),
); // alias of fold
```

## Either — core API

```typescript
// Constructors
E.right(value); // Right (success)
E.left(error); // Left (failure)
E.tryCatch(
  () => JSON.parse(s),
  (e) => String(e),
); // wraps throwing code
E.fromNullable('not found')(maybeValue); // Left if null
E.fromPredicate(
  (n) => n >= 0,
  (n) => `negative: ${n}`,
)(n);

// Stay in context
pipe(
  e,
  E.map((v) => transform(v)),
); // maps Right
pipe(
  e,
  E.mapLeft((err) => wrapError(err)),
); // maps Left
pipe(
  e,
  E.chain((v) => nextStep(v)),
); // sequences Either-returning fns
pipe(
  e,
  E.chainW((v) => widerErrorFn(v)),
); // W variants widen the error union

// Extract (at the edge only)
pipe(e, E.fold(onLeft, onRight));
pipe(
  e,
  E.getOrElse((err) => defaultValue),
);
```

## Incorrect (null checks scattered everywhere)

```typescript
function getUserCity(user: User | null): string {
  if (user === null) return 'Unknown';
  if (user.address === null) return 'Unknown';
  if (user.address.city === null) return 'Unknown';
  return user.address.city;
}
```

## Correct (Option chain)

```typescript
const getUserCity = (user: User | null): string =>
  pipe(
    O.fromNullable(user),
    O.flatMap((u) => O.fromNullable(u.address)),
    O.flatMap((a) => O.fromNullable(a.city)),
    O.getOrElse(() => 'Unknown'),
  );
```

## Incorrect (throw for expected failure)

```typescript
function parseAge(input: string): number {
  const age = parseInt(input, 10);
  if (isNaN(age)) throw new Error('Invalid age');
  if (age < 0) throw new Error('Age cannot be negative');
  return age;
}
```

## Correct (Either — failure is in the type)

```typescript
function parseAge(input: string): E.Either<string, number> {
  const age = parseInt(input, 10);
  if (isNaN(age)) return E.left('Invalid age');
  if (age < 0) return E.left('Age cannot be negative');
  return E.right(age);
}

// Caller is forced to handle both branches
pipe(
  parseAge(input),
  E.fold(
    (err) => console.error(err),
    (age) => processAge(age),
  ),
);
```

## Validation — collect ALL errors (not fail-fast)

When you need to report every validation error at once, use
`getApplicativeValidation` with a semigroup:

```typescript
type ValidationError = { field: string; message: string };

const V = E.getApplicativeValidation(NEA.getSemigroup<ValidationError>());

const result = sequenceS(V)({
  email: validateEmail(data.email),
  age: validateAge(data.age),
  name: validateName(data.name),
});
// Either<NonEmptyArray<ValidationError>, { email, age, name }>
// All fields validated even if earlier ones fail
```

## Sequential validation with Do notation

When each step depends on the previous (fail-fast):

```typescript
const validateUser = (data: unknown): E.Either<string, User> =>
  pipe(
    E.Do,
    E.bind('email', () => validateEmail(data)),
    E.bind('age', () => validateAge(data)),
    E.map(({ email, age }) => ({ email, age })),
  );
```

## Option ↔ Either conversions

```typescript
// Option → Either (you need an error for None)
pipe(
  maybeValue,
  E.fromOption(() => 'value was missing'),
);

// Either → Option (discard the error)
pipe(eitherValue, E.toOption);
```

## Anti-patterns

```typescript
// ❌ isSome/isRight for control flow — loses FP composition
if (O.isSome(result)) { ... }
if (E.isRight(result)) { ... }

// ✓ Use fold/match to ensure both branches are handled
pipe(result, O.fold(() => absent(), v => present(v)))
pipe(result, E.fold(err => handleErr(err), v => handleOk(v)))

// ❌ Nested Option<Option<T>> from incorrect map
pipe(user, O.map(u => O.fromNullable(u.email)))  // Option<Option<string>>

// ✓ flatMap to flatten one level
pipe(user, O.flatMap(u => O.fromNullable(u.email)))  // Option<string>

// ❌ Extract too early — loses composability
const name = pipe(maybeUser, O.getOrElse(() => anon)).name

// ✓ Stay in context, extract at the last moment
const name = pipe(maybeUser, O.map(u => u.name), O.getOrElse(() => 'Anonymous'))

// ❌ Mix try-catch with Either — defeats the purpose
try {
  const result = pipe(parse(input), E.chain(validate))
} catch (e) { ... }

// ✓ Stay in Either world the whole way
pipe(
  E.tryCatch(() => parse(input), e => String(e)),
  E.chain(validate),
  E.fold(handleError, handleSuccess)
)
```
