// 测试场景：Lazy Query hooks
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const orderApi = createApi({
  reducerPath: 'orderApi',
  baseQuery: fetchBaseQuery(),
  endpoints: (builder) => ({
    getOrders: builder.query({
      query: () => '/orders'
    }),
    getOrderById: builder.query({
      query: (id: string) => `/orders/${id}`
    }),
    createOrder: builder.mutation({
      query: (data: any) => ({
        url: '/orders',
        method: 'POST',
        body: data
      })
    }),
  })
})

// Lazy hooks
export const {
  useLazyGetOrdersQuery,
  useLazyGetOrderByIdQuery,
} = orderApi
