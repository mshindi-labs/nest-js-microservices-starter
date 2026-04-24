---
title: Maintain Referential Transparency
impact: CRITICAL
impactDescription: enables safe substitution, caching, and parallel execution
tags: core, referential-transparency, pure-functions, equational-reasoning
---

## Maintain Referential Transparency

**Impact: CRITICAL**

A function call is referentially transparent if you can replace it with its return value without changing the program's behaviour. This property is what enables memoization, lazy evaluation, and equational reasoning. It is violated by hidden inputs (globals, `Date.now()`, `Math.random()`) and hidden outputs (mutations, logging, I/O).

**Incorrect (hidden input — `Date.now()`):**

```typescript
function isExpired(expiryTimestamp: number): boolean {
  return Date.now() > expiryTimestamp // hidden dependency on wall clock
}

// Cannot be memoized or tested deterministically
// Two calls with the same argument can return different values
```

**Correct (inject the dependency):**

```typescript
function isExpired(expiryTimestamp: number, now: number): boolean {
  return now > expiryTimestamp
}

// Testable:
isExpired(1000, 500)  // false — always
isExpired(1000, 2000) // true  — always

// Production usage:
isExpired(token.exp, Date.now())
```

**Incorrect (hidden output — mutates input):**

```typescript
function normaliseItems(items: Item[]): Item[] {
  for (const item of items) {
    item.name = item.name.trim() // mutates caller's array
  }
  return items
}
```

**Correct (return new data, never mutate inputs):**

```typescript
function normaliseItems(items: readonly Item[]): Item[] {
  return items.map(item => ({ ...item, name: item.name.trim() }))
}
```

**Incorrect (non-deterministic — `Math.random()`):**

```typescript
function assignTeam(users: string[]): Record<string, string> {
  return Object.fromEntries(
    users.map(u => [u, Math.random() > 0.5 ? 'red' : 'blue'])
  )
}
```

**Correct (inject randomness as a parameter):**

```typescript
type RNG = () => number

function assignTeam(
  users: readonly string[],
  rng: RNG = Math.random
): Record<string, string> {
  return Object.fromEntries(
    users.map(u => [u, rng() > 0.5 ? 'red' : 'blue'])
  )
}

// Deterministic test:
const seededRng = () => 0.3
assignTeam(['Alice', 'Bob'], seededRng) // always { Alice: 'blue', Bob: 'blue' }
```

Reference: [Wikipedia — Referential Transparency](https://en.wikipedia.org/wiki/Referential_transparency)
