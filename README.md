# rtk-to-endpoints

English | [简体中文](./README.zh-CN.md)

A TypeScript Language Service Plugin that enhances IDE experience for RTK Query by enabling "Go to Definition" from hooks directly to endpoint definitions, with intelligent hover information.

<p align="center">
  <img src="./assets/view.gif" height="150" alt="view">
  &nbsp;
  <img src="./assets/hover.png" height="150" alt="hover">
</p>

## Features

- **Go to Definition**: Jump directly from RTK Query hooks to their endpoint definitions
- **Cross-file Support**: Works with hooks imported from other files (one level of import)
- **Rename Support**: Supports hooks imported with `as` alias (one level of import)
- **Hover Information**: Displays JSDoc comments and endpoint details (URL, HTTP method) on hover

## Problem

When using RTK Query, hook names (e.g., `useGetUserQuery`) are dynamically derived from endpoint names (e.g., `getUser`). TypeScript's "Go to Definition" can only point to type gymnastics, not directly to the endpoint definition in `createApi`.

## Solution

This plugin intercepts the "Go to Definition" request, recognizes RTK Query hook naming patterns, and navigates directly to the corresponding endpoint definition. It also provides rich hover information with endpoint details.

## Installation

```bash
npm install --save-dev rtk-to-endpoints
```

## Configuration

### 1. Add plugin to `tsconfig.json`

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "rtk-to-endpoints"
      }
    ]
  }
}
```

### 2. Switch VSCode to use workspace TypeScript

This plugin requires VSCode to use your workspace's TypeScript version instead of the built-in one.

**Steps:**

1. Open Command Palette:
   - **Windows/Linux**: `Ctrl+Shift+P`
   - **macOS**: `Cmd+Shift+P`

2. Run command: **TypeScript: Select TypeScript Version**

3. Select **Use Workspace Version**

4. **Reload the VSCode window** (`Ctrl+Shift+P` / `Cmd+Shift+P` → **Developer: Reload Window**) for the changes to take effect.

## Usage

### Go to Definition

After configuration, when you use "Go to Definition" (F12 / Cmd+Click) on any RTK Query hook:

```typescript
// Clicking on useGetUserQuery will jump to the getUser endpoint definition
const { data } = useGetUserQuery();
```

### Cross-file Imports

The plugin supports hooks imported from other files (up to one level of import):

```typescript
// api.ts
export const userApi = createApi({
  endpoints: (builder) => ({
    getUsers: builder.query({
      query: () => '/users'
    }),
  })
})
export const { useGetUsersQuery } = userApi

// component.ts
import { useGetUsersQuery } from './api'
//     ^ Jump works here!
```

### Import with Rename

Hooks imported with `as` alias are also supported:

```typescript
import { useGetUsersQuery as useUsers } from './api'
//     ^ Jump works here too!
```

### Hover Information

Hover over any RTK Query hook to see:
- JSDoc comments from the endpoint definition
- HTTP method and URL

```typescript
export const userApi = createApi({
  endpoints: (builder) => ({
    /**
     * Fetches all users from the API
     */
    getUsers: builder.query({
      query: () => '/users'  // or: () => ({ url: '/users', method: 'GET' })
    }),
  })
})
```

Hovering over `useGetUsersQuery` will display:
- "Fetches all users from the API"
- Method: GET
- URL: /users

### Multiple Jumps in Destructuring

This plugin does not recursively resolve assignments. If the hook name is assigned from elsewhere (e.g., via destructuring), you may need to jump multiple times:

```typescript
export const userApi = createApi({
  endpoints: (builder) => ({
    getUsers: builder.query<string, void>({
      // <- 2. Second jump lands here (endpoint definition)
      query: () => ''
    }),
  })
})

export const { useGetUsersQuery } = userApi
//               ^
//               |
// 1. First jump lands here (destructuring location)
//    Then jump again to reach the endpoint definition
```

## Supported Hook Patterns

- `use{Endpoint}Query`
- `useLazy{Endpoint}Query`
- `use{Endpoint}Mutation`
- `use{Endpoint}QueryState`
- `use{Endpoint}InfiniteQuery`
- `use{Endpoint}InfiniteQueryState`

## Requirements

- TypeScript >= 4.0.0

## License

MIT
