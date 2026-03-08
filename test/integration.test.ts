import { describe, it, expect, beforeAll } from 'vitest';
import ts from 'typescript';
import path from 'path';
import fs from 'fs/promises';
import JSON5 from 'json5';
import { fileURLToPath } from 'url';
import {
  getIdentifierNodeAt,
  findApi,
  findEndpoint,
  getDefinitionAndBoundSpan
} from '../src/utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建 TypeScript 程序的辅助函数
async function createTypeScriptProgram(
  fileNames: string[]
): Promise<{ program: ts.Program; checker: ts.TypeChecker; filesMap: Map<string, ts.SourceFile> }> {
  const tsconfigPath = path.resolve(__dirname, './tsconfig.json');
  const tsconfigContent = await fs.readFile(tsconfigPath, 'utf8').catch(() => '{}');
  const configFile = JSON5.parse(tsconfigContent);

  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile,
    ts.sys,
    path.resolve(__dirname, '..')
  );

  // 使用 ts.sys 作为文件系统，让 TypeScript 自动解析 node_modules
  const compilerHost = ts.createCompilerHost(parsedConfig.options);

  const program = ts.createProgram(fileNames, parsedConfig.options, compilerHost);
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

describe('Integration Tests - TypeScript Language Service', () => {
  let program: ts.Program;
  let checker: ts.TypeChecker;
  let testFiles: Map<string, ts.SourceFile> = new Map();
  let fixturesDir: string;

  beforeAll(async () => {
    fixturesDir = path.resolve(__dirname, './fixtures');

    const fixtureFiles = ['destructure-api.ts', 'property-access.ts', 'lazy-hooks.ts'];
    const fileNames = fixtureFiles.map(f => path.resolve(fixturesDir, f));

    const result = await createTypeScriptProgram(fileNames);
    program = result.program;
    checker = result.checker;
    testFiles = result.filesMap;
  });

  describe('getIdentifierNodeAt', () => {
    it('should find identifier at position in destructured hook', () => {
      const destructureFile = path.resolve(fixturesDir, 'destructure-api.ts');
      const sf = testFiles.get(destructureFile)!;
      const content = sf.getFullText();
      const hookIndex = content.indexOf('useGetUsersQuery');
      expect(hookIndex).toBeGreaterThan(-1);

      const node = getIdentifierNodeAt(sf, hookIndex);
      expect(node).toBeDefined();
      expect(node!.getText()).toBe('useGetUsersQuery');
    });

    it('should find identifier at position in property access', () => {
      const propertyAccessFile = path.resolve(fixturesDir, 'property-access.ts');
      const sf = testFiles.get(propertyAccessFile)!;
      const content = sf.getFullText();
      const lineIndex = content.indexOf('productApi.useGetProductsQuery');
      expect(lineIndex).toBeGreaterThan(-1);
      const hookIndex = lineIndex + 'productApi.'.length;

      const node = getIdentifierNodeAt(sf, hookIndex);
      expect(node).toBeDefined();
      expect(node!.getText()).toBe('useGetProductsQuery');
    });
  });

  describe('findApi', () => {
    it('should find api node from destructured hook', () => {
      const destructureFile = path.resolve(fixturesDir, 'destructure-api.ts');
      const sf = testFiles.get(destructureFile)!;
      const content = sf.getFullText();
      const hookIndex = content.indexOf('useGetUsersQuery');

      const node = getIdentifierNodeAt(sf, hookIndex);
      expect(node).toBeDefined();

      const apiNode = findApi(node!, ts);
      expect(apiNode).toBeDefined();
    });

    it('should find api node from property access', () => {
      const propertyAccessFile = path.resolve(fixturesDir, 'property-access.ts');
      const sf = testFiles.get(propertyAccessFile)!;
      const content = sf.getFullText();
      const lineIndex = content.indexOf('productApi.useGetProductsQuery');
      expect(lineIndex).toBeGreaterThan(-1);
      const hookIndex = lineIndex + 'productApi.'.length;

      const node = getIdentifierNodeAt(sf, hookIndex);
      expect(node).toBeDefined();
      expect(node!.getText()).toBe('useGetProductsQuery');

      const apiNode = findApi(node!, ts);
      expect(apiNode).toBeDefined();
    });
  });

  describe('findEndpoint', () => {
    it('should find endpoint symbol from api node', () => {
      const destructureFile = path.resolve(fixturesDir, 'destructure-api.ts');
      const sf = testFiles.get(destructureFile)!;
      const content = sf.getFullText();
      const hookIndex = content.indexOf('useGetUsersQuery');

      const node = getIdentifierNodeAt(sf, hookIndex);
      const apiNode = findApi(node!, ts);

      expect(apiNode).toBeDefined();

      const endpointSymbol = findEndpoint(apiNode!, 'getUsers', checker);
      expect(endpointSymbol).toBeDefined();
    });

    it('should find mutation endpoint', () => {
      const destructureFile = path.resolve(fixturesDir, 'destructure-api.ts');
      const sf = testFiles.get(destructureFile)!;
      const content = sf.getFullText();
      const hookIndex = content.indexOf('useCreateUserMutation');

      const node = getIdentifierNodeAt(sf, hookIndex);
      const apiNode = findApi(node!, ts);

      expect(apiNode).toBeDefined();

      const endpointSymbol = findEndpoint(apiNode!, 'createUser', checker);
      expect(endpointSymbol).toBeDefined();
    });

    it('should find lazy query endpoint', () => {
      const lazyFile = path.resolve(fixturesDir, 'lazy-hooks.ts');
      const sf = testFiles.get(lazyFile)!;
      const content = sf.getFullText();
      const hookIndex = content.indexOf('useLazyGetOrdersQuery');

      const node = getIdentifierNodeAt(sf, hookIndex);
      const apiNode = findApi(node!, ts);

      expect(apiNode).toBeDefined();

      const endpointSymbol = findEndpoint(apiNode!, 'getOrders', checker);
      expect(endpointSymbol).toBeDefined();
    });
  });
});

describe('End-to-End Tests', () => {
  it('should complete full flow from hook name to endpoint definition', async () => {
    const fixturesDir = path.resolve(__dirname, './fixtures');
    const destructureFile = path.resolve(fixturesDir, 'destructure-api.ts');

    const { program } = await createTypeScriptProgram([destructureFile]);

    // 模拟用户在 useGetUsersQuery 上执行 "Go to Definition"
    const sf = program.getSourceFile(destructureFile)!;
    const fileContent = sf.getFullText();
    const hookPosition = fileContent.indexOf('useGetUsersQuery');

    const result = getDefinitionAndBoundSpan(destructureFile, hookPosition, ts, program);

    // 验证结果
    expect(result).toBeDefined();
    expect(result!.definitions).toBeDefined();
    expect(result!.definitions.length).toBeGreaterThan(0);
    expect(result!.definitions[0].name).toBe('getUsers');
  });
});
