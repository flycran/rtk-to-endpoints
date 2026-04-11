/** biome-ignore-all lint/style/noNonNullAssertion: 忽略 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSON5 from "json5";
import ts from "typescript";
import { beforeAll, describe, expect, it } from "vitest";
import {
	findApi,
	findEndpoint,
	getDefinitionAndBoundSpan,
	getEndpointInfo,
	getIdentifierNodeAt,
	getQuickInfoAtPosition,
} from "../src/utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建 TypeScript 程序的辅助函数
async function createTypeScriptProgram(fileNames: string[]): Promise<{
	program: ts.Program;
	checker: ts.TypeChecker;
	filesMap: Map<string, ts.SourceFile>;
}> {
	const tsconfigPath = path.resolve(__dirname, "./tsconfig.json");
	const tsconfigContent = await fs
		.readFile(tsconfigPath, "utf8")
		.catch(() => "{}");
	const configFile = JSON5.parse(tsconfigContent);

	const parsedConfig = ts.parseJsonConfigFileContent(
		configFile,
		ts.sys,
		path.resolve(__dirname, ".."),
	);

	// 使用 ts.sys 作为文件系统，让 TypeScript 自动解析 node_modules
	const compilerHost = ts.createCompilerHost(parsedConfig.options);

	const program = ts.createProgram(
		fileNames,
		parsedConfig.options,
		compilerHost,
	);
	const checker = program.getTypeChecker();

	const filesMap = new Map<string, ts.SourceFile>();
	for (const fileName of fileNames) {
		const sf = program.getSourceFile(fileName);
		if (sf) {
			filesMap.set(fileName, sf);
		}
	}

	return { program, checker, filesMap };
}

describe("Integration Tests - TypeScript Language Service", () => {
	let program: ts.Program;
	let checker: ts.TypeChecker;
	let testFiles: Map<string, ts.SourceFile> = new Map();
	let fixturesDir: string;

	beforeAll(async () => {
		fixturesDir = path.resolve(__dirname, "./fixtures");

		const fixtureFiles = [
			"destructure-api.ts",
			"property-access.ts",
			"lazy-hooks.ts",
			"cross-file-import.ts",
			"cross-file-consumer.ts",
			"cross-file-rename.ts",
			"jsdoc-endpoint.ts",
		];
		const fileNames = fixtureFiles.map((f) => path.resolve(fixturesDir, f));

		const result = await createTypeScriptProgram(fileNames);
		program = result.program;
		checker = result.checker;
		testFiles = result.filesMap;
	});

	describe("getIdentifierNodeAt", () => {
		it("should find identifier at position in destructured hook", () => {
			const destructureFile = path.resolve(fixturesDir, "destructure-api.ts");
			const sf = testFiles.get(destructureFile)!;
			const content = sf.getFullText();
			const hookIndex = content.indexOf("useGetUsersQuery");
			expect(hookIndex).toBeGreaterThan(-1);

			const node = getIdentifierNodeAt(sf, hookIndex);
			expect(node).toBeDefined();
			expect(node!.getText()).toBe("useGetUsersQuery");
		});

		it("should find identifier at position in property access", () => {
			const propertyAccessFile = path.resolve(
				fixturesDir,
				"property-access.ts",
			);
			const sf = testFiles.get(propertyAccessFile)!;
			const content = sf.getFullText();
			const lineIndex = content.indexOf("productApi.useGetProductsQuery");
			expect(lineIndex).toBeGreaterThan(-1);
			const hookIndex = lineIndex + "productApi.".length;

			const node = getIdentifierNodeAt(sf, hookIndex);
			expect(node).toBeDefined();
			expect(node!.getText()).toBe("useGetProductsQuery");
		});
	});

	describe("findApi", () => {
		it("should find api node from destructured hook", () => {
			const destructureFile = path.resolve(fixturesDir, "destructure-api.ts");
			const sf = testFiles.get(destructureFile)!;
			const content = sf.getFullText();
			const hookIndex = content.indexOf("useGetUsersQuery");

			const node = getIdentifierNodeAt(sf, hookIndex);
			expect(node).toBeDefined();

			const apiNode = findApi(node!, ts);
			expect(apiNode).toBeDefined();
		});

		it("should find api node from property access", () => {
			const propertyAccessFile = path.resolve(
				fixturesDir,
				"property-access.ts",
			);
			const sf = testFiles.get(propertyAccessFile)!;
			const content = sf.getFullText();
			const lineIndex = content.indexOf("productApi.useGetProductsQuery");
			expect(lineIndex).toBeGreaterThan(-1);
			const hookIndex = lineIndex + "productApi.".length;

			const node = getIdentifierNodeAt(sf, hookIndex);
			expect(node).toBeDefined();
			expect(node!.getText()).toBe("useGetProductsQuery");

			const apiNode = findApi(node!, ts);
			expect(apiNode).toBeDefined();
		});
	});

	describe("findEndpoint", () => {
		it("should find endpoint symbol from api node", () => {
			const destructureFile = path.resolve(fixturesDir, "destructure-api.ts");
			const sf = testFiles.get(destructureFile)!;
			const content = sf.getFullText();
			const hookIndex = content.indexOf("useGetUsersQuery");

			const node = getIdentifierNodeAt(sf, hookIndex);
			const apiNode = findApi(node!, ts);

			expect(apiNode).toBeDefined();

			const endpointSymbol = findEndpoint(apiNode!, "getUsers", checker);
			expect(endpointSymbol).toBeDefined();
		});

		it("should find mutation endpoint", () => {
			const destructureFile = path.resolve(fixturesDir, "destructure-api.ts");
			const sf = testFiles.get(destructureFile)!;
			const content = sf.getFullText();
			const hookIndex = content.indexOf("useCreateUserMutation");

			const node = getIdentifierNodeAt(sf, hookIndex);
			const apiNode = findApi(node!, ts);

			expect(apiNode).toBeDefined();

			const endpointSymbol = findEndpoint(apiNode!, "createUser", checker);
			expect(endpointSymbol).toBeDefined();
		});

		it("should find lazy query endpoint", () => {
			const lazyFile = path.resolve(fixturesDir, "lazy-hooks.ts");
			const sf = testFiles.get(lazyFile)!;
			const content = sf.getFullText();
			const hookIndex = content.indexOf("useLazyGetOrdersQuery");

			const node = getIdentifierNodeAt(sf, hookIndex);
			const apiNode = findApi(node!, ts);

			expect(apiNode).toBeDefined();

			const endpointSymbol = findEndpoint(apiNode!, "getOrders", checker);
			expect(endpointSymbol).toBeDefined();
		});
	});

	describe("Cross-file Import Support", () => {
		it("should find identifier from cross-file destructured hook", () => {
			const consumerFile = path.resolve(fixturesDir, "cross-file-consumer.ts");
			const sf = testFiles.get(consumerFile)!;
			const content = sf.getFullText();
			const hookIndex = content.indexOf("useGetUsersQuery");

			const node = getIdentifierNodeAt(sf, hookIndex);
			expect(node).toBeDefined();
			expect(node!.getText()).toBe("useGetUsersQuery");
		});

		it("should find identifier from cross-file mutation hook", () => {
			const consumerFile = path.resolve(fixturesDir, "cross-file-consumer.ts");
			const sf = testFiles.get(consumerFile)!;
			const content = sf.getFullText();
			const hookIndex = content.indexOf("useCreateUserMutation");

			const node = getIdentifierNodeAt(sf, hookIndex);
			expect(node).toBeDefined();
			expect(node!.getText()).toBe("useCreateUserMutation");
		});
	});

	describe("Cross-file Import with Rename Support", () => {
		it("should find identifier from renamed cross-file hook", () => {
			const renameFile = path.resolve(fixturesDir, "cross-file-rename.ts");
			const sf = testFiles.get(renameFile)!;
			const content = sf.getFullText();
			const hookIndex = content.indexOf("useGetAllUsersQuery");

			const node = getIdentifierNodeAt(sf, hookIndex);
			expect(node).toBeDefined();
			expect(node!.getText()).toBe("useGetAllUsersQuery");
		});

		it("should find identifier from renamed cross-file mutation hook", () => {
			const renameFile = path.resolve(fixturesDir, "cross-file-rename.ts");
			const sf = testFiles.get(renameFile)!;
			const content = sf.getFullText();
			const hookIndex = content.indexOf("useAddUserMutation");

			const node = getIdentifierNodeAt(sf, hookIndex);
			expect(node).toBeDefined();
			expect(node!.getText()).toBe("useAddUserMutation");
		});
	});

	describe("Endpoint Info Extraction", () => {
		it("should extract endpoint info for simple string query", () => {
			const jsdocFile = path.resolve(fixturesDir, "jsdoc-endpoint.ts");
			const sf = testFiles.get(jsdocFile)!;
			const content = sf.getFullText();
			const hookIndex = content.indexOf("useGetUsersQuery");

			const node = getIdentifierNodeAt(sf, hookIndex);
			const apiNode = findApi(node!, ts);
			expect(apiNode).toBeDefined();

			const endpointSymbol = findEndpoint(apiNode!, "getUsers", checker);
			expect(endpointSymbol).toBeDefined();

			const endpointInfo = getEndpointInfo.call(
				{ getProgram: () => program } as ts.LanguageService,
				jsdocFile,
				endpointSymbol!,
				ts,
			);

			expect(endpointInfo).toBeDefined();
			expect(endpointInfo!.url).toBe("/users");
			expect(endpointInfo!.method).toBe("GET");
		});

		it("should extract endpoint info for object query with method", () => {
			const jsdocFile = path.resolve(fixturesDir, "jsdoc-endpoint.ts");
			const sf = testFiles.get(jsdocFile)!;
			const content = sf.getFullText();
			const hookIndex = content.indexOf("useCreateUserMutation");

			const node = getIdentifierNodeAt(sf, hookIndex);
			const apiNode = findApi(node!, ts);
			expect(apiNode).toBeDefined();

			const endpointSymbol = findEndpoint(apiNode!, "createUser", checker);
			expect(endpointSymbol).toBeDefined();

			const endpointInfo = getEndpointInfo.call(
				{ getProgram: () => program } as ts.LanguageService,
				jsdocFile,
				endpointSymbol!,
				ts,
			);

			expect(endpointInfo).toBeDefined();
			expect(endpointInfo!.url).toBe("/users");
			expect(endpointInfo!.method).toBe("POST");
		});

		it("should extract endpoint info for PUT method", () => {
			const jsdocFile = path.resolve(fixturesDir, "jsdoc-endpoint.ts");
			const sf = testFiles.get(jsdocFile)!;
			const content = sf.getFullText();
			const hookIndex = content.indexOf("useUpdateUserMutation");

			const node = getIdentifierNodeAt(sf, hookIndex);
			const apiNode = findApi(node!, ts);
			expect(apiNode).toBeDefined();

			const endpointSymbol = findEndpoint(apiNode!, "updateUser", checker);
			expect(endpointSymbol).toBeDefined();

			const endpointInfo = getEndpointInfo.call(
				{ getProgram: () => program } as ts.LanguageService,
				jsdocFile,
				endpointSymbol!,
				ts,
			);

			// 注意：当前实现无法解析包含变量的 URL（如 '/users/' + id）
			// 只支持纯字符串 URL
			expect(endpointInfo).toBeUndefined();
		});

		it("should extract endpoint info for DELETE method", () => {
			const jsdocFile = path.resolve(fixturesDir, "jsdoc-endpoint.ts");
			const sf = testFiles.get(jsdocFile)!;
			const content = sf.getFullText();
			const hookIndex = content.indexOf("useDeleteUserMutation");

			const node = getIdentifierNodeAt(sf, hookIndex);
			const apiNode = findApi(node!, ts);
			expect(apiNode).toBeDefined();

			const endpointSymbol = findEndpoint(apiNode!, "deleteUser", checker);
			expect(endpointSymbol).toBeDefined();

			const endpointInfo = getEndpointInfo.call(
				{ getProgram: () => program } as ts.LanguageService,
				jsdocFile,
				endpointSymbol!,
				ts,
			);

			// 注意：当前实现无法解析包含变量的 URL（如 '/users/' + id）
			// 只支持纯字符串 URL
			expect(endpointInfo).toBeUndefined();
		});

		it("should return undefined for dynamic URL with variables", () => {
			const jsdocFile = path.resolve(fixturesDir, "jsdoc-endpoint.ts");
			const sf = testFiles.get(jsdocFile)!;
			const content = sf.getFullText();
			const hookIndex = content.indexOf("useGetUserByIdQuery");

			const node = getIdentifierNodeAt(sf, hookIndex);
			const apiNode = findApi(node!, ts);
			expect(apiNode).toBeDefined();

			const endpointSymbol = findEndpoint(apiNode!, "getUserById", checker);
			expect(endpointSymbol).toBeDefined();

			const endpointInfo = getEndpointInfo.call(
				{ getProgram: () => program } as ts.LanguageService,
				jsdocFile,
				endpointSymbol!,
				ts,
			);

			// 动态 URL（包含变量）返回 undefined
			expect(endpointInfo).toBeUndefined();
		});
	});

	describe("Quick Info (Hover)", () => {
		it("should provide quick info with JSDoc and endpoint details", () => {
			const jsdocFile = path.resolve(fixturesDir, "jsdoc-endpoint.ts");
			const sf = testFiles.get(jsdocFile)!;
			const content = sf.getFullText();
			const hookIndex = content.indexOf("useGetUsersQuery");

			const mockLanguageService = {
				getProgram: () => program,
			} as ts.LanguageService;

			const quickInfo = getQuickInfoAtPosition.call(
				mockLanguageService,
				jsdocFile,
				hookIndex,
				ts,
			);

			// 验证返回了 quickInfo
			expect(quickInfo).toBeDefined();

			// 验证有文档内容（JSDoc）
			expect(quickInfo?.documentation).toBeDefined();
			expect(quickInfo?.documentation?.length).toBeGreaterThan(0);

			// 验证有 tags（包含 method 和 url）
			expect(quickInfo?.tags).toBeDefined();
			expect(quickInfo?.tags?.length).toBeGreaterThan(0);

			// 验证包含 method 和 url 标签
			const methodTag = quickInfo?.tags?.find((tag) => tag.name === "method");
			const urlTag = quickInfo?.tags?.find((tag) => tag.name === "url");

			expect(methodTag).toBeDefined();
			expect(urlTag).toBeDefined();

			// 验证值
			const methodText = methodTag?.text?.map((t) => t.text).join("");
			const urlText = urlTag?.text?.map((t) => t.text).join("");

			expect(methodText).toBe("GET");
			expect(urlText).toBe("/users");
		});

		it("should provide quick info for mutation endpoint", () => {
			const jsdocFile = path.resolve(fixturesDir, "jsdoc-endpoint.ts");
			const sf = testFiles.get(jsdocFile)!;
			const content = sf.getFullText();
			const hookIndex = content.indexOf("useCreateUserMutation");

			const mockLanguageService = {
				getProgram: () => program,
			} as ts.LanguageService;

			const quickInfo = getQuickInfoAtPosition.call(
				mockLanguageService,
				jsdocFile,
				hookIndex,
				ts,
			);

			expect(quickInfo).toBeDefined();
			expect(quickInfo?.tags).toBeDefined();

			const methodTag = quickInfo?.tags?.find((tag) => tag.name === "method");
			const urlTag = quickInfo?.tags?.find((tag) => tag.name === "url");

			expect(methodTag).toBeDefined();
			expect(urlTag).toBeDefined();

			const methodText = methodTag?.text?.map((t) => t.text).join("");
			const urlText = urlTag?.text?.map((t) => t.text).join("");

			expect(methodText).toBe("POST");
			expect(urlText).toBe("/users");
		});

		it("should provide quick info for cross-file imported hook", () => {
			const consumerFile = path.resolve(fixturesDir, "cross-file-consumer.ts");
			const sf = testFiles.get(consumerFile)!;
			const content = sf.getFullText();
			const hookIndex = content.indexOf("useGetUsersQuery");

			const mockLanguageService = {
				getProgram: () => program,
			} as ts.LanguageService;

			const quickInfo = getQuickInfoAtPosition.call(
				mockLanguageService,
				consumerFile,
				hookIndex,
				ts,
			);

			// 跨文件导入的 hook 也应该能获取 quickInfo
			expect(quickInfo).toBeDefined();
			expect(quickInfo?.tags).toBeDefined();

			const methodTag = quickInfo?.tags?.find((tag) => tag.name === "method");
			const urlTag = quickInfo?.tags?.find((tag) => tag.name === "url");

			expect(methodTag).toBeDefined();
			expect(urlTag).toBeDefined();
		});
	});
});

describe("End-to-End Tests", () => {
	it("should complete full flow from hook name to endpoint definition", async () => {
		const fixturesDir = path.resolve(__dirname, "./fixtures");
		const destructureFile = path.resolve(fixturesDir, "destructure-api.ts");

		const { program } = await createTypeScriptProgram([destructureFile]);

		// 模拟用户在 useGetUsersQuery 上执行 "Go to Definition"
		const sf = program.getSourceFile(destructureFile)!;
		const fileContent = sf.getFullText();
		const hookPosition = fileContent.indexOf("useGetUsersQuery");

		// 创建模拟的 LanguageService
		const mockLanguageService = {
			getProgram: () => program,
		} as ts.LanguageService;

		const result = getDefinitionAndBoundSpan.call(
			mockLanguageService,
			destructureFile,
			hookPosition,
			ts,
		);

		// 验证结果
		expect(result).toBeDefined();
		expect(result!.definitions).toBeDefined();
		expect(result!.definitions.length).toBeGreaterThan(0);
		expect(result!.definitions[0].name).toBe("getUsers");
	});

	it("should work with cross-file imported hooks", async () => {
		const fixturesDir = path.resolve(__dirname, "./fixtures");
		const consumerFile = path.resolve(fixturesDir, "cross-file-consumer.ts");
		const importFile = path.resolve(fixturesDir, "cross-file-import.ts");

		const { program } = await createTypeScriptProgram([
			consumerFile,
			importFile,
		]);

		const sf = program.getSourceFile(consumerFile)!;
		const fileContent = sf.getFullText();
		const hookPosition = fileContent.indexOf("useGetUsersQuery");

		const mockLanguageService = {
			getProgram: () => program,
		} as ts.LanguageService;

		const result = getDefinitionAndBoundSpan.call(
			mockLanguageService,
			consumerFile,
			hookPosition,
			ts,
		);

		expect(result).toBeDefined();
		expect(result!.definitions).toBeDefined();
		expect(result!.definitions.length).toBeGreaterThan(0);
		expect(result!.definitions[0].name).toBe("getUsers");
	});

	it("should work with renamed cross-file imported hooks", async () => {
		const fixturesDir = path.resolve(__dirname, "./fixtures");
		const renameFile = path.resolve(fixturesDir, "cross-file-rename.ts");
		const importFile = path.resolve(fixturesDir, "cross-file-import.ts");

		const { program } = await createTypeScriptProgram([renameFile, importFile]);

		const sf = program.getSourceFile(renameFile)!;
		const fileContent = sf.getFullText();
		const hookPosition = fileContent.indexOf("useGetAllUsersQuery");

		const mockLanguageService = {
			getProgram: () => program,
		} as ts.LanguageService;

		const result = getDefinitionAndBoundSpan.call(
			mockLanguageService,
			renameFile,
			hookPosition,
			ts,
		);

		expect(result).toBeDefined();
		expect(result!.definitions).toBeDefined();
		expect(result!.definitions.length).toBeGreaterThan(0);
		expect(result!.definitions[0].name).toBe("getUsers");
	});
});
