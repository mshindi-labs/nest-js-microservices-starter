---
name: fp-ts-pipe-flow
description: >
  Use pipe and flow from fp-ts/function for composing operations. pipe executes
  immediately with a starting value; flow creates a reusable function. Prefer
  named steps over long inline lambdas. Use this rule when the codebase imports
  from fp-ts.
impact: HIGH
category: fp-ts Library
---

# fp-ts-pipe-flow — Compose with `pipe` and `flow`

**Impact: HIGH** — eliminates nested call expressions and creates linear, top-to-bottom
data flows that read like a series of transformations

## Decision rule

- **`pipe(value, fn1, fn2)`** — you have a value _now_ and want to transform it immediately
- **`flow(fn1, fn2)`** — you want a _reusable function_ (no value yet); result is `(x) => fn2(fn1(x))`

## Incorrect (nested calls — inside-out reading order)

```typescript
const result = encodeURIComponent(JSON.stringify(stripNulls(normalise(raw))));
```

## Correct (pipe — top-to-bottom order)

```typescript
const result = pipe(
  raw,
  normalise,
  stripNulls,
  JSON.stringify,
  encodeURIComponent,
);
```

## Incorrect (repeated inline arrow wrappers)

```typescript
users.map((user) => toSlug(user.displayName));
posts.map((post) => toSlug(post.title));
```

## Correct (flow creates the reusable transform once)

```typescript
const toSlug = flow(S.trim, S.toLowerCase, (s: string) =>
  s.replace(/\s+/g, '-'),
);

users.map((u) => toSlug(u.displayName));
posts.map((p) => toSlug(p.title));
```

## Composing with fp-ts data types

All fp-ts module functions are curried — config/predicate first, data last —
so they slot directly into `pipe` without wrappers:

```typescript
// ✓ clean — each step is a curried fp-ts function
const result = pipe(
  users,
  A.filter((u) => u.active),
  A.map((u) => u.name),
  A.sort(S.Ord),
);

// ✓ Option chain
const email = pipe(
  O.fromNullable(user),
  O.flatMap((u) => O.fromNullable(u.contact)),
  O.flatMap((c) => O.fromNullable(c.email)),
  O.getOrElse(() => 'no-reply@example.com'),
);
```

## Debugging a pipeline

Insert `tap` to log intermediate values without breaking the pipeline:

```typescript
const result = pipe(
  data,
  tap((x) => console.log('input:', x)),
  transform1,
  tap((x) => console.log('after transform1:', x)),
  transform2,
);
```

## Performance note

- `pipe` has negligible overhead — pure function calls
- `flow` creates one closure on definition, not on each invocation
- For large arrays, combine predicates to reduce intermediate arrays:

```typescript
// Two passes — two intermediate arrays
pipe(xs, A.filter(p1), A.filter(p2));

// One pass — use filterMap or combined predicate
pipe(
  xs,
  A.filter((x) => p1(x) && p2(x)),
);
pipe(
  xs,
  A.filterMap((x) => (p1(x) && p2(x) ? O.some(transform(x)) : O.none)),
);
```
