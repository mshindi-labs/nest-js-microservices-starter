---
title: Use Readonly Types on Function Parameters
impact: CRITICAL
impactDescription: turns mutation from a runtime bug into a compile-time error
tags: immutability, typescript, Readonly, ReadonlyArray
---

## Use Readonly Types on Function Parameters

**Impact: CRITICAL**

Annotating function parameters with `Readonly<T>` and `readonly T[]` (or `ReadonlyArray<T>`) makes it a compile-time error to accidentally mutate inputs. This enforces the pure-function contract at the type level — no runtime checks needed.

**Incorrect (mutable parameter — mutation goes undetected):**

```typescript
function sortByName(users: User[]): User[] {
  return users.sort((a, b) => a.name.localeCompare(b.name))
  // Array.sort mutates in place — caller's array is now sorted too!
}
```

**Correct (readonly parameter — compiler catches the mutation):**

```typescript
function sortByName(users: readonly User[]): User[] {
  return [...users].sort((a, b) => a.name.localeCompare(b.name))
  // Forced to copy first — original is untouched
}
```

**Incorrect (mutable object parameter):**

```typescript
function formatAddress(address: Address): string {
  address.country = address.country.toUpperCase() // accidental mutation
  return `${address.street}, ${address.city}, ${address.country}`
}
```

**Correct (Readonly prevents the mutation):**

```typescript
function formatAddress(address: Readonly<Address>): string {
  // address.country = ... // TS error: Cannot assign to 'country' (readonly)
  return `${address.street}, ${address.city}, ${address.country.toUpperCase()}`
}
```

**Pattern: make all function inputs readonly by default:**

```typescript
// Utility type alias for clarity
type Pure<T> = Readonly<T>
type PureArray<T> = ReadonlyArray<T>

function processItems(
  items: PureArray<Item>,
  config: Pure<ProcessConfig>
): ProcessedItem[] {
  return items.map(item => transform(item, config))
}
```

**Readonly on return types — signal that callers should not mutate results:**

```typescript
function getDefaults(): Readonly<Config> {
  return { host: 'localhost', port: 3000, debug: false }
}

const defaults = getDefaults()
// defaults.port = 4000 // TS error
```

Reference: [TypeScript Handbook — Readonly](https://www.typescriptlang.org/docs/handbook/2/objects.html#readonly-properties)
