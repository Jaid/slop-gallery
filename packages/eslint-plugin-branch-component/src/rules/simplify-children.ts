import {AST_NODE_TYPES as AST} from '@typescript-eslint/utils'

import {isBranchElement} from '../branchImports.ts'
import createRule from '../createRule.ts'
import {attributesNamed, componentReference, hasSpread, meaningfulChildren, trimOpeningLayout} from '../jsx.ts'

export default createRule({
  name: 'simplify-children',
  meta: {
    type: 'suggestion',
    docs: {description: 'Pass bare components through then and else instead of instantiating them.'},
    fixable: 'code',
    schema: [],
    messages: {simplify: 'Pass {{component}} directly as the {{prop}} prop.'},
  },
  defaultOptions: [],
  create(context) {
    const {sourceCode} = context
    return {
      JSXElement(node) {
        if (!isBranchElement(node, sourceCode)) {
          return
        }
        for (const prop of ['then', 'else']) {
          const attributes = attributesNamed(node, prop)
          if (attributes.length !== 1) {
            continue
          }
          const attribute = attributes[0]
          if (attribute.value?.type !== AST.JSXExpressionContainer) {
            continue
          }
          const expression = attribute.value.expression
          const component = componentReference(expression, sourceCode)
          if (component) {
            context.report({
              node: expression,
              messageId: 'simplify',
              data: {
                component,
                prop,
              },
              fix: fixer => fixer.replaceText(expression, component),
            })
          }
        }
        // then and children are additive, not aliases. Never replace an existing
        // then output, including one that could have arrived through a spread.
        if (attributesNamed(node, 'then').length || hasSpread(node)) {
          return
        }
        const attributes = attributesNamed(node, 'children')
        const children = meaningfulChildren(node)
        if (attributes.length === 1 && children.length === 0) {
          const attribute = attributes[0]
          if (attribute.value?.type !== AST.JSXExpressionContainer) {
            return
          }
          const expression = attribute.value.expression
          const component = componentReference(expression, sourceCode)
          if (component) {
            context.report({
              node: expression,
              messageId: 'simplify',
              data: {
                component,
                prop: 'then',
              },
              fix: fixer => [fixer.replaceText(attribute.name, 'then'), fixer.replaceText(expression, component)],
            })
          }
          return
        }
        if (attributes.length || children.length !== 1) {
          return
        }
        const child = children[0]
        const expression = child.type === AST.JSXExpressionContainer ? child.expression : child
        const component = componentReference(expression, sourceCode)
        if (!component || sourceCode.getCommentsInside(child).length) {
          return
        }
        context.report({
          node: child,
          messageId: 'simplify',
          data: {
            component,
            prop: 'then',
          },
          fix(fixer) {
            const opening = trimOpeningLayout(sourceCode.getText(node.openingElement).slice(0, -1), node, sourceCode)
            return fixer.replaceText(node, `${opening} then={${component}} />`)
          },
        })
      },
    }
  },
})
