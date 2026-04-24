---
title: Use Closures to Encapsulate Private State
impact: HIGH
impactDescription: enforces invariants without a class system
tags: closures, encapsulation, private-state, module-pattern
---

## Use Closures to Encapsulate Private State

**Impact: HIGH**

A closure preserves access to variables in its defining scope even after that scope has returned. This makes closures a lightweight alternative to classes for encapsulating state — no `this`, no prototype chain, no `private` keyword needed.

**Incorrect (state is publicly accessible and mutable):**

```typescript
const counter = {
  count: 0, // public — anyone can set counter.count = -999
  increment() {
    this.count++;
  },
  value() {
    return this.count;
  },
};

counter.count = -999; // invariant violated
```

**Correct (state is private via closure):**

```typescript
function makeCounter(initial = 0) {
  let count = initial; // private — inaccessible from outside

  return {
    increment(): void {
      count++;
    },
    decrement(): void {
      count--;
    },
    reset(): void {
      count = initial;
    },
    value(): number {
      return count;
    },
  };
}

const counter = makeCounter();
counter.increment();
counter.value(); // 1
// counter.count   // undefined — private
```

**Each closure instance has independent state:**

```typescript
const a = makeCounter(0);
const b = makeCounter(10);

a.increment();
a.increment();

a.value(); // 2
b.value(); // 10  — completely independent
```

**Richer example — event emitter:**

```typescript
type Listener<T> = (event: T) => void;

function makeEmitter<T>() {
  const listeners = new Set<Listener<T>>(); // private

  return {
    on(listener: Listener<T>): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener); // returns unsubscribe fn
    },
    emit(event: T): void {
      listeners.forEach((fn) => fn(event));
    },
    listenerCount(): number {
      return listeners.size;
    },
  };
}

const emitter = makeEmitter<string>();
const off = emitter.on((msg) => console.log(msg));
emitter.emit('hello'); // logs "hello"
off();
emitter.emit('world'); // no listeners
```

The `listeners` Set is completely private — callers can only interact with it through the controlled API.

Reference: [_You Don't Know JS Yet_](https://github.com/getify/you-dont-know-js) by Kyle Simpson — Scope & Closures, Chapter 7
