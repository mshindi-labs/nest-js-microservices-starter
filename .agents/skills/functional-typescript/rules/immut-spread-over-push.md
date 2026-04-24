---
title: Use Spread and Map Instead of Push, Splice, and Sort
impact: CRITICAL
impactDescription: eliminates mutation bugs from array operations
tags: immutability, arrays, spread, map, filter, reduce
---

## Use Spread and Map Instead of Push, Splice, and Sort

**Impact: CRITICAL**

The most common source of accidental mutation in JavaScript is the array methods that operate in place: `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`, `fill`, and `copyWithin`. Replace them with expressions that return new arrays.

**Incorrect vs Correct — quick reference:**

```typescript
const xs = [3, 1, 2]

// Append
xs.push(4)                       // mutates ❌
const appended = [...xs, 4]      // new array ✓

// Prepend
xs.unshift(0)                    // mutates ❌
const prepended = [0, ...xs]     // new array ✓

// Remove by index
xs.splice(1, 1)                  // mutates ❌
const removed = xs.filter((_, i) => i !== 1) // new array ✓

// Replace by index
xs[1] = 99                       // mutates ❌
const replaced = xs.map((x, i) => i === 1 ? 99 : x) // new array ✓

// Sort
xs.sort()                        // mutates ❌
const sorted = [...xs].sort()    // new array ✓
// or (ES2023):
const sorted2 = xs.toSorted()   // new array ✓

// Reverse
xs.reverse()                     // mutates ❌
const reversed = [...xs].reverse() // new array ✓
// or (ES2023):
const reversed2 = xs.toReversed() // new array ✓
```

**Real-world example — shopping cart:**

```typescript
type CartItem = { id: string; qty: number }

// Incorrect — all three operations mutate the cart array
function addToCart(cart: CartItem[], item: CartItem): CartItem[] {
  const existing = cart.find(i => i.id === item.id)
  if (existing) {
    existing.qty += item.qty // mutates object
  } else {
    cart.push(item)          // mutates array
  }
  cart.sort((a, b) => a.id.localeCompare(b.id)) // mutates array
  return cart
}

// Correct — returns new structures at every step
function addToCart(cart: readonly CartItem[], item: CartItem): CartItem[] {
  const exists = cart.some(i => i.id === item.id)
  const updated = exists
    ? cart.map(i => i.id === item.id ? { ...i, qty: i.qty + item.qty } : i)
    : [...cart, item]
  return updated.toSorted((a, b) => a.id.localeCompare(b.id))
}
```

Reference: [MDN — Array methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)
