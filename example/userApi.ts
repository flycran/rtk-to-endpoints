import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const userApi = createApi({
	reducerPath: "userApi",
	baseQuery: fetchBaseQuery(),
	endpoints: (builder) => ({
		/** Get users list  */
		getUsers: builder.query<string, void>({
			// <- 2. 跳转到这里
			query: () => "/users",
		}),
		/** 获取商品列表 */
		getProducts: builder.query<string, void>({
			query: () => ({
				url: "/products",
				method: "GET",
			}),
		}),
	}),
});

// 导出 hooks
export const {
	/** 获取用户列表 */
	useGetUsersQuery, // <- 1. 跳转到这里，此处再次跳转到定义
} = userApi;

useGetUsersQuery;

export const useGetProductsQuery = userApi.useGetProductsQuery;
