import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

// 使用 fetchBaseQuery 替代 axios
export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: fetchBaseQuery(),
  endpoints: (builder) => ({
    getUsers: builder.query<string, void>({
      query: () => ''
    }),
    
    /** 获取用户信息 */
    getUserById: builder.query({
      query: () => '',
    }),
  })
})

// 导出 hooks
export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
} = userApi

userApi.useGetUserByIdQuery
