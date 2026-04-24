---
title: Curry Multi-Argument Functions for Pipeline Compatibility
impact: HIGH
impactDescription: makes functions composable by accepting one argument at a time
tags: currying, partial-application, pipelines, function-patterns, composition
---

## Curry Multi-Argument Functions for Pipeline Compatibility

**Impact: HIGH**

Currying transforms a function of N arguments into a chain of N single-argument functions. Unlike partial application (which fixes any number of arguments at once), currying always advances one argument at a time. This makes functions naturally compatible with `map`, `filter`, `pipe`, and `compose` — all of which pass a single value.

**Incorrect (multi-arg function — incompatible with map directly):**

```typescript
const multiply = (x: number, y: number): number => x * y

// Can't pass to map without a wrapper:
[1, 2, 3].map(n => multiply(2, n)) // wrapper required
```

**Correct (curried — passes directly to map):**

```typescript
const multiply = (x: number) => (y: number): number => x * y

const double = multiply(2)   // (y: number) => number
const triple = multiply(3)

[1, 2, 3].map(double) // [2, 4, 6]
[1, 2, 3].map(triple) // [3, 6, 9]
```

**Generic curry helper for 2-argument functions:**

```typescript
const curry2 =
  <A, B, C>(fn: (a: A, b: B) => C) =>
  (a: A) =>
  (b: B): C =>
    fn(a, b)

const add     = curry2((a: number, b: number) => a + b)
const add10   = add(10)
add10(5)  // 15
add10(32) // 42
```

**Argument order matters: put the "config" argument first, "data" last:**

```typescript
// Wrong order — data-first means you must wrap for pipelines
const filterWrong = (items: unknown[], pred: (x: unknown) => boolean) =>
  items.filter(pred)

// Right order — predicate first, data last — data flows through naturally
const filter =
  <T>(pred: (x: T) => boolean) =>
  (items: readonly T[]): T[] =>
    items.filter(pred)

const onlyEvens = filter((n: number) => n % 2 === 0)
onlyEvens([1, 2, 3, 4, 5]) // [2, 4]

// Composes cleanly:
const pipeline = pipe(
  filter((n: number) => n > 0),
  filter((n: number) => n % 2 === 0),
)
pipeline([-1, 0, 1, 2, 3, 4]) // [2, 4]
```

**Auto-curry for arbitrary arity (runtime, less type-safe):**

```typescript
function curry(fn: Function): Function {
  return function curried(...args: unknown[]) {
    if (args.length >= fn.length) return fn(...args)
    return (...more: unknown[]) => curried(...args, ...more)
  }
}

const add3 = curry((a: number, b: number, c: number) => a + b + c)
add3(1)(2)(3)   // 6
add3(1, 2)(3)   // 6
add3(1)(2, 3)   // 6
```

Reference: [Professor Frisby — Currying](https://mostly-adequate.gitbook.io/mostly-adequate-guide/ch04)
