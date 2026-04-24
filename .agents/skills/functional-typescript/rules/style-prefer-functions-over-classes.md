---
title: Prefer Functions and Modules Over Classes for FP Code
impact: LOW-MEDIUM
impactDescription: avoids `this`-binding bugs and keeps code purely functional
tags: style, classes, functions, modules, this
---

## Prefer Functions and Modules Over Classes for FP Code

**Impact: LOW-MEDIUM**

Classes introduce `this` — a runtime binding that changes based on how a function is called, not where it was defined. This breaks the referential transparency of methods. Factory functions and module patterns give you encapsulation, private state, and polymorphism without `this`.

**Incorrect (class with `this` — methods are not safe to pass around):**

```typescript
class Counter {
  private count = 0;
  increment() {
    this.count++;
  }
  value() {
    return this.count;
  }
}

const c = new Counter();
const inc = c.increment; // detached method
inc(); // TypeError: Cannot read properties of undefined
// or: count is not incremented — `this` is wrong context
```

**Correct (factory function — no `this`, methods are safe values):**

```typescript
function makeCounter(initial = 0) {
  let count = initial;
  return {
    increment: () => {
      count++;
    },
    value: () => count,
  };
}

const c = makeCounter();
const inc = c.increment; // safe to detach — closes over `count`, not `this`
inc();
c.value(); // 1
```

**Incorrect (class method as callback loses `this`):**

```typescript
class UserService {
  private prefix = 'user_';
  formatId(id: string) {
    return `${this.prefix}${id}`;
  }
}

const svc = new UserService()[('1', '2', '3')]
  .map(svc.formatId) // ['undefinedid1', ...] — `this` is undefined
  [('1', '2', '3')].map((id) => svc.formatId(id)); // workaround needed
```

**Correct (closure-based — no binding issues):**

```typescript
function makeUserService(prefix = 'user_') {
  const formatId = (id: string): string => `${prefix}${id}`;
  return { formatId };
}

const svc = makeUserService()[('1', '2', '3')].map(svc.formatId); // ['user_1', 'user_2', 'user_3'] ✓
```

**When classes are appropriate:**

- Implementing interfaces that require `instanceof` checks (e.g., `Error` subclasses)
- Working with frameworks that require class syntax (NestJS, TypeORM decorators)
- When inheritance hierarchies genuinely model your domain (rare)
- When the team is more familiar with OOP and FP patterns would be a jarring mismatch

**Rule:** default to factory functions. Reach for classes only when a framework requires them or when `instanceof` is needed for error handling.

Reference: [_You Don't Know JS Yet_](https://github.com/getify/you-dont-know-js) by Kyle Simpson — Objects & Classes, Chapter 3
