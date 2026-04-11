import {
	useGetProductsQuery,
	useGetUsersQuery,
	useGetUsersQuery as useGetUsersQuery2,
	userApi,
} from "./userApi";

useGetProductsQuery;
// 解构赋值: 支持
useGetUsersQuery;
// 导入重命名+解构赋值: 需要跳转两次
useGetUsersQuery2;
// 属性访问: 支持|直接返回url: 显示源jsdoc
userApi.useGetUsersQuery;
// 属性访问: 支持|返回对象: 显示源jsdoc
userApi.useGetProductsQuery;
