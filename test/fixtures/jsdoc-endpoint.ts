// 测试场景：带有 JSDoc 注释的 endpoint 和悬停提示
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const api = createApi({
	reducerPath: "jsdocApi",
	baseQuery: fetchBaseQuery({ baseUrl: "/api/v1" }),
	endpoints: (builder) => ({
		/**
		 * 获取用户列表
		 * 返回系统中所有注册用户的列表
		 * @returns 用户数组
		 */
		getUsers: builder.query<string[], void>({
			query: () => "/users",
		}),
		/**
		 * 根据 ID 获取用户详情
		 * @param id - 用户唯一标识符
		 * @returns 单个用户信息
		 */
		getUserById: builder.query<string, number>({
			query: (id) => `/users/${id}`,
		}),
		/**
		 * 创建新用户
		 * @param userData - 用户数据
		 * @returns 创建成功的用户信息
		 */
		createUser: builder.mutation<string, { name: string; email: string }>({
			query: (userData) => ({
				url: "/users",
				method: "POST",
				body: userData,
			}),
		}),
		/**
		 * 更新用户信息
		 * @param params - 包含用户 ID 和更新数据
		 * @returns 更新后的用户信息
		 */
		updateUser: builder.mutation<
			string,
			{ id: number; data: { name: string } }
		>({
			query: ({ id, data }) => ({
				url: `/users/${id}`,
				method: "PUT",
				body: data,
			}),
		}),
		/**
		 * 删除用户
		 * @param id - 要删除的用户 ID
		 */
		deleteUser: builder.mutation<void, number>({
			query: (id) => ({
				url: `/users/${id}`,
				method: "DELETE",
			}),
		}),
	}),
});

export const {
	useGetUsersQuery,
	useGetUserByIdQuery,
	useCreateUserMutation,
	useUpdateUserMutation,
	useDeleteUserMutation,
} = api;
