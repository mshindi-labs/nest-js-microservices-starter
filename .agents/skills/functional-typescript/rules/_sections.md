# Sections

This file defines all sections, their ordering, impact levels, and descriptions.
The section ID (in parentheses) is the filename prefix used to group rules.

---

## 1. Core Principles (core)

**Impact:** CRITICAL
**Description:** The three laws of functional programming — pure functions, no side effects, referential transparency. Violating these principles cascades into unpredictable behaviour, untestable code, and brittle systems.

## 2. Immutability (immut)

**Impact:** CRITICAL
**Description:** Mutation is the primary source of bugs in stateful programs. Treating data as immutable eliminates an entire class of race conditions, unexpected state changes, and debugging sessions.

## 3. Closures & Scope (closure)

**Impact:** HIGH
**Description:** Closures are the mechanism that makes FP possible in JavaScript. Understanding how functions capture their lexical environment enables encapsulation, memoization, and partial application without classes.

## 4. Function Patterns (fn)

**Impact:** HIGH
**Description:** Partial application, currying, composition, and higher-order functions are the core vocabulary of FP. These patterns replace imperative loops and conditionals with declarative, reusable pipelines.

## 5. Module Pattern (module)

**Impact:** MEDIUM-HIGH
**Description:** The module pattern uses closures to enforce public/private boundaries without a class system. Correct module structure makes refactoring safe and APIs impossible to misuse.

## 6. TypeScript FP Types (types)

**Impact:** MEDIUM
**Description:** TypeScript's type system can encode FP contracts precisely — making illegal states unrepresentable, forcing callers to handle both success and failure, and preventing accidental mutation at compile time.

## 7. Code Style (style)

**Impact:** LOW-MEDIUM
**Description:** Point-free style, consistent naming, and avoiding class-based patterns where functions suffice keep FP code concise and composable.

## 8. fp-ts Library (fp-ts)

**Impact:** HIGH (apply when codebase imports from `fp-ts/*`)
**Description:** The fp-ts library provides battle-tested container types (Option, Either, TaskEither) and composition utilities (pipe, flow) that encode FP patterns with a rich combinator API. These rules cover when and how to use each type, the full async error-handling workflow via TaskEither, and Do notation for multi-step computations. Apply in addition to — not instead of — the vanilla FP rules above.
