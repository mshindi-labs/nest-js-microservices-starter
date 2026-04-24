---
title: Never Mutate Arguments or External State
impact: CRITICAL
impactDescription: prevents an entire class of shared-state bugs and unexpected re-renders
tags: immutability, mutation, spread, pure-functions
---

## Never Mutate Arguments or External State

**Impact: CRITICAL**

Mutating a function's arguments or variables from an outer scope creates invisible coupling between the caller and the callee. Bugs manifest far from the mutation site, often only under specific call orders. In React and other reactive frameworks, mutation silently bypasses change detection entirely.

**Incorrect (mutates the array argument):**

```typescript
function addItem(cart: CartItem[], item: CartItem): CartItem[] {
  cart.push(item) // mutates caller's array
  return cart
}
```

**Correct (return a new array):**

```typescript
function addItem(cart: readonly CartItem[], item: CartItem): CartItem[] {
  return [...cart, item]
}
```

**Incorrect (mutates a nested object):**

```typescript
function applyDiscount(order: Order, percent: number): Order {
  order.total = order.total * (1 - percent / 100) // mutates input
  return order
}
```

**Correct (return a new object with spread):**

```typescript
function applyDiscount(order: Readonly<Order>, percent: number): Order {
  return { ...order, total: order.total * (1 - percent / 100) }
}
```

**Incorrect (mutates deeply nested state):**

```typescript
function updateUserCity(state: AppState, userId: string, city: string): AppState {
  state.users[userId].address.city = city // deep mutation
  return state
}
```

**Correct (immutable deep update):**

```typescript
function updateUserCity(
  state: Readonly<AppState>,
  userId: string,
  city: string
): AppState {
  return {
    ...state,
    users: {
      ...state.users,
      [userId]: {
        ...state.users[userId],
        address: { ...state.users[userId].address, city },
      },
    },
  }
}
```

For deeply nested structures, consider `structuredClone` or a library like
`immer` for complex update logic, but always prefer the flat spread pattern
when the structure is shallow.

Reference: [MDN — Spread syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax)
