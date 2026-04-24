---
title: Compose Small Functions with `pipe` and `compose`
impact: HIGH
impactDescription: replaces nested calls and temp variables with readable data pipelines
tags: composition, pipe, compose, function-patterns, declarative
---

## Compose Small Functions with `pipe` and `compose`

**Impact: HIGH**

Function composition combines small, single-purpose functions into larger ones. `pipe` applies functions left-to-right (data flows in reading order). `compose` applies right-to-left (mathematical convention). Prefer `pipe` — it reads like a series of steps.

**Incorrect (nested calls — hard to read, order is inside-out):**

```typescript
const result = encodeURIComponent(
  JSON.stringify(
    stripNulls(
      normalise(data)
    )
  )
)
```

**Correct (`pipe` — reads top to bottom in execution order):**

```typescript
const prepare = pipe(normalise, stripNulls, JSON.stringify, encodeURIComponent)
const result  = prepare(data)
```

**`pipe` implementation:**

```typescript
// Homogeneous pipe (all functions share one type)
function pipe<T>(...fns: Array<(x: T) => T>): (x: T) => T {
  return (x: T) => fns.reduce((v, fn) => fn(v), x)
}

// Heterogeneous pipe (each step can change the type)
function pipeWith<A, B>(fn: (a: A) => B): (a: A) => B
function pipeWith<A, B, C>(f1: (a: A) => B, f2: (b: B) => C): (a: A) => C
function pipeWith<A, B, C, D>(f1: (a: A) => B, f2: (b: B) => C, f3: (c: C) => D): (a: A) => D
function pipeWith(...fns: Function[]) {
  return (x: unknown) => fns.reduce((v, fn) => fn(v), x)
}
```

**Real-world example — slug generation:**

```typescript
const trim   = (s: string) => s.trim()
const lower  = (s: string) => s.toLowerCase()
const slug   = (s: string) => s.replace(/\s+/g, '-')
const encode = (s: string) => encodeURIComponent(s)

const toSlug    = pipe(trim, lower, slug)
const toUrlSafe = pipe(trim, lower, slug, encode)

toSlug('  Hello World  ')    // "hello-world"
toUrlSafe('  C# & F#  ')     // "c%23-%26-f%23"
```

**Composing with `map`/`filter` — data transformation pipelines:**

```typescript
type User = { name: string; age: number; active: boolean }
type Summary = { name: string; senior: boolean }

const isActive      = (u: User): boolean => u.active
const toSummary     = (u: User): Summary => ({
  name:   u.name.trim(),
  senior: u.age >= 65,
})
const sortByName    = (users: Summary[]): Summary[] =>
  users.toSorted((a, b) => a.name.localeCompare(b.name))

function summariseActive(users: readonly User[]): Summary[] {
  return sortByName(users.filter(isActive).map(toSummary))
}

// Or as a composed pipeline if you have a typed pipe:
// const summariseActive = pipe(filterBy(isActive), mapWith(toSummary), sortByName)
```

**`compose` (right-to-left — use when chaining math-style):**

```typescript
function compose<T>(...fns: Array<(x: T) => T>): (x: T) => T {
  return (x: T) => fns.reduceRight((v, fn) => fn(v), x)
}

const transform = compose(encode, slug, lower, trim) // executes: trim → lower → slug → encode
```

Reference: [Professor Frisby — Composing](https://mostly-adequate.gitbook.io/mostly-adequate-guide/ch05)
