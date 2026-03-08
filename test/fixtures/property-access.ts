// 测试场景：属性访问方式使用 hooks
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const productApi = createApi({
  reducerPath: 'productApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (builder) => ({
    getProducts: builder.query({
      query: () => '/products'
    }),
    getProductById: builder.query({
      query: (id: number) => `/products/${id}`
    }),
  })
})

// 使用属性访问
const useGetProductsQuery = productApi.useGetProductsQuery
const useGetProductByIdQuery = productApi.useGetProductByIdQuery

// 导出
export { useGetProductsQuery, useGetProductByIdQuery }
