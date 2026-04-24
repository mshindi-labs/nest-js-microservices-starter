---
title: Write Pure Functions
impact: CRITICAL
impactDescription: eliminates the entire class of bugs caused by shared mutable state
tags: core, pure-functions, side-effects, determinism
---

## Write Pure Functions

**Impact: CRITICAL**

A pure function returns the same output for the same inputs and produces no side effects. Pure functions are trivially testable, safely parallelisable, and trivially composable. Any function that touches external state — globals, `Date.now()`, `Math.random()`, the DOM, network, filesystem — is impure and must be treated as a boundary, not a building block.

**Incorrect (reads external mutable state):**

```typescript
let taxRate = 0.1

function calculateTotal(price: number): number {
  return price * (1 + taxRate) // depends on mutable external variable
}

// taxRate can change between calls — same input, different output
calculateTotal(100) // 110
taxRate = 0.2
calculateTotal(100) // 120 — broken
```

**Correct (all inputs explicit):**

```typescript
function calculateTotal(price: number, taxRate: number): number {
  return price * (1 + taxRate)
}

calculateTotal(100, 0.1) // always 110
calculateTotal(100, 0.2) // always 120
```

**Incorrect (mutates external array):**

```typescript
const log: string[] = []

function processUser(name: string): string {
  const result = name.trim().toLowerCase()
  log.push(`processed: ${result}`) // side effect
  return result
}
```

**Correct (return data, let caller decide what to do with it):**

```typescript
type ProcessResult = { value: string; logEntry: string }

function processUser(name: string): ProcessResult {
  const value = name.trim().toLowerCase()
  return { value, logEntry: `processed: ${value}` }
}

// caller owns the side effect
const { value, logEntry } = processUser("  Alice  ")
log.push(logEntry)
```

Reference: [Mostly Adequate Guide to FP — Chapter 3](https://mostly-adequate.gitbook.io/mostly-adequate-guide/ch03)
