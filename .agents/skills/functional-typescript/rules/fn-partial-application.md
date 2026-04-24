---
title: Use Partial Application to Pre-Fill Arguments
impact: HIGH
impactDescription: creates reusable specialisations without repetition or wrapper functions
tags: partial-application, closures, higher-order-functions, function-patterns
---

## Use Partial Application to Pre-Fill Arguments

**Impact: HIGH**

Partial application fixes some arguments of a function up front, returning a new function that accepts the rest. The fixed arguments are remembered via closure. The result is a more specialised function with a better name and fewer parameters at the call site.

**Incorrect (repeating the same argument on every call):**

```typescript
function request(method: string, baseUrl: string, path: string) {
  return fetch(`${baseUrl}${path}`, { method });
}

// Same baseUrl repeated everywhere
request('GET', 'https://api.example.com', '/users');
request('POST', 'https://api.example.com', '/users');
request('GET', 'https://api.example.com', '/products');
```

**Correct (partial application produces a specialised API client):**

```typescript
function request(method: string, baseUrl: string, path: string) {
  return fetch(`${baseUrl}${path}`, { method });
}

function partial<A extends unknown[], B extends unknown[], R>(
  fn: (...args: [...A, ...B]) => R,
  ...presetArgs: A
): (...laterArgs: B) => R {
  return (...laterArgs: B) => fn(...presetArgs, ...laterArgs);
}

const apiRequest = partial(request, 'GET', 'https://api.example.com');

apiRequest('/users'); // GET https://api.example.com/users
apiRequest('/products'); // GET https://api.example.com/products
```

**Real-world pattern — event handler pre-binding (from [You Don't Know JS Yet](https://github.com/getify/you-dont-know-js)):**

```typescript
function defineHandler(requestURL: string, requestData: unknown) {
  return function makeRequest(_evt: Event): void {
    fetch(requestURL, {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  };
}

function setupButton(btn: HTMLButtonElement): void {
  const kind = btn.dataset.kind!;
  btn.addEventListener('click', defineHandler(`/api/${kind}`, { kind }));
}
// Each button gets a handler pre-loaded with its URL and data.
// The click event is the only remaining input.
```

**TypeScript overload for 1- and 2-arg partial:**

```typescript
function partial1<A, R>(fn: (a: A) => R, a: A): () => R;
function partial1<A, B, R>(fn: (a: A, b: B) => R, a: A): (b: B) => R;
function partial1<A, B, C, R>(
  fn: (a: A, b: B, c: C) => R,
  a: A,
): (b: B, c: C) => R;
function partial1(fn: Function, ...preset: unknown[]) {
  return (...rest: unknown[]) => fn(...preset, ...rest);
}

const double = partial1((x: number, y: number) => x * y, 2);
double(5); // 10
double(21); // 42
```

Reference: [_You Don't Know JS Yet_](https://github.com/getify/you-dont-know-js) by Kyle Simpson — Scope & Closures, Chapter 7 (Partial Application & Currying)
