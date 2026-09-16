import type {TSESLint, TSESTree} from '@typescript-eslint/utils'

import {AST_NODE_TYPES as AST, ASTUtils} from '@typescript-eslint/utils'

import {createImportResolver} from '../branchImports.ts'
import createRule from '../createRule.ts'
import {commentsAreWithin, expressionText, isEagerSafe, isJsx, isJsxChild} from '../jsx.ts'

const isNull = (expression: TSESTree.Expression) => expression.type === AST.Literal && expression.value === null
type Options = [{
  keepPrimitives?: boolean
  name?: string
}]
function isBoolean(node: TSESTree.Expression, sourceCode: TSESLint.SourceCode): boolean {
  switch (node.type) {
    case AST.Literal: {
      return typeof node.value === 'boolean'
    }
    case AST.UnaryExpression: {
      return node.operator === '!'
    }
    case AST.BinaryExpression: {
      return ['!=', '!==', '<', '<=', '==', '===', '>', '>=', 'in', 'instanceof'].includes(node.operator)
    }
    case AST.LogicalExpression: {
      return isBoolean(node.left, sourceCode) && isBoolean(node.right, sourceCode)
    }
    case AST.TSAsExpression:
    case AST.TSTypeAssertion: {
      return node.typeAnnotation.type === AST.TSBooleanKeyword || isBoolean(node.expression, sourceCode)
    }
    case AST.Identifier: {
      const variable = ASTUtils.findVariable(sourceCode.getScope(node), node.name)
      return variable?.defs.some(definition => definition.name.type === AST.Identifier && definition.name.typeAnnotation?.typeAnnotation.type === AST.TSBooleanKeyword) ?? false
    }
    case AST.CallExpression: {
      return node.callee.type === AST.Identifier && node.callee.name === 'Boolean' && !ASTUtils.findVariable(sourceCode.getScope(node), 'Boolean')?.defs.length
    }
    default: {
      return false
    }
  }
}

export default createRule<Options, 'prefer'>({
  name: 'prefer-branch-component',
  meta: {
    type: 'suggestion',
    docs: {description: 'Prefer Branch over conditional rendering expressions.'},
    fixable: 'code',
    schema: [{
      type: 'object',
      additionalProperties: false,
      properties: {
        keepPrimitives: {type: 'boolean'},
        name: {
          type: 'string',
          pattern: '^[A-Za-z_$][A-Za-z0-9_$]*$',
        },
      },
    }],
    messages: {prefer: 'Use Branch for conditional rendering.'},
  },
  defaultOptions: [{
    keepPrimitives: true,
    name: 'Branch',
  }],
  create(context, [{keepPrimitives = true, name = 'Branch'}]) {
    const {sourceCode} = context
    const resolveImport = createImportResolver(sourceCode, name)
    function report(node: TSESTree.ConditionalExpression | TSESTree.LogicalExpression, condition: TSESTree.Expression, success: TSESTree.Expression, failure?: TSESTree.Expression) {
      const retained = [condition, success, ...failure ? [failure] : []]
      // Branch props are eager at runtime. Never turn a guarded property access,
      // function call, spread, await or other effect into an unconditional one.
      const canFix = sourceCode.ast.sourceType === 'module' && isEagerSafe(success) && (!failure || isEagerSafe(failure)) && commentsAreWithin(node, retained, sourceCode)
      context.report({
        node,
        messageId: 'prefer',
        fix: canFix ? fixer => {
          const binding = resolveImport(node)
          const inverted = isNull(success) && failure !== undefined
          const child = inverted ? failure : success
          const fallback = inverted || !failure || isNull(failure) ? '' : ` else={${expressionText(failure, sourceCode)}}`
          const children = isJsx(child) ? sourceCode.getText(child) : `{${expressionText(child, sourceCode)}}`
          const replacement = `<${binding.name} ${inverted ? 'not' : 'if'}={${expressionText(condition, sourceCode)}}${fallback}>${children}</${binding.name}>`
          const target = isJsxChild(node) && commentsAreWithin(node.parent, [node], sourceCode) ? node.parent : node
          const edits = [fixer.replaceText(target, replacement)]
          if (binding.insert) {
            edits.push(binding.insert(fixer))
          }
          return edits
        } : null,
      })
    }
    return {
      ConditionalExpression(node) {
        if (keepPrimitives && isJsxChild(node) && !isJsx(node.consequent) && !isJsx(node.alternate)) {
          return
        }
        if (isJsxChild(node) || isJsx(node.consequent) || isJsx(node.alternate)) {
          report(node, node.test, node.consequent, node.alternate)
        }
      },
      LogicalExpression(node) {
        // Unknown && operands can render 0 or NaN. || and ?? also return their
        // original operand, so they are deliberately not Boolean-normalized.
        if (node.operator === '&&' && isJsx(node.right) && isBoolean(node.left, sourceCode)) {
          report(node, node.left, node.right)
        }
      },
    }
  },
})
