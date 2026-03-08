import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

// 使用 fetchBaseQuery 替代 axios
export const userApi2 = createApi({
  reducerPath: 'userApi',
  baseQuery: fetchBaseQuery(),
  endpoints: (builder) => ({
    getUsers: builder.query({
      query: () => ''
    }),

    getUserById: builder.query({
      query: () => '',
    }),
  })
})

// 导出 hooks
export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
} = userApi2
