// 测试场景：跨文件导入并使用 as 重命名的解构 hooks（跨一层导入）
import {
	useCreateUserMutation as useAddUserMutation,
	useGetUsersQuery as useGetAllUsersQuery,
} from "./cross-file-import";

// 使用重命名后的 hooks
const getAllUsers = useGetAllUsersQuery;
const addUser = useAddUserMutation;

export { addUser, getAllUsers };
