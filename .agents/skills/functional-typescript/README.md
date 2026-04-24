# functional-typescript

An agent skill for writing idiomatic functional TypeScript and JavaScript.

## What it does

When installed, this skill guides your AI coding assistant to apply functional
programming patterns — closures, pure functions, immutability, partial
application, currying, higher-order functions, function composition, and the
module pattern — using TypeScript's type system to make those patterns safe and
expressive.

The skill draws on patterns from [_You Don't Know JS Yet_](https://github.com/getify/you-dont-know-js)
by Kyle Simpson for deep JS foundations, extended with TypeScript-specific types and idioms.

## Contents

```
functional-typescript/
├── SKILL.md                                   ← main instructions
└── references/
    ├── closures-and-partial-application.md    ← closures, partial application, currying, memoization
    ├── module-pattern.md                      ← IIFE, factory, ESM, CommonJS modules
    └── fp-typescript-types.md                 ← Readonly, Result, Option, HOF generics
```

## Installation

### Via skills.sh

```bash
npx skills add https://github.com/mshindi-labs/agent-skills --skill functional-typescript
```

### Manual

Copy `SKILL.md` (and optionally `references/`) into your project's
`.agents/skills/functional-typescript/` directory, then add the skill to your
agent configuration.

## Topics covered

- First-class functions and function values
- Closures — what they are, when to use them, common pitfalls
- Pure functions and side-effect isolation
- Immutability with `Readonly<T>`, `ReadonlyArray<T>`, and `as const`
- Partial application and currying (with TypeScript generics)
- Higher-order functions (`map`, `filter`, `reduce`, `pipe`, `compose`)
- Function composition and pipelines
- The module pattern (IIFE singleton, factory, ESM, CommonJS)
- TypeScript types for FP: `Result<T>`, `Option<T>`, discriminated unions,
  type guards, conditional types, `satisfies`

## License

MIT
