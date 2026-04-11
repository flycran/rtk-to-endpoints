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

import type tslib from "typescript/lib/tsserverlibrary";
import { getDefinitionAndBoundSpan, getQuickInfoAtPosition } from "./utils.js";

/**
 * TypeScript Language Service Plugin 入口。
 */
function init(modules: { typescript: typeof tslib }) {
	const ts = modules.typescript;

	function create(info: tslib.server.PluginCreateInfo) {
		const proxy: tslib.LanguageService = Object.create(info.languageService);

		// 跳转到定义
		proxy.getDefinitionAndBoundSpan = (
			fileName: string,
			position: number,
		): tslib.DefinitionInfoAndBoundSpan | undefined => {
			const definitionInfo = getDefinitionAndBoundSpan.call(
				info.languageService,
				fileName,
				position,
				ts,
			);
			return (
				definitionInfo ||
				info.languageService.getDefinitionAndBoundSpan(fileName, position)
			);
		};

		// 获取提示信息
		proxy.getQuickInfoAtPosition = (
			fileName: string,
			position: number,
			maximumLength?: number,
		): tslib.QuickInfo | undefined => {
			const originalQuickInfo = info.languageService.getQuickInfoAtPosition(
				fileName,
				position,
				maximumLength,
			);
			if (!originalQuickInfo) return;

			const quickinfo = getQuickInfoAtPosition.call(
				info.languageService,
				fileName,
				position,
				ts,
			);

			if (!quickinfo) return originalQuickInfo;

			let documentation: tslib.SymbolDisplayPart[] | undefined =
				originalQuickInfo.documentation;
			if (quickinfo.documentation) {
				documentation = [...(documentation || []), ...quickinfo.documentation];
			}
			let tags: tslib.JSDocTagInfo[] | undefined = originalQuickInfo.tags;
			if (quickinfo.tags) {
				tags = [...(tags || []), ...quickinfo.tags];
			}

			return {
				...originalQuickInfo,
				documentation: documentation,
				tags: tags,
			};
		};

		return proxy;
	}

	return { create };
}

export = init;
