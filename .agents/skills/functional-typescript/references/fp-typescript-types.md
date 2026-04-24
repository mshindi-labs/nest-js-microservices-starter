# TypeScript Types for Functional Programming

TypeScript's type system is expressive enough to model FP patterns precisely.
This reference covers the types you reach for most often when writing
functional TypeScript.

---

## Immutability Types

```ts
// Shallow immutability
type Config = Readonly<{
  host: string;
  port: number;
}>;

// Immutable array
type Tags = ReadonlyArray<string>;
// or equivalently:
type Tags2 = readonly string[];

// Deep immutability (manual for nested)
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

// Const assertion — narrowest possible literal types
const ROLES = ['admin', 'viewer', 'editor'] as const;
type Role = (typeof ROLES)[number]; // "admin" | "viewer" | "editor"

const CONFIG = { host: 'localhost', port: 3000 } as const;
type Port = (typeof CONFIG)['port']; // 3000, not number
```

Use `Readonly<T>` on function parameters to signal that the function will
not mutate its inputs — this is the TypeScript equivalent of a pure function
contract.

---

## Function Type Aliases

Name function shapes so they can be reused and composed:

```ts
type Predicate<T> = (value: T) => boolean;
type Transform<A, B = A> = (input: A) => B;
type Reducer<S, A> = (state: S, action: A) => S;
type Effect<T> = (value: T) => void;
type Lazy<T> = () => T;

// Usage
const isEven: Predicate<number> = (n) => n % 2 === 0;
const double: Transform<number> = (n) => n * 2;
const append: Transform<number[], number[]> = (xs) => [...xs, 0];
```

---

## Generic Higher-Order Functions

```ts
// map
function map<A, B>(arr: readonly A[], fn: Transform<A, B>): B[] {
  return arr.map(fn);
}

// filter
function filter<T>(arr: readonly T[], pred: Predicate<T>): T[] {
  return arr.filter(pred);
}

// reduce
function reduce<T, R>(
  arr: readonly T[],
  fn: (acc: R, cur: T) => R,
  initial: R,
): R {
  return arr.reduce(fn, initial);
}

// pipe — left-to-right composition
function pipe<T>(...fns: Array<Transform<T>>): Transform<T> {
  return (x: T) => fns.reduce((v, fn) => fn(v), x);
}

// compose — right-to-left
function compose<T>(...fns: Array<Transform<T>>): Transform<T> {
  return (x: T) => fns.reduceRight((v, fn) => fn(v), x);
}
```

---

## Discriminated Unions (Result / Option)

Model success/failure or presence/absence without exceptions:

```ts
// Result type
type Ok<T> = { readonly ok: true; readonly value: T };
type Err<E> = { readonly ok: false; readonly error: E };
type Result<T, E = string> = Ok<T> | Err<E>;

const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
const err = <E>(error: E): Err<E> => ({ ok: false, error });

function divide(a: number, b: number): Result<number> {
  if (b === 0) return err('Division by zero');
  return ok(a / b);
}

const result = divide(10, 2);
if (result.ok) {
  console.log(result.value * 2); // TS narrows to Ok<number>
} else {
  console.error(result.error); // TS narrows to Err<string>
}

// Option type (nullable without null)
type Some<T> = { readonly tag: 'some'; readonly value: T };
type None = { readonly tag: 'none' };
type Option<T> = Some<T> | None;

const some = <T>(value: T): Some<T> => ({ tag: 'some', value });
const none: None = { tag: 'none' };

function head<T>(arr: readonly T[]): Option<T> {
  return arr.length > 0 ? some(arr[0]) : none;
}
```

---

## Narrowing with Type Guards

Pure, testable predicates that also narrow types:

```ts
function isString(x: unknown): x is string {
  return typeof x === 'string';
}

function isNonNull<T>(x: T | null | undefined): x is T {
  return x != null;
}

// Filter out nulls with full type safety
const values: Array<string | null> = ['a', null, 'b', null, 'c'];
const strings: string[] = values.filter(isNonNull);
```

---

## Conditional & Mapped Types for FP Utilities

```ts
// Unwrap a Promise
type Awaited<T> = T extends Promise<infer R> ? Awaited<R> : T;

// Unwrap an array element
type ElementOf<T> = T extends ReadonlyArray<infer Item> ? Item : never;

// Make all function params optional (for partial application types)
type PartialParams<F extends (...args: any[]) => any> = F extends (
  ...args: infer P
) => infer R
  ? (...args: Partial<P>) => R
  : never;

// Immutable version of any function's first parameter
type ImmutableInput<F extends (arg: any) => any> = F extends (
  arg: infer A,
) => infer R
  ? (arg: Readonly<A>) => R
  : never;
```

---

## The `satisfies` Operator (TS 4.9+)

Validate without widening — preserves the literal type while checking against
a broader type:

```ts
type Transform<A, B> = (input: A) => B;

const pipeline = {
  trim: (s: string) => s.trim(),
  lower: (s: string) => s.toLowerCase(),
  slug: (s: string) => s.replace(/\s+/g, '-'),
} satisfies Record<string, Transform<string, string>>;

// Each property retains its specific type (not widened to Transform<string, string>)
pipeline.trim('  hi  '); // string — autocomplete works
```

---

## Function Overloads for FP Utilities

When a function can be called in multiple ways, overloads give precise types:

```ts
function curry<A, B, C>(fn: (a: A, b: B) => C): (a: A) => (b: B) => C;
function curry<A, B, C, D>(
  fn: (a: A, b: B, c: C) => D,
): (a: A) => (b: B) => (c: C) => D;
function curry(fn: Function) {
  return function curried(...args: unknown[]) {
    if (args.length >= fn.length) return fn(...args);
    return (...more: unknown[]) => curried(...args, ...more);
  };
}
```

---

## Quick Reference

| Pattern                | TypeScript Tool                      |
| ---------------------- | ------------------------------------ |
| Immutable object       | `Readonly<T>`                        |
| Immutable array        | `readonly T[]` or `ReadonlyArray<T>` |
| Literal union          | `as const` + `typeof X[number]`      |
| Success/failure        | Discriminated union (`Result<T, E>`) |
| Optional value         | Discriminated union (`Option<T>`)    |
| Type-safe predicate    | `x is T` return type                 |
| Function shape         | `type F = (x: A) => B`               |
| Validate without widen | `satisfies`                          |
| Unwrap generic         | `infer` in conditional type          |

---

## fp-ts Library Equivalences

When the codebase uses the `fp-ts` library, prefer its canonical types over
hand-rolled implementations. The vanilla patterns above and the fp-ts types
encode the same ideas; fp-ts adds a richer combinator API.

| Vanilla pattern                    | fp-ts equivalent            | Import                                          |
| ---------------------------------- | --------------------------- | ----------------------------------------------- |
| `Result<T, E>` discriminated union | `Either<E, A>`              | `import * as E from 'fp-ts/Either'`             |
| `Option<T>` discriminated union    | `Option<T>`                 | `import * as O from 'fp-ts/Option'`             |
| `() => Promise<Either<E, A>>`      | `TaskEither<E, A>`          | `import * as TE from 'fp-ts/TaskEither'`        |
| Manual `pipe` util                 | `pipe`                      | `import { pipe } from 'fp-ts/function'`         |
| Manual `compose` util              | `flow`                      | `import { flow } from 'fp-ts/function'`         |
| `(deps: D) => TaskEither<E, A>`    | `ReaderTaskEither<D, E, A>` | `import * as RTE from 'fp-ts/ReaderTaskEither'` |
| `readonly T[]` operations          | `Array` module              | `import * as A from 'fp-ts/Array'`              |
| `Record<string, T>` operations     | `Record` module             | `import * as R from 'fp-ts/Record'`             |

See `references/fp-ts-library.md` for the full fp-ts API cheat sheet.
