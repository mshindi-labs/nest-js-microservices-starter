# The Module Pattern

Source: [_You Don't Know JS Yet_](https://github.com/getify/you-dont-know-js) by Kyle Simpson — Scope & Closures, Chapter 8

---

## What Makes Something a Module?

A module is **not** just a namespace (stateless grouping) or a data structure
(stateful grouping without access control). A real module requires all three:

1. **Outer scope** — from a factory function or file boundary
2. **Hidden state** — at least one private variable representing state
3. **Public API** — at least one function with closure over that hidden state

```
Namespace    = grouping, no state
Data struct  = grouping + state, no access control
Module       = grouping + state + access control (private/public)
```

---

## Classic Module (IIFE Singleton)

Use when you need exactly one instance:

```ts
const StudentModule = (() => {
  // private — not accessible from outside
  const records = [
    { id: 14, name: 'Kyle', grade: 86 },
    { id: 73, name: 'Suzy', grade: 87 },
    { id: 112, name: 'Frank', grade: 75 },
    { id: 6, name: 'Sarah', grade: 91 },
  ];

  function getName(studentID: number): string | undefined {
    return records.find((s) => s.id === studentID)?.name;
  }

  // public API
  return { getName };
})();

StudentModule.getName(73); // "Suzy"
(StudentModule as any).records; // undefined — private
```

The IIFE runs once, captures `records` in closure, and returns only the
public methods. External code can never reach `records` directly.

---

## Module Factory (Multiple Instances)

Use when you need independent instances with their own state:

```ts
function makeCounter(start = 0) {
  let count = start; // private

  return {
    increment(): void {
      count++;
    },
    decrement(): void {
      count--;
    },
    reset(): void {
      count = start;
    },
    value(): number {
      return count;
    },
  };
}

const a = makeCounter(0);
const b = makeCounter(10);

a.increment();
a.increment();
a.value(); // 2

b.decrement();
b.value(); // 9  — completely independent from `a`
```

Each call to `makeCounter` creates a new scope, giving each instance its own
`count` variable. This is the revealing-module pattern applied as a factory.

---

## Namespace vs Module (the distinction matters)

```ts
// NAMESPACE — no private state, just grouping
const Utils = {
  trim: (s: string) => s.trim(),
  lower: (s: string) => s.toLowerCase(),
  isEmail: (s: string) => /[^@]+@[^@.]+\.[^@.]+/.test(s),
};

// MODULE — private state + public API
function makeCache<T>() {
  const store = new Map<string, T>(); // private

  return {
    get(key: string): T | undefined {
      return store.get(key);
    },
    set(key: string, val: T): void {
      store.set(key, val);
    },
    has(key: string): boolean {
      return store.has(key);
    },
    size(): number {
      return store.size;
    },
  };
}
```

If there's no private state, use a plain object namespace. If there is
private state that the public methods depend on, use the module factory.

---

## ES Modules (ESM)

Modern JS/TS: each file is a module. Unexported identifiers are private
by default.

```ts
// student.ts

// private — not exported
const records = [
  { id: 14, name: 'Kyle' },
  { id: 73, name: 'Suzy' },
];

// public API — exported
export function getName(studentID: number): string | undefined {
  return records.find((s) => s.id === studentID)?.name;
}

export function getAll(): typeof records {
  return [...records]; // return a copy, not the mutable reference
}
```

```ts
// main.ts
import { getName } from './student.js';
getName(73); // "Suzy"
```

ESM is the preferred format for new TypeScript projects. The module system
enforces the public/private boundary at the file level — no IIFE needed.

**Key rules for FP-style ESM modules:**

- Export functions, not mutable state
- If state must be shared, export functions that read/update it (never the
  raw variable)
- Use `readonly` / `ReadonlyArray` on exported types so callers can't mutate

---

## CommonJS Modules (Node.js)

```ts
// student.js (CommonJS)
const records = [
  { id: 14, name: 'Kyle' },
  { id: 73, name: 'Suzy' },
];

function getName(studentID) {
  return records.find((s) => s.id === studentID)?.name;
}

module.exports = { getName };
```

```ts
// main.js
const { getName } = require('./student');
getName(73); // "Suzy"
```

In TypeScript with CommonJS target, use `export =` or standard named exports
with `"module": "commonjs"` in tsconfig.

---

## Choosing the Right Pattern

| Situation                              | Pattern                |
| -------------------------------------- | ---------------------- |
| One-time setup, single shared instance | IIFE module            |
| Independent copies of the same logic   | Module factory         |
| File-level organization, tree-shaking  | ESM (preferred)        |
| Node.js without ESM support            | CommonJS               |
| No state, just utility functions       | Plain object namespace |

---

## Anti-Patterns to Avoid

```ts
// BAD — exposes mutable internal state directly
const BadModule = (() => {
  const state = { count: 0 };
  return { state }; // caller can do BadModule.state.count = 999
})();

// GOOD — expose only controlled accessors
const GoodModule = (() => {
  let count = 0;
  return {
    increment() {
      count++;
    },
    get() {
      return count;
    },
  };
})();

// BAD — module with no private state (just use a plain object)
const AlsoNamespace = (() => {
  return {
    add: (a: number, b: number) => a + b,
    sub: (a: number, b: number) => a - b,
  };
})();

// GOOD — plain object is clearer when there's no private state
const MathUtils = {
  add: (a: number, b: number) => a + b,
  sub: (a: number, b: number) => a - b,
};
```
