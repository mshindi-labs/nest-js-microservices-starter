---
title: Use ES Modules for File-Level Encapsulation
impact: MEDIUM-HIGH
impactDescription: the module system enforces private/public boundaries with zero runtime cost
tags: modules, esm, encapsulation, exports, typescript
---

## Use ES Modules for File-Level Encapsulation

**Impact: MEDIUM-HIGH**

In ES modules (and TypeScript), every file is a module. Unexported identifiers are private by default — no IIFE needed. The module system is the boundary. Export only what callers need; keep implementation details unexported.

**Incorrect (exporting mutable state directly):**

```typescript
// user-store.ts
export let users: User[] = []          // mutable, public — anyone can replace it
export function addUser(u: User) {
  users.push(u)                        // mutation
}
```

**Correct (export functions, not raw state):**

```typescript
// user-store.ts
const users: User[] = []              // private to this module

export function addUser(user: User): void {
  users.push({ ...user })             // store a copy
}

export function getUsers(): readonly User[] {
  return users                        // readonly — callers cannot mutate
}

export function findUser(id: string): User | undefined {
  return users.find(u => u.id === id)
}

export function removeUser(id: string): boolean {
  const index = users.findIndex(u => u.id === id)
  if (index === -1) return false
  users.splice(index, 1)
  return true
}
```

**Incorrect (exporting implementation details):**

```typescript
// api-client.ts
export const BASE_URL = 'https://api.example.com'   // internal detail — leaks

export function buildUrl(path: string): string {
  return `${BASE_URL}${path}`
}

export async function get(path: string) {
  return fetch(buildUrl(path))
}
```

**Correct (only export the public API):**

```typescript
// api-client.ts
const BASE_URL = 'https://api.example.com'          // private

function buildUrl(path: string): string {
  return `${BASE_URL}${path}`
}

export async function get<T>(path: string): Promise<T> {
  const res = await fetch(buildUrl(path))
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

export async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}
```

**Re-export pattern — barrel files for public API surfaces:**

```typescript
// features/users/index.ts  — public API barrel (intentional, not for tree-shaking)
export { getUsers, addUser, findUser, removeUser } from './user-store'
export type { User } from './types'
// Does NOT export UserStore implementation details
```

**Rule:** if an identifier only exists to support other module-private code, do not export it. The `export` keyword is a deliberate API decision, not a default.

Reference: [MDN — JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
