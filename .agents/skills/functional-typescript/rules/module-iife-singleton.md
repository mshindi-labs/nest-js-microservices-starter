---
title: Use an IIFE for Singleton Module Instances
impact: MEDIUM-HIGH
impactDescription: enforces public/private access control without a class or build step
tags: modules, IIFE, singleton, encapsulation, closures
---

## Use an IIFE for Singleton Module Instances

**Impact: MEDIUM-HIGH**

An Immediately Invoked Function Expression (IIFE) runs once, captures private state in its closure, and returns only the public API. This is the classic module pattern — the original mechanism for encapsulation in JavaScript before `class` and ES modules.

Use an IIFE singleton when you need exactly one instance of a module with private state, without the overhead of a class or a separate file.

**Incorrect (data structure — state is fully public):**

```typescript
const cache = {
  store: new Map<string, unknown>(), // public — anyone can clear it or corrupt it
  get(key: string) {
    return this.store.get(key);
  },
  set(key: string, val: unknown) {
    this.store.set(key, val);
  },
};

cache.store.clear(); // invariant violated from outside
```

**Correct (IIFE module — `store` is private):**

```typescript
const cache = (() => {
  const store = new Map<string, unknown>(); // private

  return {
    get<T>(key: string): T | undefined {
      return store.get(key) as T | undefined;
    },
    set<T>(key: string, value: T): void {
      store.set(key, value);
    },
    has(key: string): boolean {
      return store.has(key);
    },
    invalidate(key: string): void {
      store.delete(key);
    },
    size(): number {
      return store.size;
    },
  };
})();

// cache.store  // undefined — inaccessible
cache.set('user:1', { name: 'Alice' });
cache.get<{ name: string }>('user:1'); // { name: 'Alice' }
```

**Three requirements for a valid classic module (from [You Don't Know JS Yet](https://github.com/getify/you-dont-know-js)):**

1. There must be an outer scope (the IIFE function body)
2. The inner scope must have at least one piece of hidden state
3. The public API must return at least one function that has closure over that state

**Namespace vs Module — know the difference:**

```typescript
// NAMESPACE — no hidden state, just grouping (not a module)
const MathUtils = {
  add: (a: number, b: number) => a + b,
  sub: (a: number, b: number) => a - b,
};

// MODULE — hidden state accessed only through the API
const idGenerator = (() => {
  let next = 0;
  return {
    generate(): string {
      return `id_${next++}`;
    },
    reset(): void {
      next = 0;
    },
  };
})();

idGenerator.generate(); // "id_0"
idGenerator.generate(); // "id_1"
// idGenerator.next  // undefined
```

Reference: [_You Don't Know JS Yet_](https://github.com/getify/you-dont-know-js) by Kyle Simpson — Scope & Closures, Chapter 8
