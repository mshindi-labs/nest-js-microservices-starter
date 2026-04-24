---
title: Use `as const` for Immutable Literal Values
impact: HIGH
impactDescription: creates the narrowest possible literal types and prevents runtime mutation
tags: immutability, typescript, as-const, literal-types, enums
---

## Use `as const` for Immutable Literal Values

**Impact: HIGH**

`as const` freezes an object or array literal to its narrowest possible type and makes all properties `readonly` deeply. Use it to replace `enum` (which generates runtime code), to derive union types from arrays, and to mark configuration objects that should never change.

**Incorrect (widened types lose precision):**

```typescript
const DIRECTION = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
}
// type of DIRECTION.UP is `string`, not `"up"`
// DIRECTION.UP = 'other' // silently allowed

type Direction = typeof DIRECTION[keyof typeof DIRECTION]
// Direction = string — useless
```

**Correct (`as const` narrows to literals):**

```typescript
const DIRECTION = {
  UP:    'up',
  DOWN:  'down',
  LEFT:  'left',
  RIGHT: 'right',
} as const

// DIRECTION.UP = 'other' // TS error: Cannot assign to 'UP' (readonly)

type Direction = typeof DIRECTION[keyof typeof DIRECTION]
// Direction = "up" | "down" | "left" | "right" — precise
```

**Incorrect (array loses element types):**

```typescript
const ROLES = ['admin', 'viewer', 'editor']
type Role = typeof ROLES[number]
// Role = string — widened, loses the literals
```

**Correct (array tuple with `as const`):**

```typescript
const ROLES = ['admin', 'viewer', 'editor'] as const
type Role = typeof ROLES[number]
// Role = "admin" | "viewer" | "editor"

function hasRole(role: string): role is Role {
  return (ROLES as readonly string[]).includes(role)
}
```

**Replace `enum` with `as const` objects:**

```typescript
// Avoid: enum generates runtime code and has surprising behaviour
enum Status {
  Active = 'active',
  Inactive = 'inactive',
}

// Prefer: as const + type alias
const Status = {
  Active:   'active',
  Inactive: 'inactive',
} as const

type Status = typeof Status[keyof typeof Status]
// "active" | "inactive"
```

Reference: [TypeScript 3.4 Release — const assertions](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#const-assertions)
