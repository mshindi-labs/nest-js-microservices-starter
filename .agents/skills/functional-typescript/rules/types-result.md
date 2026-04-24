---
title: Use `Result<T, E>` Instead of Throwing for Expected Errors
impact: MEDIUM
impactDescription: makes error paths visible in the type signature and forces callers to handle them
tags: types, result, error-handling, discriminated-union, typescript
---

## Use `Result<T, E>` Instead of Throwing for Expected Errors

**Impact: MEDIUM**

Throwing exceptions for expected, recoverable errors (validation failures, not-found, permission denied) hides the error path from the type system. Callers have no compile-time indication that the call might fail. A `Result<T, E>` type encodes success and failure in the return type, making the error path impossible to ignore.

**Incorrect (throws for expected failure — invisible at call site):**

```typescript
function divide(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero')
  return a / b
}

const result = divide(10, 0) // type is `number` — no indication it might throw
```

**Correct (Result type — failure is explicit):**

```typescript
type Ok<T>  = { readonly ok: true;  readonly value: T }
type Err<E> = { readonly ok: false; readonly error: E }
type Result<T, E = string> = Ok<T> | Err<E>

const ok  = <T>(value: T): Ok<T>  => ({ ok: true,  value })
const err = <E>(error: E): Err<E> => ({ ok: false, error })

function divide(a: number, b: number): Result<number> {
  if (b === 0) return err('Division by zero')
  return ok(a / b)
}

const result = divide(10, 2)
if (result.ok) {
  console.log(result.value * 2) // TS narrows to Ok<number>
} else {
  console.error(result.error)   // TS narrows to Err<string>
}
```

**Chaining Results (pipeline of fallible operations):**

```typescript
function map<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result
}

function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  return result.ok ? fn(result.value) : result
}

// Usage — chain without intermediate try/catch
const result = flatMap(
  parseJSON(input),
  data => flatMap(
    validateSchema(data),
    validated => ok(transform(validated))
  )
)
```

**Converting thrown errors to Result at boundaries:**

```typescript
function tryCatch<T, E = Error>(fn: () => T): Result<T, E> {
  try {
    return ok(fn())
  } catch (e) {
    return err(e as E)
  }
}

async function tryCatchAsync<T, E = Error>(fn: () => Promise<T>): Promise<Result<T, E>> {
  try {
    return ok(await fn())
  } catch (e) {
    return err(e as E)
  }
}

const parsed = tryCatch(() => JSON.parse(rawInput))
if (!parsed.ok) {
  // Handle gracefully
}
```

**When to still throw:** programming errors (bugs), unrecoverable states, and situations where the call stack should unwind (e.g., initialization failures). Use `Result` for domain errors that a reasonable caller should handle.

Reference: [TypeScript Handbook — Discriminated Unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)
