import ts from 'typescript'
import path from 'path'
import fs from 'fs/promises'
import JSON5 from "json5";

import { getDefinitionAndBoundSpan } from '../src/utils.ts';

const currentFileName = import.meta.url.replace('file://', '');
const currentDirname = path.dirname(currentFileName)

// 读取并解析 tsconfig.json
const tsconfigFile = await fs.readFile(path.resolve(currentDirname, './tsconfig.json'), 'utf8');
const configFile = JSON5.parse(tsconfigFile);

// 使用 TypeScript API 解析配置文件，获取完整编译选项
const parsedConfig = ts.parseJsonConfigFileContent(
  configFile,
  ts.sys,
  currentDirname
);

// 获取 tsconfig 作用域内的所有文件
const fileNames = parsedConfig.fileNames;
console.log('Files in tsconfig scope:', fileNames);

// 创建语言服务
const filesMap = new Map<string, string>();

// 预加载所有文件内容
for (const fileName of fileNames) {
  const content = await fs.readFile(fileName, 'utf8').catch(() => '');
  filesMap.set(fileName, content);
}

const host: ts.LanguageServiceHost = {
  getCompilationSettings: () => parsedConfig.options,
  getScriptFileNames: () => fileNames,
  getScriptVersion: () => "1",
  getScriptSnapshot: (fileName) => {
    const content = filesMap.get(fileName) ?? ts.sys.readFile(fileName);
    return content !== undefined ? ts.ScriptSnapshot.fromString(content) : undefined;
  },
  getCurrentDirectory: () => currentDirname,
  getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
  readDirectory: ts.sys.readDirectory,
};

const service = ts.createLanguageService(host);

const program = service.getProgram();

const start = (file: string, line: number, character: number) => {
  const sf = program!.getSourceFile(file)!;
  const pos = sf.getPositionOfLineAndCharacter(line, character);
  getDefinitionAndBoundSpan(file, pos, ts, program)
};

// 示例：获取 userApi.ts 中特定位置的 symbol
const targetFile = fileNames.find(f => f.endsWith('example.ts'));
if (targetFile) {
  start(targetFile, 2, 1)
  // start(targetFile, 4, 9)
}

service.dispose()
