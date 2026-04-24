---
title: Isolate Side Effects at the Boundaries
impact: CRITICAL
impactDescription: keeps the pure core testable and the impure shell auditable
tags: core, side-effects, architecture, functional-core-imperative-shell
---

## Isolate Side Effects at the Boundaries

**Impact: CRITICAL**

Side effects (I/O, network, DOM, randomness, time) are unavoidable but should be pushed to the outermost layer of your program. The pattern is called **Functional Core, Imperative Shell**: a pure inner core does all computation; a thin outer shell calls the core and performs side effects with the results.

This makes the core independently testable with no mocks, and the shell easy to audit since it contains no logic.

**Incorrect (logic and side effects interleaved):**

```typescript
async function syncUsers(apiUrl: string): Promise<void> {
  const response = await fetch(apiUrl)          // side effect
  const data = await response.json()            // side effect

  const users = data.users
    .filter((u: any) => u.active)
    .map((u: any) => ({ id: u.id, name: u.name.trim() }))

  for (const user of users) {
    await db.upsert('users', user)              // side effect inside loop
    console.log(`synced: ${user.id}`)           // side effect inside loop
  }
}
// Untestable without mocking fetch and db
```

**Correct (pure core, impure shell):**

```typescript
// Pure core — zero side effects, fully testable
type RawUser = { id: string; name: string; active: boolean }
type User    = { id: string; name: string }

function selectActiveUsers(rawUsers: readonly RawUser[]): User[] {
  return rawUsers
    .filter(u => u.active)
    .map(u => ({ id: u.id, name: u.name.trim() }))
}

// Impure shell — side effects only, no logic
async function syncUsers(apiUrl: string): Promise<void> {
  const response = await fetch(apiUrl)
  const { users: rawUsers } = await response.json()

  const users = selectActiveUsers(rawUsers)   // call pure core

  for (const user of users) {
    await db.upsert('users', user)
    console.log(`synced: ${user.id}`)
  }
}

// Test the core without any mocks:
expect(selectActiveUsers([
  { id: '1', name: ' Alice ', active: true },
  { id: '2', name: 'Bob',    active: false },
])).toEqual([{ id: '1', name: 'Alice' }])
```

Reference: [Destroy All Software — Boundaries](https://www.destroyallsoftware.com/talks/boundaries)
