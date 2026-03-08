/**
 * typescript-plugin-rtk-query
 *
 * 一个 TypeScript Language Service Plugin，用于增强 RTK Query 的 IDE 体验。
 *
 * 解决的核心问题：
 *   RTK Query 的 hook 名（如 useGetUserQuery）是由 endpoint 名（如 getUser）
 *   动态派生而来，TypeScript 的"跳转到定义"只能指向类型体操，
 *   无法直接跳到 createApi 里的 endpoint 定义行。
 */

import tslib from "typescript/lib/tsserverlibrary";
import { getDefinitionAndBoundSpan } from "./utils.js";

/**
 * TypeScript Language Service Plugin 入口。
 */
function init(modules: { typescript: typeof tslib }) {
  const ts = modules.typescript;

  function create(info: tslib.server.PluginCreateInfo) {
    const logger = info.project.projectService.logger;

    function log(msg: string) {
      logger.info(`[rtk-query-plugin] ${msg}`);
    }

    function logWarn(msg: string) {
      logger.info(`[rtk-query-plugin] ⚠️  ${msg}`);
    }

    log("✅ Plugin initialized");

    const proxy: tslib.LanguageService = Object.create(info.languageService);

    // 跳转到定义
    proxy.getDefinitionAndBoundSpan = (
      fileName: string,
      position: number
    ): tslib.DefinitionInfoAndBoundSpan | undefined => {
      const program = info.languageService.getProgram();
      const definitionInfo = getDefinitionAndBoundSpan(fileName, position, ts, program)
      return definitionInfo || info.languageService.getDefinitionAndBoundSpan(fileName, position);;
    };

    return proxy;
  }

  return { create };
}

export = init;
