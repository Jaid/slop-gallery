import {AST_NODE_TYPES as AST} from '@typescript-eslint/utils'

import {isBranchElement} from '../branchImports.ts'
import createRule from '../createRule.ts'
import {attributesNamed, commentsAreWithin, componentReference, hasSpread, isEagerSafe, isJsx, meaningfulChildren, openingWithoutAttribute, trimOpeningLayout} from '../jsx.ts'

export default createRule({
  name: 'expand-children',
  meta: {
    type: 'suggestion',
    docs: {description: 'Write complex successful JSX branches as nested children.'},
    fixable: 'code',
    schema: [],
    messages: {expand: 'Write this JSX between the Branch opening and closing tags.'},
  },
  defaultOptions: [],
  create(context) {
    const {sourceCode} = context
    return {
      JSXElement(node) {
        if (!isBranchElement(node, sourceCode) || meaningfulChildren(node).length) {
          return
        }
        const children = attributesNamed(node, 'children')
        const outputProp = children.length ? 'children' : 'then'
        const attributes = children.length ? children : attributesNamed(node, 'then')
        if (attributes.length !== 1 || attributes[0].value?.type !== AST.JSXExpressionContainer) {
          return
        }
        // Moving then into children would overwrite children from a spread.
        // else must stay a prop: nested children belong to the successful branch.
        if (outputProp === 'then' && hasSpread(node)) {
          return
        }
        const attribute = attributes[0]
        const expression = attributes[0].value.expression
        if (!isJsx(expression) || componentReference(expression, sourceCode)) {
          return
        }
        const following = node.openingElement.attributes.slice(node.openingElement.attributes.indexOf(attribute) + 1)
        if (following.some(prop => prop.type === AST.JSXSpreadAttribute)) {
          return
        }
        const canMove = following.every(prop => prop.type === AST.JSXAttribute && (prop.value === null || prop.value.type === AST.Literal || isEagerSafe(expression) && isEagerSafe(prop.value)))
        context.report({
          node: attribute,
          messageId: 'expand',
          fix: canMove && commentsAreWithin(attribute, [expression], sourceCode) ? fixer => {
            const withoutAttribute = openingWithoutAttribute(node, attribute, sourceCode)
            const beforeClose = node.openingElement.selfClosing ? withoutAttribute.replace(/\/\s*>$/u, '') : withoutAttribute.slice(0, -1)
            const opening = `${trimOpeningLayout(beforeClose, node, sourceCode)}>`
            const name = sourceCode.getText(node.openingElement.name)
            return fixer.replaceText(node, `${opening}${sourceCode.getText(expression)}</${name}>`)
          } : null,
        })
      },
    }
  },
})
