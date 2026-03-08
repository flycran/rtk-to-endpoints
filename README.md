# rtk-to-endpoints

English | [简体中文](./README.zh-CN.md)

A TypeScript Language Service Plugin that enhances IDE experience for RTK Query by enabling "Go to Definition" from hooks directly to endpoint definitions.

## Problem

When using RTK Query, hook names (e.g., `useGetUserQuery`) are dynamically derived from endpoint names (e.g., `getUser`). TypeScript's "Go to Definition" can only point to type gymnastics, not directly to the endpoint definition in `createApi`.

## Solution

This plugin intercepts the "Go to Definition" request, recognizes RTK Query hook naming patterns, and navigates directly to the corresponding endpoint definition.

## Installation

```bash
npm install --save-dev rtk-to-endpoints
```

## Configuration

Add the plugin to your `tsconfig.json`:

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

## Usage

After configuration, when you use "Go to Definition" (F12 / Cmd+Click) on any RTK Query hook:

```typescript
// Clicking on useGetUserQuery will jump to the getUser endpoint definition
const { data } = useGetUserQuery();
```

Supported hook patterns:
- `use{Endpoint}Query`
- `useLazy{Endpoint}Query`
- `use{Endpoint}Mutation`
- `use{Endpoint}QueryState`
- `use{Endpoint}QuerySubscription`
- `use{Endpoint}InfiniteQuery`
- `use{Endpoint}InfiniteQueryState`
- `use{Endpoint}InfiniteQuerySubscription`

## Requirements

- TypeScript >= 4.0.0

## License

MIT
