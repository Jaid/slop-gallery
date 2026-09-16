import {AST_NODE_TYPES as AST} from '@typescript-eslint/utils'

import {isBranchElement} from '../branchImports.ts'
import createRule from '../createRule.ts'
import {attributesNamed, expressionText, hasSpread} from '../jsx.ts'

export default createRule({
  name: 'prefer-positive',
  meta: {
    type: 'suggestion',
    docs: {description: 'Prefer not={value} over if={!value}.'},
    fixable: 'code',
    schema: [],
    messages: {prefer: 'Use not={{value}} instead of if={!{{value}}}.'},
  },
  defaultOptions: [],
  create(context) {
    const {sourceCode} = context
    return {
      JSXElement(node) {
        if (!isBranchElement(node, sourceCode) || hasSpread(node) || attributesNamed(node, 'not').length) {
          return
        }
        const attributes = attributesNamed(node, 'if')
        if (attributes.length !== 1) {
          return
        }
        const attribute = attributes[0]
        if (attribute.value?.type !== AST.JSXExpressionContainer || attribute.value.expression.type !== AST.UnaryExpression || attribute.value.expression.operator !== '!') {
          return
        }
        const expression = attribute.value.expression
        if (expression.argument.type === AST.UnaryExpression && expression.argument.operator === '!' || sourceCode.getCommentsInside(expression).length) {
          return
        }
        const value = expressionText(expression.argument, sourceCode)
        context.report({
          node: attribute,
          messageId: 'prefer',
          data: {value},
          fix: fixer => [
            fixer.replaceText(attribute.name, 'not'),
            fixer.replaceText(expression, value),
          ],
        })
      },
    }
  },
})
