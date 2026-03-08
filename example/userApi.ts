import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: fetchBaseQuery(),
  endpoints: (builder) => ({
    getUsers: builder.query<string, void>({ // <- 2. 跳转到这里
      query: () => ''
    }),
    getProducts: builder.query<string, void>({
      query: () => ''
    }),
  })
})

// 导出 hooks
export const {
  useGetUsersQuery, // <- 1. 跳转到这里，此处再次跳转到定义
} = userApi

export const useGetProductsQuery = userApi.useGetProductsQuery
