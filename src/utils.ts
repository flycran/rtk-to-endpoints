import type tslib from "typescript/lib/tsserverlibrary";

/**
 * RTK Query 生成的 hook 名前缀和后缀列表。
 * hook 命名规则：{prefix}{CapitalizedEndpointName}{suffix}
 */
const HOOK_PREFIXES = ["useLazy", "use"] as const;

const HOOK_SUFFIXES = [
	"InfiniteQueryState",
	"InfiniteQuery",
	"QueryState",
	"Mutation",
	"Query",
] as const;

/**
 * 从 hook 名中提取 endpoint 名
 * @returns endpoint 名，如果不符合任何 hook 命名规则则返回 undefined
 */
export function extractEndpointName(hookName: string) {
	for (const prefix of HOOK_PREFIXES) {
		if (hookName.startsWith(prefix)) {
			const rest = hookName.slice(prefix.length);
			for (const suffix of HOOK_SUFFIXES) {
				if (rest.endsWith(suffix)) {
					const endpointName = rest.slice(0, rest.length - suffix.length);
					if (endpointName) {
						return endpointName[0].toLowerCase() + endpointName.slice(1);
					}
				}
			}
			return;
		}
	}
}

// ─── AST 工具：按位置查找标识符节点 ──────────────────────────────────────────

/**
 * 使用二分查找，在源文件 AST 中，找到覆盖指定字符位置的最深层节点。
 */
export function getIdentifierNodeAt(
	sourceFile: tslib.SourceFile,
	pos: number,
): tslib.Node | undefined {
	let current: tslib.Node = sourceFile;
	while (true) {
		const children = current.getChildren(sourceFile);
		let left = 0;
		let right = children.length - 1;
		let targetChild: tslib.Node | undefined;

		while (left <= right) {
			const mid = (left + right) >>> 1;
			const child = children[mid];
			if (pos < child.pos) {
				right = mid - 1;
			} else if (pos >= child.end) {
				left = mid + 1;
			} else {
				targetChild = child;
				break;
			}
		}

		if (!targetChild) break;
		current = targetChild;
	}
	return current;
}

/**
 * 从节点中找到 api 实例
 * @param node
 * @param ts
 * @returns
 */
export function findApi(node: tslib.Node, ts: typeof tslib) {
	const parent = node.parent;
	// 属性访问
	if (parent && ts.isPropertyAccessExpression(parent)) {
		return parent
			.getChildren()
			.slice(0, -2)
			.find((child) => ts.isIdentifier(child));
	}
	// 解构模式
	if (ts.isBindingElement(parent)) {
		const expressionNode = parent.parent?.parent;
		if (!ts.isVariableDeclaration(expressionNode)) return;
		const apiNode = parent.parent?.parent?.getChildAt(
			expressionNode.getChildCount() - 1,
		);
		if (!apiNode || !ts.isIdentifier(apiNode)) return;
		return apiNode;
	}
}

/**
 * 从 api 实例中找到 endpoint
 * @param apiNode
 * @param endpointName
 * @param checker
 * @returns
 */
export function findEndpoint(
	apiNode: tslib.Node,
	endpointName: string,
	checker: tslib.TypeChecker,
) {
	const apiType = checker.getTypeAtLocation(apiNode);
	const endpointsSymbol = apiType.getProperty("endpoints");
	if (!endpointsSymbol) return;
	const endpointsType = checker.getTypeOfSymbol(endpointsSymbol);
	const endpointsPropertySymbol = endpointsType.getProperty(endpointName);
	return endpointsPropertySymbol;
}

/**
 * 获取 endpoint 的 symbol
 * @param identNode
 * @param ts
 * @param program
 * @returns
 */
export function getEndpointSymbol(
	this: tslib.LanguageService,
	fileName: string,
	position: number,
	ts: typeof tslib,
) {
	const program = this.getProgram();
	if (!program) return;
	const sf = program.getSourceFile(fileName);
	if (!sf || !program) return;
	const checker = program.getTypeChecker();

	const identNode = getIdentifierNodeAt(sf, position);
	if (!identNode || !ts.isIdentifier(identNode)) return;
	const identSymbol = checker.getSymbolAtLocation(identNode);
	if (!identSymbol) return;
	const originNode =
		identSymbol.flags & ts.SymbolFlags.Alias
			? checker.getAliasedSymbol(identSymbol)?.declarations?.[0]?.getChildAt(0)
			: identNode;

	if (!originNode || !ts.isIdentifier(originNode)) return;

	const endpointName = extractEndpointName(originNode.getText());
	if (!endpointName) return;

	const apiNode = findApi.call(this, originNode, ts);
	if (!apiNode) return;

	const endpointSymbol = findEndpoint(apiNode, endpointName, checker);

	return { endpointSymbol, identNode };
}

export function getDefinitionAndBoundSpan(
	this: tslib.LanguageService,
	fileName: string,
	position: number,
	ts: typeof tslib,
) {
	const program = this.getProgram();
	if (!program) return;
	const sf = program.getSourceFile(fileName);
	if (!sf || !program) return;
	const EndpointSymbolResult = getEndpointSymbol.call(
		this,
		fileName,
		position,
		ts,
	);
	if (!EndpointSymbolResult) return;
	const { endpointSymbol, identNode } = EndpointSymbolResult;
	if (!endpointSymbol?.declarations?.length) return;

	const definitions = endpointSymbol.declarations.map(
		(node): tslib.DefinitionInfo => {
			return {
				fileName: node.getSourceFile().fileName,
				kind: ts.ScriptElementKind.memberFunctionElement,
				name: endpointSymbol.getName(),
				containerKind: ts.ScriptElementKind.classElement,
				containerName: "endpoints",
				textSpan: {
					start: node.getStart(),
					length: node.getWidth(),
				},
			};
		},
	);

	return {
		definitions,
		textSpan: {
			start: identNode.getStart(sf),
			length: identNode.getWidth(sf),
		},
	};
}

export function getEndpointInfo(
	this: tslib.LanguageService,
	fileName: string,
	endpointSymbol: tslib.Symbol,
	ts: typeof tslib,
) {
	const program = this.getProgram();
	if (!program) return;
	const sf = program.getSourceFile(fileName);
	if (!sf || !program) return;
	const checker = program.getTypeChecker();
	if (!endpointSymbol?.declarations?.length) return;

	if (!ts.isPropertyAssignment(endpointSymbol.declarations[0])) return;

	const callExpression = endpointSymbol.declarations[0].initializer;
	if (!callExpression || !ts.isCallExpression(callExpression)) return;

	const firstArgument = callExpression.arguments?.[0];
	const firstArgumentType = checker.getTypeAtLocation(firstArgument);

	const querySymbol = firstArgumentType.getProperty("query");
	if (!querySymbol) return;

	const queryNode = querySymbol.declarations?.[0];
	if (!queryNode) return;
	if (!ts.isPropertyAssignment(queryNode)) return;
	const queryValueNode = queryNode.initializer;
	if (
		!ts.isArrowFunction(queryValueNode) &&
		!ts.isFunctionExpression(queryValueNode)
	)
		return;
	const bodyNode = queryValueNode.body;

	const getUrl = (urlNode: tslib.Node) => {
		if (
			ts.isStringLiteral(urlNode) ||
			ts.isNoSubstitutionTemplateLiteral(urlNode)
		) {
			const text = urlNode.text;
			return text.length > 128 ? `${text.slice(0, 128)}...` : text;
		}
		const text = urlNode.getText();
		return text.length > 128 ? `${text.slice(0, 128)}...` : text;
	};

	// 返回对象
	if (
		ts.isParenthesizedExpression(bodyNode) &&
		ts.isObjectLiteralExpression(bodyNode.getChildAt(1))
	) {
		const bodyType = checker.getTypeAtLocation(bodyNode);
		const urlSymbol = bodyType.getProperty("url");
		if (!urlSymbol) return;
		const methodSymbol = bodyType.getProperty("method");
		const urlNode = urlSymbol.declarations?.[0];
		if (!urlNode) return;
		if (!ts.isPropertyAssignment(urlNode)) return;
		const urlValue = urlNode.initializer;
		const url = getUrl(urlValue);
		const getMethod = () => {
			if (!methodSymbol) return;
			const methodNode = methodSymbol.declarations?.[0];
			if (!methodNode) return;
			if (!ts.isPropertyAssignment(methodNode)) return;
			const nodeValue = methodNode.initializer;
			if (!ts.isStringLiteral(nodeValue)) return;
			return nodeValue.text;
		};
		return {
			method: getMethod()?.toUpperCase() || "GET",
			url,
		};
	}

	const url = getUrl(bodyNode);
	// 返回字符串
	if (url) {
		return {
			method: "GET",
			url,
		};
	}
}

export function getQuickInfoAtPosition(
	this: tslib.LanguageService,
	fileName: string,
	position: number,
	ts: typeof tslib,
) {
	const program = this.getProgram();
	if (!program) return;
	const sf = program.getSourceFile(fileName);
	if (!sf || !program) return;
	const checker = program.getTypeChecker();

	const EndpointSymbolResult = getEndpointSymbol.call(
		this,
		fileName,
		position,
		ts,
	);

	if (!EndpointSymbolResult) return;
	const { endpointSymbol } = EndpointSymbolResult;
	if (!endpointSymbol?.declarations?.length) return;

	const documentation = endpointSymbol.getDocumentationComment(checker);
	let tags = endpointSymbol.getJsDocTags();
	const endpointInfo = getEndpointInfo.call(this, fileName, endpointSymbol, ts);

	if (endpointInfo) {
		tags = [
			...tags,
			{
				name: "method",
				text: [
					{
						kind: "stringLiteral",
						text: endpointInfo.method,
					},
				],
			},
			{
				name: "url",
				text: [
					{
						kind: "stringLiteral",
						text: endpointInfo.url,
					},
				],
			},
		];
	}

	return {
		documentation,
		tags,
	};
}
