# rtk-to-endpoints

[English](./README.md) | 简体中文

一个 TypeScript 语言服务插件，通过实现从 RTK Query hook 到 endpoint 定义的"跳转到定义"功能，增强 IDE 开发体验。

<p align="center">
  <img src="./view.gif" alt="view" width="360">
</p>

## 问题

使用 RTK Query 时，hook 名称（如 `useGetUserQuery`）是由 endpoint 名称（如 `getUser`）动态派生而来的。TypeScript 原生的"跳转到定义"只能指向类型体操代码，无法直接跳转到 `createApi` 中的 endpoint 定义处。

## 解决方案

该插件拦截"跳转到定义"请求，识别 RTK Query hook 命名模式，直接导航到对应的 endpoint 定义。

## 安装

```bash
npm install --save-dev rtk-to-endpoints
```

## 配置

### 1. 在 `tsconfig.json` 中添加插件

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

### 2. 切换 VSCode 使用工作区 TypeScript

此插件需要 VSCode 使用工作区的 TypeScript 版本而非内置版本。

**操作步骤：**

1. 打开命令面板：
   - **Windows/Linux**: `Ctrl+Shift+P`
   - **macOS**: `Cmd+Shift+P`

2. 执行指令：**TypeScript: 选择 TypeScript 版本...** (或 "TypeScript: Select TypeScript Version")

3. 选择**使用工作区版本** (或 "Use Workspace Version")

4. **重新加载 VSCode 窗口**（`Ctrl+Shift+P` / `Cmd+Shift+P` → **开发人员: 重新加载窗口** / "Developer: Reload Window"）使配置生效。

## 使用

配置完成后，在任何 RTK Query hook 上使用"跳转到定义"（F12 / Cmd+点击）：

```typescript
// 点击 useGetUserQuery 将跳转到 getUser endpoint 定义处
const { data } = useGetUserQuery();
```

### 解构场景下的多次跳转

本插件不递归解析赋值操作。如果 hook 名称是从其他地方赋值而来（例如通过解构），可能需要多次跳转：

```typescript
export const userApi = createApi({
  endpoints: (builder) => ({
    getUsers: builder.query<string, void>({
      // <- 2. 第二次跳转到达此处（endpoint 定义）
      query: () => ''
    }),
  })
})

export const { useGetUsersQuery } = userApi
//               ^
//               |
// 1. 第一次跳转到达此处（解构位置）
//    再次跳转即可到达 endpoint 定义
```

支持的 hook 模式：
- `use{Endpoint}Query`
- `useLazy{Endpoint}Query`
- `use{Endpoint}Mutation`
- `use{Endpoint}QueryState`
- `use{Endpoint}InfiniteQuery`
- `use{Endpoint}InfiniteQueryState`

## 要求

- TypeScript >= 4.0.0

## 许可证

MIT
