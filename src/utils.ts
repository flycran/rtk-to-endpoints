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
      return
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
  if (ts.isBindingElement(parent)) {
    // 解构模式
    const expressionNode = parent.parent?.parent
    if (!ts.isVariableDeclaration(expressionNode)) return;
    const apiNode = parent.parent?.parent?.getChildAt(expressionNode.getChildCount() - 1);
    if (!apiNode || !ts.isIdentifier(apiNode)) return;
    return apiNode;
  } else if (parent && ts.isPropertyAccessExpression(parent)) {
    // 属性访问
    return parent.getChildAt(parent.getChildCount() - 3);
  }
}

/**
 * 从 api 实例中找到 endpoint
 * @param apiNode 
 * @param endpointName 
 * @param checker 
 * @returns 
 */
export function findEndpoint(apiNode: tslib.Node, endpointName: string, checker: tslib.TypeChecker) {
  const apiType = checker.getTypeAtLocation(apiNode);
  const endpointsSymbol = apiType.getProperty('endpoints');
  if (!endpointsSymbol) return;
  const endpointsType = checker.getTypeOfSymbol(endpointsSymbol);
  const endpointsPropertySymbol = endpointsType.getProperty(endpointName);
  return endpointsPropertySymbol;
}

export function getDefinitionAndBoundSpan(fileName: string, position: number, ts: typeof tslib, program?: tslib.Program,) {
  const sf = program!.getSourceFile(fileName);
  const checker = program!.getTypeChecker();
  if (!sf || !program || !checker) return

  const identNode = getIdentifierNodeAt(sf, position);
  if (!identNode || !ts.isIdentifier(identNode)) return

  const endpointName = extractEndpointName(identNode.getText());
  if (!endpointName) return

  const apiNode = findApi(identNode, ts);
  if (!apiNode) return

  const endpointSymbol = findEndpoint(apiNode, endpointName, checker);

  if (!endpointSymbol?.declarations?.length) return

  const definitions = endpointSymbol.declarations.map((node): tslib.DefinitionInfo => {
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
    }
  });

  return {
    definitions,
    textSpan: {
      start: identNode.getStart(sf),
      length: identNode.getWidth(sf),
    },
  };
}