import type {TSESLint, TSESTree} from '@typescript-eslint/utils'

import {AST_NODE_TYPES as AST} from '@typescript-eslint/utils'

import {isBranchElement} from '../branchImports.ts'
import createRule from '../createRule.ts'
import {attributesNamed, hasSpread, meaningfulChildren} from '../jsx.ts'

type ClassNameTarget = {
  attribute: TSESTree.JSXAttribute
  expressionText: string
  key: string
  valueText: string
}
type Collected = {
  safe: boolean
  targets: Array<ClassNameTarget>
}

const safe = (targets: Array<ClassNameTarget> = []): Collected => ({
  safe: true,
  targets,
})
const unsafe = (): Collected => ({
  safe: false,
  targets: [],
})
const mergeCollected = (parts: Array<Collected>): Collected => {
  if (parts.every(part => part.safe)) {
    return safe(parts.flatMap(part => part.targets))
  }
  return unsafe()
}
function isSafeEvaluationExpression(node: TSESTree.Expression): boolean {
  switch (node.type) {
    case AST.Identifier:
    case AST.Literal: {
      return true
    }
    case AST.MemberExpression: {
      if (node.object.type === AST.Super || !isSafeEvaluationExpression(node.object)) {
        return false
      }
      return !node.computed || isSafeEvaluationExpression(node.property)
    }
    case AST.BinaryExpression: {
      return node.left.type !== AST.PrivateIdentifier && isSafeEvaluationExpression(node.left) && isSafeEvaluationExpression(node.right)
    }
    case AST.LogicalExpression: {
      return isSafeEvaluationExpression(node.left) && isSafeEvaluationExpression(node.right)
    }
    case AST.ConditionalExpression: {
      return isSafeEvaluationExpression(node.test) && isSafeEvaluationExpression(node.consequent) && isSafeEvaluationExpression(node.alternate)
    }
    case AST.TemplateLiteral: {
      return node.expressions.every(isSafeEvaluationExpression)
    }
    case AST.UnaryExpression: {
      return ['!', 'typeof', 'void'].includes(node.operator) && isSafeEvaluationExpression(node.argument)
    }
    case AST.ChainExpression: {
      return isSafeEvaluationExpression(node.expression)
    }
    case AST.TSAsExpression:
    case AST.TSNonNullExpression:
    case AST.TSSatisfiesExpression:
    case AST.TSTypeAssertion: {
      return isSafeEvaluationExpression(node.expression)
    }
    default: {
      return false
    }
  }
}
const isNullishExpression = (node: TSESTree.Expression): boolean => node.type === AST.Literal && node.value === null || node.type === AST.Identifier && node.name === 'undefined' || node.type === AST.UnaryExpression && node.operator === 'void' && isSafeEvaluationExpression(node.argument)
function isSafeClassNameExpression(node: TSESTree.Expression): boolean {
  switch (node.type) {
    case AST.Identifier: {
      return node.name !== 'undefined'
    }
    case AST.Literal: {
      return typeof node.value === 'string'
    }
    case AST.MemberExpression: {
      return isSafeEvaluationExpression(node)
    }
    case AST.TemplateLiteral: {
      return isSafeEvaluationExpression(node)
    }
    case AST.ConditionalExpression: {
      const resultIsSafe = (result: TSESTree.Expression) => isNullishExpression(result) || isSafeClassNameExpression(result)
      return isSafeEvaluationExpression(node.test) && resultIsSafe(node.consequent) && resultIsSafe(node.alternate)
    }
    case AST.ChainExpression: {
      return isSafeClassNameExpression(node.expression)
    }
    case AST.TSAsExpression:
    case AST.TSNonNullExpression:
    case AST.TSSatisfiesExpression:
    case AST.TSTypeAssertion: {
      return isSafeClassNameExpression(node.expression)
    }
    default: {
      return false
    }
  }
}
const isSafeClassNameArrayExpression = (node: TSESTree.ArrayExpression): boolean => node.elements.every(element => element === null || element.type !== AST.SpreadElement && (isSafeClassNameExpression(element) || isNullishExpression(element)))
const mergedBranchClassNameValue = (attribute: TSESTree.JSXAttribute, shared: string, sourceCode: TSESLint.SourceCode): string | undefined => {
  const {value} = attribute
  if (value?.type === AST.Literal && typeof value.value === 'string') {
    return `{[${shared}, ${sourceCode.getText(value)}]}`
  }
  if (value?.type !== AST.JSXExpressionContainer || value.expression.type === AST.JSXEmptyExpression) {
    return
  }
  const expression = value.expression
  const existing = sourceCode.getText(expression)
  if (expression.type === AST.ArrayExpression) {
    return isSafeClassNameArrayExpression(expression) ? `{[${shared}, ...${existing}]}` : undefined
  }
  return isSafeClassNameExpression(expression) || isNullishExpression(expression) ? `{[${shared}, ${existing}]}` : undefined
}
const classNameTarget = (node: TSESTree.JSXElement, sourceCode: TSESLint.SourceCode): Collected => {
  if (hasSpread(node)) {
    return unsafe()
  }
  const name = sourceCode.getText(node.openingElement.name)
  if (name === 'Fragment' || name.endsWith('.Fragment')) {
    return unsafe()
  }
  const attributes = attributesNamed(node, 'className')
  if (attributes.length !== 1) {
    return unsafe()
  }
  const attribute = attributes[0]
  if (sourceCode.getCommentsInside(attribute).length) {
    return unsafe()
  }
  const {value} = attribute
  if (value?.type === AST.Literal && typeof value.value === 'string') {
    return safe([{
      attribute,
      expressionText: sourceCode.getText(value),
      key: `string:${value.value}`,
      valueText: sourceCode.getText(value),
    }])
  }
  if (value?.type !== AST.JSXExpressionContainer || value.expression.type === AST.JSXEmptyExpression || !isSafeClassNameExpression(value.expression)) {
    return unsafe()
  }
  return safe([{
    attribute,
    expressionText: sourceCode.getText(value.expression),
    key: `expression:${sourceCode.getText(value.expression)}`,
    valueText: sourceCode.getText(value),
  }])
}
const collectNode = (node: TSESTree.Expression | TSESTree.JSXChild, sourceCode: TSESLint.SourceCode): Collected => {
  switch (node.type) {
    case AST.JSXElement: {
      return classNameTarget(node, sourceCode)
    }
    case AST.JSXFragment: {
      return mergeCollected(node.children.map(child => collectNode(child, sourceCode)))
    }
    case AST.JSXText: {
      return safe()
    }
    case AST.JSXExpressionContainer: {
      return node.expression.type === AST.JSXEmptyExpression ? safe() : collectNode(node.expression, sourceCode)
    }
    case AST.ArrayExpression: {
      return mergeCollected(node.elements.map(element => {
        if (element === null) {
          return safe()
        }
        return element.type === AST.SpreadElement ? unsafe() : collectNode(element, sourceCode)
      }))
    }
    case AST.Literal: {
      return safe()
    }
    default: {
      return unsafe()
    }
  }
}
const collectAttributeOutput = (attribute: TSESTree.JSXAttribute, sourceCode: TSESLint.SourceCode): Collected => {
  if (attribute.value?.type === AST.Literal) {
    return safe()
  }
  if (attribute.value?.type !== AST.JSXExpressionContainer || attribute.value.expression.type === AST.JSXEmptyExpression) {
    return unsafe()
  }
  return collectNode(attribute.value.expression, sourceCode)
}
const collectNestedChildren = (node: TSESTree.JSXElement, sourceCode: TSESLint.SourceCode): Collected => mergeCollected(meaningfulChildren(node).map(child => collectNode(child, sourceCode)))

export default createRule({
  name: 'simplify-classname',
  meta: {
    type: 'suggestion',
    docs: {description: 'Hoist identical output className props to Branch.'},
    fixable: 'code',
    schema: [],
    messages: {simplify: 'Hoist the shared className to Branch.'},
  },
  defaultOptions: [],
  create(context) {
    const {sourceCode} = context
    return {
      JSXElement(node) {
        if (!isBranchElement(node, sourceCode) || hasSpread(node)) {
          return
        }
        const branchClassNames = attributesNamed(node, 'className')
        if (branchClassNames.length > 1) {
          return
        }
        const branchClassName = branchClassNames.at(0)
        if (branchClassName && sourceCode.getCommentsInside(branchClassName).length) {
          return
        }
        const outputAttributes = ['then', 'else', 'children'].flatMap(name => attributesNamed(node, name))
        const outputNames = new Set(outputAttributes.map(attribute => attribute.name.name))
        if (outputAttributes.length !== outputNames.size) {
          return
        }
        const explicitChildren = attributesNamed(node, 'children')
        const nestedChildren = meaningfulChildren(node)
        if (explicitChildren.length && nestedChildren.length) {
          return
        }
        const collected = mergeCollected([
          ...outputAttributes.map(attribute => collectAttributeOutput(attribute, sourceCode)),
          ...explicitChildren.length ? [] : [collectNestedChildren(node, sourceCode)],
        ])
        if (!collected.safe || collected.targets.length < 2) {
          return
        }
        const [first] = collected.targets
        if (!collected.targets.every(target => target.key === first.key)) {
          return
        }
        const mergedBranchClassName = branchClassName ? mergedBranchClassNameValue(branchClassName, first.expressionText, sourceCode) : undefined
        if (branchClassName && mergedBranchClassName === undefined) {
          return
        }
        context.report({
          node: first.attribute,
          messageId: 'simplify',
          fix(fixer) {
            const fixes: Array<TSESLint.RuleFix> = []
            if (branchClassName) {
              fixes.push(fixer.replaceText(branchClassName.value!, mergedBranchClassName!))
            } else {
              const opening = node.openingElement
              const insertionPoint = opening.range[1] - (opening.selfClosing ? 2 : 1)
              const prefix = /\s/u.test(sourceCode.text[insertionPoint - 1] ?? '') ? '' : ' '
              fixes.push(fixer.insertTextBeforeRange([insertionPoint, insertionPoint + 1], `${prefix}className=${first.valueText}`))
            }
            for (const {attribute} of collected.targets) {
              let start = attribute.range[0]
              while (start > 0 && /[\t ]/u.test(sourceCode.text[start - 1])) {
                start--
              }
              fixes.push(fixer.removeRange([start, attribute.range[1]]))
            }
            return fixes
          },
        })
      },
    }
  },
})
