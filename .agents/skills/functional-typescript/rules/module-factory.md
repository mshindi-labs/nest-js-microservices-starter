---
title: Use Factory Functions for Multiple Module Instances
impact: MEDIUM-HIGH
impactDescription: gives each instance independent private state without classes or `new`
tags: modules, factory, closures, encapsulation, instances
---

## Use Factory Functions for Multiple Module Instances

**Impact: MEDIUM-HIGH**

When you need more than one independent instance of a module, replace the IIFE with a regular function — a module factory. Each call to the factory creates a new scope with fresh private state. No `class`, no `new`, no `this`.

**Incorrect (shared state — all instances see the same counter):**

```typescript
let count = 0;

const counter = {
  increment() {
    count++;
  },
  value() {
    return count;
  },
};

const a = counter;
const b = counter;
a.increment();
b.value(); // 1 — not independent
```

**Correct (factory — each instance gets its own `count`):**

```typescript
function makeCounter(initial = 0) {
  let count = initial; // private per instance

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

const a = makeCounter(0);
const b = makeCounter(10);

a.increment();
a.increment();

a.value(); // 2
b.value(); // 10  — independent
```

**Typed factory pattern:**

```typescript
type Stack<T> = {
  push(item: T): void;
  pop(): T | undefined;
  peek(): T | undefined;
  size(): number;
  isEmpty(): boolean;
  toArray(): T[];
};

function makeStack<T>(): Stack<T> {
  const items: T[] = []; // private

  return {
    push(item: T): void {
      items.push(item);
    },
    pop(): T | undefined {
      return items.pop();
    },
    peek(): T | undefined {
      return items[items.length - 1];
    },
    size(): number {
      return items.length;
    },
    isEmpty(): boolean {
      return items.length === 0;
    },
    toArray(): T[] {
      return [...items];
    }, // copy — don't expose the ref
  };
}

const stack = makeStack<number>();
stack.push(1);
stack.push(2);
stack.pop(); // 2
stack.size(); // 1
```

**Factory with configuration:**

```typescript
type LoggerOptions = {
  prefix?: string;
  level?: 'debug' | 'info' | 'warn' | 'error';
  silent?: boolean;
};

function makeLogger(options: Readonly<LoggerOptions> = {}) {
  const { prefix = '', level = 'info', silent = false } = options;
  const history: string[] = []; // private

  function format(msg: string): string {
    return prefix ? `[${prefix}] ${msg}` : msg;
  }

  return {
    log(msg: string): void {
      if (silent) return;
      const entry = format(msg);
      history.push(entry);
      console[level](entry);
    },
    history(): readonly string[] {
      return history; // readonly reference — caller can read but not mutate
    },
  };
}

const appLog = makeLogger({ prefix: 'app' });
const testLog = makeLogger({ silent: true });
```

Reference: [_You Don't Know JS Yet_](https://github.com/getify/you-dont-know-js) by Kyle Simpson — Scope & Closures, Chapter 8 (Module Factory)
