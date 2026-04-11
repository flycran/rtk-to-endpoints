// 测试场景：从另一个文件导入解构后的 hooks（跨一层导入）
import { useCreateUserMutation, useGetUsersQuery } from "./cross-file-import";

// 使用导入的 hooks
const usersQuery = useGetUsersQuery;
const createMutation = useCreateUserMutation;

export { createMutation, usersQuery };
