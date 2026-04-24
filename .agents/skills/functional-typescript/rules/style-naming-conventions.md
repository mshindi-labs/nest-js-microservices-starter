---
title: Follow FP Naming Conventions
impact: LOW-MEDIUM
impactDescription: makes function intent and data flow self-evident without comments
tags: style, naming, conventions, readability
---

## Follow FP Naming Conventions

**Impact: LOW-MEDIUM**

Good names in FP code communicate what a function does (verb) or what data represents (noun). They remove the need for comments and make pipelines readable as English sentences.

**Functions — use verbs and predicate patterns:**

```typescript
// Transforms — use verb or verb phrase
const trim          = (s: string) => s.trim()
const normalise     = (s: string) => s.toLowerCase().trim()
const toSlug        = (s: string) => s.toLowerCase().replace(/\s+/g, '-')
const parseDate     = (s: string) => new Date(s)

// Predicates — prefix with `is`, `has`, `can`, `should`
const isActive      = (u: User): boolean => u.active
const isNonEmpty    = (s: string): boolean => s.length > 0
const hasPermission = (u: User, action: string): boolean => u.permissions.includes(action)

// Factory functions — prefix with `make` or `create`
const makeCounter   = (start = 0) => { ... }
const createLogger  = (prefix: string) => { ... }

// HOF creators — name describes the specialised result
const multiplyBy    = (factor: number) => (n: number) => n * factor
const filterBy      = <T>(pred: Predicate<T>) => (xs: T[]) => xs.filter(pred)
const sortByKey     = <T>(key: keyof T) => (xs: T[]) => xs.toSorted((a, b) => ...)
```

**Type aliases — use nouns and adjectives:**

```typescript
type UserId         = string
type Timestamp      = number
type Predicate<T>   = (x: T) => boolean
type Transform<A,B> = (x: A) => B
type NonEmptyArray<T> = [T, ...T[]]
```

**Avoid generic variable names except in truly generic contexts:**

```typescript
// Bad — what is `x`, `d`, `r`?
const process = (x: unknown) => { ... }
const fn = (d: User[]) => d.map(r => r.name)

// Good — names communicate domain
const processEvent  = (event: DomainEvent) => { ... }
const extractNames  = (users: User[]) => users.map(user => user.name)
```

**Type parameter names:**

```typescript
// Single type param — use T
function identity<T>(x: T): T { return x }

// Descriptive when it aids understanding
function zip<TLeft, TRight>(left: TLeft[], right: TRight[]): [TLeft, TRight][]
function groupBy<TItem, TKey extends string>(items: TItem[], key: (i: TItem) => TKey)

// Input/output convention
function transform<TInput, TOutput>(input: TInput, fn: (x: TInput) => TOutput): TOutput
```

**Pipeline variable names — name the data, not the step:**

```typescript
// Bad — names describe transformation steps
const trimmed     = trim(input)
const lowercased  = lower(trimmed)
const slugified   = slug(lowercased)

// Good — use pipe, no intermediate names needed
const slug = pipe(trim, lower, toSlug)(input)

// Or if intermediate names are needed, name the data at each stage
const rawTitle      = ' Hello World '
const cleanTitle    = trim(rawTitle)
const urlSegment    = toSlug(cleanTitle)
```
