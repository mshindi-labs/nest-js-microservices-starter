---
title: Write Reusable Type Guard Functions
impact: MEDIUM
impactDescription: centralises narrowing logic and makes it composable across the codebase
tags: types, type-guards, narrowing, predicates, typescript
---

## Write Reusable Type Guard Functions

**Impact: MEDIUM**

A type guard is a function returning `x is T`. When it returns `true`, TypeScript narrows the type of `x` to `T` inside the `if` branch. Type guards centralise narrowing logic so it isn't duplicated as ad-hoc `typeof` or `instanceof` checks throughout the codebase.

**Incorrect (ad-hoc checks duplicated everywhere):**

```typescript
function process(value: unknown) {
  if (typeof value === 'string' && value.length > 0) {
    // TypeScript still sees `value` as string — but this check is repeated
  }
}

function validate(input: unknown) {
  if (typeof input === 'string' && input.length > 0) {
    // Same check, different file
  }
}
```

**Correct (named, reusable type guard):**

```typescript
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function process(value: unknown) {
  if (isNonEmptyString(value)) {
    value.toUpperCase() // TS knows it's a string here
  }
}
```

**Common type guards to define once and reuse:**

```typescript
// Primitives
const isString  = (x: unknown): x is string  => typeof x === 'string'
const isNumber  = (x: unknown): x is number  => typeof x === 'number' && !Number.isNaN(x)
const isBoolean = (x: unknown): x is boolean => typeof x === 'boolean'

// Nullability
function isDefined<T>(x: T | null | undefined): x is T {
  return x != null
}

// Arrays
function isArray<T>(
  x: unknown,
  guard: (item: unknown) => item is T
): x is T[] {
  return Array.isArray(x) && x.every(guard)
}

// Objects
function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}
```

**Type guard for a specific shape:**

```typescript
type User = { id: string; name: string; email: string }

function isUser(x: unknown): x is User {
  return (
    isRecord(x) &&
    isString(x.id) &&
    isString(x.name) &&
    isString(x.email)
  )
}

function processApiResponse(data: unknown): User {
  if (!isUser(data)) throw new Error('Invalid user payload')
  return data // TS narrows to User
}
```

**Combining type guards with `filter`:**

```typescript
const mixed: Array<string | number | null> = ['a', 1, null, 'b', 2]

const strings: string[] = mixed.filter(isString)
const numbers: number[] = mixed.filter(isNumber)
const defined: Array<string | number> = mixed.filter(isDefined)
```

**`asserts` guards — throw instead of returning false:**

```typescript
function assertUser(x: unknown): asserts x is User {
  if (!isUser(x)) throw new TypeError(`Expected User, got ${JSON.stringify(x)}`)
}

// Usage — x is narrowed to User after the call
assertUser(payload)
console.log(payload.email)
```

Reference: [TypeScript Handbook — Using type predicates](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates)
