---
title: Type Higher-Order Functions with Generics
impact: MEDIUM
impactDescription: preserves precise types through transformation pipelines without casting
tags: types, generics, higher-order-functions, typescript, type-inference
---

## Type Higher-Order Functions with Generics

**Impact: MEDIUM**

Higher-order functions (HOFs) that accept or return functions need generics to preserve type information through the transformation. Without generics, you lose precision and are forced into `any` or type assertions.

**Incorrect (loses type information):**

```typescript
function map(arr: any[], fn: (x: any) => any): any[] {
  return arr.map(fn)
}

const result = map([1, 2, 3], x => x * 2)
// result: any[]  — TypeScript can no longer help
```

**Correct (generics preserve types end-to-end):**

```typescript
function map<A, B>(arr: readonly A[], fn: (value: A, index: number) => B): B[] {
  return arr.map(fn)
}

const result = map([1, 2, 3], x => x * 2)
// result: number[]  — inferred precisely
```

**Typed function type aliases — define once, use everywhere:**

```typescript
type Predicate<T>         = (value: T) => boolean
type Transform<A, B = A>  = (input: A) => B
type Reducer<S, A>        = (state: S, action: A) => S
type Comparator<T>        = (a: T, b: T) => number

// Usage
function filter<T>(arr: readonly T[], pred: Predicate<T>): T[] {
  return arr.filter(pred)
}

function sortBy<T>(arr: readonly T[], comparator: Comparator<T>): T[] {
  return [...arr].sort(comparator)
}

function reduce<T, R>(
  arr: readonly T[],
  reducer: Reducer<R, T>,
  initial: R
): R {
  return arr.reduce(reducer, initial)
}
```

**Generic pipe — preserves types through each step:**

```typescript
// 1-step
function pipe<A, B>(a: A, f1: Transform<A, B>): B
// 2-step
function pipe<A, B, C>(a: A, f1: Transform<A, B>, f2: Transform<B, C>): C
// 3-step
function pipe<A, B, C, D>(a: A, f1: Transform<A, B>, f2: Transform<B, C>, f3: Transform<C, D>): D
// Runtime
function pipe(value: unknown, ...fns: Array<(x: unknown) => unknown>): unknown {
  return fns.reduce((v, fn) => fn(v), value)
}

const result = pipe(
  '  Hello World  ',
  (s: string) => s.trim(),
  (s: string) => s.toLowerCase(),
  (s: string) => s.split(' ')
)
// result: string[]  — inferred
```

**Generic partial application:**

```typescript
function partial<A extends unknown[], B extends unknown[], R>(
  fn: (...args: [...A, ...B]) => R,
  ...preset: A
): (...rest: B) => R {
  return (...rest: B) => fn(...preset, ...rest)
}

const add = (a: number, b: number, c: number) => a + b + c
const add10 = partial(add, 10)
add10(3, 4) // 17 — typed as (b: number, c: number) => number
```

**Constraining generics:**

```typescript
// T must have an `id` field — allows access without casting
function indexBy<T extends { id: string }>(
  items: readonly T[]
): Record<string, T> {
  return items.reduce<Record<string, T>>(
    (acc, item) => ({ ...acc, [item.id]: item }),
    {}
  )
}

// K must be a key of T — prevents typos in key names
function pluck<T, K extends keyof T>(
  items: readonly T[],
  key: K
): Array<T[K]> {
  return items.map(item => item[key])
}

const names = pluck(users, 'name')   // string[]
const ids   = pluck(users, 'id')     // string[]
// pluck(users, 'typo')              // TS error — 'typo' is not keyof User
```

Reference: [TypeScript Handbook — Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
