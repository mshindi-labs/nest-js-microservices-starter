---
title: Use Higher-Order Functions Instead of Imperative Loops
impact: HIGH
impactDescription: eliminates loop variables and mutation, produces declarative, composable data transformations
tags: higher-order-functions, map, filter, reduce, declarative, loops
---

## Use Higher-Order Functions Instead of Imperative Loops

**Impact: HIGH**

`map`, `filter`, `reduce`, and their cousins transform collections without mutation or loop variables. Each expresses intent directly — transforming, selecting, accumulating — rather than describing the mechanics of iterating.

**Incorrect (imperative — mutation inside loop):**

```typescript
const users: User[] = [...]
const activeNames: string[] = []

for (let i = 0; i < users.length; i++) {
  if (users[i].active) {
    activeNames.push(users[i].name.trim())
  }
}
```

**Correct (declarative — no mutation, no loop variable):**

```typescript
const activeNames = users
  .filter(u => u.active)
  .map(u => u.name.trim())
```

**Common replacements:**

```typescript
// Sum
let total = 0
for (const item of items) total += item.price     // imperative ❌
const total = items.reduce((sum, i) => sum + i.price, 0) // declarative ✓

// Find first match
let found: User | undefined
for (const u of users) { if (u.id === id) { found = u; break } }
const found = users.find(u => u.id === id)         // ✓

// Check if any match
let hasAdmin = false
for (const u of users) { if (u.role === 'admin') { hasAdmin = true; break } }
const hasAdmin = users.some(u => u.role === 'admin')   // ✓

// Check if all match
let allActive = true
for (const u of users) { if (!u.active) { allActive = false; break } }
const allActive = users.every(u => u.active)           // ✓

// Group by key
const byRole: Record<string, User[]> = {}
for (const u of users) {
  if (!byRole[u.role]) byRole[u.role] = []
  byRole[u.role].push(u)
}
const byRole = users.reduce<Record<string, User[]>>(
  (acc, u) => ({ ...acc, [u.role]: [...(acc[u.role] ?? []), u] }),
  {}
)

// Flat map (map + flatten)
const tags = posts.flatMap(p => p.tags)   // ✓  (instead of .map().flat())
```

**Custom typed HOFs:**

```typescript
function groupBy<T, K extends string>(
  items: readonly T[],
  key: (item: T) => K
): Partial<Record<K, T[]>> {
  return items.reduce<Partial<Record<K, T[]>>>((acc, item) => {
    const k = key(item)
    return { ...acc, [k]: [...(acc[k] ?? []), item] }
  }, {})
}

const byRole = groupBy(users, u => u.role)

function partition<T>(
  items: readonly T[],
  pred: (item: T) => boolean
): [T[], T[]] {
  return items.reduce<[T[], T[]]>(
    ([yes, no], item) => pred(item) ? [[...yes, item], no] : [yes, [...no, item]],
    [[], []]
  )
}

const [active, inactive] = partition(users, u => u.active)
```

**When a `for...of` loop is appropriate:**
- When you need `async/await` inside the iteration (HOFs don't handle async well)
- When early exit semantics matter significantly for performance
- When the intent is clearer with explicit looping (rare)

Reference: [MDN — Array.prototype.reduce](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce)
