import type {TSESTree} from '@typescript-eslint/utils'

import {AST_NODE_TYPES as AST, AST_TOKEN_TYPES, ASTUtils, TSESLint} from '@typescript-eslint/utils'

export function isComponentIdentifier(name: string): boolean {
  return !/^[a-z]|-/u.test(name)
}

export function isLayoutWhitespace(node: TSESTree.JSXChild): boolean {
  return node.type === AST.JSXText && /^[\t ]*(?:\r?\n[\t ]*)+$/u.test(node.value)
}

export function meaningfulChildren(node: TSESTree.JSXElement): Array<TSESTree.JSXChild> {
  return node.children.filter(child => !isLayoutWhitespace(child))
}

export function attributesNamed(node: TSESTree.JSXElement, name: string): Array<TSESTree.JSXAttribute> {
  return node.openingElement.attributes.filter((attribute): attribute is TSESTree.JSXAttribute => attribute.type === AST.JSXAttribute && attribute.name.type === AST.JSXIdentifier && attribute.name.name === name)
}

export function hasSpread(node: TSESTree.JSXElement): boolean {
  return node.openingElement.attributes.some(attribute => attribute.type === AST.JSXSpreadAttribute)
}

/** Both children rules share this predicate so their fixes cannot oscillate. */
export function componentReference(node: TSESTree.Node, sourceCode: TSESLint.SourceCode): string | undefined {
  if (node.type !== AST.JSXElement || node.openingElement.attributes.length || node.openingElement.typeArguments || meaningfulChildren(node).length || sourceCode.getCommentsInside(node).length) {
    return
  }
  const name = node.openingElement.name
  if (sourceCode.getText(name).includes('-')) {
    return
  }
  if (name.type === AST.JSXMemberExpression || name.type === AST.JSXIdentifier && isComponentIdentifier(name.name)) {
    // branch-component renders functions, not React's exotic objects/symbols.
    // Keep known wrappers (memo, forwardRef, lazy, etc.) as JSX. With type
    // information, also recognize imported exotic components by their marker.
    const {program, esTreeNodeToTSNodeMap} = sourceCode.parserServices ?? {}
    const tsName = esTreeNodeToTSNodeMap?.get(name)
    if (program && tsName && program.getTypeChecker().getTypeAtLocation(tsName).getProperty('$$typeof')) {
      return
    }
    let root: TSESTree.JSXTagNameExpression = name
    while (root.type === AST.JSXMemberExpression) {
      root = root.object
    }
    if (root.type !== AST.JSXIdentifier) {
      return
    }
    const variable = ASTUtils.findVariable(sourceCode.getScope(node), root.name)
    if (variable?.defs.some(definition => definition.type === TSESLint.Scope.DefinitionType.ImportBinding && definition.parent.type === AST.ImportDeclaration && definition.parent.source.value === 'react' || name.type === AST.JSXIdentifier && definition.type === TSESLint.Scope.DefinitionType.Variable && definition.node.init !== null && ![AST.ArrowFunctionExpression, AST.ClassExpression, AST.FunctionExpression].includes(definition.node.init.type))) {
      return
    }
    return sourceCode.getText(name)
  }
}

export function expressionText(node: TSESTree.Node, sourceCode: TSESLint.SourceCode): string {
  const text = sourceCode.getText(node)
  return node.type === AST.SequenceExpression ? `(${text})` : text
}

export function isJsx(node: TSESTree.Node): node is TSESTree.JSXElement | TSESTree.JSXFragment {
  return node.type === AST.JSXElement || node.type === AST.JSXFragment
}

export function isJsxChild(node: TSESTree.Node): boolean {
  return node.parent?.type === AST.JSXExpressionContainer && (node.parent.parent.type === AST.JSXElement || node.parent.parent.type === AST.JSXFragment)
}

/** Keep line-comment terminators while compacting opening-tag layout. */
export function trimOpeningLayout(text: string, node: TSESTree.JSXElement, sourceCode: TSESLint.SourceCode): string {
  return sourceCode.getCommentsInside(node.openingElement).some(comment => comment.type === AST_TOKEN_TYPES.Line) ? text.replace(/[\t ]+$/u, '') : text.trimEnd()
}

/** Remove layout before an attribute without swallowing a preceding comment. */
export function openingWithoutAttribute(node: TSESTree.JSXElement, attribute: TSESTree.JSXAttribute, sourceCode: TSESLint.SourceCode): string {
  const opening = node.openingElement
  const before = trimOpeningLayout(sourceCode.text.slice(opening.range[0], attribute.range[0]), node, sourceCode)
  return before + sourceCode.text.slice(attribute.range[1], opening.range[1])
}

/** Conservatively reject evaluation that could throw or affect another branch. */
export function isEagerSafe(node: TSESTree.Node): boolean {
  switch (node.type) {
    case AST.ArrowFunctionExpression:
    case AST.FunctionExpression:
    case AST.Identifier:
    case AST.Literal:
    case AST.JSXText:
    case AST.JSXEmptyExpression: {
      return true
    }
    case AST.JSXElement: {
      return node.openingElement.name.type === AST.JSXIdentifier && node.openingElement.attributes.every(attribute => attribute.type === AST.JSXAttribute && (attribute.value === null || isEagerSafe(attribute.value))) && node.children.every(isEagerSafe)
    }
    case AST.JSXFragment: {
      return node.children.every(isEagerSafe)
    }
    case AST.JSXExpressionContainer: {
      return isEagerSafe(node.expression)
    }
    case AST.UnaryExpression: {
      return ['!', 'typeof', 'void'].includes(node.operator) && isEagerSafe(node.argument)
    }
    case AST.LogicalExpression: {
      return isEagerSafe(node.left) && isEagerSafe(node.right)
    }
    case AST.BinaryExpression: {
      return ['!==', '==='].includes(node.operator) && isEagerSafe(node.left) && isEagerSafe(node.right)
    }
    case AST.ConditionalExpression: {
      return isEagerSafe(node.test) && isEagerSafe(node.consequent) && isEagerSafe(node.alternate)
    }
    case AST.ObjectExpression: {
      return node.properties.every(property => property.type === AST.Property && !property.computed && isEagerSafe(property.value))
    }
    case AST.TemplateLiteral: {
      return node.expressions.length === 0
    }
    case AST.ArrayExpression: {
      return node.elements.every(element => element === null || isEagerSafe(element))
    }
    case AST.TSAsExpression:
    case AST.TSSatisfiesExpression:
    case AST.TSNonNullExpression:
    case AST.TSTypeAssertion: {
      return isEagerSafe(node.expression)
    }
    default: {
      return false
    }
  }
}

export function commentsAreWithin(node: TSESTree.Node, retained: Array<TSESTree.Node>, sourceCode: TSESLint.SourceCode): boolean {
  return sourceCode.getCommentsInside(node).every(comment => retained.some(part => part.range[0] <= comment.range[0] && part.range[1] >= comment.range[1]))
}
