---
title: Use `let` in Loops to Avoid Shared Closure Bindings
impact: HIGH
impactDescription: prevents the classic loop-closure bug where all callbacks share one variable
tags: closures, loops, var, let, scope
---

## Use `let` in Loops to Avoid Shared Closure Bindings

**Impact: HIGH**

`var` creates a single binding for the entire function scope. All closures created inside a `var` loop capture the same variable. By the time callbacks execute, the loop has finished and every callback sees the final value. `let` creates a fresh binding per iteration — each closure captures its own copy.

**Incorrect (`var` — all callbacks share one `i`):**

```typescript
const fns: Array<() => number> = [];

for (var i = 0; i < 5; i++) {
  fns.push(() => i);
}

fns.map((fn) => fn()); // [5, 5, 5, 5, 5] — not [0, 1, 2, 3, 4]
```

**Correct (`let` — each iteration gets its own binding):**

```typescript
const fns: Array<() => number> = [];

for (let i = 0; i < 5; i++) {
  fns.push(() => i);
}

fns.map((fn) => fn()); // [0, 1, 2, 3, 4] ✓
```

**Common real-world manifestation — event listeners:**

```typescript
const buttons = document.querySelectorAll('button');

// Incorrect: every click handler logs the same final value of i
for (var i = 0; i < buttons.length; i++) {
  buttons[i].addEventListener('click', () => {
    console.log(`Button ${i} clicked`); // always logs buttons.length
  });
}

// Correct: each handler captures its own i
for (let i = 0; i < buttons.length; i++) {
  buttons[i].addEventListener('click', () => {
    console.log(`Button ${i} clicked`); // logs 0, 1, 2, ...
  });
}
```

**Prefer array methods over index loops entirely:**

```typescript
// Best: no loop variable to close over at all
Array.from(buttons).forEach((btn, i) => {
  btn.addEventListener('click', () => console.log(`Button ${i} clicked`));
});
```

**Rule: never use `var`. Always use `const` by default, `let` only when reassignment is required.**

Reference: [_You Don't Know JS Yet_](https://github.com/getify/you-dont-know-js) by Kyle Simpson — Scope & Closures, Chapter 5
