---
title: Prefer Point-Free Style to Eliminate Unnecessary Arguments
impact: LOW-MEDIUM
impactDescription: reduces noise and encourages reuse of named functions
tags: point-free, tacit, composition, naming, style
---

## Prefer Point-Free Style to Eliminate Unnecessary Arguments

**Impact: LOW-MEDIUM**

Point-free (or tacit) style defines a function without mentioning its arguments, by directly composing or passing functions. It reduces boilerplate wrapper lambdas and encourages naming reusable operations. Use it where it aids clarity — avoid it where it obscures intent.

**Incorrect (unnecessary wrapper lambda):**

```typescript
const names = users.map(user => getName(user))
const evens = numbers.filter(n => isEven(n))
const total = amounts.reduce((sum, n) => add(sum, n), 0)
```

**Correct (point-free — function references directly):**

```typescript
const names = users.map(getName)
const evens = numbers.filter(isEven)
const total = amounts.reduce(add, 0)
```

**Incorrect (wrapping a single-arg transform):**

```typescript
const slugs = titles.map(title => toSlug(title))
const upper = words.map(word  => word.toUpperCase())
```

**Correct:**

```typescript
const slugs = titles.map(toSlug)
const upper = words.map(s => s.toUpperCase()) // method refs need a wrapper — this is fine
```

**Point-free pipelines using `pipe`:**

```typescript
// Named individual steps
const trim        = (s: string) => s.trim()
const lower       = (s: string) => s.toLowerCase()
const replaceSpaces = (s: string) => s.replace(/\s+/g, '-')

// Point-free composition — no argument mentioned
const toSlug = pipe(trim, lower, replaceSpaces)

// Usage
['  Hello World  ', '  Foo Bar  '].map(toSlug)
// ['hello-world', 'foo-bar']
```

**When to avoid point-free (clarity wins):**

```typescript
// Unclear point-free — what does this do?
const process = pipe(filter(gt(0)), map(multiply(2)), reduce(add, 0))

// Clearer with an argument name
const sumDoubledPositives = (nums: readonly number[]): number =>
  nums.filter(n => n > 0).map(n => n * 2).reduce((a, b) => a + b, 0)
```

**Rule:** use point-free when the function reference reads like an English description of the operation. Add an argument when naming the parameter explains what the data represents.

Reference: [Professor Frisby — Pointfree Style](https://mostly-adequate.gitbook.io/mostly-adequate-guide/ch05#pointfree)
