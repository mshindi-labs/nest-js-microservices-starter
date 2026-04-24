# Closures & Partial Application

Source: [_You Don't Know JS Yet_](https://github.com/getify/you-dont-know-js) by Kyle Simpson — Scope & Closures, Chapter 7

---

## What Is a Closure?

Closure is a behavior of functions. A function instance _closes over_ variables
from its defining scope, preserving access to those variables even after the
outer scope has finished executing.

> "Closure is one of the most important language characteristics ever invented
> in programming — it underlies major programming paradigms, including
> Functional Programming (FP), modules, and even a bit of class-oriented
> design." — [You Don't Know JS Yet](https://github.com/getify/you-dont-know-js)

Two models for thinking about closure:

- **Observational:** a function instance remembers its outer variables even
  as that function is passed to and invoked in other scopes.
- **Implementational:** a function instance and its scope environment are
  preserved in-place while references to it are passed around.

---

## Classic Closure Example

```js
function adder(num1) {
  return function addTo(num2) {
    return num1 + num2;
  };
}

const add10To = adder(10);
const add42To = adder(42);

add10To(15); // 25
add42To(9); // 51
add10To(3); // 13
```

Each call to `adder` produces a separate `addTo` instance. Each instance
closes over its own `num1`. The two instances don't share state.

---

## Closure Over Loop Variables

A common pitfall — using `var` in a loop shares the binding:

```js
// Bug: all callbacks close over the same `i`
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// logs: 3, 3, 3

// Fix 1: use `let` — creates a new binding per iteration
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// logs: 0, 1, 2

// Fix 2: IIFE to capture each value
for (var i = 0; i < 3; i++) {
  ((j) => setTimeout(() => console.log(j), 100))(i);
}
```

In TypeScript, always use `let`/`const`. The `let` block-scoping makes loop
closures behave as expected.

---

## Partial Application

Partial application fixes some arguments of a function up front, returning a
new function that accepts the remaining arguments. The initial arguments are
remembered via closure.

```ts
// General partial application helper
function partial<A extends unknown[], B extends unknown[], R>(
  fn: (...args: [...A, ...B]) => R,
  ...presetArgs: A
): (...laterArgs: B) => R {
  return (...laterArgs: B) => fn(...presetArgs, ...laterArgs);
}

const multiply = (x: number, y: number) => x * y;
const double = partial(multiply, 2);
double(5); // 10
double(21); // 42
```

From [You Don't Know JS Yet](https://github.com/getify/you-dont-know-js) — the event handler pattern:

```ts
function defineHandler(requestURL: string, requestData: unknown) {
  return function makeRequest(_evt: Event) {
    fetch(requestURL, {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  };
}

function setupButtonHandler(btn: HTMLButtonElement) {
  const recordKind = btn.dataset.kind!;
  const handler = defineHandler(`/api/${recordKind}`, { type: recordKind });
  btn.addEventListener('click', handler);
}
```

`makeRequest` closes over `requestURL` and `requestData`. The event listener
only needs to know about the click event — the rest is pre-baked.

---

## Currying

Currying transforms a multi-argument function into a chain of single-argument
functions. Each step returns a new function (via closure) until all arguments
are supplied.

```ts
// Manual curry
const add = (a: number) => (b: number) => a + b;
const add5 = add(5);
add5(3); // 8
add5(10); // 15

// Generic curry helper (2-arg)
const curry2 =
  <A, B, C>(fn: (a: A, b: B) => C) =>
  (a: A) =>
  (b: B): C =>
    fn(a, b);

const divide = curry2((a: number, b: number) => a / b);
const half = divide(1); // x => 1 / x  (no, this fixes a=1 — see note below)
half(4); // 0.25

// Flip argument order for point-free pipelines
const divideBy = curry2((divisor: number, n: number) => n / divisor);
const halve = divideBy(2);
[10, 20, 30].map(halve); // [5, 10, 15]
```

**Partial application vs currying:**

- Partial application: fix _any number_ of arguments at once
- Currying: always fix exactly _one_ argument at a time

Both rely on closure to preserve the provided arguments.

---

## Memoization with Closure

Closures are the natural place to cache results:

```ts
function memoize<A extends unknown[], R>(
  fn: (...args: A) => R,
): (...args: A) => R {
  const cache = new Map<string, R>();

  return (...args: A): R => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key)!;
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

const expensiveCalc = memoize((n: number) => {
  // simulate slow computation
  return n * n;
});

expensiveCalc(10); // computed
expensiveCalc(10); // cache hit
```

The `cache` Map is private — only accessible through the returned function.
This is the module pattern applied at the function level.

---

## Benefits of Closures (from [You Don't Know JS Yet](https://github.com/getify/you-dont-know-js))

1. **Efficiency** — remember previously determined information instead of
   recomputing each time
2. **Readability** — narrow scope exposure by encapsulating variables inside
   function instances, making the resulting specialized functions cleaner to
   interact with
3. **Reusability** — extract parameterized logic into standalone utilities
   (`defineHandler`) instead of repeating inline setup
