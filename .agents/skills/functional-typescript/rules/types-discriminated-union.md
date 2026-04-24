---
title: Use Discriminated Unions Instead of Class Hierarchies
impact: MEDIUM
impactDescription: makes illegal states unrepresentable and exhaustiveness checking free
tags: types, discriminated-union, sum-types, pattern-matching, typescript
---

## Use Discriminated Unions Instead of Class Hierarchies

**Impact: MEDIUM**

A discriminated union is a union of object types sharing a common literal field (the discriminant). TypeScript narrows the type automatically when you check the discriminant, giving you exhaustiveness checking and eliminating the need for instanceof, type casting, or class hierarchies.

**Incorrect (class hierarchy — requires instanceof, easy to miss cases):**

```typescript
class Shape { }
class Circle extends Shape { constructor(public radius: number) { super() } }
class Rect   extends Shape { constructor(public w: number, public h: number) { super() } }
class Triangle extends Shape { constructor(public base: number, public height: number) { super() } }

function area(s: Shape): number {
  if (s instanceof Circle)   return Math.PI * (s as Circle).radius ** 2
  if (s instanceof Rect)     return (s as Rect).w * (s as Rect).h
  // Forgot Triangle — TypeScript does NOT warn. Returns undefined silently.
  return 0
}
```

**Correct (discriminated union — exhaustiveness checked at compile time):**

```typescript
type Circle   = { kind: 'circle';   radius: number }
type Rect     = { kind: 'rect';     width: number; height: number }
type Triangle = { kind: 'triangle'; base: number;  height: number }
type Shape    = Circle | Rect | Triangle

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':   return Math.PI * shape.radius ** 2
    case 'rect':     return shape.width * shape.height
    case 'triangle': return 0.5 * shape.base * shape.height
    // TypeScript errors if a case is missing (with `noImplicitReturns: true`)
  }
}
```

**Exhaustiveness helper — `assertNever`:**

```typescript
function assertNever(x: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(x)}`)
}

function describe(shape: Shape): string {
  switch (shape.kind) {
    case 'circle':   return `Circle r=${shape.radius}`
    case 'rect':     return `Rect ${shape.width}×${shape.height}`
    case 'triangle': return `Triangle b=${shape.base}`
    default:         return assertNever(shape) // TS error if Shape gains a new variant
  }
}
```

**Modelling async state:**

```typescript
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error';   error: string }

function renderUser(state: AsyncState<User>): string {
  switch (state.status) {
    case 'idle':    return 'Not started'
    case 'loading': return 'Loading...'
    case 'success': return `Hello, ${state.data.name}`
    case 'error':   return `Error: ${state.error}`
  }
}
```

**Adding a variant is a compile error, not a runtime surprise:**

When you add `| { status: 'cancelled' }` to `AsyncState<T>`, every exhaustive switch on it will fail to compile until all callers handle the new case.

Reference: [TypeScript Handbook — Discriminated Unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)
