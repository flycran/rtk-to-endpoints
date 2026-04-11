// 测试场景：解构赋值导出 hooks
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const userApi = createApi({
	reducerPath: "userApi",
	baseQuery: fetchBaseQuery(),
	endpoints: (builder) => ({
		getUsers: builder.query<string, void>({
			query: () => "/users",
		}),
		getUserById: builder.query<string, { id: number }>({
			query: ({ id }) => `/users/${id}`,
		}),
		createUser: builder.mutation<string, { name: string }>({
			query: (body) => ({
				url: "/users",
				method: "POST",
				body,
			}),
		}),
		updateUser: builder.mutation<string, { id: number; name: string }>({
			query: ({ id, ...body }) => ({
				url: `/users/${id}`,
				method: "PUT",
				body,
			}),
		}),
		deleteUser: builder.mutation<void, { id: number }>({
			query: ({ id }) => ({
				url: `/users/${id}`,
				method: "DELETE",
			}),
		}),
	}),
});

// 导出 hooks - 这是测试的主要目标
export const {
	useGetUsersQuery,
	useGetUserByIdQuery,
	useCreateUserMutation,
	useUpdateUserMutation,
	useDeleteUserMutation,
} = userApi;
