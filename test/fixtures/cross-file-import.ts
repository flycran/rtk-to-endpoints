// 测试场景：跨文件导入的解构 hooks
// 这个文件模拟从另一个文件导入 hooks 的场景
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

/**
 * 用户 API
 * 用于测试跨文件导入场景
 */
export const userApi = createApi({
	reducerPath: "crossFileUserApi",
	baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
	endpoints: (builder) => ({
		/**
		 * 获取所有用户
		 * @returns 用户列表
		 */
		getUsers: builder.query<string[], void>({
			query: () => "/users",
		}),
		/**
		 * 创建新用户
		 * @param body - 用户信息
		 * @returns 创建的用户
		 */
		createUser: builder.mutation<string, { name: string }>({
			query: (body) => ({
				url: "/users",
				method: "POST",
				body,
			}),
		}),
	}),
});

// 导出 hooks - 这些将被另一个文件导入
export const { useGetUsersQuery, useCreateUserMutation } = userApi;
