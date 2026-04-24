---
title: Use `Option<T>` to Make Absence Explicit
impact: MEDIUM
impactDescription: eliminates null-pointer errors by forcing callers to handle the absent case
tags: types, option, maybe, nullable, discriminated-union, typescript
---

## Use `Option<T>` to Make Absence Explicit

**Impact: MEDIUM**

`null` and `undefined` are invisible in call signatures — a function returning `User | null` compiles whether or not the caller checks for null. An `Option<T>` discriminated union requires the caller to pattern-match before accessing the value, turning null-pointer bugs into compile-time errors.

**Implementation:**

```typescript
type Some<T> = { readonly tag: 'some'; readonly value: T }
type None    = { readonly tag: 'none' }
type Option<T> = Some<T> | None

const some = <T>(value: T): Some<T> => ({ tag: 'some', value })
const none: None = { tag: 'none' }

function isSome<T>(opt: Option<T>): opt is Some<T> { return opt.tag === 'some' }
function isNone<T>(opt: Option<T>): opt is None    { return opt.tag === 'none' }
```

**Incorrect (nullable return — callers can forget to check):**

```typescript
function findUser(id: string): User | null {
  return users.find(u => u.id === id) ?? null
}

const user = findUser('123')
console.log(user.name) // TypeScript error... but only with strictNullChecks
```

**Correct (Option — callers must match before accessing value):**

```typescript
function findUser(id: string): Option<User> {
  const user = users.find(u => u.id === id)
  return user ? some(user) : none
}

const result = findUser('123')
if (result.tag === 'some') {
  console.log(result.value.name) // TS guarantees value exists here
} else {
  console.log('User not found')
}
```

**Utility functions for working with Option:**

```typescript
function mapOption<T, U>(opt: Option<T>, fn: (value: T) => U): Option<U> {
  return opt.tag === 'some' ? some(fn(opt.value)) : none
}

function flatMapOption<T, U>(opt: Option<T>, fn: (value: T) => Option<U>): Option<U> {
  return opt.tag === 'some' ? fn(opt.value) : none
}

function getOrElse<T>(opt: Option<T>, fallback: T): T {
  return opt.tag === 'some' ? opt.value : fallback
}

function fromNullable<T>(value: T | null | undefined): Option<T> {
  return value != null ? some(value) : none
}

// Usage
const name = getOrElse(mapOption(findUser('123'), u => u.name), 'Anonymous')
```

**Filtering arrays with Option — remove None values with full type safety:**

```typescript
function catOptions<T>(opts: readonly Option<T>[]): T[] {
  return opts.flatMap(opt => opt.tag === 'some' ? [opt.value] : [])
}

const userIds = ['1', '2', '3', '99']
const users   = catOptions(userIds.map(findUser))
// users: User[]  — only the ones that were found
```

**When `T | undefined` is fine:** inside small, local functions where the flow is obvious. Use `Option<T>` at module boundaries and public API surfaces where callers need a clear contract.

Reference: [TypeScript Handbook — Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
