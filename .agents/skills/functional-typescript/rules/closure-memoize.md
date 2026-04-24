---
title: Memoize Expensive Pure Functions with Closure Caches
impact: HIGH
impactDescription: eliminates redundant computation while preserving referential transparency
tags: closures, memoization, performance, caching, pure-functions
---

## Memoize Expensive Pure Functions with Closure Caches

**Impact: HIGH**

Memoization caches the result of a function call keyed by its arguments. Because pure functions always return the same output for the same inputs, a cached result is always correct. The cache lives in a closure — private, owned by the memoized function.

**Pattern — generic memoize helper:**

```typescript
function memoize<A extends unknown[], R>(
  fn: (...args: A) => R,
): (...args: A) => R {
  const cache = new Map<string, R>();

  return function memoized(...args: A): R {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key)!;
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

// Usage
const fib = memoize(function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
});

fib(40); // fast — computed once, cached thereafter
fib(40); // instant cache hit
```

**Incorrect (memoizing an impure function — produces stale results):**

```typescript
// WRONG — function depends on external state
const memoizedPrice = memoize(function getPrice(productId: string) {
  return fetch(`/api/prices/${productId}`); // network call — not pure!
});
// Prices change; memoizedPrice will return stale data indefinitely
```

**Single-argument cache with Map (faster than JSON.stringify):**

```typescript
function memoizeOne<A, R>(fn: (arg: A) => R): (arg: A) => R {
  const cache = new Map<A, R>();
  return (arg: A): R => {
    if (cache.has(arg)) return cache.get(arg)!;
    const result = fn(arg);
    cache.set(arg, result);
    return result;
  };
}

const parseJson = memoizeOne((s: string) => JSON.parse(s));
```

**Memoize with WeakMap for object keys (avoids memory leaks):**

```typescript
function memoizeObject<K extends object, R>(fn: (key: K) => R): (key: K) => R {
  const cache = new WeakMap<K, R>();
  return (key: K): R => {
    if (cache.has(key)) return cache.get(key)!;
    const result = fn(key);
    cache.set(key, result);
    return result;
  };
}
```

**Bounded cache (LRU-like, avoids unbounded memory growth):**

```typescript
function memoizeLRU<A extends unknown[], R>(
  fn: (...args: A) => R,
  maxSize = 100,
): (...args: A) => R {
  const cache = new Map<string, R>();
  return (...args: A): R => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      const value = cache.get(key)!;
      cache.delete(key);
      cache.set(key, value); // move to end (most recently used)
      return value;
    }
    const result = fn(...args);
    if (cache.size >= maxSize) {
      cache.delete(cache.keys().next().value); // evict oldest
    }
    cache.set(key, result);
    return result;
  };
}
```

Reference: [_You Don't Know JS Yet_](https://github.com/getify/you-dont-know-js) by Kyle Simpson — Scope & Closures, Chapter 7
